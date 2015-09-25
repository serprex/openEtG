"use strict";
var zlib = require("zlib");
var Cards = require("../Cards");
var svg = require("../svg");
var cache = [];
module.exports = function(url, res, date){
	var code = parseInt(url.slice(0,3), 32);
	if (!(code in Cards.Codes)){
		res.write("HTTP 1.1 404 Not Found\r\nConnection:close\r\n\r\n");
		return res.end();
	}
	var prefix = "HTTP/1.1 200 OK\r\nContent-Encoding:gzip\r\nContent-Type:image/svg+xml\r\n"+date+"Connection:close\r\n\r\n";
	if (cache[code]){
		res.write(prefix);
		res.write(cache[code]);
		return res.end();
	}
	zlib.gzip(svg.card(code), {level:9}, (err, retbuf) => {
		res.write(prefix);
		res.write(retbuf);
		res.end();
		cache[code] = retbuf;
	});
}