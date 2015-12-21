var chat = require("./chat");
var sock = require("./sock");
var util = require("./util");
var Decks = require("./Decks.json");
var RngMock = require("./RngMock");
var etgutil = require("./etgutil");
var options = require("./options");
var userutil = require("./userutil");
var mkDeck = require("./ai/deck");

exports.mkPremade = function(level, daily) {
	var name = level == 1 ? "mage" : "demigod";
	return function() {
		var urdeck = sock.getDeck();
		if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
			require("./views/Editor")();
			return;
		}
		var cost = daily !== undefined ? 0 : userutil.pveCostReward[level*2], foedata;
		if (sock.user) {
			if (daily === undefined){
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "$", "System");
					return;
				}
			}else{
				foedata = Decks[name][sock.user[level == 1 ? "dailymage" : "dailydg"]];
			}
		}
		if (!foedata) foedata = RngMock.choose(Decks[name]);
		var gameData = { level: level, deck: foedata[1], urdeck: urdeck, seed: util.randint(), foename: foedata[0] };
		if (level == 1){
			gameData.p2hp = 125;
		}else{
			gameData.p2hp = 200;
			gameData.p2markpower = 3;
			gameData.p2drawpower = 2;
		}
		if (!sock.user) options.parsepvpstats(gameData);
		else gameData.cost = cost;
		if (daily !== undefined) gameData.daily = daily;
		return require("./views/Match")(gameData, true);
	}
}
exports.mkAi = function(level, daily) {
	return function() {
		var urdeck = sock.getDeck();
		if (etgutil.decklength(urdeck) < (sock.user ? 31 : 9)) {
			require("./views/Editor")();
			return;
		}
		var cost = daily !== undefined ? 0 : userutil.pveCostReward[level*2];
		if (sock.user && cost) {
			if (sock.user.gold < cost) {
				chat("Requires " + cost + "$", "System");
				return;
			}
		}
		var deck = level == 0 ? mkDeck(0, 1, 2) : mkDeck(.4, 2, 4);
		options.aideck = deck;

		var randomNames = [
			"Adrienne", "Audrie",
			"Billie", "Brendon",
			"Charles", "Caddy",
			"Dane", "Digna",
			"Emory", "Evan",
			"Fern",
			"Garland", "Gord",
			"Margie", "Mariah", "Martina", "Monroe", "Murray",
			"Page", "Pariah",
			"Rocky", "Ronald", "Ren",
			"Seth", "Sherman", "Stormy",
			"Tammi",
			"Yuriko"
		];

		var gameData = { deck: deck, urdeck: urdeck, seed: util.randint(), p2hp: level == 0 ? 100 : level == 1 ? 125 : 150, p2markpower: level > 1 ? 2 : 1, foename: RngMock.choose(randomNames), p2drawpower: level == 2 ? 2 : 1 };
		if (!sock.user) options.parsepvpstats(gameData);
		else gameData.cost = cost;
		gameData.level = level;
		if (daily !== undefined) gameData.daily = daily;
		return require("./views/Match")(gameData, true);
	}
}