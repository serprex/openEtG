"use strict";
var etgutil = require("./etgutil");
var Cards = require("./Cards");
exports.rewardwords = {
	mark: -1,
	pillar: 0,
	rare: 3,
	shard: 4,
	nymph: 5,
};
exports.sellcard = function(data, user){
	if (etgutil.count(user.pool, data.card)){
		var card = Cards.Codes[data.card];
		var sellValue = [5, 1, 3, 15, 20, 125][card.rarity] * (card.upped ? 5 : 1);
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
		user.pool = etgutil.addcard(user.pool, card.asUpped(true).code);
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
		user.pool = etgutil.addcard(user.pool, card.asShiny(true).code);
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
	user.daily |= (1 << data.daily);
}