"use strict";
var etg = require("../etg");
var etgutil = require("../etgutil");
var mt = require("../MersenneTwister");
function speed(req, res, next){
	if (req.url == "/"){
		res.writeHead("302", {Location: "http://" + req.headers.host + "/speed/" + Math.random()*etgutil.MAX_INT });
		res.end();
		return;
	}
	var hash = 0;
	for (var i=1; i<req.url.length; i++){
		hash = hash*31 + req.url.charCodeAt(i) & 0x7FFFFFFF;
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
	require("./deckredirect")()({url: "/" + etgutil.encodedeck(cards)}, res);
}
module.exports = function(){
	return speed;
}