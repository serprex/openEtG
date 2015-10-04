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
	10, 60,
	20, 180,
	10, 55,
	20, 110,
]);
exports.arenaCost = function(lv){
	return exports.pveCostReward[lv?10:8];
}
exports.calcWealth = function(cardpool, isDecoded){
	if (!cardpool) return 0;
	var wealth = 0;
	function wealthIter(code, count){
		var card = Cards.Codes[code];
		if (card && card.rarity != -1 && (card.rarity || card.upped || card.shiny)){
			wealth += exports.cardValues[card.rarity] * (card.upped?6:1) * (card.shiny?6:1) * count;
		}
	}
	if (typeof cardpool === "string"){
		etgutil.iterraw(cardpool, wealthIter);
	}else{
		cardpool.forEach(isDecoded ? function(code){wealthIter(code,1)} : function(count,code){wealthIter(code,count)});
	}
	return wealth;
}