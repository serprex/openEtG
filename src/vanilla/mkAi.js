var ui = require('./ui');
var etg = require('./etg');
var sock = require('./sock');
var util = require('../util');
var store = require('./store');
var Cards = require('./Cards');
var etgutil = require('../etgutil');
var aiDecks = require('./Decks.json');
var RngMock = require('./RngMock');
var mkGame = require('./mkGame');

function run(gamedata) {
	console.log(gamedata);
	if (typeof gamedata === 'function') {
		return () => run(gamedata());
	}
	if (gamedata) {
		store.store.dispatch(store.doNav(require('./views/Match'), gamedata));
	}
};

exports.mkPremade = function() {
	return function() {
		var urdeck = sock.getDeck();
		if (urdeck.length < 9) {
			return;
		}
		var foedata = RngMock.choose(aiDecks);
		var gameData = {
			deck: etgutil.decodedeck(foedata[1]),
			urdeck: urdeck,
			seed: util.randint(),
			foename: foedata[0],
		};
		gameData.p2hp = 200;
		gameData.p2markpower = 3;
		gameData.p2drawpower = 2;
		gameData.level = 3;
		return mkGame(gameData, true);
	};
};
exports.mkAi = function(level) {
	return function() {
		var urdeck = sock.getDeck();
		var deck = require('./ai/deck')(level);
		if (urdeck.length < 9) {
			return;
		}
		var randomNames = [
			'Adrienne',
			'Audrie',
			'Billie',
			'Brendon',
			'Charles',
			'Caddy',
			'Dane',
			'Digna',
			'Emory',
			'Evan',
			'Fern',
			'Garland',
			'Gord',
			'Margie',
			'Mariah',
			'Martina',
			'Monroe',
			'Murray',
			'Page',
			'Pariah',
			'Rocky',
			'Ronald',
			'Ren',
			'Seth',
			'Sherman',
			'Stormy',
			'Tammi',
			'Yuriko',
		];

		var gameData = {
			deck: deck,
			urdeck: urdeck,
			seed: util.randint(),
			p2hp: level == 0 ? 100 : level == 1 ? 125 : 150,
			p2markpower: level > 1 ? 2 : 1,
			foename: RngMock.choose(randomNames),
			p2drawpower: level == 2 ? 2 : 1,
		};
		gameData.level = level;
		return mkGame(gameData, true);
	};
};
exports.run = run;
