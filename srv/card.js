"use strict";
var zlib = require("zlib");
var Cards = require("../Cards");
var svg = require("../svg");
module.exports = function(url, resolve, reject, stime){
	var code = parseInt(url.slice(0,3), 32);
	if (!(code in Cards.Codes)){
		reject(code+" undefined");
	}
	zlib.gzip(svg.card(code), {level:9}, (err, buf) => {
		resolve({
			head:"Content-Encoding:gzip\r\nContent-Type:image/svg+xml\r\n",
			date:stime,
			buf:buf,
		});
	});
}