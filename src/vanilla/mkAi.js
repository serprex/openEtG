import * as sock from './sock.js';
import * as util from '../util.js';
import * as store from './store.js';
import * as etgutil from '../etgutil';
import aiDecks from './Decks.json';
import RngMock from './RngMock.js';
import mkGame from './mkGame.js';
import deckgen from './ai/deck.js';

export function run(game) {
	if (game) {
		store.store.dispatch(store.doNav(import('./views/Match'), { game }));
	}
}

export function mkPremade() {
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
}
export function mkAi(level) {
	var urdeck = sock.getDeck();
	var deck = deckgen(level);
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
}
