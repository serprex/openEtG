#!/bin/node
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var decks = require("../Decks");
Cards.loadcards();
var pool = "";
function buildPool(x){pool = etgutil.mergedecks(pool, x[1])}
decks.mage.forEach(buildPool);
decks.demigod.forEach(buildPool);
var a = Cards.filter(false, function(card){ return card.rarity > 0 && card.rarity < 4 && etgutil.count(pool, card.asUpped(false).code)+etgutil.count(pool, card.asUpped(true).code) == 0; });
a.forEach(function(x){
	console.log(x.name);
});
var pool2 = etgutil.deck2pool(pool), poolrank = [];
pool2.forEach(function(code, count){
	if (etgutil.asUpped(code, true) == code) pool2[etgutil.asUpped(code, false)] = (pool2[etgutil.asUpped(code, false)] || 0) + count;
});
pool2.forEach(function(code, count){
	var card = Cards.Codes[code];
	if (!card || card.upped || card.rarity < 1) return;
	poolrank.push([card.name, count]);
});
poolrank.sort(function(x,y){return x[1]-y[1]});
console.log(poolrank);
console.log(etgutil.encodedeck(a.map(function(x){return x.code;})));