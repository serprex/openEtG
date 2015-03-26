#!/usr/bin/node
process.chdir(__dirname);
"use strict";
var users = {}, usersock = {}, rooms = {};
var sutil = require("./srv/sutil");
sutil.loadcards();
var qstring = require("querystring");
var crypto = require("crypto");
var fs = require("fs");
var db = require("redis").createClient();
var app = require("connect")().
	use(require("compression")()).
	use(require("serve-static")(__dirname, { maxAge: 2626262 })).
	use("/Cards", require("./srv/cardredirect")()).
	use("/speed", require("./srv/speed")()).
	use("/deck", require("./srv/deckredirect")()).
	use("/code", require("./srv/codesmith")(db));
var wss = new (require("ws/lib/WebSocketServer"))({server:app.listen(13602)});
var etgutil = require("./etgutil");
var userutil = require("./userutil");
var etg = require("./etg");
var aiDecks = require("./Decks");
var Cards = require("./Cards");
function storeUsers(){
	for(var u in users){
		var user = users[u];
		if (user.pool || user.accountbound){
			db.hmset("U:"+u, user);
		}
	}
}
setInterval(function(){
	storeUsers();
	// Clear inactive users
	for(var u in users){
		if (!(u in usersock)){
			delete users[u];
		}else if (usersock[u].readyState == 3){
			delete usersock[u];
			delete users[u];
		}
	}
}, 300000);
process.on("SIGTERM", process.exit).on("SIGINT", process.exit);
process.on("exit", function(){
	storeUsers();
	db.quit();
});
function activeUsers() {
	var activeusers = [], userCount = 0;
	for (var username in usersock) {
		var sock = usersock[username];
		if (sock && sock.readyState == 1){
			userCount++;
			if (sock.meta.offline) continue;
			if (sock.meta.afk) username += " (afk)";
			else if (sock.meta.wantpvp) username += "\xb6";
			activeusers.push(username);
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
	if (!data) data = {};
	data.x = event;
	socket.send(JSON.stringify(data));
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
var echoEvents = { endturn: true, cast: true, foeleft: true, mulligan: true, cardchosen: true };
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
		var socket = this;
		var task = sutil.mkTask(function(){
			sockEvents.login.call(socket, {u:user.name, a:user.auth});
		});
		db.rpush("N:"+data.u,1,2,3,4,5,6,7,8,9,10, task("N"));
		db.hmset("D:"+data.u, "1", starters[sid+1], "2", starters[sid+2], "3", starters[sid+3], task("D"));
		task();
	},
	logout:function(data, user) {
		var u=data.u;
		db.hmset("U:"+u, user);
		delete users[u];
		delete usersock[u];
	},
	delete:function(data, user) {
		var u = data.u;
		db.del("U:" + u);
		db.del("Q:" + u);
		db.del("D:" + u);
		db.del("N:" + u);
		delete users[u];
		delete usersock[u];
	},
	changequickdeck:function(data,user){
		db.lset("N:"+user.name, data.number, data.name, function(err, res){
			if (err){
				db.rpush("N:"+data.u,1,2,3,4,5,6,7,8,9,10);
			}
		});
	},
	setdeck:function(data, user) {
		if (data.d !== undefined) {
			db.hset("D:"+user.name, data.name, data.d);
		}
		user.selectedDeck = data.name;
	},
	rmdeck:function(data, user){
		db.hdel("D:"+user.name, data.name);
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
		if (data.aname in users){
			users[data.aname].gold += data.won?3:1;
		}else{
			db.exists("U:"+data.aname, function(err, exists){
				if (exists){
					db.hincrby("U:"+data.aname, "gold", data.won?3:1);
				}
			});
		}
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
					if (data.lv) adeck.card = etgutil.asUpped(adeck.card, true);
					adeck.hp = parseInt(adeck.hp || 200);
					adeck.mark = parseInt(adeck.mark || 1);
					adeck.draw = parseInt(adeck.draw || data.lv+1);
					var curhp = getAgedHp(adeck.hp, sutil.getDay()-adeck.day);
					sockEmit(socket, "foearena", {
						seed: seed*etgutil.MAX_INT,
						name: aname, hp: curhp,
						mark: adeck.mark, draw: adeck.draw,
						deck: adeck.deck + "05" + adeck.card, lv:data.lv});
				});
			});
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
				var c = type.slice(1);
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
		var u=data.u, f=data.f, socket = this;
		if (u == f){
			return;
		}
		console.log(u + " requesting " + f);
		db.hget("D:"+u, user.selectedDeck, function(err, deck){
			if (!deck) return;
			socket.meta.deck = deck;
			socket.meta.pvpstats = { hp: data.p1hp, markpower: data.p1markpower, deckpower: data.p1deckpower, drawpower: data.p1drawpower };
			var foesock = usersock[f];
			if (foesock && foesock.readyState == 1){
				if (foesock.meta.duel == u) {
					delete foesock.meta.duel;
					var seed = Math.random() * etgutil.MAX_INT;
					socket.meta.foe = foesock;
					foesock.meta.foe = socket;
					var deck0 = foesock.meta.deck, deck1 = socket.meta.deck;
					var owndata = { seed: seed, deck: deck0, urdeck: deck1, foename:f };
					var foedata = { flip: true, seed: seed, deck: deck1, urdeck: deck0 ,foename:u };
					var stat = socket.meta.pvpstats, foestat = foesock.meta.pvpstats;
					for (var key in stat) {
						owndata["p1" + key] = stat[key];
						foedata["p2" + key] = stat[key];
					}
					for (var key in foestat) {
						owndata["p2" + key] = foestat[key];
						foedata["p1" + key] = foestat[key];
					}
					sockEmit(socket, "pvpgive", owndata);
					sockEmit(foesock, "pvpgive", foedata);
				} else {
					socket.meta.duel = f;
					sockEmit(foesock, "challenge", { f:u, pvp:true });
				}
			}
		});
	},
	canceltrade:function (data) {
		var info = this.meta;
		if (info.trade){
			var foesock = usersock[info.trade.foe];
			if (foesock){
				sockEmit(foesock, "tradecanceled");
				sockEmit(foesock, "chat", { mode: "red", msg: data.u + " has canceled the trade."});
				if (foesock.meta.trade.foe == data.u) delete foesock.meta.trade;
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
		var thatsock = usersock[thistrade.foe];
		var thattrade = thatsock && thatsock.meta.trade;
		var otherUser = users[thistrade.foe];
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
		var foesock = usersock[f];
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
			var hkey = "U:"+user.name;
			db.hdel(hkey, "salt");
			db.hdel(hkey, "iter");
			db.hset(hkey, "auth", user.name);
			delete user.salt;
			delete user.iter;
			user.auth = user.name;
			sockEmit(this, "passchange", {auth: user.name});
		}else{
			var socket = this;
			if(!user.salt){
				user.salt = crypto.pseudoRandomBytes(16).toString("base64");
				user.iter = 100000;
			}
			crypto.pbkdf2(data.p, user.salt, parseInt(user.iter), 64, function(err, key){
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
			if (usersock[to] && usersock[to].readyState == 1) {
				sockEmit(usersock[to], "chat", { msg: data.msg, mode: "blue", u: data.u });
				sockEmit(this, "chat", { msg: data.msg, mode: "blue", u: "To " + to });
			}
			else sockEmit(this, "chat", { mode: "red", msg: to + " is not here right now." });
		}
		else{
			genericChat(this, data);
		}
	},
	updatequest:function (data, user) {
		db.hset("Q:" + data.u, data.quest, data.newstage);
	},
	booster:function(data, user) {
		var freepacklist, bound;
		var pack = [
			{ amount: 10, cost: 15, rare: []},
			{ amount: 6, cost: 25, rare: [3]},
			{ amount: 8, cost: 60, rare: [3, 7]},
			{ amount: 9, cost: 100, rare: [4, 7, 8]},
			{ amount: 1, cost: 250, rare: [0, 0, 0, 0]},
		][data.pack];
		if (!pack) return;
		var bumprate = .45/pack.amount;
		if (user.freepacks){
			freepacklist = user.freepacks.split(",");
			if (freepacklist[data.pack] > 0) bound = true;
		}
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
					if (data.element == 14){
						var newCardList = [
							Cards.TidalHealing,Cards.DreamCatcher,Cards.Unsummon,Cards.BlackCat,Cards.NullMantis,Cards.Goon,Cards.Envenom,Cards.JetStream,
							Cards.Osmosis,Cards.SharkofVoid,Cards.Tornado,Cards.Minotaur,Cards.WritofVengeance,Cards.WritofVindication,Cards.JackOLantern,Cards.ThermalRecoil,
							Cards["52Pickup"],Cards.Alicorn,Cards.ScorpionClaws,Cards.Stormspike,Cards.Epoch,Cards.PsycheMetal,Cards.Byakko];
						card = etg.PlayerRng.randomcard(false, function(x){ return notFromElement ^ ~newCardList.indexOf(x) && x.rarity == bumprarity});
					}
					if (!card) card = etg.PlayerRng.randomcard(false, function(x) { return x.rarity == bumprarity });
					cardcode = card.code
				}
				newCards = etgutil.addcard(newCards, cardcode);
			}
			if (bound) {
				freepacklist[data.pack]--;
				user.accountbound = etgutil.mergedecks(user.accountbound, newCards);
				if (freepacklist.every(function(x){return x == 0})) {
					db.hdel("U:" + user.name, "freepacks");
					delete user.freepacks;
				}
				else{
					user.freepacks = freepacklist.join(",");
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
			var foesock = usersock[info.duel];
			if (foesock){
				sockEmit(foesock, "foeleft");
				sockEmit(foesock, "chat", { mode: "red", msg: data.u + " has canceled the duel."});
				if (foesock.meta.duel == data.u) delete foesock.meta.duel;
			}
			delete info.duel;
		}
	}
};
["sellcard", "upgrade", "uppillar", "polish", "shpillar", "upshpillar", "addgold", "addloss", "addwin", "addcards", "addbound", "donedaily","unpolish","unupgrade","upshall"].forEach(function(event){
	userEvents[event] = userutil[event];
});
var sockEvents = {
	login:require("./srv/loginauth")(db, users, sockEmit, usersock),
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
			var owndata = { seed: seed, deck: deck0, urdeck: deck1};
			var foedata = { flip: true, seed: seed, deck: deck1, urdeck: deck0};
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
		if (data.f in users){
			var u = users[data.f];
			sockEmit(this, "librarygive", {pool:u.pool, bound:u.accountbound, gold:u.gold});
		}else{
			var socket = this;
			db.hmget("U:"+data.f, "pool", "accountbound", "gold", function(err, info){
				if (info) sockEmit(socket, "librarygive", {pool:info[0], bound:info[1], gold:parseInt(info[2])});
			});
		}
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
	cardart:function(){
		var socket = this;
		fs.readdir(__dirname + "/Cards", function(err, files){
			if (files){
				sockEmit(socket, "cardart", {art: files.join("").replace(/\.png/g, "")});
			}
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
		var foesock = usersock[data.f];
		if (foesock && foesock.readyState == 1){
			var info = foesock.meta, foename = data.pvp ? info.duel : info.trade ? info.trade.foe : "";
			sockEmit(foesock, "chat", { mode: "red", msg: "You have sent a " + (data.pvp ? "PvP" : "trade") + " request to " + foename + "!" });
		}
	},
	roomcancel:function(data){
		delete rooms[data.room];
	}
};
wss.on("connection", function(socket) {
	socket.meta = {};
	socket.on("close", function(){
		for(var key in rooms){
			if (rooms[key] == this){
				delete rooms[key];
			}
		}
		var info = this.meta;
		if (info){
			if (info.trade){
				var foesock = usersock[info.trade.foe];
				if (foesock && usersock[to].readyState == 1){
					var foeinfo = foesock.meta;
					if (foeinfo && foeinfo.trade && usersock[foeinfo.trade.foe] == this){
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
		var data = JSON.parse(rawdata);
		if (!data) return;
		console.log(data.u, data.x);
		if (data.x in echoEvents){
			var foe = this.meta.trade ? usersock[this.meta.trade.foe] : this.meta.foe;
			if (foe && foe.readyState == 1){
				foe.send(rawdata);
			}
			return;
		}
		var func = userEvents[data.x];
		if (func){
			var u = data.u, auth = data.a;
			delete data.a;
			if (!(u in users)){
				if (data.x == "logout") return;
				db.hgetall("U:"+u, function(err, obj){
					if (obj){
						sutil.prepuser(obj);
						users[u] = obj;
						if (auth == obj.auth) {
							usersock[u] = socket;
							func.call(socket, data, obj);
						}
					}
				});
			} else if (auth == users[u].auth) {
				usersock[u] = socket;
				func.call(socket, data, users[u]);
			}
		}else if (func = sockEvents[data.x]){
			func.call(socket, data);
		}
	});
});