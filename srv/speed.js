"use strict";
var deck = require("./deck");
var etg = require("../etg");
var etgutil = require("../etgutil");
var mt = require("../MersenneTwister");
module.exports = function(url, res, date){
	if (url == ""){
		res.write("HTTP/1.1 302 Found\r\nLocation:http://etg.dek.im/speed/" + Math.random()*etgutil.MAX_INT+"\r\n\r\n");
		res.end();
		return;
	}
	var hash = 0;
	for (var i=1; i<url.length; i++){
		hash = hash*31 + url.charCodeAt(i) & 0x7FFFFFFF;
	}
	var prng = Object.create(etg.Player.prototype);
	prng.game = {rng: new mt(hash)};
	var eles = new Uint8Array(12), cards = new Array(42);
	for (var i=0; i<12; i++){
		eles[i] = i+1;
	}
	for (var i=0; i<6; i++){
		// Select a random set of unique elements through partial shuffling
		var ei = i+prng.upto(12-i);
		var ele = eles[ei];
		eles[ei] = eles[i];
		for(var j=0; j<7; j++){
			cards[i*7+j] = prng.randomcard(false, function(x){return x.element == ele && x.type && cards.indexOf(x.code) == -1}).code;
		}
	}
	deck(etgutil.encodedeck(cards), res, date);
}