"use strict";
var fs = require("fs");
var Cards = require("./Cards");
exports.loadcards = function(){
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	for(var i=0; i<names.length; i++){
		Cards.parseCsv(i, fs.readFileSync(__dirname + "/" + names[i] + ".csv").toString());
	}
	Cards.parseTargeting(fs.readFileSync(__dirname + "/active.csv").toString());
	console.log("Cards loaded");
	Cards.loaded = true;
}
exports.prepuser = function(servuser){
	["gold", "selectedDeck", "daily", "dailymage", "dailydg", "aiwins", "ailosses", "pvpwins", "pvplosses"].forEach(function(field){
		servuser[field] = parseInt(servuser[field] || 0);
	});
}
exports.useruser = function(db, servuser, cb){
	db.hgetall("Q:" + servuser.name, function (err, obj) {
		cb({
			auth: servuser.auth,
			name: servuser.name,
			decks: servuser.decks,
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
			quest: obj,
		});
	});
}
exports.getDay = function(){
	return Math.floor(Date.now()/86400000);
}