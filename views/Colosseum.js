"use strict";
var px = require("./px");
var sock = require("./sock");
var aiDecks = require("./Decks");
var mkAi = require("./mkAi");
var startMenu = require("./MainMenu");
function mkDaily(type) {
	if (type < 3) {
		return function() {
			var dataNext = type == 1 ?
				{ goldreward: 150, endurance: 2, cost: 0, daily: 1, cardreward: "", noheal: true} :
				{ goldreward: 500, endurance: 2, cost: 0, daily: 2, cardreward: "" };
			var game = mkAi.mkAi(type == 1 ? 0 : 2, type)();
			game.addData(dataNext);
			game.dataNext = dataNext;
		}
	}
	else {
		return function() {
			var game = mkAi.mkPremade(type == 3 ? "mage" : "demigod", type)();
			game.addonreward = type == 3 ? 50 : 100;
			sock.userExec("donedaily", { daily: type });
		}
	}
}
module.exports = function(){
	var magename = aiDecks.mage[sock.user.dailymage][0];
	var dgname = aiDecks.demigod[sock.user.dailydg][0];
	var events = [
		{ name: "Novice Endurance", desc: "Fight 3 Commoners in a row without healing in between. May try until you win." },
		{ name: "Expert Endurance", desc: "Fight 3 Champions in a row. May try until you win." },
		{ name: "Novice Duel", desc: "Fight " + magename + ". Only one attempt allowed." },
		{ name: "Expert Duel", desc: "Fight " + dgname + ". Only one attempt allowed." }
	];
	var div = [[50, 50, ["Exit", startMenu]]];
	for (var i = 1;i < 5;i++) {
		var active = !(sock.user.daily & (1 << i));
		if (active) {
			div.push([50, 100 + 30 * i, ["Fight!", mkDaily(i)]]);
		}
		div.push([130, 100 + 30 * i, active ? (events[i-1].name + ": " + events[i-1].desc) : i > 2 ? (sock.user.daily&(i==3?1:32) ? "You defeated this already today." : "You failed this today. Better luck tomorrow!") : "Completed."]);
	}
	if (sock.user.daily == 63){
		div.push([50, 280, ["Nymph!", function(){
			var etg = require("./etg");
			var nymph = etg.NymphList[etg.PlayerRng.uptoceil(12)];
			sock.userExec("donedaily", {daily: 6, c: nymph});
			startMenu(nymph);
		}]], [130, 280, "You successfully completed all tasks."]);
	}
	px.refreshRenderer({div: {colo: div}});
}