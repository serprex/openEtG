"use strict";
var px = require("./px");
var sock = require("./sock");
var aiDecks = require("./Decks");
var startMenu = require("./MainMenu");
function mkDaily(type) {
	if (type < 3) {
		return function() {
			var dataNext = type == 1 ?
				{ goldreward: 75, endurance: 2, cost: 0, daily: 1, cardreward: "", noheal: true} :
				{ goldreward: 200, endurance: 2, cost: 0, daily: 2, cardreward: "" };
			var game = aiDecks.mkAi(type == 1 ? 0 : 2, type)();
			game.addData(dataNext);
			game.dataNext = dataNext;
		}
	}
	else {
		return function() {
			var game = aiDecks.mkPremade(type == 3 ? "mage" : "demigod", type)();
			game.addonreward = type == 3 ? 30 : 100;
			sock.userExec("donedaily", { daily: type });
		}
	}
}
module.exports = function(){
	var coloui = px.mkView();
	var magename = aiDecks.mage[sock.user.dailymage][0];
	var dgname = aiDecks.demigod[sock.user.dailydg][0];
	var events = [
		{ name: "Novice Endurance", desc: "Fight 3 Commoners in a row without healing in between. May try until you win." },
		{ name: "Expert Endurance", desc: "Fight 3 Champions in a row. May try until you win." },
		{ name: "Novice Duel", desc: "Fight " + magename + ". Only one attempt allowed." },
		{ name: "Expert Duel", desc: "Fight " + dgname + ". Only one attempt allowed." }
	];
	for (var i = 1;i < 5;i++) {
		var active = !(sock.user.daily & (1 << i));
		if (active) {
			var button = px.mkButton(50, 100 + 30 * i, "Fight!");
			px.setClick(button, mkDaily(i));
			coloui.addChild(button);
		}
		var text = new px.MenuText(130, 100 + 30 * i, active ? (events[i-1].name + ": " + events[i-1].desc) : i > 2 ? (sock.user.daily&(i==3?1:32) ? "You defeated this already today." : "You failed this today. Better luck tomorrow!") : "Completed.");
		coloui.addChild(text);
	}
	if (sock.user.daily == 63){
		var button = px.mkButton(50, 280, "Nymph!");
		px.setClick(button, function(){
			var nymph = etg.NymphList[etg.PlayerRng.uptoceil(12)];
			sock.userExec("addcards", {c: "01"+nymph});
			sock.userExec("donedaily", {daily: 6});
			startMenu(nymph);
		});
		coloui.addChild(button);
		coloui.addChild(new px.MenuText(130, 280, "You successfully completed all tasks."));
	}

	var bexit = px.mkButton(50, 50, "Exit");
	px.setClick(bexit, startMenu);
	coloui.addChild(bexit);

	px.refreshRenderer(coloui);
}