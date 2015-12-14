"use strict";
var deck = require("./deck");
var Cards = require("../Cards");
var mt = require("../MersenneTwister");
module.exports = function(url, resolve, reject, stime){
	var hash = 0;
	for (var i=0; i<url.length; i++){
		hash = hash*31 + url.charCodeAt(i) & 0x7FFFFFFF;
	}
	var mt = new mt(hash);
	var eles = new Uint8Array(12), cards = new Uint16Array(42);
	for (var i=0; i<12; i++) eles[i] = i+1;
	for (var i=0; i<6; i++){
		// Select a random set of unique elements through partial shuffling
		var ei = i+prng.upto(12-i);
		var ele = eles[ei];
		eles[ei] = eles[i];
		for(var j=0; j<7; j++){
			var codes = Cards.filter(false, x => x.element == ele && x.type && cards.indexOf(x.code) == -1);
			cards[i*7+j] = codes[codes.length*mt.rnd()|0];
		}
	}
	cards.sort(Cards.codeCmp);
	var code = "";
	for (var i=0; i<cards.length; i++){
		code += "01" + cards[i].toString(32);
	}
	deck(code, resolve, reject, stime);
}