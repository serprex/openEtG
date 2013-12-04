"use strict"
var http = require("http");
var app = http.createServer(handler);
var io = require("socket.io").listen(app);
var fs = require("fs");
app.listen(80);

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
var socktoid = {};
var idtosock = {};
var idtodeck = {};

io.sockets.on("connection", function(socket) {
	var sockId = Math.random();
	idtosock[sockId] = socket;
	socktoid[socket] = sockId;
	socket.emit("idgive", {id: sockId});
	socket.on("disconnect", function(data) {
		delete idtosock[socktoid[socket]];
		delete socktoid[socket];
	});
	socket.on("pvpwant", function(data) {
		var id = data.id;
		console.log(id + " " + pendinggame);
		if (id == pendinggame){
			return;
		}
		idtodeck[id] = data.deck;
		if (pendinggame != null && pendinggame in idtosock){
			var seed = Math.random()*4294967296;
			var first = seed<(4294967296/2)?pendinggame:id;
			socket.emit("pvpgive", {foeId: pendinggame, first:first, seed:seed, deck:idtodeck[pendinggame]});
			idtosock[pendinggame].emit("pvpgive", {foeId: id, first:first, seed:seed, deck:data.deck});
			pendinggame = null;
		}else{
			pendinggame = id;
		}
	});
	socket.on("endturn", function(data) {
		if (data.foeId in idtosock){
			idtosock[data.foeId].emit("endturn");
		}
	});
	socket.on("summon", function(data) {
		if (data.foeId in idtosock){
			idtosock[data.foeId].emit("summon", data);
		}
	});
	socket.on("active", function(data) {
		if (data.foeId in idtosock){
			idtosock[data.foeId].emit("active", data);
		}
	});
});