#!/usr/bin/env node
'use strict';
process.chdir(__dirname);
const fs = require('fs');
const https = require('https');
const httpoly = require('httpolyglot');
const ws = require('ws');
const etg = require('./etg');
const Cards = require('./Cards');
const RngMock = require('./RngMock');
const etgutil = require('./etgutil');
const usercmd = require('./usercmd');
const userutil = require('./userutil');
const sutil = require('./srv/sutil');
const db = require('./srv/db');
const Us = require('./srv/Us');

const MAX_INT = 0x100000000;
const rooms = {};

const keycerttask = sutil.mkTask(res => {
	function activeUsers() {
		const activeusers = [];
		for (const name in Us.socks) {
			const sock = Us.socks[name];
			if (sock && sock.readyState == 1) {
				if (sock.meta.offline) continue;
				if (sock.meta.afk) name += ' (afk)';
				else if (sock.meta.wantpvp) name += '\xb6';
				activeusers.push(name);
			}
		}
		return activeusers;
	}
	function genericChat(socket, data) {
		data.x = 'chat';
		broadcast(data);
	}
	function broadcast(data) {
		const msg = JSON.stringify(data);
		for (const sock of wss.clients) {
			if (sock.readyState === 1) sock.send(msg);
		}
	}
	function getAgedHp(hp, age) {
		return Math.max(hp - age * age, hp / 2) | 0;
	}
	function wilson(up, total) {
		// from npm's wilson-score
		const z = 2.326348,
			z2 = z * z,
			phat = up / total;
		return (
			(phat +
				z2 / (2 * total) -
				z * Math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total)) /
			(1 + z2 / total)
		);
	}
	function sockEmit(socket, event, data) {
		if (socket.readyState == 1) {
			if (!data) data = {};
			data.x = event;
			socket.send(JSON.stringify(data));
		}
	}
	function modf(func) {
		return function(data, user) {
			db.sismember('Mods', data.u, (err, ismem) => {
				if (ismem) {
					func.call(this, data, user);
				} else {
					sockEmit(this, 'chat', { mode: 1, msg: 'You are not a mod' });
				}
			});
		};
	}
	const echoEvents = new Set([
		'endturn',
		'cast',
		'foeleft',
		'mulligan',
		'cardchosen',
	]);
	var guestban = false;
	const userEvents = {
		modadd: modf(function(data, user) {
			db.sadd('Mods', data.m);
		}),
		modrm: modf(function(data, user) {
			db.srem('Mods', data.m);
		}),
		modguest: modf(function(data, user) {
			guestban = data.m == 'off';
		}),
		modmute: modf(function(data, user) {
			broadcast({ x: 'mute', m: data.m });
		}),
		modclear: modf(function(data, user) {
			broadcast({ x: 'clear' });
		}),
		inituser: function(data, user) {
			const starter = require('./srv/starter.json');
			if (data.e < 1 || data.e > 13) return;
			var sid = (data.e - 1) * 6;
			user.pvpwins = user.pvplosses = user.aiwins = user.ailosses = 0;
			user.accountbound = starter[sid];
			user.oracle = 0;
			user.pool = '';
			user.freepacks = [starter[sid + 4], starter[sid + 5], 1];
			user.selectedDeck = '1';
			user.qecks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
			user.decks = {
				1: starter[sid + 1],
				2: starter[sid + 2],
				3: starter[sid + 3],
			};
			user.quests = {};
			user.streak = [];
			sockEvents.login.call(this, { u: user.name, a: user.auth });
		},
		logout: function(data, user) {
			const u = data.u;
			db.hset('Users', u, JSON.stringify(user));
			delete Us.users[u];
			delete Us.socks[u];
		},
		delete: function(data, user) {
			const u = data.u;
			db.hdel('Users', u);
			delete Us.users[u];
			delete Us.socks[u];
		},
		setarena: function(data, user) {
			if (!user.ocard || !data.d) {
				return;
			}
			var au = (data.lv ? 'B:' : 'A:') + data.u;
			if (data.mod) {
				db.hmset(au, {
					deck: data.d,
					hp: data.hp,
					draw: data.draw,
					mark: data.mark,
				});
			} else {
				db.hmset(au, {
					day: sutil.getDay(),
					deck: data.d,
					card: user.ocard,
					win: 0,
					loss: 0,
					hp: data.hp,
					draw: data.draw,
					mark: data.mark,
				});
				db.zadd('arena' + (data.lv ? '1' : ''), 200, data.u);
			}
		},
		arenainfo: function(data, user) {
			db
				.batch([
					['hgetall', 'A:' + data.u],
					['hgetall', 'B:' + data.u],
					['zrevrank', 'arena', data.u],
					['zrevrank', 'arena1', data.u],
				])
				.exec((err, res) => {
					var day = sutil.getDay();
					function process(obj, rank) {
						if (!obj) return;
						obj.day = day - obj.day;
						obj.curhp = getAgedHp(obj.hp, obj.day);
						if (rank !== null) obj.rank = rank;
						['draw', 'hp', 'loss', 'mark', 'win', 'card'].forEach(function(
							key,
						) {
							obj[key] = parseInt(obj[key], 10);
						});
					}
					process(res[0], res[2]);
					process(res[1], res[3]);
					sockEmit(this, 'arenainfo', { A: res[0], B: res[1] });
				});
		},
		modarena: function(data, user) {
			Us.load(data.aname, user => (user.gold += data.won ? 3 : 1));
			var arena = 'arena' + (data.lv ? '1' : ''),
				akey = (data.lv ? 'B:' : 'A:') + data.aname;
			db.zscore(arena, data.aname, (err, score) => {
				if (score === null) return;
				var task = sutil.mkTask(wld => {
					if (wld.err) return;
					var won = parseInt(data.won ? wld.incr : wld.mget[0]),
						loss = parseInt(data.won ? wld.mget[0] : wld.incr),
						day = parseInt(wld.mget[1]);
					db.zadd(
						arena,
						wilson(won + 1, won + loss + 1) * 1000 - (sutil.getDay() - day),
						data.aname,
					);
				});
				db.hincrby(akey, data.won ? 'win' : 'loss', 1, task('incr'));
				db.hmget(akey, data.won ? 'loss' : 'win', 'day', task('mget'));
				task();
			});
		},
		foearena: function(data, user) {
			db.zcard('arena' + (data.lv ? '1' : ''), (err, len) => {
				if (!len) return;
				const cost = userutil.arenaCost(data.lv);
				if (user.gold < cost) return;
				user.gold -= cost;
				const idx = RngMock.upto(Math.min(len, 20));
				db.zrevrange('arena' + (data.lv ? '1' : ''), idx, idx, (err, aname) => {
					if (!aname || !aname.length) {
						console.log('No arena ' + idx);
						return;
					}
					aname = aname[0];
					db.hgetall((data.lv ? 'B:' : 'A:') + aname, (err, adeck) => {
						adeck.card = parseInt(adeck.card, 10);
						if (data.lv) adeck.card = etgutil.asUpped(adeck.card, true);
						adeck.hp = parseInt(adeck.hp || 200);
						adeck.mark = parseInt(adeck.mark || 1);
						adeck.draw = parseInt(adeck.draw || data.lv + 1);
						const curhp = getAgedHp(adeck.hp, sutil.getDay() - adeck.day);
						sockEmit(this, 'foearena', {
							seed: Math.random() * MAX_INT,
							name: aname,
							hp: curhp,
							rank: idx,
							mark: adeck.mark,
							draw: adeck.draw,
							deck: adeck.deck + '05' + adeck.card.toString(32),
							lv: data.lv,
						});
					});
				});
			});
		},
		codecreate: function(data, user) {
			if (!data.t) {
				return sockEmit(this, 'chat', {
					mode: 1,
					msg: 'Invalid type ' + data.t,
				});
			}
			db.sismember('Codesmiths', data.u, (err, ismem) => {
				if (ismem) {
					db.eval(
						"math.randomseed(ARGV[1])local c repeat c=''for i=1,8 do c=c..string.char(math.random(33,126))end until redis.call('hexists','CodeHash',c)==0 redis.call('hset','CodeHash',c,ARGV[2])return c",
						0,
						Math.random() * MAX_INT,
						data.t,
						(err, code) => {
							if (err) console.log(err);
							sockEmit(this, 'chat', { mode: 1, msg: data.t + ' ' + code });
						},
					);
				} else {
					sockEmit(this, 'chat', { mode: 1, msg: 'You are not a codesmith' });
				}
			});
		},
		codesubmit: function(data, user) {
			db.hget('CodeHash', data.code, (err, type) => {
				if (!type) {
					sockEmit(this, 'chat', { mode: 1, msg: 'Code does not exist' });
				} else if (type.charAt(0) == 'G') {
					var g = parseInt(type.slice(1));
					if (isNaN(g)) {
						sockEmit(this, 'chat', {
							mode: 1,
							msg: 'Invalid gold code type: ' + type,
						});
					} else {
						user.gold += g;
						sockEmit(this, 'codegold', { g: g });
						db.hdel('CodeHash', data.code);
					}
				} else if (type.charAt(0) == 'C') {
					var c = parseInt(type.slice(1), 32);
					if (c in Cards.Codes) {
						user.pool = etgutil.addcard(user.pool, c);
						sockEmit(this, 'codecode', { card: c });
						db.hdel('CodeHash', data.code);
					} else
						sockEmit(this, 'chat', { mode: 1, msg: 'Unknown card: ' + type });
				} else if (type.replace(/^!/, '') in userutil.rewardwords) {
					sockEmit(this, 'codecard', { type: type });
				} else {
					sockEmit(this, 'chat', {
						mode: 1,
						msg: 'Unknown code type: ' + type,
					});
				}
			});
		},
		codesubmit2: function(data, user) {
			db.hget('CodeHash', data.code, (err, type) => {
				if (!type) {
					sockEmit(this, 'chat', { mode: 1, msg: 'Code does not exist' });
				} else if (type.replace(/^!/, '') in userutil.rewardwords) {
					var card = Cards.Codes[data.card];
					if (
						card &&
						card.rarity == userutil.rewardwords[type.replace(/^!/, '')] &&
						card.shiny ^ (type.charAt(0) != '!')
					) {
						user.pool = etgutil.addcard(user.pool, data.card);
						sockEmit(this, 'codedone', { card: data.card });
						db.hdel('CodeHash', data.code);
					}
				} else {
					sockEmit(this, 'chat', {
						mode: 1,
						msg: 'Unknown code type: ' + type,
					});
				}
			});
		},
		foewant: function(data, user) {
			var u = data.u,
				f = data.f;
			if (u == f) {
				return;
			}
			console.log(u + ' requesting ' + f);
			var deck = user.decks[user.selectedDeck];
			if (!deck) return;
			this.meta.deck = deck;
			this.meta.pvpstats = {
				hp: data.p1hp,
				markpower: data.p1markpower,
				deckpower: data.p1deckpower,
				drawpower: data.p1drawpower,
			};
			var foesock = Us.socks[f];
			if (foesock && foesock.readyState == 1) {
				if (foesock.meta.duel == u) {
					delete foesock.meta.duel;
					var seed = Math.random() * MAX_INT;
					this.meta.foe = foesock;
					foesock.meta.foe = this;
					var deck0 = foesock.meta.deck,
						deck1 = this.meta.deck;
					var owndata = { seed: seed, deck: deck0, urdeck: deck1, foename: f };
					var foedata = {
						flip: true,
						seed: seed,
						deck: deck1,
						urdeck: deck0,
						foename: u,
					};
					var stat = this.meta.pvpstats,
						foestat = foesock.meta.pvpstats;
					for (const key in stat) {
						owndata['p1' + key] = stat[key];
						foedata['p2' + key] = stat[key];
					}
					for (const key in foestat) {
						owndata['p2' + key] = foestat[key];
						foedata['p1' + key] = foestat[key];
					}
					sockEmit(this, 'pvpgive', owndata);
					sockEmit(foesock, 'pvpgive', foedata);
					if (foesock.meta.spectators) {
						foesock.meta.spectators.forEach(function(uname) {
							var sock = Us.socks[uname];
							if (sock && sock.readyState == 1) {
								sockEmit(sock, 'spectategive', foedata);
							}
						});
					}
				} else {
					this.meta.duel = f;
					sockEmit(foesock, 'challenge', { f: u, pvp: true });
				}
			}
		},
		spectate: function(data, user) {
			var tgt = Us.socks[data.f];
			if (tgt && tgt.meta.duel) {
				sockEmit(tgt, 'chat', { mode: 1, msg: data.u + ' is spectating.' });
				if (!tgt.meta.spectators) tgt.meta.spectators = [];
				tgt.meta.spectators.push(data.u);
			}
		},
		canceltrade: function(data) {
			var info = this.meta;
			if (info.trade) {
				var foesock = Us.socks[info.trade.foe];
				if (foesock) {
					sockEmit(foesock, 'tradecanceled');
					sockEmit(foesock, 'chat', {
						mode: 1,
						msg: data.u + ' has canceled the trade.',
					});
					if (foesock.meta.trade && foesock.meta.trade.foe == data.u)
						delete foesock.meta.trade;
				}
				delete info.trade;
			}
		},
		confirmtrade: function(data, user) {
			var u = data.u,
				thistrade = this.meta.trade;
			if (!thistrade) {
				return;
			}
			thistrade.tradecards = data.cards;
			thistrade.oppcards = data.oppcards;
			var thatsock = Us.socks[thistrade.foe];
			var thattrade = thatsock && thatsock.meta.trade;
			var otherUser = Us.users[thistrade.foe];
			if (!thattrade || !otherUser) {
				sockEmit(this, 'tradecanceled');
				delete this.meta.trade;
				return;
			} else if (thattrade.accepted) {
				var player1Cards = thistrade.tradecards,
					player2Cards = thattrade.tradecards;
				if (
					player1Cards != thattrade.oppcards ||
					player2Cards != thistrade.oppcards
				) {
					sockEmit(this, 'tradecanceled');
					sockEmit(this, 'chat', { mode: 1, msg: 'Trade disagreement.' });
					sockEmit(thatsock, 'tradecanceled');
					sockEmit(thatsock, 'chat', { mode: 1, msg: 'Trade disagreement.' });
					return;
				}
				user.pool = etgutil.removedecks(user.pool, player1Cards);
				user.pool = etgutil.mergedecks(user.pool, player2Cards);
				otherUser.pool = etgutil.removedecks(otherUser.pool, player2Cards);
				otherUser.pool = etgutil.mergedecks(otherUser.pool, player1Cards);
				sockEmit(this, 'tradedone', {
					oldcards: player1Cards,
					newcards: player2Cards,
				});
				sockEmit(thatsock, 'tradedone', {
					oldcards: player2Cards,
					newcards: player1Cards,
				});
				delete this.meta.trade;
				delete thatsock.meta.trade;
			} else {
				thistrade.accepted = true;
			}
		},
		tradewant: function(data) {
			var u = data.u,
				f = data.f;
			if (u == f) {
				return;
			}
			console.log(u + ' requesting ' + f);
			var foesock = Us.socks[f];
			if (foesock && foesock.readyState == 1) {
				this.meta.trade = { foe: f };
				var foetrade = foesock.meta.trade;
				if (foetrade && foetrade.foe == u) {
					sockEmit(this, 'tradegive');
					sockEmit(foesock, 'tradegive');
				} else {
					sockEmit(foesock, 'challenge', { f: u });
				}
			}
		},
		passchange: function(data, user) {
			user.salt = '';
			if (!data.p) {
				user.auth = '';
				sockEmit(this, 'passchange', { auth: '' });
			} else {
				sutil.initsalt(user);
				require('crypto').pbkdf2(
					data.p,
					user.salt,
					user.iter,
					64,
					user.algo,
					(err, key) => {
						if (!err) {
							user.auth = key.toString('base64');
							sockEmit(this, 'passchange', { auth: user.auth });
						}
					},
				);
			}
		},
		chat: function(data) {
			if (data.to) {
				var to = data.to;
				if (Us.socks[to] && Us.socks[to].readyState == 1) {
					sockEmit(Us.socks[to], 'chat', { msg: data.msg, mode: 2, u: data.u });
					sockEmit(this, 'chat', { msg: data.msg, mode: 2, u: 'To ' + to });
				} else
					sockEmit(this, 'chat', {
						mode: 1,
						msg: to + ' is not here right now.\nFailed to deliver: ' + data.msg,
					});
			} else {
				genericChat(this, data);
			}
		},
		booster: function(data, user) {
			var pack = [
				{ amount: 10, cost: 15, rare: [] },
				{ amount: 6, cost: 25, rare: [3] },
				{ amount: 5, cost: 77, rare: [1, 3] },
				{ amount: 9, cost: 100, rare: [4, 7, 8] },
				{ amount: 1, cost: 250, rare: [0, 0, 0, 0] },
			][data.pack];
			if (!pack) return;
			var bumprate = 0.45 / pack.amount;
			var bound = user.freepacks && user.freepacks[data.pack] > 0;
			if (!bound && data.bulk) {
				pack.amount *= data.bulk;
				pack.cost *= data.bulk;
				for (var i = 0; i < pack.rare.length; i++) pack.rare[i] *= data.bulk;
			}
			if (bound || user.gold >= pack.cost) {
				var newCards = '',
					rarity = 1;
				for (var i = 0; i < pack.amount; i++) {
					while (i == pack.rare[rarity - 1]) rarity++;
					var cardcode;
					if (rarity == 5) {
						cardcode =
							etg.NymphList[
								data.element > 0 && data.element < 13
									? data.element
									: RngMock.upto(12) + 1
							];
					} else {
						var notFromElement = Math.random() > 0.5,
							bumprarity = rarity + (Math.random() < bumprate),
							card = undefined;
						if (data.element < 13)
							card = RngMock.randomcard(
								false,
								x =>
									(x.element == data.element) ^ notFromElement &&
									x.rarity == bumprarity,
							);
						if (!card)
							card = RngMock.randomcard(false, x => x.rarity == bumprarity);
						cardcode = card.code;
					}
					newCards = etgutil.addcard(newCards, cardcode);
				}
				if (bound) {
					user.freepacks[data.pack]--;
					user.accountbound = etgutil.mergedecks(user.accountbound, newCards);
					if (user.freepacks.every(x => x == 0)) {
						delete user.freepacks;
					}
				} else {
					user.gold -= pack.cost;
					user.pool = etgutil.mergedecks(user.pool, newCards);
				}
				sockEmit(this, 'boostergive', {
					cards: newCards,
					accountbound: bound,
					packtype: data.pack,
				});
			}
		},
		foecancel: function(data) {
			var info = this.meta;
			if (info.duel) {
				var foesock = Us.socks[info.duel];
				if (foesock) {
					sockEmit(foesock, 'foeleft');
					sockEmit(foesock, 'chat', {
						mode: 1,
						msg: data.u + ' has canceled the duel.',
					});
					if (foesock.meta.duel == data.u) delete foesock.meta.duel;
				}
				delete info.duel;
				delete info.spectators;
			}
		},
	};
	var sockEvents = {
		login: require('./srv/login')(sockEmit),
		konglogin: function(data) {
			db.get('kongapi', (err, key) => {
				if (!key) {
					sockEmit(this, 'login', { err: 'Global error: no kong api in db' });
					return;
				}
				https.get(
					'https://api.kongregate.com/api/authenticate.json?user_id=' +
						data.u +
						'&game_auth_token=' +
						data.g +
						'&api_key=' +
						key,
					res => {
						var jtext = '';
						res.setEncoding('utf8');
						res.on('data', chunk => (jtext += chunk));
						res.on('end', () => {
							var json = sutil.parseJSON(jtext);
							if (!json) {
								sockEmit(this, 'login', { err: 'Kong returned invalid JSON' });
								return;
							}
							if (json.success) {
								var name = 'Kong:' + json.username;
								Us.load(
									name,
									user => {
										user.auth = data.g;
										sockEvents.login.call(this, { u: name, a: data.g });
										var req = https.request({
											hostname: 'www.kongregate.com',
											path: '/api/submit_statistics.json',
											method: 'POST',
										});
										req.write(
											'user_id=' +
												data.u +
												'\napi_key=' +
												key +
												'\nWealth=' +
												(user.gold + userutil.calcWealth(user.pool)),
										);
										req.end();
									},
									() => {
										var user = (Us.users[name] = {
											name: name,
											gold: 0,
											auth: data.g,
										});
										sockEvents.login.call(this, { u: name, a: data.g });
									},
								);
							} else {
								sockEmit(this, 'login', {
									err: json.error + ': ' + json.error_description,
								});
							}
						});
					},
				);
			});
		},
		guestchat: function(data) {
			if (guestban) return;
			data.guest = true;
			data.u = 'Guest_' + data.u;
			genericChat(this, data);
		},
		roll: function(data) {
			var A = Math.min(data.A || 1, 99),
				X = data.X || MAX_INT;
			var sum = 0;
			for (var i = 0; i < A; i++) {
				sum += RngMock.upto(X) + 1;
			}
			data.sum = sum;
			broadcast(data);
		},
		mod: function(data) {
			db.smembers('Mods', (err, mods) => {
				sockEmit(this, 'chat', { mode: 1, msg: mods.join() });
			});
		},
		pvpwant: function(data) {
			var pendinggame = rooms[data.room];
			this.meta.deck = data.deck;
			this.meta.pvpstats = {
				hp: data.hp,
				markpower: data.mark,
				deckpower: data.deck,
				drawpower: data.draw,
			};
			if (this == pendinggame) {
				return;
			}
			if (pendinggame && pendinggame.readyState == 1) {
				var seed = Math.random() * MAX_INT;
				this.meta.foe = pendinggame;
				pendinggame.meta.foe = this;
				var deck0 = pendinggame.meta.deck,
					deck1 = data.deck;
				var owndata = { seed: seed, deck: deck0, urdeck: deck1 };
				var foedata = { flip: true, seed: seed, deck: deck1, urdeck: deck0 };
				var stat = this.meta.pvpstats,
					foestat = pendinggame.meta.pvpstats;
				for (const key in stat) {
					owndata['p1' + key] = stat[key];
					foedata['p2' + key] = stat[key];
				}
				for (const key in foestat) {
					owndata['p2' + key] = foestat[key];
					foedata['p1' + key] = foestat[key];
				}
				sockEmit(this, 'pvpgive', owndata);
				sockEmit(pendinggame, 'pvpgive', foedata);
				delete rooms[data.room];
			} else {
				rooms[data.room] = this;
			}
		},
		librarywant: function(data) {
			Us.load(data.f, user => {
				sockEmit(this, 'librarygive', {
					pool: user.pool,
					bound: user.accountbound,
					gold: user.gold,
					pvpwins: user.pvpwins,
					pvplosses: user.pvplosses,
					aiwins: user.aiwins,
					ailosses: user.ailosses,
				});
			});
		},
		arenatop: function(data) {
			db.zrevrange(
				'arena' + (data.lv ? '1' : ''),
				0,
				19,
				'withscores',
				(err, obj) => {
					if (err) return;
					var task = sutil.mkTask(res => {
						var i = 0,
							t20 = [],
							day = sutil.getDay();
						while (res[i]) {
							var wl = res[i];
							wl[2] = day - wl[2];
							wl[3] = parseInt(wl[3]);
							t20.push([obj[i * 2], Math.floor(obj[i * 2 + 1])].concat(wl));
							i++;
						}
						sockEmit(this, 'arenatop', { top: t20, lv: data.lv });
					});
					for (var i = 0; i < obj.length; i += 2) {
						db.hmget(
							(data.lv ? 'B:' : 'A:') + obj[i],
							'win',
							'loss',
							'day',
							'card',
							task(i / 2),
						);
					}
					task();
				},
			);
		},
		wealthtop: function(data) {
			db.zrevrange('wealth', 0, 49, 'withscores', (err, obj) => {
				if (!err) sockEmit(this, 'wealthtop', { top: obj });
			});
		},
		chatus: function(data) {
			if (data.hide !== undefined) this.meta.offline = data.hide;
			if (data.want !== undefined) this.meta.wantpvp = data.want;
			if (data.afk !== undefined) this.meta.afk = data.afk;
		},
		who: function(data) {
			sockEmit(this, 'chat', { mode: 1, msg: activeUsers().join(', ') });
		},
		challrecv: function(data) {
			var foesock = Us.socks[data.f];
			if (foesock && foesock.readyState == 1) {
				var info = foesock.meta,
					foename = data.pvp ? info.duel : info.trade ? info.trade.foe : '';
				sockEmit(foesock, 'chat', {
					mode: 1,
					msg:
						'You have sent a ' +
						(data.pvp ? 'PvP' : 'trade') +
						' request to ' +
						foename +
						'!',
				});
			}
		},
		roomcancel: function(data) {
			delete rooms[data.room];
		},
	};
	function onSocketClose() {
		for (var key in rooms) {
			if (rooms[key] == this) {
				delete rooms[key];
			}
		}
		for (var key in Us.socks) {
			if (Us.socks[key] == this) {
				delete Us.socks[key];
			}
		}
		var info = this.meta;
		if (info) {
			if (info.trade) {
				var foesock = Us.socks[info.trade.foe];
				if (foesock && foesock.readyState == 1) {
					var foeinfo = foesock.meta;
					if (foeinfo && foeinfo.trade && Us.socks[foeinfo.trade.foe] == this) {
						sockEmit(foesock, 'tradecanceled');
						delete foeinfo.trade;
					}
				}
			}
			if (info.foe) {
				var foeinfo = info.foe.meta;
				if (foeinfo && foeinfo.foe == this) {
					sockEmit(info.foe, 'foeleft');
					delete foeinfo.foe;
				}
			}
		}
	}
	function onSocketMessage(rawdata) {
		var data = sutil.parseJSON(rawdata);
		if (!data) return;
		console.log(data.u, data.x);
		if (echoEvents.has(data.x)) {
			var foe = this.meta.trade ? Us.socks[this.meta.trade.foe] : this.meta.foe;
			if (foe && foe.readyState == 1) {
				foe.send(rawdata);
				for (var i = 1; i <= 2; i++) {
					var spectators = (i == 1 ? this : foe).meta.spectators;
					if (spectators) {
						data.spectate = i;
						var rawmsg = JSON.stringify(data);
						spectators.forEach(uname => {
							var sock = Us.socks[uname];
							if (sock && sock.readyState == 1) {
								sock.send(rawmsg);
							}
						});
					}
				}
			}
			return;
		}
		var func = userEvents[data.x] || usercmd[data.x];
		if (func) {
			var u = data.u;
			Us.load(u, user => {
				if (data.a == user.auth) {
					Us.socks[u] = this;
					delete data.a;
					func.call(this, data, Us.users[u]);
				}
			});
		} else if ((func = sockEvents[data.x])) {
			func.call(this, data);
		}
	}
	function onSocketConnection(socket) {
		socket.meta = {};
		socket.on('close', onSocketClose);
		socket.on('message', onSocketMessage);
	}
	const app = httpoly
		.createServer(
			{
				key: res.key,
				cert: res.cert,
			},
			require('./srv/forkcore'),
		)
		.listen(13602)
		.on('clientError', () => {});
	const wss = new ws.Server({
		server: app,
		clientTracking: true,
		perMessageDeflate: true,
	});
	wss.on('connection', onSocketConnection);
	function stop() {
		app.close();
		wss.close();
		Us.stop();
	}
	process.on('SIGTERM', stop).on('SIGINT', stop);
});
fs.readFile('../certs/oetg-key.pem', keycerttask('key'));
fs.readFile('../certs/oetg-cert.pem', keycerttask('cert'));
keycerttask();
