#!/usr/bin/node
"use strict";
process.chdir(__dirname);
var rooms = {};
var etg = require("./etg");
var Cards = require("./Cards");
Cards.loadcards();
var etgutil = require("./etgutil");
var usercmd = require("./usercmd");
var userutil = require("./userutil");
var sutil = require("./srv/sutil");
var http = require("http");
var db = require("./srv/db");
var Us = require("./srv/Us");
var forkcore = require("child_process").fork("./srv/forkcore");
var app = http.createServer(function(req, res){
	var ifModifiedSince = req.headers["if-modified-since"];
	forkcore.send(req.url.slice(1) + (ifModifiedSince?"\n"+ifModifiedSince:""), res.socket);
});
function stop(){
	wss.close();
	app.close();
	forkcore.kill();
	Us.stop();
}
process.on("SIGTERM", stop).on("SIGINT", stop);
function activeUsers() {
	var activeusers = [], userCount = 0;
	for (var name in Us.socks) {
		var sock = Us.socks[name];
		if (sock && sock.readyState == 1){
			userCount++;
			if (sock.meta.offline) continue;
			if (sock.meta.afk) name += " (afk)";
			else if (sock.meta.wantpvp) name += "\xb6";
			activeusers.push(name);
		}
	}
	var otherCount = wss.clients.length - userCount;
	activeusers.push(otherCount + " other connection" + (otherCount == 1 ? "" : "s"));
	return activeusers;
}
function genericChat(socket, data){
	data.x = "chat";
	broadcast(data);
}
function broadcast(data){
	var msg = JSON.stringify(data);
	wss.clients.forEach(function(sock){
		if (sock.readyState == 1) sock.send(msg);
	});
}
function getAgedHp(hp, age){
	var curhp = age > 1 ? hp - (1<<Math.min(age, 9)-1) : hp;
	return Math.max(curhp, Math.floor(hp/4));
}
function wilson(up, total) {
	// from npm's wilson-score
	var z = 2.326348, z2 = z*z, phat = up/total;
	return (phat + z2/(2*total) - z*Math.sqrt((phat*(1 - phat) + z2/(4*total))/total))/(1 + z2/total);
}
function sockEmit(socket, event, data){
	if (socket.readyState == 1){
		if (!data) data = {};
		data.x = event;
		socket.send(JSON.stringify(data));
	}
}
function modf(func){
	return function(data, user){
		var socket = this;
		db.sismember("Mods", data.u, function(err, ismem){
			if (ismem){
				func.call(socket, data, user);
			}else{
				sockEmit(socket, "chat", { mode: "red", msg: "You are not a mod" });
			}
		});
	}
}
var echoEvents = new Set(["endturn", "cast", "foeleft", "mulligan", "cardchosen"]);
var guestban = false;
var userEvents = {
	modadd:modf(function(data, user){
		db.sadd("Mods", data.m);
	}),
	modrm:modf(function(data, user){
		db.srem("Mods", data.m);
	}),
	modguest:modf(function(data, user){
		guestban = data.m == "off";
	}),
	modmute:modf(function(data, user){
		broadcast({x:"mute", m:data.m});
	}),
	modclear:modf(function(data, user){
		broadcast({x:"clear"});
	}),
	inituser:function(data, user) {
		var starters = require("./srv/starter");
		if (data.e < 1 || data.e > 13) return;
		var sid = (data.e-1)*6;
		user.accountbound = starters[sid];
		user.oracle = 0;
		user.pool = "";
		user.freepacks = starters[sid+4] + "," + starters[sid+5] + ",1";
		user.selectedDeck = "1";
		user.qecks = ["1","2","3","4","5","6","7","8","9","10"];
		user.decks = {1:starters[sid+1],2:starters[sid+2],3:starters[sid+3]};
		user.quests = {};
		user.streak = [];
		sockEvents.login.call(socket, {u:user.name, a:user.auth});
	},
	logout:function(data, user) {
		var u=data.u;
		db.hset("Users", u, JSON.stringify(user));
		delete Us.users[u];
		delete Us.socks[u];
	},
	delete:function(data, user) {
		var u = data.u;
		db.hdel("Users", u);
		delete Us.users[u];
		delete Us.socks[u];
	},
	setarena:function(data, user){
		if (!user.ocard || !data.d){
			return;
		}
		var au=(data.lv?"B:":"A:") + data.u;
		if (data.mod){
			db.hmset(au, {deck: data.d, hp: data.hp, draw: data.draw, mark: data.mark});
		}else{
			db.hmset(au, {day: sutil.getDay(), deck: data.d, card: user.ocard, win:0, loss:0, hp: data.hp, draw: data.draw, mark: data.mark});
			db.zadd("arena"+(data.lv?"1":""), 200, data.u);
		}
	},
	arenainfo:function(data, user){
		var socket = this;
		var task = sutil.mkTask(function(result){
			var day = sutil.getDay();
			function process(obj, rank){
				if (!obj) return;
				obj.day = day - obj.day;
				obj.curhp = getAgedHp(obj.hp, obj.day);
				if (rank !== null) obj.rank = rank;
				["draw", "hp", "loss", "mark", "win", "card"].forEach(function(key){
					obj[key] = parseInt(obj[key], 10);
				});
			}
			process(result.A, result.ra);
			process(result.B, result.rb);
			sockEmit(socket, "arenainfo", {A:result.A, B:result.B});
		});
		db.hgetall("A:" + data.u, task("A"));
		db.hgetall("B:" + data.u, task("B"));
		db.zrevrank("arena", data.u, task("ra"));
		db.zrevrank("arena1", data.u, task("rb"));
		task();
	},
	modarena:function(data, user){
		Us.load(data.aname, function(user){
			user.gold += data.won?3:1;
		});
		var arena = "arena"+(data.lv?"1":""), akey = (data.lv?"B:":"A:")+data.aname;
		db.zscore(arena, data.aname, function(err, score){
			if (score === null) return;
			var task = sutil.mkTask(function(wld){
				if (wld.err) return;
				var won = parseInt(data.won?wld.incr:wld.mget[0]),
					loss = parseInt(data.won?wld.mget[0]:wld.incr),
					day = parseInt(wld.mget[1]);
				if (!data.won && (won == 0 && loss == 5 || loss-won > 15 || sutil.getDay()-day > 14)){
					db.zrem(arena, data.aname);
				}else{
					db.zadd(arena, wilson(won+1, won+loss+1)*1000, data.aname);
				}
			});
			db.hincrby(akey, data.won?"win":"loss", 1, task("incr"));
			db.hmget(akey, data.won?"loss":"win", "day", task("mget"));
			task();
		});
	},
	foearena:function(data, user){
		var socket = this;
		db.zcard("arena"+(data.lv?"1":""), function(err, len){
			if (!len)return;
			var cost = userutil.arenaCost(data.lv);
			if (user.gold < cost)return;
			user.gold -= cost;
			var idx = etg.PlayerRng.upto(len);
			db.zrange("arena"+(data.lv?"1":""), idx, idx, function(err, aname){
				if (!aname || !aname.length){
					console.log("No arena " + idx);
					return;
				}
				aname = aname[0];
				console.log("deck: "+ aname + " " + idx);
				db.hgetall((data.lv?"B:":"A:")+aname, function(err, adeck){
					var seed = Math.random();
					adeck.card = parseInt(adeck.card, 10);
					if (data.lv) adeck.card = etgutil.asUpped(adeck.card, true);
					adeck.hp = parseInt(adeck.hp || 200);
					adeck.mark = parseInt(adeck.mark || 1);
					adeck.draw = parseInt(adeck.draw || data.lv+1);
					var curhp = getAgedHp(adeck.hp, sutil.getDay()-adeck.day);
					sockEmit(socket, "foearena", {
						seed: seed*etgutil.MAX_INT,
						name: aname, hp: curhp,
						mark: adeck.mark, draw: adeck.draw,
						deck: adeck.deck + "05" + adeck.card.toString(32), lv:data.lv});
				});
			});
		});
	},
	codecreate:function(data, user){
		var socket = this;
		if (!data.t){
			return sockEmit(socket, "chat", { mode: "red", msg: "Invalid type" });
		}
		db.sismember("Codesmiths", data.u, function(err, ismem){
			function codeSmithLoop(iter){
				if (iter == 999){
					sockEmit(socket, "chat", { mode: "red", msg: "Failed to generate unique code."});
				}else{
					var code = "";
					for (var i=0; i<8; i++){
						code += String.fromCharCode(33+Math.floor(Math.random()*94));
					}
					db.hexists("CodeHash", code, function(err, exists){
						if (exists){
							codeSmithLoop(iter+1);
						}else{
							db.hset("CodeHash", code, data.t);
							sockEmit(socket, "chat", { mode: "red", msg: data.t + " " + code});
						}
					});
				}
			}
			if (ismem){
				codeSmithLoop(0);
			}else{
				sockEmit(socket, "chat", { mode: "red", msg: "You are not a codesmith" });
			}
		});
	},
	codesubmit:function(data, user){
		var socket = this;
		db.hget("CodeHash", data.code, function(err, type){
			if (!type){
				sockEmit(socket, "chat", { mode: "red", msg: "Code does not exist"});
			}else if (type.charAt(0) == "G"){
				var g = parseInt(type.slice(1));
				if (isNaN(g)){
					sockEmit(socket, "chat", { mode: "red", msg: "Invalid gold code type: " + type});
				}else{
					user.gold += g;
					sockEmit(socket, "codegold", {g: g});
					db.hdel("CodeHash", data.code);
				}
			}else if (type.charAt(0) == "C"){
				var c = parseInt(type.slice(1), 32);
				if (c in Cards.Codes){
					user.pool = etgutil.addcard(user.pool, c);
					sockEmit(socket, "codecode", {card: c});
					db.hdel("CodeHash", data.code);
				}else sockEmit(socket, "chat", { mode: "red", msg: "Unknown card: " + type});
			}else if (type.replace(/^!/, "") in userutil.rewardwords){
				sockEmit(socket, "codecard", {type: type});
			}else{
				sockEmit(socket, "chat", { mode: "red", msg: "Unknown code type: " + type});
			}
		});
	},
	codesubmit2:function(data, user){
		var socket = this;
		db.hget("CodeHash", data.code, function(err, type){
			if (!type){
				sockEmit(socket, "chat", { mode: "red", msg: "Code does not exist"});
			}else if (type.replace(/^!/, "") in userutil.rewardwords){
				var card = Cards.Codes[data.card];
				if (card && card.rarity == userutil.rewardwords[type.replace(/^!/, "")] && card.shiny ^ (type.charAt(0) != "!")){
					user.pool = etgutil.addcard(user.pool, data.card);
					sockEmit(socket, "codedone", {card: data.card});
					db.hdel("CodeHash", data.code);
				}
			}else{
				sockEmit(socket, "chat", { mode: "red", msg: "Unknown code type: " + type});
			}
		});
	},
	foewant:function(data, user){
		var u=data.u, f=data.f;
		if (u == f){
			return;
		}
		console.log(u + " requesting " + f);
		var deck = user.decks[user.selectedDeck];
		if (!deck) return;
		this.meta.deck = deck;
		this.meta.pvpstats = { hp: data.p1hp, markpower: data.p1markpower, deckpower: data.p1deckpower, drawpower: data.p1drawpower };
		var foesock = Us.socks[f];
		if (foesock && foesock.readyState == 1){
			if (foesock.meta.duel == u) {
				delete foesock.meta.duel;
				var seed = Math.random() * etgutil.MAX_INT;
				this.meta.foe = foesock;
				foesock.meta.foe = this;
				var deck0 = foesock.meta.deck, deck1 = this.meta.deck;
				var owndata = { seed: seed, deck: deck0, urdeck: deck1, foename:f };
				var foedata = { flip: true, seed: seed, deck: deck1, urdeck: deck0 ,foename:u };
				var stat = this.meta.pvpstats, foestat = foesock.meta.pvpstats;
				for (var key in stat) {
					owndata["p1" + key] = stat[key];
					foedata["p2" + key] = stat[key];
				}
				for (var key in foestat) {
					owndata["p2" + key] = foestat[key];
					foedata["p1" + key] = foestat[key];
				}
				sockEmit(this, "pvpgive", owndata);
				sockEmit(foesock, "pvpgive", foedata);
				if (foesock.meta.spectators){
					foesock.meta.spectators.forEach(function(uname){
						var sock = Us.socks[uname];
						if (sock && sock.readyState == 1){
							sockEmit(sock, "spectategive", foedata);
						}
					});
				}
			} else {
				this.meta.duel = f;
				sockEmit(foesock, "challenge", { f:u, pvp:true });
			}
		}
	},
	spectate:function(data, user){
		var tgt = Us.socks[data.f];
		if (tgt && tgt.meta.duel){
			sockEmit(tgt, "chat", { mode: "red", msg: data.u + " is spectating." });
			if (!tgt.meta.spectators) tgt.meta.spectators = [];
			tgt.meta.spectators.push(data.u);
		}
	},
	canceltrade:function (data) {
		var info = this.meta;
		if (info.trade){
			var foesock = Us.socks[info.trade.foe];
			if (foesock){
				sockEmit(foesock, "tradecanceled");
				sockEmit(foesock, "chat", { mode: "red", msg: data.u + " has canceled the trade."});
				if ( foesock.meta.trade && foesock.meta.trade.foe == data.u) delete foesock.meta.trade;
			}
			delete info.trade;
		}
	},
	confirmtrade:function (data, user) {
		var u = data.u, thistrade = this.meta.trade;
		if (!thistrade){
			return;
		}
		thistrade.tradecards = data.cards;
		thistrade.oppcards = data.oppcards;
		var thatsock = Us.socks[thistrade.foe];
		var thattrade = thatsock && thatsock.meta.trade;
		var otherUser = Us.users[thistrade.foe];
		if (!thattrade || !otherUser){
			sockEmit(this, "tradecanceled");
			delete this.meta.trade;
			return;
		} else if (thattrade.accepted) {
			var player1Cards = thistrade.tradecards, player2Cards = thattrade.tradecards;
			if (player1Cards != thattrade.oppcards || player2Cards != thistrade.oppcards){
				sockEmit(this, "tradecanceled");
				sockEmit(this, "chat", { mode: "red", msg: "Trade disagreement."});
				sockEmit(thatsock, "tradecanceled");
				sockEmit(thatsock, "chat", { mode: "red", msg: "Trade disagreement."});
				return;
			}
			user.pool = etgutil.removedecks(user.pool, player1Cards);
			user.pool = etgutil.mergedecks(user.pool, player2Cards);
			otherUser.pool = etgutil.removedecks(otherUser.pool, player2Cards);
			otherUser.pool = etgutil.mergedecks(otherUser.pool, player1Cards);
			sockEmit(this, "tradedone", { oldcards: player1Cards, newcards: player2Cards });
			sockEmit(thatsock, "tradedone", { oldcards: player2Cards, newcards: player1Cards });
			delete this.meta.trade;
			delete thatsock.meta.trade;
		} else {
			thistrade.accepted = true;
		}
	},
	tradewant:function (data) {
		var u = data.u, f = data.f;
		if (u == f) {
			return;
		}
		console.log(u + " requesting " + f);
		var foesock = Us.socks[f];
		if (foesock && foesock.readyState == 1) {
			this.meta.trade = {foe: f};
			var foetrade = foesock.meta.trade;
			if (foetrade && foetrade.foe == u) {
				sockEmit(this, "tradegive");
				sockEmit(foesock, "tradegive");
			} else {
				sockEmit(foesock, "challenge", {f:u});
			}
		}
	},
	passchange:function(data, user){
		if (!data.p){
			user.salt = "";
			user.iter = 0;
			user.auth = user.name;
			sockEmit(this, "passchange", {auth: user.name});
		}else{
			var socket = this;
			sutil.initsalt(user);
			require("crypto").pbkdf2(data.p, user.salt, user.iter, 64, function(err, key){
				if (!err){
					user.auth = key.toString("base64");
					sockEmit(socket, "passchange", {auth: user.auth});
				}
			});
		}
	},
	chat:function (data) {
		if (data.to) {
			var to = data.to;
			if (Us.socks[to] && Us.socks[to].readyState == 1) {
				sockEmit(Us.socks[to], "chat", { msg: data.msg, mode: "blue", u: data.u });
				sockEmit(this, "chat", { msg: data.msg, mode: "blue", u: "To " + to });
			}
			else sockEmit(this, "chat", { mode: "red", msg: to + " is not here right now." });
		}
		else{
			genericChat(this, data);
		}
	},
	booster:function(data, user) {
		var pack = [
			{ amount: 10, cost: 15, rare: []},
			{ amount: 6, cost: 25, rare: [3]},
			{ amount: 5, cost: 77, rare: [1, 3]},
			{ amount: 9, cost: 100, rare: [4, 7, 8]},
			{ amount: 1, cost: 250, rare: [0, 0, 0, 0]},
		][data.pack];
		if (!pack) return;
		var bumprate = .45/pack.amount;
		var bound = user.freepacks && user.freepacks[data.pack] > 0;
		if (!bound && data.bulk){
			pack.amount *= data.bulk;
			pack.cost *= data.bulk;
			for(var i=0; i<pack.rare.length; i++) pack.rare[i] *= data.bulk;
		}
		if (bound || user.gold >= pack.cost) {
			var newCards = "", rarity = 1;
			for (var i = 0;i < pack.amount;i++) {
				while (i == pack.rare[rarity-1]) rarity++;
				var cardcode;
				if (rarity == 5){
					cardcode = etg.NymphList[data.element > 0 && data.element < 13 ? data.element : etg.PlayerRng.uptoceil(12)];
				}else{
					var notFromElement = Math.random() > .5, bumprarity = rarity+(Math.random() < bumprate), card = undefined;
					if (data.element < 13) card = etg.PlayerRng.randomcard(false, function(x) { return (x.element == data.element) ^ notFromElement && x.rarity == bumprarity});
					if (!card) card = etg.PlayerRng.randomcard(false, function(x) { return x.rarity == bumprarity });
					cardcode = card.code
				}
				newCards = etgutil.addcard(newCards, cardcode);
			}
			if (bound) {
				user.freepacks[data.pack]--;
				user.accountbound = etgutil.mergedecks(user.accountbound, newCards);
				if (user.freepacks.every(function(x){return x == 0})) {
					delete user.freepacks;
				}
			}
			else {
				user.gold -= pack.cost;
				user.pool = etgutil.mergedecks(user.pool, newCards);
			}
			sockEmit(this, "boostergive", { cards: newCards, accountbound: bound, packtype: data.pack });
		}
	},
	foecancel:function(data){
		var info = this.meta;
		if (info.duel){
			var foesock = Us.socks[info.duel];
			if (foesock){
				sockEmit(foesock, "foeleft");
				sockEmit(foesock, "chat", { mode: "red", msg: data.u + " has canceled the duel."});
				if (foesock.meta.duel == data.u) delete foesock.meta.duel;
			}
			delete info.duel;
			delete info.spectators;
		}
	}
};
var sockEvents = {
	login:require("./srv/login")(sockEmit),
	guestchat:function(data) {
		if (guestban) return;
		data.guest = true;
		data.u = "Guest_" + data.u;
		genericChat(this, data);
	},
	roll:function(data){
		var A = Math.min(data.A || 1, 99), X = data.X || etgutil.MAX_INT;
		var sum = 0;
		for(var i=0; i<A; i++){
			sum += etg.PlayerRng.uptoceil(X);
		}
		data.sum = sum;
		broadcast(data);
	},
	mod:function(data){
		var socket = this;
		db.smembers("Mods", function(err, mods){
			sockEmit(socket, "chat", { mode: "red", msg: mods.join() });
		});
	},
	pvpwant:function(data) {
		var pendinggame=rooms[data.room];
		this.meta.deck = data.deck;
		this.meta.pvpstats = { hp: data.hp, markpower: data.mark, deckpower: data.deck, drawpower: data.draw };
		if (this == pendinggame){
			return;
		}
		if (pendinggame && pendinggame.readyState == 1){
			var seed = Math.random()*etgutil.MAX_INT;
			this.meta.foe = pendinggame;
			pendinggame.meta.foe = this;
			var deck0 = pendinggame.meta.deck, deck1 = data.deck;
			var owndata = { seed: seed, deck: deck0, urdeck: deck1 };
			var foedata = { flip: true, seed: seed, deck: deck1, urdeck: deck0 };
			var stat = this.meta.pvpstats, foestat = pendinggame.meta.pvpstats;
			for (var key in stat) {
				owndata["p1" + key] = stat[key];
				foedata["p2" + key] = stat[key];
			}
			for (var key in foestat) {
				owndata["p2" + key] = foestat[key];
				foedata["p1" + key] = foestat[key];
			}
			sockEmit(this, "pvpgive", owndata);
			sockEmit(pendinggame, "pvpgive", foedata);
			delete rooms[data.room];
		}else{
			rooms[data.room] = this;
		}
	},
	librarywant:function(data){
		var socket = this;
		Us.load(data.f, function(user){
			sockEmit(socket, "librarygive", {pool:user.pool, bound:user.accountbound, gold:user.gold});
		});
	},
	arenatop:function(data){
		var socket = this;
		db.zrevrange("arena"+(data.lv?"1":""), 0, 19, "withscores", function(err, obj){
			if (err) return;
			var t20 = [];
			function getwinloss(i){
				if (i == obj.length){
					sockEmit(socket, "arenatop", {top: t20, lv:data.lv});
				}else{
					db.hmget((data.lv?"B:":"A:") + obj[i], "win", "loss", "day", "card", function(err, wl){
						wl[2] = sutil.getDay()-wl[2];
						wl[3] = parseInt(wl[3], 10);
						t20.push([obj[i], Math.floor(obj[i+1])].concat(wl));
						getwinloss(i+2);
					});
				}
			}
			getwinloss(0);
		});
	},
	wealthtop:function(data){
		var socket = this;
		db.zrevrange("wealth", 0, 49, "withscores", function(err, obj){
			if (!err) sockEmit(socket, "wealthtop", {top: obj});
		});
	},
	chatus:function(data){
		if (data.hide !== undefined) this.meta.offline = data.hide;
		if (data.want !== undefined) this.meta.wantpvp = data.want;
		if (data.afk !== undefined) this.meta.afk = data.afk;
	},
	who:function(data){
		sockEmit(this, "chat", { mode: "red", msg: activeUsers().join(", ") });
	},
	challrecv:function(data){
		var foesock = Us.socks[data.f];
		if (foesock && foesock.readyState == 1){
			var info = foesock.meta, foename = data.pvp ? info.duel : info.trade ? info.trade.foe : "";
			sockEmit(foesock, "chat", { mode: "red", msg: "You have sent a " + (data.pvp ? "PvP" : "trade") + " request to " + foename + "!" });
		}
	},
	roomcancel:function(data){
		delete rooms[data.room];
	}
};
function wssConnection(socket) {
	socket.meta = {};
	socket.on("close", function(){
		for(var key in rooms){
			if (rooms[key] == this){
				delete rooms[key];
			}
		}
		for(var key in Us.socks){
			if (Us.socks[key] == this){
				delete Us.socks[key];
			}
		}
		var info = this.meta;
		if (info){
			if (info.trade){
				var foesock = Us.socks[info.trade.foe];
				if (foesock && foesock.readyState == 1){
					var foeinfo = foesock.meta;
					if (foeinfo && foeinfo.trade && Us.socks[foeinfo.trade.foe] == this){
						sockEmit(foesock, "tradecanceled");
						delete foeinfo.trade;
					}
				}
			}
			if (info.foe){
				var foeinfo = info.foe.meta;
				if (foeinfo && foeinfo.foe == this){
					sockEmit(info.foe, "foeleft");
					delete foeinfo.foe;
				}
			}
		}
	});
	socket.on("message", function(rawdata){
		var data = sutil.parseJSON(rawdata);
		if (!data) return;
		console.log(data.u, data.x);
		if (echoEvents.has(data.x)){
			var foe = this.meta.trade ? Us.socks[this.meta.trade.foe] : this.meta.foe;
			if (foe && foe.readyState == 1){
				foe.send(rawdata);
				for(var i=1; i<=2; i++){
					var spectators = (i==1?this:foe).meta.spectators;
					if (spectators){
						data.spectate = i;
						var rawmsg = JSON.stringify(data);
						spectators.forEach(function(uname){
							var sock = Us.socks[uname];
							if (sock && sock.readyState == 1){
								sock.send(rawmsg);
							}
						});
					}
				}
			}
			return;
		}
		var func = userEvents[data.x] || usercmd[data.x];
		if (func){
			var u = data.u;
			Us.load(u, function(user){
				if (data.a == user.auth){
					Us.socks[u] = socket;
					delete data.a;
					func.call(socket, data, Us.users[u]);
				}
			});
		}else if (func = sockEvents[data.x]){
			func.call(socket, data);
		}
	});
}
var wss = new (require("ws/lib/WebSocketServer"))({server:app.listen(13602)});
wss.on("connection", wssConnection);