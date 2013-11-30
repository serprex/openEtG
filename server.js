var http = require('http');
var app = http.createServer(handler);
var io = require('socket.io').listen(app);
var fs = require('fs');
app.listen(80);

function handler (req, res) {
	if (req.url.indexOf("..") != -1)
		return;
	if (req.url.indexOf("/cards/") == 0){
		var request=http.get("http://dek.im/resources/card_images/"+req.url.substring(7), function (getres) {
			getres.on("data", function(data){
				res.write(data);
			});
			getres.on("end", function(){
				res.end();
			});
		});
	}else{
		var url = req.url == "/"?"/pixi.htm":req.url;
		fs.readFile(__dirname + url, function (err, data) {
			if (err) {
				res.writeHead(500);
				return res.end('Error loading '+url);
			}
			res.writeHead(200);
			res.end(data);
		});
	}
}

var pendinggame = null;
var socktoid = {};
var idtosock = {};

io.sockets.on('connection', function (socket) {
	var sockId = Math.random();
	idtosock[sockId] = socket;
	socktoid[socket] = sockId;
	socket.emit('idgive', {id: sockId});
	socket.on('disconnect', function(data) {
		delete idtosock[socktoid[socket]];
		delete socktoid[socket];
	});
	socket.on('pvpwant', function (data) {
		console.log(data);
		if (pendinggame != null){
			var ownId = socktoid[socket];
			var seed = Math.random()*4294967296;
			var first = seed<(4294967296/2)?pendinggame:ownId;
			socket.emit("pvpgive", {foeId: pendinggame, first:first, seed:seed});
			idtosock[pendinggame].emit("pvpgive", {foeId: ownId, first:first, seed:seed});
			pendinggame = null;
		}else{
			pendinggame = data.id;
		}
	});
});