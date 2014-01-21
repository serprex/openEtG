"use strict"
var http = require("http");
var connect = require("connect");
var app = http.createServer(connect().use(connect.compress()).use(connect.static(__dirname)).use(loginAuth));
var io = require("socket.io").listen(app.listen(13602));
var redis = require("redis"), db = redis.createClient();
var etgutil = require("./etgutil");
/*var servutil = require("./srvcards");
var Cards = servcards.Cards;
var CardCodes = servcards.CardCodes;
*/

function loginRespond(res, servuser){
	var user = etgutil.useruser(servuser), day = Math.floor(Date.now()/86400000);
	if (!servuser.oracle || servuser.oracle < day){
		servuser.oracle = day;
		user.oracle = true;
	}
	res.end(JSON.stringify(user));
}
function loginAuth(req, res, next){
	if (req.url.indexOf("/auth?") == 0){
		res.writeHead("200");
		var uname = req.url.substring(6);
		if (uname in users){
			loginRespond(res, users[uname]);
		}else{
			db.hgetall("U:"+uname, function (err, obj){
				users[uname] = obj || {auth: uname};
				loginRespond(res, users[uname]);
			});
		}
	}else next();
}

var users = {};
var duels = {};
var usersock = {};
var rooms = {};
var sockinfo = {};
process.on("SIGTERM", process.exit);
process.on("exit", function(){
	for(var u in users){
		var u=data.u;
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
		if (!(u in users)){
			db.hgetall("U:"+u, function(err, obj){
				if (obj){
					users[u] = obj;
					func.call(socket, data, obj);
				}
			});
		}else{
			func.call(socket, data, users[u]);
		}
	});
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
	"034sa014t40a5l8015lj025lo025lp015ld045lf025lm015ll015ln015la045rg035rh015ri015s1025ru018ps",
	"034sa014t3035l8015lc035lb015lf015ln0a5oc025od025oh035ok035oe025oo025ot015or015op015of018pq",
	"034sa014t3095rg035ri025rr025rk035rq015rl025ru015s0015rn015rm045uk035v1015v3025vb015uu018pi",
	"016210162402627034sa014t3085uk035um015un025us015v1035v3025uq025ut015up015v2015uv015va015ul0461o0161q018pu",
	"03620016240261p01627034sa014t3054vc024ve024vo014vk0a61o0361q0361s0161t0161r0161v018pj"
];

io.sockets.on("connection", function(socket) {
	sockinfo[socket.id] = {};
	socket.on("disconnect", dropsock);
	socket.on("reconnect_failed", dropsock);
	userEvent(socket, "inituser", function(data, user) {
		var u=data.u;
		var startdeck = starter[data.e];
		user.deck = user.pool = starter[data.e] || starter[0];
		this.emit("userdump", etgutil.useruser(user));
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
		// Anything using this API call should eventually be serverside
		user.pool = etgutil.addcard(user.pool, data.c);
	});
	userEvent(socket, "setdeck", function(data, user){
		user.deck = etgutil.encodedeck(data.d);
	});
	userEvent(socket, "transmute", function(data, user){
		var rm = data.rm, add = data.add;
		for(var i=0; i<rm.length; i++){
			user.pool = etgutil.addcard(user.pool, rm[i], -1);
		}
		for(var i=0; i<add.length; i++){
			user.pool = etgutil.addcard(user.pool, add[i]);
		}
		user.deck = etgutil.encodedeck(add);
	});
	userEvent(socket, "foewant", function(data) {
		var u=data.u, f=data.f;
		if (u == f){
			return;
		}
		console.log(u + " requesting " + f);
		sockinfo[this.id].deck = data.deck;
		if (f in users){
			usersock[u] = this;
			if (duels[u] == f){
				var seed = Math.random()*4000000000;
				var first = seed<2000000000;
				sockinfo[this.id].foe = usersock[f];
				sockinfo[usersock[f].id].foe = this;
				var deck0=sockinfo[usersock[f].id].deck, deck1=data.deck;
				this.emit("pvpgive", {first:first, seed:seed, deck:deck0, urdeck:deck1});
				usersock[f].emit("pvpgive", {first:!first, seed:seed, deck:deck1, urdeck:deck0});
				delete duels[u];
			}else duels[f] = u;
		}
	});
	socket.on("pvpwant", function(data) {
		var pendinggame=rooms[data.room];
		console.log(this.id + ": " + (pendinggame?pendinggame.id:"-"));
		sockinfo[this.id].deck = data.deck;
		if (this == pendinggame){
			return;
		}
		if (pendinggame && pendinggame.id in sockinfo){
			var seed = Math.random()*4000000000;
			var first = seed<2000000000;
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
	foeEcho(socket, "summon");
	foeEcho(socket, "active");
	foeEcho(socket, "chat");
	foeEcho(socket, "mulligan");
});