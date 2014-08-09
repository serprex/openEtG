"use strict"
var qstring = require("querystring");
var crypto = require("crypto");
var connect = require("connect");
var fs = require("fs");
var app = require("http").createServer(connect().use(require("compression")()).use(cardRedirect).use(require("serve-static")(__dirname)).use(loginAuth).use(codeSmith));
var io = require("socket.io")(app.listen(13602));
var db = require("redis").createClient();
var etgutil = require("./etgutil");
var userutil = require("./userutil");
var etg = require("./etg");
var aiDecks = require("./Decks");
require("./etg.server").loadcards(function(cards, codes, tgt){
	global.Cards = cards;
	global.CardCodes = codes;
	global.Targeting = tgt;
});

function loginRespond(res, servuser, pass){
	if(!servuser.name){
		servuser.name = servuser.auth;
	}
	if(!servuser.salt){
		servuser.salt = crypto.pseudoRandomBytes(16).toString("base64");
		servuser.iter = 100000;
	}
	function postHash(err, key){
		if (err){
			res.writeHead("503");
			res.end();
			return;
		}
		key = key.toString("base64");
		if (!servuser.auth){
			servuser.auth = key;
		}else if (servuser.auth != key){
			console.log("Failed login "+servuser.name);
			res.writeHead("404");
			res.end();
			return;
		}
		useruser(servuser, function(user){
			var day = getDay();
			if (servuser.oracle < day){
				servuser.oracle = day;
				var card = etg.PlayerRng.randomcard(false,
					(function (y) { return function (x) { return x.type != etg.PillarEnum && ((x.rarity != 5) ^ y); } })(Math.random() < .03));
				if (card.rarity >= 2) {
					servuser.accountbound = user.accountbound = etgutil.addcard(user.accountbound, card.code);
				}
				else {
					servuser.pool = user.pool = etgutil.addcard(user.pool, card.code);
				}
				servuser.ocard = user.ocard = user.oracle = card.code;
				servuser.daily = user.daily = 0;
				servuser.dailymage = user.dailymage = Math.floor(Math.random() * aiDecks.mage.length);
				servuser.dailydg = user.dailydg = Math.floor(Math.random() * aiDecks.demigod.length);
			}
			res.writeHead("200");
			res.end(JSON.stringify(user));
		});
	}
	if (pass && pass.length){
		crypto.pbkdf2(pass, servuser.salt, parseInt(servuser.iter), 64, postHash);
	}else postHash(null, servuser.name);
}
function loginAuth(req, res, next){
	if (req.url.substr(0, 6) == "/auth?"){
		var paramstring = req.url.substring(6);
		var params = qstring.parse(paramstring);
		var name = (params.u || "").trim();
		if (!name.length){
			res.writeHead("404");
			res.end();
			return;
		}else if (name in users){
			loginRespond(res, users[name], params.p);
		}else{
			db.hgetall("U:"+name, function (err, obj){
				users[name] = obj || {name: name};
				prepuser(users[name]);
				loginRespond(res, users[name], params.p);
			});
		}
	}else next();
}
function codeSmithLoop(res, iter, params){
	if (iter == 1000){
		res.writeHead("503");
		res.end();
	}else{
		var code = [];
		for (var i=0; i<8; i++){
			code.push(33+Math.floor(Math.random()*94));
		}
		code = String.fromCharCode.apply(String, code);
		db.hexists("CodeHash", code, function(err, exists){
			if (exists){
				codeSmithLoop(res, iter+1, params);
			}else{
				db.hset("CodeHash", code, params.t)
				res.writeHead("200");
				res.end(code);
			}
		});
	}
}
function codeSmith(req, res, next){
	if (req.url.substr(0, 6) == "/code?"){
		var paramstring = req.url.substring(6);
		var params = qstring.parse(paramstring);
		fs.readFile(__dirname + "/codepsw", function(err, data) {
			if (err){
				if (err.code == "ENOENT"){
					data = params.p;
				}else throw err;
			}
			if (params.p == data){
				codeSmithLoop(res, 0, params);
			}else{
				res.writeHead("404");
				res.end();
			}
		});
	}else next();
}
function cardRedirect(req, res, next){
	if (req.url.match(/^\/Cards\/...\.png$/)){
		var intCode = parseInt(req.url.substr(7, 3), 32);
		if (intCode >= 7000){
			fs.exists(__dirname + req.url, function(exists){
				if (!exists){
					res.writeHead("302", {Location: "http://" + req.headers.host + "/Cards/" + (intCode-2000).toString(32) + ".png"});
					res.end();
				}else next();
			});
			return;
		}
	}
	next();
}

