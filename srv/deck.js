"use strict";
var zlib = require("zlib");
var svg = require("../svg");
var cache = {};
module.exports = function(url, res, date){
	var deck = url.replace(/\.svg$/, "");
	if (deck.length%5){
		res.write("HTTP/1.1 404 Not Found\r\nConnection:close\r\n\r\n");
		return res.end();
	}
	var prefix = "HTTP/1.1 200 OK\r\nContent-Encoding:gzip\r\nContent-Type:image/svg+xml\r\n" + date + "Connection:close\r\n\r\n";
	if (cache[deck]){
		res.write(prefix);
		res.write(cache[deck]);
		return res.end();
	}
	zlib.gzip(svg.deck(deck), {level:9}, (err, retbuf) => {
		res.write(prefix);
		res.write(retbuf);
		res.end();
		cache[deck] = retbuf;
	});
}