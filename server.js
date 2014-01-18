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
				users[uname] = {auth: uname};
				res.end(JSON.stringify(users[uname]));
			}else{
				users[uname] = obj;
				res.end(JSON.stringify(etgutil.useruser(obj)));
			}
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

var starter = {
	deck: "084sa014t3014tc0a4vc0250u034vi034vj014vq014vh044vk014vm034ve014vo014vu014vf0352o0155q0158p045ca025bu015c7035c6015cc015i5015rh015v1018pn",
	pool: "084sa014t3014tc0a4vc0250u034vi034vj014vq014vh044vk014vm034ve014vo014vu014vf0352o0155q0158p045ca025bu015c7035c6015cc015i5015rh015v1018pn"
};

io.sockets.on("connection", function(socket) {
	sockinfo[socket.id] = {};
	socket.on("disconnect", dropsock);
	socket.on("reconnect_failed", dropsock);
	userEvent(socket, "inituser", function(data) {
		var u=data.u;
		users[u].deck = starter.deck;
		users[u].pool = starter.pool;
		socket.emit("userdump", etgutil.useruser(users[u]));
	});
	userEvent(socket, "logout", function(data) {
		var u=data.u;
		db.hmset("U:"+u, users[u]);
		delete users[u];
	});
	userEvent(socket, "foewant", function(data) {
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