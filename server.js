"use strict"
var http = require("http");
var app = http.createServer(handler);
var io = require("socket.io").listen(app);
var fs = require("fs");
app.listen(13602);

function handler(req, res) {
	if (req.url.indexOf("..") != -1)
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

var pendinggame = null;
var sockinfo = {};

io.sockets.on("connection", function(socket) {
	sockinfo[socket.id] = {};
	socket.on("disconnect", function(data) {
		if (socket in sockinfo){
			var foe = sockinfo[socket.id].foe;
			if (foe && foe.connected){
				foe.emit("foeleft");
			}
			delete sockinfo[socket.id];
		}
	});
	socket.on("pvpwant", function(data) {
		console.log(socket.id + ": " + (pendinggame?pendinggame.id:"-"));
		if (socket == pendinggame){
			return;
		}
		sockinfo[socket.id].deck = data.deck;
		if (pendinggame && pendinggame.id in sockinfo){
			var seed = Math.random()*4294967296;
			var first = seed<(4294967296/2);
			sockinfo[socket.id].foe = pendinggame;
			sockinfo[pendinggame.id].foe = socket;
			socket.emit("pvpgive", {first:first, seed:seed, deck:sockinfo[pendinggame.id].deck});
			pendinggame.emit("pvpgive", {first:!first, seed:seed, deck:data.deck});
			pendinggame = null;
		}else{
			pendinggame = socket;
		}
	});
	socket.on("endturn", function(data) {
		var foe = sockinfo[socket.id].foe;
		if (foe.id in sockinfo){
			foe.emit("endturn");
		}
	});
	socket.on("summon", function(data) {
		var foe = sockinfo[socket.id].foe;
		if (foe.id in sockinfo){
			foe.emit("summon", data);
		}
	});
	socket.on("active", function(data) {
		var foe = sockinfo[socket.id].foe;
		if (foe.id in sockinfo){
			foe.emit("active", data);
		}
	});
});