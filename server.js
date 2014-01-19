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
					func(data, obj);
				}
			});
		}else{
			func(data, users[u]);
		}
	});
}

var starter = [
	"0q4sa024sc014t3014sb014tc064vj014vh014vs0252j0155u0155n0158p0158q015c1015c9015f3015f8015i6015ii015la015oo015oj015ri015rl025vb0101623016278po",
	"084sa014t3014tc0a4vc0250u034vi034vj014vq014vh044vk014vm014vt034ve014vo014vf0152n0155u0155q0158p045ca025bu015c7035c6015cc015i5015os015rh015v1018pn",
	"0254202620084sa014t3014tc014vd0a52g0352i0352m0352o0252j0352t0152h0155r0158t015c8015f4015i5015lc025oo025rp025rr025rk015s1025rv025un015uq018ps",
	"",
	"0156201590015910159201593015940159502596015980159901626084sa014t3014tc0155t0a58o025aa0258t0158u0258p0258q0158r015c2015f1025fb025fa025ij025i8015lc015le015om035rq015uv018po",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
];

io.sockets.on("connection", function(socket) {
	sockinfo[socket.id] = {};
	socket.on("disconnect", dropsock);
	socket.on("reconnect_failed", dropsock);
	userEvent(socket, "inituser", function(data) {
		var u=data.u;
		var startdeck = starter[data.e];
		users[u].deck = users[u].pool = !startdeck || !startdeck.length?starter[data.e]:startdeck;
		socket.emit("userdump", etgutil.useruser(users[u]));
	});
	userEvent(socket, "logout", function(data, user) {
		var u=data.u;
		db.hmset("U:"+u, user);
		delete users[u];
	});
	userEvent(socket, "addcard", function(data, user) {
		// Anything using this API call should eventually be serverside
		user.pool = etgutil.addcard(user.pool, data.c);
	});
	userEvent(socket, "setdeck", function(data, user){
		user.deck = etgutil.encodedeck(data.d);
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