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
	var hash = 0, str = req.url.slice(1);
	for (var i=0; i<str.length; i++){
		hash = hash*31 + str.charCodeAt(i) & 0x7FFFFFFF;
	}
	var prng = Object.create(etg.Player.prototype);
	prng.game = {rng: new mt(hash)};
	var eles = {}, cards = [];
	for(var i=0; i<6; i++){
		var ele;
		do ele = prng.uptoceil(12); while (eles[ele]);
		eles[ele] = true;
		for(var j=0; j<7; j++){
			var card = prng.randomcard(false, function(x){return x.element == ele && x.type && cards.indexOf(x.code) == -1});
			cards.push(card.code);
		}
	}
	require("./deckredirect")()({url: "/" + "01"+cards.join("01")}, res);
}
module.exports = function(){
	return speed;
}