"use strict";
var px = require("../px");
var dom = require("../dom");
var mkAi = require("../mkAi");
var sock = require("../sock");
var Decks = require("../Decks.json");
var RngMock = require("../RngMock");
var startMenu = require("./MainMenu");
function mkDaily(type) {
	if (type < 3) {
		return function() {
			var dataNext = type == 1 ?
				{ goldreward: 200, endurance: 2, cost: 0, daily: 1, cardreward: "", noheal: true} :
				{ goldreward: 500, endurance: 1, cost: 0, daily: 2, cardreward: "" };
			var game = mkAi.mkAi(type == 1 ? 0 : 2, type)();
			if (game){
				game.addData(dataNext);
				game.dataNext = dataNext;
			}
		}
	}
	else {
		return function() {
			var game = mkAi.mkPremade(type == 3 ? 1 : 3, type)();
			if (game){
				game.addonreward = type == 3 ? 90 : 200;
				sock.userExec("donedaily", { daily: type });
			}
		}
	}
}
module.exports = function(){
	var magename = Decks.mage[sock.user.dailymage][0];
	var dgname = Decks.demigod[sock.user.dailydg][0];
	var events = [
		"Novice Endurance Fight 3 Commoners in a row without healing in between. May try until you win.",
		"Expert Endurance: Fight 2 Champions in a row. May try until you win.",
		"Novice Duel: Fight " + magename + ". Only one attempt allowed.",
		"Expert Duel: Fight " + dgname + ". Only one attempt allowed."];
	var div = dom.div([50, 50, ["Exit", startMenu]]);
	for (var i = 1;i < 5;i++) {
		var active = !(sock.user.daily & (1 << i));
		if (active) {
			dom.add(div, [50, 100 + 30 * i, ["Fight!", mkDaily(i)]]);
		}
		dom.add(div, [130, 100 + 30 * i, active ? events[i-1] : i > 2 ? (sock.user.daily&(i==3?1:32) ? "You defeated this already today." : "You failed this today. Better luck tomorrow!") : "Completed."]);
	}
	if (sock.user.daily == 191){
		dom.add(div, [50, 280, ["Nymph!", function(){
			var etg = require("../etg");
			var nymph = etg.NymphList[RngMock.upto(12)+1];
			sock.userExec("donedaily", {daily: 6, c: nymph});
			startMenu(nymph);
		}]], [130, 280, "You successfully completed all tasks."]);
	}
	px.view({dom:div});
}