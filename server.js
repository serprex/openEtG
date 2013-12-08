"use strict"
var http = require("http");
var app = http.createServer(handler);
var io = require("socket.io").listen(app);
var fs = require("fs");
app.listen(13602);

function handler(req, res) {
	if (~req.url.indexOf(".."))
		return;
	if (req.url.indexOf("/cards/") == 0){
		var request=http.get("http://dek.im/resources/card_header_images/"+req.url.substring(7), function (getres) {
			getres.on("data", function(data){
				res.write(data);
			});
			getres.on("end", function(){
				res.end();
			});
		});
	}else{
		var url = req.url == "/"?"/etg.htm":req.url;
		fs.readFile(__dirname + url, function(err, data) {
			if (err) {
				res.writeHead(500);
				return res.end("Error loading "+url);
			}
			res.writeHead(200);
			res.end(data);
		});
	}
}

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

io.sockets.on("connection", function(socket) {
	sockinfo[socket.id] = {};
	socket.on("disconnect", dropsock);
	socket.on("reconnect_failed", dropsock);
	socket.on("pvpwant", function(data) {
		var pendinggame=rooms[data.room];
		console.log(this.id + ": " + (pendinggame?pendinggame.id:"-"));
		if (this == pendinggame){
			return;
		}
		sockinfo[this.id].deck = data.deck;
		if (pendinggame && pendinggame.id in sockinfo){
			var seed = Math.random()*4294967296;
			var first = seed<(4294967296/2);
			sockinfo[this.id].foe = pendinggame;
			sockinfo[pendinggame.id].foe = this;
			this.emit("pvpgive", {first:first, seed:seed, deck:sockinfo[pendinggame.id].deck});
			pendinggame.emit("pvpgive", {first:!first, seed:seed, deck:data.deck});
			delete rooms[data.room]
		}else{
			rooms[data.room] = this;
		}
	});
	foeEcho(socket, "endturn");
	foeEcho(socket, "summon");
	foeEcho(socket, "active");
	foeEcho(socket, "chat");
});