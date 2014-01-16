"use strict"
var fs = require("fs");
var http = require("http");
var connect = require("connect");
var app = http.createServer(connect().use(connect.compress()).use(connect.static(__dirname)).use(loginAuth));
var io = require("socket.io").listen(app.listen(13602));
var redis = require("redis"), db = redis.createClient();
var etgutil = require("./etgutil");

function loginAuth(req, res, next){
	if (req.url.indexOf("/auth?") == 0){
		res.writeHead("200");
		var uname = req.url.substring(6);
		db.hgetall("U:"+uname, function (err, obj){
			if (!obj){
				obj = {auth: uname, empty:true};
			}
			users[uname] = obj;
			res.end(JSON.stringify(obj));
		});
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

var starter = {
	deck: "4sa4sa4sa4t44vj4vj4vj4vs52o52o52o55q55q5905bu5c15f65if5if5lc5lc5lc5og5oh5ri5ri5ri5un5un61q8pi",
};

io.sockets.on("connection", function(socket) {
	sockinfo[socket.id] = {};
	socket.on("disconnect", dropsock);
	socket.on("reconnect_failed", dropsock);
	socket.on("inituser", function(data) {
		var u=data.u;
		if (u in users){
			users[u].deck = starter.deck;
			db.hmset("U:"+u, users[u]);
			socket.emit("userdump", users[u]);
		}
	});
	socket.on("foewant", function(data) {
		var u=data.u, f=data.f;
		if (u == f){
			return;
		}
		console.log(u + " requesting " + f);
		sockinfo[this.id].deck = data.deck;
		if (u in users && f in users){
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