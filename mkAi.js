var etg = require("./etg");
var ui = require("./uiutil");
var chat = require("./chat");
var sock = require("./sock");
var Cards = require("./Cards");
var aiDecks = require("./Decks");
var etgutil = require("./etgutil");
exports.mkPremade = function(name, daily) {
	return function() {
		var urdeck = sock.getDeck();
		if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
			require("./views/Editor")();
			return;
		}
		var cost = daily !== undefined ? 0 : name == "mage" ? 5 : 20, foedata;
		if (sock.user) {
			if (daily === undefined){
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "\u00A4");
					return;
				}
			}else{
				foedata = aiDecks[name][sock.user[name == "mage" ? "dailymage" : "dailydg"]];
			}
		}
		if (!foedata) foedata = aiDecks.giveRandom(name);
		var foename = name[0].toUpperCase() + name.slice(1) + "\n" + foedata[0];
		var gameData = { deck: foedata[1], urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, foename: foename };
		if (name == "mage"){
			gameData.p2hp = 125;
		}else{
			gameData.p2hp = 200;
			gameData.p2markpower = 3;
			gameData.p2drawpower = 2;
		}
		if (!sock.user) ui.parsepvpstats(gameData);
		else gameData.cost = cost;
		gameData.level = name == "mage" ? 1 : 3;
		if (daily !== undefined) gameData.daily = daily;
		return require("./views/Match")(gameData, true);
	}
}
exports.mkAi = function(level, daily) {
	return function() {
		if (Cards.loaded){
			var urdeck = sock.getDeck();
			if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
				require("./views/Editor")();
				return;
			}
			var cost = daily !== undefined || level == 0 ? 0 : level == 1 ? 5 : 10;
			if (sock.user && cost) {
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "\u00A4");
					return;
				}
			}
			var deck = require("./ai/deck")(level);
			aideck.value = deck;

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
			var typeName = ["Commoner", "Mage", "Champion"];

			var foename = typeName[level] + "\n" + etg.PlayerRng.choose(randomNames);
			var gameData = { deck: deck, urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, p2hp: level == 0 ? 100 : level == 1 ? 125 : 150, p2markpower: level == 2 ? 2 : 1, foename: foename, p2drawpower: level == 2 ? 2 : 1 };
			if (!sock.user) ui.parsepvpstats(gameData);
			else gameData.cost = cost;
			gameData.level = level;
			if (daily !== undefined) gameData.daily = daily;
			return require("./views/Match")(gameData, true);
		}
	}
}