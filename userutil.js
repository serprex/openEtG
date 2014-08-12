"use strict";
var etgutil = require("./etgutil");
exports.sellcard = function(data, user){
	if (etgutil.count(user.pool, data.card)){
		var card = CardCodes[data.card];
		var sellValue = [5, 1, 3, 15, 20][card.rarity] * (card.upped ? 5 : 1);
		user.pool = etgutil.addcard(user.pool, data.card, -1);
		user.gold += sellValue;
	}
}
exports.upgrade = function(data, user){
	var card = CardCodes[data.card];
	if (!card) return;
	var newcard = card.asUpped(true).code;
	var use = card.rarity < 5 ? 6 : 1;
	var poolCount = etgutil.count(user.pool, card.code);
	if (poolCount < use){
		var boundCount = etgutil.count(user.accountbound, card.code);
		if (poolCount + boundCount >= use){
			user.accountbound = etgutil.addcard(user.accountbound, card.code, -use);
			if (boundCount < use) user.pool = etgutil.addcard(user.pool, card.code, boundCount-use);
			user.accountbound = etgutil.addcard(user.accountbound, newcard);
		}
	}else{
		user.pool = etgutil.addcard(user.pool, card.code, -use);
		user.pool = etgutil.addcard(user.pool, newcard);
	}
}
exports.uppillar = function(data, user){
	var card = CardCodes[data.c];
	if (card && user.gold >= 50 && card.rarity === 0){
		user.gold -= 50;
		user.pool = etgutil.addcard(user.pool, card.asUpped(true).code);
	}
}
exports.addgold = function (data, user) {
	user.gold += data.g;
}
exports.addloss = function (data, user) {
	if (data.pvp) user.pvplosses = (user.pvplosses ? parseInt(user.pvplosses) + 1 : 1);
	else user.ailosses = (user.ailosses ? parseInt(user.ailosses) + 1 : 1);
}
exports.addwin = function(data, user) {
	if (data.pvp) {
		user.pvpwins = user.pvpwins ? parseInt(user.pvpwins) + 1 : 1;
		user.pvplosses = user.pvplosses ? parseInt(user.pvplosses) - 1 : 0;
	}
	else {
		user.aiwins = user.aiwins ? parseInt(user.aiwins) + 1 : 1;
		user.ailosses = user.ailosses ? parseInt(user.ailosses) - 1 : 0;
	}
}
exports.addcards = function(data, user) {
	user.pool = etgutil.mergedecks(user.pool, data.c);
}
exports.donedaily = function(data, user) {
	user.daily |= (1 << data.daily);
}