"use strict"
var qstring = require("querystring");
var http = require("http");
var crypto = require("crypto");
var connect = require("connect");
var fs = require("fs");
var app = http.createServer(connect().use(connect.compress()).use(cardRedirect).use(connect.static(__dirname)).use(loginAuth));
var io = require("socket.io").listen(app.listen(13602));
var redis = require("redis"), db = redis.createClient();
var etgutil = require("./etgutil");

function loginRespond(res, servuser, pass){
	if(!servuser.name){
		servuser.name = servuser.auth;
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
		var user = useruser(servuser), day = getDay();
		if (!servuser.oracle || servuser.oracle < day){
			servuser.oracle = day;
			user.oracle = true;
		}
		res.writeHead("200");
		res.end(JSON.stringify(user));
	}
	if(!servuser.salt){
		servuser.salt = crypto.pseudoRandomBytes(16).toString("base64");
		servuser.iter = 100000;
	}
	if (pass && pass.length){
		crypto.pbkdf2(pass, servuser.salt, parseInt(servuser.iter), 64, postHash);
	}else postHash(null, servuser.name);
}
function loginAuth(req, res, next){
	if (req.url.indexOf("/auth?") == 0){
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
function cardRedirect(req, res, next){
	if (req.url.match(/^\/Cards\/...\.png$/)){
		var code = req.url.substr(7, 3), intCode = parseInt(code, 32);
		if (intCode >= 7000){
			fs.exists(__dirname + req.url, function(exists){
				if (!exists){
					req.url = "/Cards/" + (intCode-2000).toString(32) + ".png";
				}
				next();
			});
			return;
		}
	}
	next();
}

var users = {};
var duels = {};
var trades = {};
var pendingtrade = {};
var usersock = {};
var rooms = {};
var sockinfo = {};
process.on("SIGTERM", process.exit).on("SIGINT", process.exit);
process.on("exit", function(){
	for(var u in users){
		db.hmset("U:"+u, users[u]);
	}
	db.quit();
});
function dropsock(data){
	if (this.id in sockinfo){
		var foe = sockinfo[this.id].foe;
		if (foe){
			foe.emit("foeleft");
		}
		delete sockinfo[this.id];
	}
}
function foeEcho(socket, event){
	socket.on(event, function(data){
		var foe = sockinfo[this.id].foe;
		if (foe && foe.id in sockinfo){
			foe.emit(event, data);
		}
	});
}
function userEvent(socket, event, func){
	socket.on(event, function(data){
		var u=data.u;
		console.log(u+": "+event);
		if (!(u in users)){
			db.hgetall("U:"+u, function(err, obj){
				if (obj){
					prepuser(obj);
					users[u] = obj;
					if (data.a == obj.auth){
						func.call(socket, data, obj);
					}
				}
			});
		}else if (data.a == users[u].auth){
			func.call(socket, data, users[u]);
		}
	});
}
function prepuser(servuser){
	servuser.gold = parseInt(servuser.gold || 0);
}
function useruser(servuser){
	return {
		auth: servuser.auth,
		name: servuser.name,
		deck: servuser.deck,
		pool: servuser.pool,
		gold: servuser.gold,
		ocard: servuser.ocard
	};
}
function getDay(){
	return Math.floor(Date.now()/86400000);
}

var starter = [
	"01530015660159001599016220d4sa034sb024sd014vm014vu0152p0155u015c1015cc015fa015il015in015lf015ln015os015oj015ri015rn015uo015uv018pi",
	"0253101532034sa014t3094vc024vi034vk014vp024vs014vt014vd034ve014vf0452g0552m0152r018pk",
	"0153002532015630256501566034sa014t30952g0152i0252m0152j0252k0152n0252p0352t0152r0152h0455k0255t018pl",
	"0156203564035650159502599034sa014t30a55k0255q0355t0155r0255l0155o0358o0258t0158p0158q018pm",
	"0259101593015940259603599034sa014t50858o0358u0258p0258q0159a0158r055bs025c2015c7025c9018pn",
	"034sa034td0b5bs035c0025c2015c8025c7035ce015c6015c9015c3015bt035f9025fh025fb015fa018po",
	"034sa034t4085f0035f1035f3025f4025ff015fh015f6015f5015fc015f2015f9055i4015ia025ii015i9015ig018pp",
	"044sa014td0a5i4025i5025i7015i8015ia015if015iq025ip035ie015id045oc015og025on025os015ot015or018pr",
	"034sa014t40a5l8015lj025lo025lp015ld045lf025lm015ln015ll015la045rg035rh015ri015s1025ru018ps",
	"034sa014t3035l8015lc035lb015lf015ln0a5oc025od025oh035ok035oe025oo025ot015or015op015of018pq",
	"034sa014t30a5rg025ri015rp025rr025rk035rq015s1015rl015ru015s0015rn015rm035uk035v1015v3025vb015uu018pi",
	"016210162402627034sa014t3085uk035um015un025us015v1035v3025uq025ut015up015v2015uv015va015ul0461o0161q018pu",
	"016200162101623026240162501627034sa014t3034vc014vi024vk014vt014ve024vo0a61o0261p0261q0261s0161t0161r0161v018pj"
];

io.sockets.on("connection", function(socket) {
	sockinfo[socket.id] = {};
	socket.on("disconnect", dropsock);
	socket.on("reconnect_failed", dropsock);
	userEvent(socket, "inituser", function(data, user) {
		var u=data.u;
		var startdeck = starter[data.e];
		user.deck = starter[data.e] || starter[0];
		user.pool = user.deck.substring(0, user.deck.length-5);
		this.emit("userdump", useruser(user));
	});
	userEvent(socket, "logout", function(data, user) {
		var u=data.u;
		db.hmset("U:"+u, user);
		delete users[u];
	});
	userEvent(socket, "delete", function(data, user) {
		var u=data.u;
		db.del("U:"+u);
		delete users[u];
	});
	userEvent(socket, "addcard", function(data, user) {
		// Anything using this should eventually be serverside
		user.pool = etgutil.addcard(user.pool, data.c);
		if (data.g){
			user.gold += data.g;
		}
		if (data.o){
			user.ocard = data.o;
		}
	});
	userEvent(socket, "subgold", function(data, user){
		user.gold -= data.g;
	});
	userEvent(socket, "setdeck", function(data, user){
		user.deck = data.d;
	});
	userEvent(socket, "setarena", function(data, user){
		var au="A:" + data.u;
		if (!user.ocard){
			return;
		}
		db.hget(au, "card", function(err, card){
			var adeck = etg.addcard(data.d, user.ocard, 5);
			if (card != user.ocard){
				db.hmset(au, {day: getDay(), deck: adeck, card: user.ocard, win:0, loss:0});
				db.zadd("arena", 0, data.u);
			}else{
				db.hset(au, "deck", adeck);
			}
		});
	});
	userEvent(socket, "arenainfo", function(data, user){
		db.hgetall("A:" + data.u, function(err, obj){
			socket.emit("arenainfo", obj);
		});
	});
	userEvent(socket, "arenatop", function(data, user){
		db.zrange("arena", 0, 10, function(err, obj){
			socket.emit("arenatop", obj);
		});
	});
	userEvent(socket, "modarena", function(data, user){
		db.hincrby("A:"+data.aname, data.won?"win":"loss", 1);
		db.zincrby("arena", data.won?1:-1, data.aname);
	});
	userEvent(socket, "foearena", function(data, user){
		db.zcard("arena", function(err, len){
			if (!len)return;
			var idx = Math.floor(Math.random()*Math.min(len, 10));
			db.zrange("arena", idx, idx, function(err, aname){
				console.log("deck: "+ aname + " " + idx);
				db.hgetall("A:"+aname, function(err, adeck){
					var day = getDay();
					var seed = Math.random();
					var first = seed<.5;
					socket.emit("foearena", {seed: seed*etgutil.MAX_INT, first: first, name: aname, hp:Math.max(202-Math.pow(2, 1+day-adeck.day), 100), deck: adeck.deck})
				});
			});
		});
	});
	userEvent(socket, "transmute", function(data, user){
		var rm = etgutil.decodedeck(data.rm), add = etgutil.decodedeck(data.add);
		for(var i=0; i<rm.length; i++){
			user.pool = etgutil.addcard(user.pool, rm[i], -1);
		}
		for(var i=0; i<add.length; i++){
			user.pool = etgutil.addcard(user.pool, add[i]);
		}
		user.deck = data.add;
	});
	userEvent(socket, "add", function (data, user) {
		var add = etgutil.decodedeck(data.add);
		for (var i = 0; i < add.length; i++) {
			user.pool = etgutil.addcard(user.pool, add[i]);
		}
	});
	userEvent(socket, "foewant", function(data){
		var u=data.u, f=data.f;
		if (u == f){
			return;
		}
		console.log(u + " requesting " + f);
		sockinfo[this.id].deck = data.deck;
		if (f in users){
			usersock[u] = this;
			if (duels[f] == u) {
				delete duels[f];
				var seed = Math.random() * etgutil.MAX_INT;
				var first = seed < etgutil.MAX_INT / 2;
				sockinfo[this.id].foe = usersock[f];
				sockinfo[usersock[f].id].foe = this;
				var deck0 = sockinfo[usersock[f].id].deck, deck1 = data.deck;
				this.emit("pvpgive", { first: first, seed: seed, deck: deck0, urdeck: deck1 });
				usersock[f].emit("pvpgive", { first: !first, seed: seed, deck: deck1, urdeck: deck0 });
			} else {
				duels[u] = f;

			}
		}
	});
	userEvent(socket, "confirmtrade", function (data) {
		var u = data.u;
		sockinfo[this.id].tradecard = data.card;
		sockinfo[this.id].oppcard = data.oppcard;
		var other = usersock[sockinfo[this.id].foe];
		if (sockinfo[other.id].tradeaccepted) {
			var player1Card = sockinfo[this.id].tradecard;
			var player2Card = sockinfo[other.id].tradecard;
			//if (player1Card == sockinfo[other.id].oppcard && sockinfo[this.id].oppcard == player2Card) {
				u.pool = etgutil.addcard(user.pool, player1Card, -1);
				u.pool = etgutil.addcard(user.pool, player2Card);
				sockinfo[u].foe.pool = etgutil.addcard(user.pool, player2Card, -1);
				sockinfo[u].foe.pool = etgutil.addcard(user.pool, player1Card);
				socket.emit("tradedone", { oldcard: player1Card, newcard: player2Card })
				sockinfo[other.id].emit("tradedone", { oldcard: player2Card, newcard: player1Card })
				delete sockinfo[this.id].tradecard;
				delete sockinfo[other.id].tradecard;
				delete sockinfo[this.id].oppcard;
				delete sockinfo[other.id].oppcard;
				delete sockinfo[this.id].tradeaccepted;
				delete sockinfo[other].tradeaccepted;

			//}
		} else sockinfo[this.id].tradeaccepted = true;
	});
	userEvent(socket, "tradewant", function (data) {
		var u = data.u, f = data.f;
		if (u == f) {
			return;
		}
		console.log(u + " requesting " + f);
		if (f in users)
		{
			usersock[u] = this;
			if (trades[f] == u){
				delete trades[f];
				sockinfo[this.id].foe = usersock[f];
				sockinfo[usersock[f].id].foe = this;
				this.emit("tradegive", {first: false})
				usersock[f].emit("tradegive", {first: true})
			}else trades[u] = f;
		}
	});
	userEvent(socket, "passchange", function(data, user){
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
	userEvent(socket, "chat", function (data) {
		io.sockets.emit("chat", data);
	});
	socket.on("pvpwant", function(data) {
		var pendinggame=rooms[data.room];
		console.log(this.id + ": " + (pendinggame?pendinggame.id:"-"));
		sockinfo[this.id].deck = data.deck;
		if (this == pendinggame){
			return;
		}
		if (pendinggame && pendinggame.id in sockinfo){
			var seed = Math.random()*etgutil.MAX_INT;
			var first = seed<etgutil.MAX_INT/2;
			sockinfo[this.id].foe = pendinggame;
			sockinfo[pendinggame.id].foe = this;
			var deck0=sockinfo[pendinggame.id].deck, deck1=data.deck;
			this.emit("pvpgive", {first:first, seed:seed, deck:deck0, urdeck:deck1});
			pendinggame.emit("pvpgive", {first:!first, seed:seed, deck:deck1, urdeck:deck0});
			delete rooms[data.room];
		}else{
			rooms[data.room] = this;
		}
	});
	foeEcho(socket, "endturn");
	foeEcho(socket, "cast");
	foeEcho(socket, "foeleft");
	foeEcho(socket, "mulligan");
	foeEcho(socket, "cardchosen");
});