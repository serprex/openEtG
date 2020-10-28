#!/usr/bin/node
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

import fs from 'fs/promises';

import crypto from 'crypto';
import http from 'http';
import https from 'https';
import qs from 'querystring';
import ws from 'ws';
import * as etg from './src/etg.js';
import Cards from './src/Cards.js';
import RngMock from './src/RngMock.js';
import * as etgutil from './src/etgutil.js';
import * as usercmd from './src/usercmd.js';
import * as userutil from './src/userutil.js';
import { getDay, initsalt, parseJSON, sockEmit } from './src/srv/sutil.js';
import * as pg from './src/srv/pg.js';
import * as Us from './src/srv/Us.js';
import starter from './src/srv/starter.json';
import originalstarter from './src/srv/original-starter.json';
import forkcore from './src/srv/forkcore.js';
import login from './src/srv/login.js';
import config from './config.json';
import { randint } from './src/util.js';

const sockmeta = new WeakMap();

const [keypem, certpem] = config.certs
	? await Promise.all([
			fs.readFile(`${config.certs}/oetg-key.pem`),
			fs.readFile(`${config.certs}/oetg-cert.pem`),
	  ])
	: [];
function broadcast(data) {
	const msg = JSON.stringify(data);
	for (const sock of wss.clients) {
		if (sock.readyState === 1) sock.send(msg);
	}
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
function roleck(key, func) {
	return async function (data, user, userId) {
		const ismem = await pg.pool.query({
			text: `select exists(select * from user_role ur join roles r on ur.role_id = r.id where ur.user_id = $1 and r.val = $2) res`,
			values: [userId, key],
		});
		if (ismem.rows[0].res) {
			return func.call(this, data, user, userId);
		} else {
			sockEmit(this, 'chat', {
				mode: 1,
				msg: `You aren't a member of ${key}`,
			});
		}
	};
}
function addRoleHandler(role) {
	return roleck(role, function addRole(data, user) {
		return pg.pool.query({
			text: `insert into user_role (user_id, role_id) select u.id, r.id from users u, roles r where u.name = $1 and r.val = $2 on conflict do nothing`,
			values: [data.m, role],
		});
	});
}
function rmRoleHandler(role) {
	return roleck(role, function rmRole(data, user) {
		return pg.pool.query({
			text: `delete from user_role ur using users u, roles r where ur.user_id = u.id and ur.role_id = r.id and u.name = $1 and r.val = $2`,
			values: [data.m, role],
		});
	});
}
function listRoleHandler(role) {
	return async function listRole(data) {
		const ms = await pg.pool.query({
			text: `select u.name from user_role ur join users u on u.id = ur.user_id join roles r on r.id = ur.role_id where r.val = $1 order by u.name`,
			values: [role],
		});
		sockEmit(this, 'chat', {
			mode: 1,
			msg: ms.rows.map(x => x.name).join(),
		});
	};
}
function updateArenaRanks(sql) {
	return sql.query({
		text: `with arank as (select user_id, arena_id, "rank", (row_number() over (partition by arena_id order by score desc, day desc, "rank"))::int "realrank" from arena)
update arena set "rank" = realrank, bestrank = least(bestrank, realrank) from arank where arank.arena_id = arena.arena_id and arank.user_id = arena.user_id and arank.realrank <> arank."rank"`,
	});
}
const userEvents = {
	modadd: addRoleHandler('Mod'),
	modrm: rmRoleHandler('Mod'),
	codesmithadd: addRoleHandler('Codesmith'),
	codesmithrm: rmRoleHandler('Codesmith'),
	modguest: roleck('Mod', function (data, user) {
		return pg.pool.query({
			text:
				data.m === 'off'
					? "insert into strings (key, val) values ('GuestsBanned', '') on conflict do nothing"
					: "delete from strings where key = 'GuestsBanned'",
		});
	}),
	modmute: roleck('Mod', function (data, user) {
		broadcast({ x: 'mute', m: data.m });
	}),
	modclear: roleck('Mod', function (data, user) {
		broadcast({ x: 'clear' });
	}),
	modmotd: roleck('Mod', function (data, user) {
		const match = data.m.match(/^(\d+) ?(.*)$/);
		if (match) {
			const num = match[1],
				text = match[2];
			if (text) {
				return pg.pool.query({
					text: `insert into motd (id, val) values ($1, $2) on conflict (id) do update set val = $2`,
					values: [num, text],
				});
			} else {
				return pg.pool.query({
					text: `delete from motd where id = $1`,
					values: [num],
				});
			}
		} else {
			sockEmit(this, 'chat', { mode: 1, msg: 'Invalid format' });
		}
	}),
	inituser(data, user) {
		if (data.e < 1 || data.e > 13) return;
		const sid = (data.e - 1) * 6;
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
		return login.call(this, { u: user.name, a: user.auth });
	},
	async loginoriginal(data, user, userId) {
		const result = await pg.pool.query({
			text: 'select data from user_data where user_id = $1 and type_id = 2',
			values: [userId],
		});
		sockEmit(
			this,
			'originaldata',
			result.rows.length ? result.rows[0].data : {},
		);
	},
	async initoriginal(data, user, userId) {
		if (data.e < 1 || data.e > 13) return;
		const sid = (data.e - 1) * 2;
		const originaldata = {
			pool: originalstarter[sid],
			deck: originalstarter[sid + 1],
			electrum: 0,
		};
		await pg.pool.query({
			text:
				'insert into user_data (user_id, type_id, name, data) values ($1, $2, $3, $4)',
			values: [userId, 2, data.name, originaldata],
		});
		sockEmit(this, 'originaldata', originaldata);
	},
	async logout({ u }, user, userId) {
		await Us.save(user);
		Us.users.delete(u);
		Us.socks.delete(u);
	},
	async delete({ u }, user, userId) {
		await pg.trx(async sql => {
			await Promise.all(
				['arena', 'bazaar', 'stats', 'user_data'].map(table =>
					sql.query({
						text: `delete from ${table} where user_id = $1`,
						values: [userId],
					}),
				),
			);
			await sql.query({
				text: `delete from users where id = $1`,
				values: [userId],
			});
		});
		Us.users.delete(u);
		Us.socks.delete(u);
	},
	async setarena(data, user, userId) {
		if (!user.ocard || !data.d) {
			return;
		}
		const au = `${data.lv ? 'B:' : 'A:'}${data.u}`;
		if (data.mod) {
			return pg.pool.query({
				text: `update arena set deck = $3, hp = $4, draw = $5, mark = $6 where user_id = $1 and arena_id = $2`,
				values: [
					userId,
					data.lv ? 2 : 1,
					data.d,
					data.hp,
					data.draw,
					data.mark,
				],
			});
		} else {
			const res = await pg.pool.query({
				text: `select day from arena where user_id = $1 and arena_id = $2`,
				values: [userId, data.lv ? 2 : 1],
			});
			const today = getDay();
			if (res.rowCount) {
				const age = today - res.rows[0].day;
				if (age > 0) {
					user.gold += Math.min(age * 25, 350);
				}
			}
			return await pg.trx(async sql => {
				await pg.pool.query({
					text: `insert into arena (user_id, arena_id, day, deck, code, won, loss, hp, draw, mark, score) values ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8, 250)
on conflict (user_id, arena_id) do update set day = $3, deck = $4, code = $5, won = 0, loss = 0, hp = $6, draw = $7, mark = $8, score = 250, "rank" = -1, bestrank = null`,
					values: [
						userId,
						data.lv ? 2 : 1,
						today,
						data.d,
						user.ocard,
						data.hp,
						data.draw,
						data.mark,
					],
				});
				return updateArenaRanks(sql);
			});
		}
	},
	async arenainfo(data, user, userId) {
		const day = getDay();
		const res = await pg.pool.query({
			text: `select arena_id, ($2 - arena.day) "day", draw, mark, hp, won, loss, code, deck, "rank", bestrank
from arena where user_id = $1`,
			values: [userId, day],
		});
		const info = {};
		for (const row of res.rows) {
			info[row.arena_id === 1 ? 'A' : 'B'] = {
				rank: row.rank,
				bestrank: row.bestrank,
				day: row.day,
				hp: row.hp,
				mark: row.mark,
				draw: row.draw,
				win: row.won,
				loss: row.loss,
				card: row.code,
				deck: row.deck,
			};
		}
		sockEmit(this, 'arenainfo', info);
	},
	async modarena(data, user) {
		Us.load(data.aname)
			.then(user => (user.gold += data.won ? 15 : 5))
			.catch(() => {});
		const arenaId = data.lv ? 2 : 1;
		await pg.trx(async sql => {
			const res = await sql.query({
				text: `select a.user_id, a.won, a.loss, ($3 - a.day) "day" from arena a join users u on a.user_id = u.id and a.arena_id = $1 where u.name = $2`,
				values: [arenaId, data.aname, getDay()],
			});
			if (res.rows.length === 0) return;
			const row = res.rows[0],
				won = row.won + (data.won ? 1 : 0),
				loss = row.loss + (data.won ? 0 : 1),
				wlfield = data.won ? 'won' : 'loss';
			await sql.query({
				text: `update arena set ${wlfield} = ${wlfield} + 1, score = $3 where user_id = $1 and arena_id = $2`,
				values: [
					row.user_id,
					arenaId,
					(wilson(won + 1, won + loss + 1) * 1000 -
						(row.day ** 1.6 * 999) / (row.day ** 1.6 + 999)) |
						0,
				],
			});
			return updateArenaRanks(sql);
		});
	},
	async foearena(data, user) {
		const arenaId = data.lv ? 2 : 1;
		const reslen = await pg.pool.query({
				text: `select count(*) len from arena where arena_id = $1`,
				values: [arenaId],
			}),
			len = +reslen.rows[0].len;
		if (len === 0) return;
		let r = Math.random(),
			p = 0.07,
			p0 = 1 - p,
			idx = 0;
		for (; idx < len && r > p; idx++) {
			r -= p;
			p *= p0;
		}
		if (idx === len) {
			idx = RngMock.upto(len);
		}
		const ares = await pg.pool.query({
			text: `select u.name, a.score, a.deck, a.hp, a.mark, a.draw, a.day, a.won, a.loss, a.code from arena a join users u on u.id = a.user_id where a.arena_id = $1 order by a."rank" limit 1 offset $2`,
			values: [arenaId, idx],
		});
		if (ares.rows.length == 0) {
			console.log('No arena', idx);
			return;
		}
		const adeck = ares.rows[0];
		sockEmit(this, 'foearena', {
			seed: randint(),
			name: adeck.name,
			hp: adeck.hp,
			rank: idx,
			mark: adeck.mark,
			draw: adeck.draw,
			deck: `${adeck.deck}05${etgutil.encodeCode(
				data.lv ? etgutil.asUpped(adeck.code, true) : adeck.code,
			)}`,
			lv: data.lv,
		});
	},
	stat(data, user, userId) {
		return pg.pool.query({
			text: `insert into stats (user_id, "set", stats, players) values ($1, $2, $3, $4)`,
			values: [userId, data.set ?? '', data.stats, data.players],
		});
	},
	setgold: roleck('Codesmith', async function (data, user) {
		const tgt = await Us.load(data.t);
		sockEmit(this, 'chat', {
			mode: 1,
			msg: `Set ${tgt.name} from ${tgt.gold}$ to ${data.g}$`,
		});
		tgt.gold = data.g;
	}),
	addbound: roleck('Codesmith', async function (data, user) {
		const tgt = await Us.load(data.t);
		tgt.accountbound = etgutil.mergedecks(tgt.accountbound, data.pool);
		sockEmit(this, 'chat', {
			mode: 1,
			msg: `Added to ${tgt.name}'s accountbound ${data.pool}`,
		});
	}),
	addpool: roleck('Codesmith', async function (data, user) {
		const tgt = await Us.load(data.t);
		tgt.pool = etgutil.mergedecks(tgt.pool, data.pool);
		sockEmit(this, 'chat', {
			mode: 1,
			msg: `Added to ${tgt.name}'s pool ${data.pool}`,
		});
	}),
	codecreate: roleck('Codesmith', async function (data, user) {
		if (!data.t) {
			return sockEmit(this, 'chat', {
				mode: 1,
				msg: `Invalid type ${data.t}`,
			});
		}
		let code = '';
		for (let i = 0; i < 8; i++) {
			code += String.fromCharCode(33 + ((Math.random() * 93) | 0));
		}
		try {
			await pg.pool.query({
				text: `insert into codes values ($1, $2)`,
				values: [code, data.t],
			});
		} catch {
			return sockEmit(this, 'chat', {
				mode: 1,
				msg: `Failed to create code`,
			});
		}
		sockEmit(this, 'chat', { mode: 1, msg: `${data.t} ${code}` });
	}),
	codesubmit(data, user) {
		return pg.trx(async sql => {
			await sql.query({ text: 'lock codes in row exclusive mode' });
			const obj = await sql.query({
				text: `select val from codes where code = $1`,
				values: [data.code],
			});
			if (obj.rowCount === 0) {
				sockEmit(this, 'chat', {
					mode: 1,
					msg: 'Code does not exist',
				});
				return;
			}
			const type = obj.rows[0].val;
			if (type.charAt(0) === 'G') {
				const g = +type.slice(1);
				if (isNaN(g)) {
					sockEmit(this, 'chat', {
						mode: 1,
						msg: `Invalid gold code type: ${type}`,
					});
				} else {
					user.gold += g;
					sockEmit(this, 'codegold', { g });
					return sql.query({
						text: `delete from codes where code = $1`,
						values: [data.code],
					});
				}
			} else if (type.charAt(0) === 'C') {
				const c = parseInt(type.slice(1), 32);
				if (c in Cards.Codes) {
					user.pool = etgutil.addcard(user.pool, c);
					sockEmit(this, 'codecode', { card: c });
					return sql.query({
						text: `delete from codes where code = $1`,
						values: [data.code],
					});
				} else {
					sockEmit(this, 'chat', {
						mode: 1,
						msg: `Unknown card: ${type}`,
					});
				}
			} else if (type.replace(/^!?(upped)?/, '') in userutil.rewardwords) {
				sockEmit(this, 'codecard', { type });
			} else {
				sockEmit(this, 'chat', {
					mode: 1,
					msg: `Unknown code type: ${type}`,
				});
			}
		});
	},
	codesubmit2(data, user) {
		return pg.trx(async sql => {
			await sql.query({ text: 'lock codes in row exclusive mode' });
			const obj = await sql.query({
					text: `select val from codes where code = $1`,
					values: [data.code],
				}),
				type = obj.rows[0].val;
			if (!type) {
				sockEmit(this, 'chat', { mode: 1, msg: 'Code does not exist' });
			} else if (type.replace(/^!/, '') in userutil.rewardwords) {
				const card = Cards.Codes[data.card];
				if (
					card &&
					card.rarity === userutil.rewardwords[type.replace(/^!/, '')] &&
					card.shiny ^ (type.charAt(0) !== '!')
				) {
					user.pool = etgutil.addcard(user.pool, data.card);
					sockEmit(this, 'codedone', { card: data.card });
					return sql.query({
						text: `delete from codes where code = $1`,
						values: [data.code],
					});
				}
			} else {
				sockEmit(this, 'chat', {
					mode: 1,
					msg: 'Unknown code type: ' + type,
				});
			}
		});
	},
	async foewant(data, user, userId) {
		if (data.set && typeof data.set !== 'string') return;
		const { u, f } = data;
		if (u === f) return;
		const deck =
			data.set === 'Original' ? data.deck : user.decks[user.selectedDeck];
		if (typeof deck !== 'string') return;
		const foesock = Us.socks.get(f);
		if (foesock?.readyState === 1) {
			const foeUser = await Us.load(f);
			return pg.trx(async sql => {
				const pendingRequests = await sql.query({
					text: `select mr1.game_id
from match_request mr1
join match_request mr2 on mr1.game_id = mr2.game_id
where mr1.user_id = $1 and mr2.user_id = $2 and not mr1.accepted and mr2.accepted`,
					values: [userId, foeUser.id],
				});
				if (pendingRequests.rows.length === 0) {
					const game = {
						set: data.set,
						players: [
							{ idx: 1, user: u, name: u, deck },
							{ idx: 2, user: f, name: f, deck: null },
						],
					};
					const newGame = await sql.query({
							text:
								"insert into games (data, moves, expire_at) values ($1,'{}', now() + interval '1 hour') returning id",
							values: [JSON.stringify(game)],
						}),
						gameId = newGame.rows[0].id;
					await sql.query({
						text:
							'insert into match_request (game_id, user_id, accepted) values ($1,$2,true),($1,$3,false)',
						values: [gameId, userId, foeUser.id],
					});
					sockEmit(foesock, 'challenge', {
						f: u,
						set: data.set,
						deckcheck: data.deckcheck,
					});
				} else {
					const gameId = pendingRequests.rows[0].game_id;
					await sql.query({
						text:
							'update match_request set accepted = true where game_id = $1 and user_id = $2',
						values: [gameId, userId],
					});
					const gameRow = await sql.query({
						text: 'select data from games where id = $1',
						values: [gameId],
					});
					const gameData = gameRow.rows[0].data;
					gameData.seed = randint();
					gameData.players[1].deck = deck;
					if (gameData.seed & 1) gameData.players.reverse();
					await sql.query({
						text:
							"update games set data = $2, expire_at = now() + interval '1 hour' where id = $1",
						values: [gameId, JSON.stringify(gameData)],
					});
					sockEmit(this, 'pvpgive', { id: gameId, data: gameData });
					sockEmit(foesock, 'pvpgive', { id: gameId, data: gameData });
				}
			});
		}
	},
	async canceltrade(data, user, userId) {
		const foe = await Us.load(data.f),
			foesock = Us.socks.get(data.f);
		if (foesock?.readyState === 1) {
			sockEmit(foesock, 'tradecanceled', { u: user.name });
			sockEmit(foesock, 'chat', {
				u: user.name,
				mode: 1,
				msg: 'has canceled the trade.',
			});
		}
		return pg.pool.query({
			text:
				'delete from trade_request where (user_id = $1 and for_user_id = $2) or (user_id = $2 and for_user_id = $1)',
			values: [userId, foe.id],
		});
	},
	async reloadtrade(data, user, userId) {
		const foe = await Us.load(data.f);
		const tradeResult = await pg.pool.query({
			text:
				'select cards, g from trade_request where user_id = $2 and for_user_id = $1',
			values: [userId, foe.id],
		});
		console.log(userId, foe.id, tradeResult);
		if (tradeResult.rows.length !== 0) {
			const [row] = tradeResult.rows;
			console.log(row);
			sockEmit(this, 'offertrade', {
				f: data.f,
				c: row.cards,
				g: row.g,
			});
		}
	},
	async offertrade(data, user, userId) {
		const { u, f } = data;
		if (u === f) {
			return;
		}
		const foesock = Us.socks.get(f);
		if (foesock?.readyState === 1) {
			const foe = await Us.load(f);
			await pg.trx(async sql => {
				if (
					typeof data.forcards === 'string' &&
					typeof data.forg === 'number'
				) {
					const acceptResult = await pg.pool.query({
						text: `select 1 from trade_request where user_id = $2 and for_user_id = $1 and cards = $5 and g = $6 and forcards = $3 and forg = $4`,
						values: [
							userId,
							foe.id,
							data.cards,
							data.g,
							data.forcards,
							data.forg,
						],
					});
					if (acceptResult.rows.length !== 0) {
						const p1gdelta = (data.forg - data.g) | 0,
							p2gdelta = (data.g - data.forg) | 0;
						if (user.gold < -p1gdelta || foe.gold < -p2gdelta) return;
						const userpool = etgutil.deck2pool(user.pool),
							foepool = etgutil.deck2pool(foe.pool);
						for (const [code, count] of etgutil.iterraw(user.pool)) {
							if ((userpool[code] -= count) < 0) return;
						}
						for (const [code, count] of etgutil.iterraw(foe.pool)) {
							if ((foepool[code] -= count) < 0) return;
						}
						sockEmit(this, 'tradedone', {
							oldcards: data.cards,
							newcards: data.forcards,
							g: p1gdelta,
						});
						sockEmit(foesock, 'tradedone', {
							oldcards: data.forcards,
							newcards: data.cards,
							g: p2gdelta,
						});
						user.pool = etgutil.mergedecks(
							etgutil.removedecks(user.pool, data.cards),
							data.forcards,
						);
						user.gold += p1gdelta;
						foe.pool = etgutil.mergedecks(
							etgutil.removedecks(foe.pool, data.forcards),
							data.cards,
						);
						foe.gold += p2gdelta;
						return pg.pool.query({
							text:
								'delete from trade_request where (user_id = $1 and for_user_id = $2) or (user_id = $2 and for_user_id = $1)',
							values: [userId, foe.id],
						});
					}
				}
				await pg.pool.query({
					text: `insert into trade_request (user_id, for_user_id, cards, g, forcards, forg, expire_at)
values ($1, $2, $3, $4, $5, $6, now() + interval '1 hour')
on conflict (user_id, for_user_id) do update set user_id = $1, for_user_id = $2, cards = $3, g = $4, forcards = $5, forg = $6, expire_at = now() + interval '1 hour'`,
					values: [
						userId,
						foe.id,
						data.cards,
						data.g,
						data.forcards,
						data.forg,
					],
				});
				sockEmit(foesock, 'offertrade', { f: u, c: data.cards, g: data.g });
			});
		}
	},
	passchange(data, user) {
		user.salt = '';
		if (!data.p) {
			user.auth = '';
			sockEmit(this, 'passchange', { auth: '' });
		} else {
			initsalt(user);
			crypto.pbkdf2(data.p, user.salt, user.iter, 64, user.algo, (err, key) => {
				if (!err) {
					user.auth = key.toString('base64');
					sockEmit(this, 'passchange', { auth: user.auth });
				}
			});
		}
	},
	challrecv(data) {
		const foesock = Us.socks.get(data.f);
		if (foesock?.readyState === 1) {
			sockEmit(foesock, 'chat', {
				u: data.u,
				mode: 1,
				msg: `You have sent a ${data.trade ? 'trade' : 'PvP'} request to ${
					data.u
				}!`,
			});
		}
	},
	chat(data) {
		const { to } = data;
		if (to) {
			const sockto = Us.socks.get(to);
			if (sockto?.readyState === 1) {
				sockEmit(sockto, 'chat', {
					msg: data.msg,
					mode: 2,
					u: data.u,
				});
				sockEmit(this, 'chat', {
					msg: data.msg,
					mode: 2,
					u: 'To ' + to,
				});
			} else
				sockEmit(this, 'chat', {
					mode: 1,
					msg: `${to} isn't here right now.\nFailed to deliver: ${data.msg}`,
				});
		} else {
			data.x = 'chat';
			broadcast(data);
		}
	},
	async bzcancel(data, user, userId) {
		const code = data.c | 0;
		const bids = await pg.pool.query({
			text:
				'delete from bazaar where user_id = $1 and code = $2 returning q, p',
			values: [userId, code],
		});
		const rm = {};
		for (const bid of bids.rows) {
			const { q, p } = bid;
			if (p > 0) {
				user.gold += p * q;
			} else {
				user.pool = etgutil.addcard(user.pool, code, q);
			}
			if (!rm[code]) rm[code] = [];
			rm[code].push({ u: user.name, q: bid.q, p: bid.p });
		}
		sockEmit(this, 'bzbid', {
			rm,
			g: user.gold,
			pool: user.pool,
		});
	},
	async bzbid(data, user, userId) {
		data.price |= 0;
		if (!data.price) return;
		const add = {},
			rm = {};
		await pg.trx(async sql => {
			await sql.query({ text: 'lock bazaar in row exclusive mode' });
			for (let [code, count] of etgutil.iterraw(data.cards)) {
				const card = Cards.Codes[code];
				if (!card) continue;
				const sellval = userutil.sellValue(card);
				let codeCount = data.price > 0 ? 0 : etgutil.count(user.pool, code);
				if (data.price > 0) {
					if (data.price <= sellval) {
						continue;
					}
				} else {
					if (-data.price <= sellval) {
						if (codeCount >= count) {
							user.gold += sellval * count;
							user.pool = etgutil.addcard(user.pool, code, -count);
						}
						continue;
					}
				}
				const bids = await sql.query({
					text:
						'select b.id, u.name u, b.p, b.q from bazaar b join users u on b.user_id = u.id where b.code = $1 order by sign(b.p), abs(b.p)',
					values: [code],
				});
				const ops = [];
				for (const bid of bids.rows) {
					const amt = Math.min(bid.q, count);
					let happened = 0;
					if (data.price > 0) {
						if (bid.p < 0 && -bid.p <= data.price) {
							happened = amt;
						}
					} else {
						if (bid.p > 0 && bid.p <= -data.price) {
							happened = -amt;
						}
					}
					const cost = Math.abs(bid.p) * happened;
					if (
						happened &&
						(data.price > 0 ? user.gold >= cost : codeCount >= happened)
					) {
						user.gold -= cost;
						user.pool = etgutil.addcard(user.pool, code, happened);
						codeCount += happened;
						const SellFunc = seller => {
							if (data.price > 0) {
								seller.gold += cost;
							} else {
								seller.pool = etgutil.addcard(seller.pool, code, amt);
							}
							const sellerSock = Us.socks.get(seller.name);
							if (sellerSock) {
								sockEmit(
									sellerSock,
									'bzgive',
									data.price > 0
										? {
												msg: `${user.name} bought ${amt} of ${
													card.name
												} @ ${-bid.p} from you.`,
												g: cost,
										  }
										: {
												msg: `${user.name} sold you ${amt} of ${card.name} @ ${bid.p}`,
												c: etgutil.encodeCount(amt) + etgutil.encodeCode(code),
										  },
								);
							}
						};
						if (bid.u === user.name) {
							SellFunc(user);
						} else {
							Us.load(bid.u)
								.then(SellFunc)
								.catch(e => console.log('Bazaar bug', e));
						}
						if (bid.q > count) {
							ops.push({ op: 'UPDATE', bid, q: bid.q - count });
							count = 0;
						} else {
							ops.push({ op: 'DELETE', bid });
							count -= bid.q;
						}
						if (!count) break;
					}
				}
				if (count > 0) {
					let bidmade = false;
					if (data.price > 0) {
						if (user.gold >= data.price * count) {
							user.gold -= data.price * count;
							bidmade = true;
						}
					} else {
						if (codeCount >= count) {
							user.pool = etgutil.addcard(user.pool, code, -count);
							codeCount -= count;
							bidmade = true;
						}
					}
					if (bidmade) {
						let hadmerge = false;
						for (const bid of bids.rows) {
							if (bid.u === user.name && bid.p === data.price) {
								ops.push({ op: 'UPDATE', bid, q: bid.q + count });
								hadmerge = true;
								break;
							}
						}
						if (!hadmerge) {
							ops.push({
								op: 'INSERT',
								q: count,
								p: data.price,
							});
						}
					}
				}
				const queries = [];
				for (const op of ops) {
					if (op.op === 'DELETE') {
						queries.push(
							sql.query({
								text: 'delete from bazaar where id = $1',
								values: [op.bid.id],
							}),
						);
						if (!rm[code]) rm[code] = [];
						rm[code].push({ u: op.bid.u, q: op.bid.q, p: op.bid.p });
					} else if (op.op === 'INSERT') {
						queries.push(
							sql.query({
								text:
									'insert into bazaar (user_id, code, q, p) values ($1, $2, $3, $4)',
								values: [userId, code, op.q, op.p],
							}),
						);
						if (!add[code]) add[code] = [];
						add[code].push({ u: user.name, q: op.q, p: op.p });
					} else if (op.op === 'UPDATE') {
						queries.push(
							sql.query({
								text: 'update bazaar set q = $2 where id = $1',
								values: [op.bid.id, op.q],
							}),
						);
						if (!rm[code]) rm[code] = [];
						if (!add[code]) add[code] = [];
						rm[code].push({ u: op.bid.u, q: op.bid.q, p: op.bid.p });
						add[code].push({ u: op.bid.u, q: op.q, p: op.bid.p });
					}
				}
				await Promise.all(queries);
			}
		});
		sockEmit(this, 'bzbid', {
			rm,
			add,
			g: user.gold,
			pool: user.pool,
		});
	},
	booster(data, user) {
		const pack = [
			{ amount: 10, cost: 15, rare: [] },
			{ amount: 6, cost: 25, rare: [3] },
			{ amount: 5, cost: 77, rare: [1, 3] },
			{ amount: 9, cost: 100, rare: [4, 7, 8] },
			{ amount: 1, cost: 250, rare: [0, 0, 0, 0] },
		][data.pack];
		if (!pack) return;
		const bumprate = 0.45 / pack.amount;
		const bound = user.freepacks && user.freepacks[data.pack] > 0;
		if (!bound && data.bulk) {
			pack.amount *= data.bulk;
			pack.cost *= data.bulk;
			for (let i = 0; i < pack.rare.length; i++) pack.rare[i] *= data.bulk;
		}
		if (bound || user.gold >= pack.cost) {
			let newCards = '',
				rarity = 1;
			for (let i = 0; i < pack.amount; i++) {
				while (i === pack.rare[rarity - 1]) rarity++;
				let cardcode;
				if (rarity === 5) {
					cardcode =
						etg.NymphList[
							data.element > 0 && data.element < 13
								? data.element
								: RngMock.upto(12) + 1
						];
				} else {
					const notFromElement = Math.random() > 0.5,
						bumprarity = rarity + (Math.random() < bumprate);
					let card = undefined;
					if (data.element < 13)
						card = RngMock.randomcard(
							false,
							x =>
								(x.element === data.element) ^ notFromElement &&
								x.rarity === bumprarity,
						);
					cardcode = (
						card ?? RngMock.randomcard(false, x => x.rarity === bumprarity)
					).code;
				}
				newCards = etgutil.addcard(newCards, cardcode);
			}
			if (bound) {
				user.freepacks[data.pack]--;
				user.accountbound = etgutil.mergedecks(user.accountbound, newCards);
				if (user.freepacks.every(x => x === 0)) {
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
	move(data, user, userId) {
		return pg.trx(async sql => {
			const usersResult = await sql.query({
				text:
					'select u.id, u.name from match_request mr join users u on mr.user_id = u.id where mr.game_id = $1',
				values: [data.id],
			});
			if (!usersResult.rows.some(row => row.id === userId)) {
				sockEmit(this, { mode: 1, msg: "You aren't in that match" });
				return;
			}
			await sql.query({
				text:
					"update games set moves = array_append(moves, $2), expire_at = now() + interval '1 hour' where id = $1",
				values: [data.id, JSON.stringify(data.data)],
			});
			const msg = JSON.stringify({ x: 'move', data: data.data });
			for (const row of usersResult.rows) {
				console.log(row);
				if (row.id !== userId) {
					const sock = Us.socks.get(row.name);
					if (sock?.readyState === 1) {
						sock.send(msg);
					}
				}
			}
		});
	},
	async reloadmoves(data, user, userId) {
		const movesResult = await pg.pool.query({
			text:
				'select g.moves from games g join match_request mr on mr.game_id = g.id join users u on u.id = mr.user_id where g.id = $1 and u.id = $2',
			values: [data.id, userId],
		});
		if (movesResult.rows.length !== 0) {
			sockEmit(this, 'reloadmoves', movesResult.rows[0]);
		}
	},
	updateorig(data, user, userId) {
		return pg.trx(async sql => {
			const result = await sql.query({
				text:
					'select data from user_data where user_id = $1 and type_id = 2 for update',
				values: [userId],
			});
			if (result.rows.length) {
				return await sql.query({
					text:
						'update user_data set data = $2 where user_id = $1 and type_id = 2',
					values: [
						userId,
						{
							...result.rows[0].data,
							...data,
							x: undefined,
							u: undefined,
						},
					],
				});
			}
		});
	},
	origadd(data, user, userId) {
		return pg.trx(async sql => {
			const result = await sql.query({
				text:
					'select data from user_data where user_id = $1 and type_id = 2 for update',
				values: [userId],
			});
			if (result.rows.length) {
				const row = result.rows[0].data;
				let pool = row.pool;
				if (data.pool) pool = etgutil.mergedecks(pool, data.pool);
				if (data.rmpool) pool = etgutil.removedecks(pool, data.rmpool);
				return await sql.query({
					text:
						'update user_data set data = $2 where user_id = $1 and type_id = 2',
					values: [
						userId,
						{
							...row,
							electrum: row.electrum + (data.electrum | 0),
							pool,
						},
					],
				});
			}
		});
	},
};
const sockEvents = {
	login: login,
	async konglogin(data) {
		const keyresult = await pg.pool.query({
			text: `select val from strings where key = 'kongapi'`,
		});
		if (keyresult.rows.length === 0) {
			sockEmit(this, 'login', {
				err: 'Global error: no kong api in db',
			});
			return;
		}
		const key = keyresult.rows[0].val;
		https
			.get(
				`https://api.kongregate.com/api/authenticate.json?user_id=${data.u}&game_auth_token=${data.g}&api_key=${key}`,
				res => {
					const chunks = [];
					res.on('data', chunk => chunks.push(chunk));
					res.on('end', () => {
						const json = parseJSON(Buffer.concat(chunks).toString());
						if (!json) {
							sockEmit(this, 'login', {
								err: 'Kong returned invalid JSON',
							});
							return;
						}
						if (json.success) {
							const name = 'Kong:' + json.username;
							Us.load(name)
								.then(user => {
									user.auth = data.g;
								})
								.catch(() => {
									Us.users.set(name, {
										name,
										gold: 0,
										auth: data.g,
									});
								});
							return login.call(this, {
								u: name,
								a: data.g,
							});
						} else {
							sockEmit(this, 'login', {
								err: `${json.error}: ${json.error_description}`,
							});
						}
					});
				},
			)
			.on('error', e => console.log(e));
	},
	async guestchat(data) {
		const isBanned = await pg.pool.query({
			text: `select 1 from strings where key = 'GuestsBanned'`,
		});
		if (isBanned.rows.length === 0) {
			data.x = 'chat';
			data.guest = true;
			data.u = `Guest_${data.u}`;
			broadcast(data);
		}
	},
	roll(data) {
		const A = Math.min(data.A || 1, 99),
			X = data.X || 0x100000000;
		let sum = 0;
		for (let i = 0; i < A; i++) {
			sum += RngMock.upto(X) + 1;
		}
		data.sum = sum;
		broadcast(data);
	},
	async motd(data) {
		const ms = await pg.pool.query(`select id, val from motd order by id`);
		for (const row of ms.rows) {
			sockEmit(this, 'chat', {
				mode: 1,
				msg: `motd ${row.id} ${row.val}`,
			});
		}
	},
	mod: listRoleHandler('Mod'),
	codesmith: listRoleHandler('Codesmith'),
	async librarywant(data) {
		try {
			const user = await Us.load(data.f);
			const bids = await pg.pool.query({
				text: 'select code, q, p from bazaar where user_id = $1',
				values: [user.id],
			});
			let { gold, pool } = user;
			for (const bid of bids.rows) {
				if (bid.p < 0) {
					pool = etgutil.addcard(pool, bid.code, bid.q);
				} else {
					gold += bid.p * bid.q;
				}
			}
			sockEmit(this, 'librarygive', {
				pool: pool,
				bound: user.accountbound,
				gold: gold,
				pvpwins: user.pvpwins,
				pvplosses: user.pvplosses,
				aiwins: user.aiwins,
				ailosses: user.ailosses,
			});
		} catch {
			sockEmit(this, 'chat', { mode: 1, msg: `No user ${data.f}` });
		}
	},
	async arenatop(data) {
		const { rows } = await pg.pool.query({
			text: `select u.name, a.score, a.won, a.loss, ($1 - a.day) "day", a.code from arena a join users u on u.id = a.user_id where a.arena_id = $2 order by a."rank" limit 30`,
			values: [getDay(), data.lv ? 2 : 1],
			rowMode: 'array',
		});
		sockEmit(this, 'arenatop', {
			top: rows,
			lv: data.lv,
		});
	},
	async wealthtop(data) {
		const { rows } = await pg.pool.query({
			text: `select name, wealth from users order by wealth desc limit 60`,
			rowMode: 'array',
		});
		sockEmit(this, 'wealthtop', { top: rows.flat() });
	},
	chatus(data) {
		const thismeta = sockmeta.get(this);
		if (data.hide !== undefined) thismeta.offline = data.hide;
		if (data.afk !== undefined) thismeta.afk = data.afk;
	},
	who(data) {
		const activeusers = [];
		for (const [name, sock] of Us.socks) {
			if (sock.readyState === 1) {
				const meta = sockmeta.get(sock);
				if (meta) {
					if (meta.offline) continue;
					if (meta.afk) name += ' (afk)';
					activeusers.push(meta.afk ? `${name} (afk)` : name);
				}
			}
		}
		sockEmit(this, 'chat', { mode: 1, msg: activeusers.join(', ') });
	},
	async bzread(data) {
		const bids = await pg.pool.query({
			text:
				'select u.name, b.code, b.q, b.p from bazaar b join users u on b.user_id = u.id',
		});
		const bz = {};
		for (const bid of bids.rows) {
			if (!bz[bid.code]) bz[bid.code] = [];
			bz[bid.code].push({ u: bid.name, q: bid.q, p: bid.p });
		}
		for (const code in bz) {
			bz[code].sort(
				(a, b) => (a.p > 0) - (b.p > 0) || Math.abs(a.p) - Math.abs(b.p),
			);
		}
		sockEmit(this, 'bzread', { bz });
	},
};
async function onSocketMessage(rawdata) {
	const data = parseJSON(rawdata);
	if (!data || typeof data !== 'object' || typeof data.x !== 'string') return;
	console.log(data.u, data.x);
	try {
		let func = userEvents[data.x] || usercmd[data.x];
		if (func) {
			const { u } = data;
			if (typeof u === 'string') {
				const result = await pg.pool.query({
					text: 'select id, auth from users where name = $1',
					values: [u],
				});
				if (result.rows.length) {
					const [row] = result.rows;
					if (data.a === row.auth) {
						const user = await Us.load(u);
						Us.socks.set(u, this);
						delete data.a;
						const res = await Promise.resolve(
							func.call(this, data, user, row.id),
						);
						if (res && func === usercmd[data.x]) {
							Object.assign(user, res);
						}
					}
				}
			}
		} else if ((func = sockEvents[data.x])) {
			await Promise.resolve(func.call(this, data));
		}
	} catch (err) {
		console.log(err);
	}
}
function onSocketConnection(socket) {
	sockmeta.set(socket, {});
	socket.on('message', onSocketMessage);
}
const app = (config.certs
	? https.createServer(
			{
				key: keypem,
				cert: certpem,
			},
			forkcore,
	  )
	: http.createServer(forkcore)
)
	.listen(config.listen)
	.on('clientError', () => {});
const wss = new ws.Server({
	server: app,
	clientTracking: true,
	perMessageDeflate: true,
})
	.on('error', e => console.log(e))
	.on('connection', onSocketConnection);
process.once('SIGINT', () => {
	console.log('Shutting down');
	app.close();
	wss.close();
	Us.stop()
		.then(() => pg.pool.end())
		.catch(err => console.error(err));
});
