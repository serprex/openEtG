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
exports.sellValues = [5, 1, 3, 15, 20, 250];
exports.arenaCost = function(lv){
	return lv ? 20 : 10;
}
exports.calcWealth = function(wealth, cardpool){
	for(var code in cardpool){
		var card = Cards.Codes[code], num = cardpool[code];
		if (card){
			if (card.rarity == 0){
				if (card.upped && card.shiny) wealth += 300 * num;
				else if (card.upped || card.shiny) wealth += 50 * num;
			}else if (card.rarity > 0){
				var worth = [1.375, 5, 30, 35, 250][card.rarity-1];
				if (card.upped) worth *= 6;
				if (card.shiny) worth *= 6;
				wealth += worth * num;
			}
		}
	}
	return wealth;
}
exports.sellcard = function(data, user){
	if (etgutil.count(user.pool, data.card)){
		var card = Cards.Codes[data.card];
		var sellValue = exports.sellValues[card.rarity] * (card.upped ? 5 : 1) * (card.shiny ? 5 : 1);
		if (sellValue){
			user.pool = etgutil.addcard(user.pool, data.card, -1);
			user.gold += sellValue;
		}
	}
}
function transmute(user, oldcard, func, use){
	var poolCount = etgutil.count(user.pool, oldcard);
	var newcard = func(oldcard, true);
	if (poolCount < use){
		var boundCount = etgutil.count(user.accountbound, oldcard);
		if (poolCount + boundCount >= use){
			user.accountbound = etgutil.addcard(user.accountbound, oldcard, -use);
			if (boundCount < use) user.pool = etgutil.addcard(user.pool, oldcard, boundCount-use);
			user.accountbound = etgutil.addcard(user.accountbound, newcard);
		}
	}else{
		user.pool = etgutil.addcard(user.pool, oldcard, -use);
		user.pool = etgutil.addcard(user.pool, newcard);
	}
}
exports.upgrade = function(data, user){
	var card = Cards.Codes[data.card];
	if (!card || card.upped) return;
	var use = card.rarity != -1 ? 6 : 1;
	transmute(user, card.code, etgutil.asUpped, use);
}
exports.uppillar = function(data, user){
	var card = Cards.Codes[data.c];
	if (card && user.gold >= 50 && card.rarity === 0 && !card.shiny){
		user.gold -= 50;
		user.pool = etgutil.addcard(user.pool, etgutil.asUpped(data.c, true));
	}
}
exports.polish = function(data, user){
	var card = Cards.Codes[data.card];
	if (!card || card.shiny || card.rarity == 5) return;
	var use = card.rarity != -1 ? 6 : 2;
	transmute(user, card.code, etgutil.asShiny, use);
}
exports.shpillar = function(data, user){
	var card = Cards.Codes[data.c];
	if (card && user.gold >= 50 && card.rarity === 0 && !card.shiny){
		user.gold -= 50;
		user.pool = etgutil.addcard(user.pool, etgutil.asShiny(data.c, true));
	}
}
exports.addgold = function (data, user) {
	user.gold += data.g;
}
exports.addloss = function (data, user) {
	user[data.pvp?"pvplosses":"ailosses"]++;
}
exports.addwin = function(data, user) {
	var prefix = data.pvp?"pvp":"ai";
	user[prefix+"wins"]++;
	user[prefix+"losses"]--;
}
exports.addcards = function(data, user) {
	user.pool = etgutil.mergedecks(user.pool, data.c);
}
exports.addbound = function(data, user) {
	user.accountbound = etgutil.mergedecks(user.accountbound, data.c);
}
exports.donedaily = function(data, user) {
	if (data.daily == 6 && !(user.daily&64)){
		user.pool = etgutil.addcard(user.pool, data.c);
	}
	user.daily |= (1 << data.daily);
}