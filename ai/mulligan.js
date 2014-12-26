"use strict";
var etg = require("../etg");
var Cards = require("../Cards");
module.exports = function(pl){
	if (pl.hand.length < 6)return true;
	var hasQuanta = pl.hand.some(function(c){
		var card = c.card;
		return card.type == etg.PillarEnum || card.isOf(Cards.Nova) || card.isOf(Cards.Immolation) || card.isOf(Cards.GiftofOceanus) || card.isOf(Cards.QuantumLocket);
	});
	if (hasQuanta) return true;
	return pl.deck.every(function(code){ return Cards.Codes[code].type != etg.PillarEnum });
}