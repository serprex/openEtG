"use strict";
const zlib = require("zlib"),
	svg = require("../svg");
module.exports = function(url, resolve, reject, stime){
	const deck = url.replace(/\.svg$/, "");
	if (deck.length%5){
		return reject("Unaligned deck");
	}
	zlib.gzip(svg.deck(deck), {level:9}, (err, buf) =>
		resolve({
			head:"Content-Encoding:gzip\r\nContent-Type:image/svg+xml\r\n",
			date:stime,
			buf:buf,
		})
	);
}