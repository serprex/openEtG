"use strict";
var etg = require("./etg");
var ui = require("./uiutil");
var sock = require("./sock");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var initGame = require("./views/Match");
var startEditor = require("./views/Editor");
exports.mage = [
	["The Ashes", "085f0085gi045f4045f6015f7045fb015fg025f8045fc015fe018po"],
	["The Chromatic", "0153201563015980159901627044sa044sc064vj014vh014vk0152i0155u015cc015fi015iq015il015lp015os015ri015un018pi"],
	["The Clock", "0a5rg0a5t2045rk015s1045rl015ro045ru045s0025rm018ps"],
	["The Contagion", "065420652g0452o0152q0452u0252p0252r045un045uq018pt"],
	["The Dead", "04531044vq0852g0652v0252k0452n0252p0252r018pj"],
	["The Eater", "025630e576035910255p0455r0458t0258q0158v018pm"],
	["The Ethereal", "046200162204625046270861o0863a0261q0161u0461t018pu"],
	["The Gale", "045lb045lf015lh065oc0a5pu045oe015ol025or015op018pq"],
	["The Horde", "095bs085de045cb015ce045c6025c9025ca045cr018pn"],
	["The Mirror", "025020153503599046230f4sa0155v015cc015fc015in025lq015os015rl025vb018pu"],
	["The Pyre", "0a5f0045f1045f3065f9045f4045fa045l9018pm"],
	["The Swarm", "0156004564025660255q0e5t2045rk065rq015rs018pl"],
	["The Uncertainty", "025010h50u044vi044vk014vl044vs014vt018pi"],
	["The Vacuum", "06606065uk015ur045us045v3025uq045ut025up015uo018pt"],
	["The Wall", "0e5de015c5045c2045c8015ci015c3025l8025mq025lo045lm025ln025la015li018pq"],
	["The Waves", "01593035980858o0158s0c5i4045i6015ib015ic045ig018pm"],
	["The Weaponsmith", "044t4024tc044td045c7015c40e5gi045ff045fh025f6015f8018pn"],
	["The Weight", "035610456202565085760855k0255t0155p0455m0155s0255o018pl"],
];
exports.demigod = [
	["Akan", "0c7ac057bu037am027dm027dn027do017n0047n6067n3017nb037n9018pr"],
	["Anubis", "0e71002711037170472i0471l0371b067t7037t9047ti027ta018pt"],
	["Atomsk", "047ne027n90f7t4037t9027tb037ta047td027t5018pr"],
	["Gobannus", "0h7dg067e0067dv047n2037qb047th067tb027ta018pt"],
	["Halwn", "0b71006718047190472i0371a0371n0471j047aj018pn"],
	["Kenosis", "0f744057450674f067k9057jv037k7017k1018pq"],
	["Lycaon", "0a6ts066ve066u2066u1046ud046u7027th037tj027ta018pt"],
	["Neysa", "047gk0b7i6037h6067hb047k6067k5057n2018pq"],
	["Nirrti", "067180571a047n20h7q0037q4037qf067q5047qg018pk"],
	["Nosferatu", "047130c6qq016u1036u30177o0177g027aq027dm017h7017k2057n8017q5017th0380g018pr"],
	["Pele", "0j7780677g0277q0577h0377b037q4057ql027q3018ps"],
	["Suwako", "0b7ac067bu067ae017al037am047as0480d0380i018pu"],
	["Thetis", "047an047ap027aj0e7gk057h4037gq037h1037gr067gu018pn"],
];
exports.giveRandom = function(type) {
	return exports[type][Math.floor(Math.random() * exports[type].length)];
}
exports.mkPremade = function(name, daily) {
	return function() {
		var urdeck = sock.getDeck();
		if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
			startEditor();
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
				foedata = exports[name][sock.user[name == "mage" ? "dailymage" : "dailydg"]];
			}
		}
		if (!foedata) foedata = exports.giveRandom(name);
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
		return initGame(gameData, true);
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

			var foename = typeName[level] + "\n" + randomNames[etg.PlayerRng.upto(randomNames.length)];
			var gameData = { deck: deck, urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, p2hp: level == 0 ? 100 : level == 1 ? 125 : 150, p2markpower: level == 2 ? 2 : 1, foename: foename, p2drawpower: level == 2 ? 2 : 1 };
			if (!sock.user) ui.parsepvpstats(gameData);
			else gameData.cost = cost;
			gameData.level = level;
			if (daily !== undefined) gameData.daily = daily;
			return initGame(gameData, true);
		}
	}
}