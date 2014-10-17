"use strict";
var fs = require("fs");
var Cards = require("../Cards");
exports.loadcards = function(){
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	for(var i=0; i<names.length; i++){
		Cards.parseCsv(i, fs.readFileSync(names[i] + ".csv").toString());
	}
	Cards.parseTargeting(fs.readFileSync("active.csv").toString());
	console.log("Cards loaded");
	Cards.loaded = true;
}
exports.prepuser = function(servuser){
	if (servuser.selectedDeck == null) servuser.selectedDeck = "0";
	["gold", "daily", "dailymage", "dailydg", "aiwins", "ailosses", "pvpwins", "pvplosses"].forEach(function(field){
		servuser[field] = parseInt(servuser[field] || 0);
	});
}
exports.useruser = function(db, servuser, cb){
	db.hgetall("Q:" + servuser.name, function(err, quest) {
		db.hgetall("D:" + servuser.name, function(err, decks) {
			cb({
				auth: servuser.auth,
				name: servuser.name,
				decknames: decks,
				selectedDeck: servuser.selectedDeck,
				pool: servuser.pool,
				accountbound: servuser.accountbound,
				gold: servuser.gold,
				ocard: servuser.ocard,
				freepacks: servuser.freepacks,
				aiwins: servuser.aiwins,
				ailosses: servuser.ailosses,
				pvpwins: servuser.pvpwins,
				pvplosses: servuser.pvplosses,
				daily: servuser.daily,
				dailymage: servuser.dailymage,
				dailydg: servuser.dailydg,
				quest: quest,
			});
		});
	});
}
exports.getDay = function(){
	return Math.floor(Date.now()/86400000);
}