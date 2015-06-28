"use strict";
var Cards = require("./Cards");
var etgutil = require("./etgutil");
exports.rewardwords = {
	mark: -1,
	pillar: 0,
	rare: 3,
	shard: 4,
	nymph: 5,
};
exports.cardValues = new Float32Array([25/3, 1.375, 5, 30, 35, 250]);
exports.sellValues = new Uint8Array([5, 1, 3, 15, 20, 240]);
exports.pveCostReward = new Uint8Array([
	0, 10,
	5, 25,
	10, 55,
	20, 160,
	10, 50,
	20, 100,
]);
exports.arenaCost = function(lv){
	return exports.pveCostReward[lv?10:8];
}
exports.calcWealth = function(cardpool){
	var wealth = 0;
	function wealthIter(code, count){
		var card = Cards.Codes[code];
		if (card && card.rarity != -1 && (card.rarity || card.upped || card.shiny)){
			wealth += exports.cardValues[card.rarity] * (card.upped?6:1) * (card.shiny?6:1) * count;
		}
	}
	if (typeof cardpool === "string"){
		etgutil.iterraw(cardpool, wealthIter);
	}else if (cardpool instanceof Array){
		cardpool.forEach(function(x){wealthIter(x,1)});
	}else{
		for(var code in cardpool){
			wealthIter(code, cardpool[code]);
		}
	}
	return wealth;
}