var users = {};
var usersock = {};
var rooms = {};
var sockinfo = {};
function storeUsers(){
	for(var u in users){
		var user = users[u];
		if (user.pool || user.accountbound){
			db.hmset("U:"+u, user);
		}
	}
}
function clearInactiveUsers(){
	for(var u in users){
		if (!(u in usersock)){
			delete users[u];
		}else if (!usersock[u].connected){
			dropsock.call(usersock[u]);
			delete usersock[u];
			delete users[u];
		}
	}
}
setInterval(function(){
	storeUsers();
	clearInactiveUsers();
}, 300000);
process.on("SIGTERM", process.exit).on("SIGINT", process.exit);
process.on("exit", function(){
	storeUsers();
	db.quit();
});
function dropsock(){
	var info = sockinfo[this.id];
	if (info){
		if (info.foe){
			info.foe.emit("foeleft");
		}
		if (info.trade){
			var foesock = usersock[info.trade.foe];
			if (foesock){
				foesock.emit("tradecanceled");
				var foesockinfo = sockinfo[foesock.id];
				if (foesockinfo){
					delete foesockinfo.trade;
				}
			}
		}
		delete sockinfo[this.id];
	}
}
function activeUsers() {
	var activeusers = [];
	for (var username in usersock) {
		var sock = usersock[username];
		if (sock && sock.connected){
			activeusers.push(username);
		}
	}
	return activeusers;
}
function prepuser(servuser){
	servuser.gold = parseInt(servuser.gold || 0);
}
function useruser(servuser, cb){
	db.hgetall("Q:" + servuser.name, function (err, obj) {
		cb({
			auth: servuser.auth,
			name: servuser.name,
			decks: servuser.decks,
			selectedDeck: servuser.selectedDeck || 0,
			pool: servuser.pool,
			gold: servuser.gold,
			ocard: servuser.ocard,
			freepacks: servuser.freepacks,
			accountbound: servuser.accountbound,
			aiwins: parseInt(servuser.aiwins || 0),
			ailosses: parseInt(servuser.ailosses || 0),
			pvpwins: parseInt(servuser.pvpwins || 0),
			pvplosses: parseInt(servuser.pvplosses || 0),
			daily: parseInt(servuser.daily || 0),
			dailymage: parseInt(servuser.dailymage || 0),
			dailydg: parseInt(servuser.dailydg || 0),
			quest: obj,
		});
	});
}
function getDay(){
	return Math.floor(Date.now()/86400000);
}
function genericChat(socket, data){
	if (data.msg == "/who") {
		var usersonline = activeUsers().join(", ");
		socket.emit("chat", { mode: "info", msg: usersonline ? "Users online: " + usersonline + "." : "There are no users online :(" })
	}
	else io.emit("chat", data)
}
function getAgedHp(hp, age){
	var curhp = age > 1 ? hp - (1<<Math.min(age, 9)-1) : hp;
	return Math.max(curhp, Math.floor(hp/4));
}
io.on("connection", function(socket) {
	sockinfo[socket.id] = {};
	socket.on("disconnect", dropsock);
	socket.on("reconnect_failed", dropsock);
	function userEvent(event, func){
		socket.on(event, function(data){
			var u;
			if (!data || !(u = data.u)){
				return;
			}
			if (!(this.id in sockinfo)){
				sockinfo[this.id] = {};
			}
			console.log(u+": "+event);
			if (!(u in users)){
				db.hgetall("U:"+u, function(err, obj){
					if (obj){
						prepuser(obj);
						users[u] = obj;
						if (data.a == obj.auth) {
							usersock[u] = socket;
							func.call(socket, data, obj);
						}
					}
				});
			} else if (data.a == users[u].auth) {
				usersock[u] = socket;
				func.call(socket, data, users[u]);
			}
		});
	}
	function foeEcho(event){
		socket.on(event, function(data){
			var foe = sockinfo[this.id].trade ? usersock[sockinfo[this.id].trade.foe] : sockinfo[this.id].foe;
			if (foe){
				foe.emit(event, data);
			}
		});
	}
	function utilEvent(event){
		userEvent(event, userutil[event]);
	}
	foeEcho("endturn");
	foeEcho("cast");
	foeEcho("foeleft");
	foeEcho("mulligan");
	foeEcho("cardchosen");
	utilEvent("sellcard");
	utilEvent("upgrade");
	utilEvent("uppillar");
	utilEvent("addgold");
	utilEvent("addloss");
	utilEvent("addwin");
	utilEvent("addcards");
	utilEvent("donedaily");
	userEvent("inituser", function(data, user) {
		var starters = [
			"015990g4sa014sd014t4014vi014vs0152o0152t0155u0155p0158q015ca015fi015f6015if015il015lo015lb015ou015s5025rq015v3015ut0161s018pi",
			"01502034sa014t3014sd0b4vc024vi014vj014vh014vv014vp034vs024vd014ve014vf055uk015us015v3015uq015up015uv018pt",
			"0153102532034sa014sd014t40c52g0252i0252j0252k0252n0152p0152t0152r0152h045bs025cb025cr018pn",
			"0156203564025650159502599034sa014sd014t50b55k0155q0255t0255r0255l0155o0458o0158t0258q018pm",
			"03590015910159403599034sa014sd014t40b58o0258u0158p0258q0158s0158r045rg025ri025rr015rn018ps",
			"034sa014sd014td0c5bs015bu025c1015cb025c0015c8025c7015c6015cr015c3015bt045i4015ia015i6025il025ie018ps",
			"034sa014sd024t40b5f0025f1025f3015f4025fh025fi025fa015f5025fc015f2045l8025lp025lr018pq",
			"02565034sa024sd014td0455k0255t0155r0c5i4025i8035i6025ip025ie015i9025ig015id018pl",
			"034sa014sd014tb0b5l8025lo025lp035lb015ld025lm015ln025ll015la045oc025on025os015oe015or018pr",
			"034sa014sd014t4055f0015f3025f4015f6015fc0c5oc025od015og025os015oh015oe025ou015om025or015of018po",
			"03627034sa024sd014t40c5rg025ri025rr015rl025ru015s0015rn015rm0561o0261q0261t018pu",
			"034sa014sd014t40452g0152p0252t0a5uk035um025un015us025v3015uq035ut015up015vb015uo025uv015ul018pk",
			"015020262002627034sa014sd014t4064vc024vp034vs0b61o0261q0361s0261t0161v018pj",
			"",
		];
		user.decks = starters[data.e];
		user.selectedDeck = 0;
		user.pool = "";
		user.accountbound = user.decks;
		user.freepacks = data.e == 13 ? "6,6,0,0" : "3,2,0,0";
		user.aiwins = 0;
		user.ailosses = 0;
		user.pvpwins = 0;
		user.pvplosses = 0;
		user.oracle = 0;
		user.daily = 0;
		user.dailymage = Math.floor(Math.random() * aiDecks.mage.length);
		user.dailydg = Math.floor(Math.random() * aiDecks.demigod.length);
		db.hset("Q:"+user.name, "necromancer", 1, function(err, obj){
			useruser(user, function(clientuser){
				socket.emit("userdump", clientuser);
			});
		});
	});
	userEvent("logout", function(data, user) {
		var u=data.u;
		db.hmset("U:"+u, user);
		delete users[u];
		delete usersock[u];
	});
	userEvent("delete", function(data, user) {
		var u = data.u;
		db.del("U:" + u);
		db.del("Q:" + u);
		delete users[u];
		delete usersock[u];
	});
	userEvent("setdeck", function(data, user) {
		var decks = user.decks ? user.decks.split(",") : [];
		decks[data.number] = data.d;
		user.decks = decks.join(",");
		user.selectedDeck = data.number;
	});
	userEvent("setarena", function(data, user){
		if (!user.ocard || !data.d){
			return;
		}
		var au=(data.lv?"B:":"A:") + data.u;
		if (data.mod){
			db.hmset(au, {deck: data.d, hp: data.hp, draw: data.draw, mark: data.mark});
		}else{
			db.hmset(au, {day: getDay(), deck: data.d, card: user.ocard, win:0, loss:0, hp: data.hp, draw: data.draw, mark: data.mark});
			db.zadd("arena"+(data.lv?"1":""), 0, data.u);
		}
	});
	userEvent("arenainfo", function(data, user){
		db.hgetall((data.lv?"B:":"A:") + data.u, function(err, obj){
			if (!obj){
				socket.emit("arenainfo", {deck:"", lv: data.lv});
			}else{
				db.zrevrank("arena"+(data.lv?"1":""), data.u, function(err, rank){
					obj.day = getDay() - obj.day;
					obj.curhp = getAgedHp(obj.hp, obj.day);
					obj.lv = data.lv;
					if (rank != "") obj.rank = rank;
					socket.emit("arenainfo", obj);
				});
			}
		});
	});
	userEvent("arenatop", function(data, user){
		db.zrevrange("arena"+(data.lv?"1":""), 0, 19, "withscores", function(err, obj){
			var t20 = [];
			function getwinloss(i){
				if (i == obj.length){
					socket.emit("arenatop", t20);
				}else{
					db.hmget((data.lv?"B:":"A:") + obj[i], "win", "loss", "day", "card", function(err, wl){
						wl[2] = getDay()-wl[2];
						t20.push([obj[i], obj[i+1]].concat(wl));
						getwinloss(i+2);
					});
				}
			}
			getwinloss(0);
		});
	});
	userEvent("modarena", function(data, user){
		var arena = "arena"+(data.lv?"1":"");
		db.hincrby((data.lv?"B:":"A:")+data.aname, data.won?"win":"loss", 1);
		if (data.aname in users){
			users[data.aname].gold += data.won?3:1;
		}else{
			db.exists("U:"+data.aname, function(err, exists){
				if (exists){
					db.hincrby("U:"+data.aname, "gold", data.won?3:1);
				}
			});
		}
		if (data.won){
			db.zincrby(arena, 1, data.aname);
		}else{
			db.zscore(arena, function(err, score){
				if (score === "") return;
				db.zincrby(arena, -1, data.aname, function(err, newscore) {
					if (!err && newscore < -15){
						db.hmget((data.lv?"B:":"A:")+data.aname, "win", "loss", function(err, wl){
							if (wl[0] / (wl[0]+wl[1]+1) < .2){
								db.zrem("arena"+(data.lv?"1":""), data.aname);
							}
						});
					}
				});
			});
		}
	});
	userEvent("foearena", function(data, user){
		db.zcard("arena"+(data.lv?"1":""), function(err, len){
			if (!len)return;
			var cost = 5+data.lv*15;
			if (user.gold < cost)return;
			user.gold -= cost;
			var idx = Math.floor(Math.random()*Math.min(len, 20));
			db.zrevrange("arena"+(data.lv?"1":""), idx, idx, function(err, aname){
				console.log("deck: "+ aname + " " + idx);
				db.hgetall((data.lv?"B:":"A:")+aname, function(err, adeck){
					var seed = Math.random();
					if (data.lv) adeck.card = CardCodes[adeck.card].asUpped(true).code;
					adeck.hp = parseInt(adeck.hp || 200);
					adeck.mark = parseInt(adeck.mark || 1);
					adeck.draw = parseInt(adeck.draw || data.lv+1);
					var curhp = getAgedHp(adeck.hp, getDay()-adeck.day);
					socket.emit("foearena", {
						seed: seed*etgutil.MAX_INT,
						name: aname, hp: curhp,
						mark: adeck.mark, draw: adeck.draw,
						deck: adeck.deck + "05" + adeck.card, lv:data.lv});
				});
			});
		});
	});
	userEvent("codesubmit", function(data, user){
		db.hget("CodeHash", data.code, function(err, type){
			if (!type){
				socket.emit("codereject", "Code does not exist");
			}else if (type.charAt(0) == "G"){
				var g = parseInt(type.substr(1));
				if (isNaN(g)){
					socket.emit("codereject", "Invalid gold code type: " + type);
				}else{
					user.gold += g;
					socket.emit("codegold", g);
					db.hdel("CodeHash", data.code);
				}
			}else if (type.charAt(0) == "C"){
				var c = type.substr(1);
				if (c in CardCodes){
					user.pool = etgutil.addcard(user.pool, c);
					socket.emit("codecode", c);
					db.hdel("CodeHash", data.code);
				}else socket.emit("codereject", "Unknown card: " + type);
			}else if (type == "mark" || type == "shard"){
				socket.emit("codecard", type);
			}else{
				socket.emit("codereject", "Unknown code type: " + type);
			}
		});
	});
	userEvent("codesubmit2", function(data, user){
		db.hget("CodeHash", data.code, function(err, type){
			if (!type){
				socket.emit("codereject", "Code does not exist");
			}else if (type == "mark" || type == "shard"){
				user.pool = etgutil.addcard(user.pool, data.card);
				socket.emit("codedone", data);
				db.hdel("CodeHash", data.code);
			}else{
				socket.emit("codereject", "Unknown code type: " + type);
			}
		});
	});
	userEvent("foewant", function(data, user){
		var u=data.u, f=data.f;
		if (u == f){
			return;
		}
		console.log(u + " requesting " + f);
		sockinfo[this.id].deck = user.decks.split(",")[user.selectedDeck];
		sockinfo[this.id].pvpstats = { hp: data.hp, markpower: data.mark, deckpower: data.deck, drawpower: data.draw };
		var foesock = usersock[f];
		if (foesock && foesock.id in sockinfo){
			if (sockinfo[foesock.id].duel == u) {
				delete sockinfo[foesock.id].duel;
				var seed = Math.random() * etgutil.MAX_INT;
				var first = seed < etgutil.MAX_INT / 2;
				sockinfo[this.id].foe = foesock;
				sockinfo[foesock.id].foe = this;
				var deck0 = etgutil.decodedeck(sockinfo[foesock.id].deck), deck1 = etgutil.decodedeck(sockinfo[this.id].deck);
				var owndata = { first: first, seed: seed, deck: deck0, urdeck: deck1, foename:f };
				var foedata = { first: !first, seed: seed, deck: deck1, urdeck: deck0 ,foename:u};
				var stat = sockinfo[this.id].pvpstats, foestat = sockinfo[foesock.id].pvpstats;
				for (var key in stat) {
					owndata["p1" + key] = stat[key];
					foedata["p2" + key] = stat[key];
				}
				for (var key in foestat) {
					owndata["p2" + key] = foestat[key];
					foedata["p1" + key] = foestat[key];
				}
				this.emit("pvpgive", owndata);
				foesock.emit("pvpgive", foedata);
			} else {
				sockinfo[this.id].duel = f;
				foesock.emit("chat", { msg: u + " wants to duel with you!", mode: "info" });
				this.emit("chat", { mode: "info", msg: "You have sent a PvP request to " + f + "!" });
			}
		}
	});
	userEvent("canceltrade", function (data, user) {
		var foesock = usersock[sockinfo[this.id].trade.foe];
		if (foesock){
			foesock.emit("tradecanceled");
			foesock.emit("chat", { mode:"info", msg: data.u + " has canceled the trade."});
			if (foesock.id in sockinfo){
				delete sockinfo[foesock.id].trade;
			}
		}
		delete sockinfo[this.id].trade;
	});
	userEvent("confirmtrade", function (data, user) {
		var u = data.u, thistrade = sockinfo[this.id].trade;
		if (!thistrade){
			return;
		}
		thistrade.tradecards = data.cards;
		thistrade.oppcards = data.oppcards;
		var thatsock = usersock[thistrade.foe];
		var thattrade = thatsock && sockinfo[thatsock.id] && sockinfo[thatsock.id].trade;
		var otherUser = users[thistrade.foe];
		if (!thattrade || !otherUser){
			socket.emit("tradecanceled");
			delete sockinfo[this.id].trade;
			return;
		} else if (thattrade.accepted) {
			var player1Cards = thistrade.tradecards, player2Cards = thattrade.tradecards;
			user.pool = etgutil.removedecks(user.pool, player1Cards);
			user.pool = etgutil.mergedecks(user.pool, player2Cards);
			otherUser.pool = etgutil.removedecks(otherUser.pool, player2Cards);
			otherUser.pool = etgutil.mergedecks(otherUser.pool, player1Cards);
			this.emit("tradedone", { oldcards: player1Cards, newcards: player2Cards });
			thatsock.emit("tradedone", { oldcards: player2Cards, newcards: player1Cards });
			delete sockinfo[this.id].trade;
			delete sockinfo[thatsock.id].trade;
		} else {
			thistrade.accepted = true;
		}
	});
	userEvent("tradewant", function (data) {
		var u = data.u, f = data.f;
		if (u == f) {
			return;
		}
		console.log(u + " requesting " + f);
		var foesock = usersock[f];
		if (foesock && foesock.id in sockinfo) {
			sockinfo[this.id].trade = {foe: f};
			var foetrade = sockinfo[foesock.id].trade;
			if (foetrade && foetrade.foe == u) {
				this.emit("tradegive", { first: false });
				foesock.emit("tradegive", { first: true });
			} else {
				foesock.emit("chat", { mode: "info", msg: u + " wants to trade with you!" });
				this.emit("chat", { mode: "info", msg: "You have sent a trade request to " + f + "!" });
			}
		}
	});
	userEvent("passchange", function(data, user){
		var pass = data.p || "";
		if (!pass.length){
			var hkey = "U:"+user.name;
			db.hdel(hkey, "salt");
			db.hdel(hkey, "iter");
			db.hset(hkey, "auth", user.name);
			delete user.salt;
			delete user.iter;
			user.auth = user.name;
			socket.emit("passchange", user.name);
		}else{
			crypto.pbkdf2(pass, user.salt, parseInt(user.iter), 64, function(err, key){
				if (!err){
					user.auth = key.toString("base64");
					socket.emit("passchange", user.auth);
				}
			});
		}
	});
	userEvent("chat", function (data) {
		if (data.to) {
			var to = data.to;
			if (usersock[to]) {
				usersock[to].emit("chat", { msg: data.msg, mode: "pm", u: data.u });
				socket.emit("chat", { msg: data.msg, mode: "pm", u: "To " + to });
			}
			else
				socket.emit("chat", { mode: "info", msg: to ? to + " is not here right now." : "I need to know who to message..." });
		}
		else{
			delete data.a;
			genericChat(socket, data);
		}
	});
	userEvent("updatequest", function (data, user) {
		db.hset("Q:" + data.u, data.quest, data.newstage);
	});
	userEvent("booster", function(data, user) {
		var freepacklist;
		if (user.freepacks){
			freepacklist = user.freepacks.split(",");
		}
		var pack = [
			{ amount: 9, cost: 15, rare: []},
			{ amount: 6, cost: 25, rare: [3]},
			{ amount: 8, cost: 65, rare: [3, 7]},
			{ amount: 9, cost: 100, rare: [4, 7, 8]},
		][data.pack];
		if (!pack) return;
		var bound = freepacklist && freepacklist[data.pack] > 0;
		if (bound || user.gold >= pack.cost) {
			var newCards = "", rarity = 1;
			for (var i = 0;i < pack.amount;i++) {
				if (i == pack.rare[rarity-1]) rarity++;
				var notFromElement = Math.random() > .5;
				var card = undefined; // Explicit else randompack is all same card
				if (data.element < 13) card = etg.PlayerRng.randomcard(false, function(x) { return (x.element == data.element) ^ notFromElement && x.rarity == rarity });
				if (!card) card = etg.PlayerRng.randomcard(false, function(x) { return x.rarity == rarity });
				newCards = etgutil.addcard(newCards, card.code);
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
			socket.emit("boostergive", { cards: newCards, accountbound: bound, cost:pack.cost, packtype:data.pack });
		}
	});
	socket.on("guestchat", function (data) {
		data.mode = "guest";
		data.u = "Guest" + (data.u ? "_" + data.u : "");
		genericChat(socket, data);
	});
	socket.on("pvpwant", function(data) {
		var pendinggame=rooms[data.room];
		console.log(this.id + ": " + (pendinggame?pendinggame.id:"-"));
		sockinfo[this.id].deck = data.deck;
		sockinfo[this.id].pvpstats = { hp: data.hp, markpower: data.mark, deckpower: data.deck, drawpower: data.draw };
		if (this == pendinggame){
			return;
		}
		if (pendinggame && pendinggame.id in sockinfo){
			var seed = Math.random()*etgutil.MAX_INT;
			var first = seed<etgutil.MAX_INT/2;
			sockinfo[this.id].foe = pendinggame;
			sockinfo[pendinggame.id].foe = this;
			var deck0 = sockinfo[pendinggame.id].deck, deck1 = data.deck;
			var owndata = { first: first, seed: seed, deck: deck0, urdeck: deck1};
			var foedata = { first: !first, seed: seed, deck: deck1, urdeck: deck0};
			var stat = sockinfo[this.id].pvpstats, foestat = sockinfo[foesock.id].pvpstats;
			for (var key in stat) {
				owndata["p1" + key] = stat[key];
				foedata["p2" + key] = stat[key];
			}
			for (var key in foestat) {
				owndata["p2" + key] = foestat[key];
				foedata["p1" + key] = foestat[key];
			}
			this.emit("pvpgive", owndata);
			foesock.emit("pvpgive", foedata);
			delete rooms[data.room];
		}else{
			rooms[data.room] = this;
		}
	});
	socket.on("librarywant", function(data){
		if (data.f in users){
			socket.emit("librarygive", users[data.f].pool);
		}else{
			db.hget("U:"+data.f, "pool", function(err, pool){
				socket.emit("librarygive", pool);
			});
		}
	});
});