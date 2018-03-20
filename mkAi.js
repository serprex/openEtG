const chat = require('./chat'),
	sock = require('./sock'),
	util = require('./util'),
	Decks = require('./Decks.json'),
	RngMock = require('./RngMock'),
	etgutil = require('./etgutil'),
	options = require('./options'),
	store = require('./store'),
	userutil = require('./userutil'),
	mkDeck = require('./ai/deck'),
	mkGame = require('./mkGame');

exports.mkPremade = function(level, daily) {
	const name = level == 1 ? 'mage' : 'demigod';
	return () => {
		const urdeck = sock.getDeck();
		if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
			return;
		}
		const cost = daily !== undefined ? 0 : userutil.pveCostReward[level * 2];
		let foedata;
		if (sock.user) {
			if (daily === undefined) {
				if (sock.user.gold < cost) {
					chat('Requires ' + cost + '$', 'System');
					return;
				}
			} else {
				foedata = Decks[name][sock.user[level == 1 ? 'dailymage' : 'dailydg']];
			}
		}
		if (!foedata) foedata = RngMock.choose(Decks[name]);
		const gameData = {
			level: level,
			deck: foedata[1],
			urdeck: urdeck,
			seed: util.randint(),
			foename: foedata[0],
			ai: true,
		};
		if (level == 1) {
			gameData.p2hp = 125;
		} else {
			gameData.p2hp = 200;
			gameData.p2markpower = 3;
			gameData.p2drawpower = 2;
		}
		if (!sock.user) options.parsepvpstats(gameData);
		else gameData.cost = cost;
		if (daily !== undefined) gameData.daily = daily;
		return mkGame(gameData);
	};
};
const randomNames = [
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
exports.mkAi = function(level, daily) {
	return () => {
		const urdeck = sock.getDeck();
		if (etgutil.decklength(urdeck) < (sock.user ? 31 : 9)) {
			return;
		}
		const cost = daily !== undefined ? 0 : userutil.pveCostReward[level * 2];
		if (sock.user && cost) {
			if (sock.user.gold < cost) {
				chat('Requires ' + cost + '$', 'System');
				return;
			}
		}
		const deck = level == 0 ? mkDeck(0, 1, 2) : mkDeck(0.4, 2, 4);
		store.store.dispatch(store.setOptTemp('aideck', deck));

		const gameData = {
			deck: deck,
			urdeck: urdeck,
			seed: util.randint(),
			p2hp: level == 0 ? 100 : level == 1 ? 125 : 150,
			p2markpower: level > 1 ? 2 : 1,
			foename: RngMock.choose(randomNames),
			p2drawpower: level == 2 ? 2 : 1,
			ai: true,
		};
		if (!sock.user) options.parsepvpstats(gameData);
		else gameData.cost = cost;
		gameData.level = level;
		if (daily !== undefined) gameData.daily = daily;
		return mkGame(gameData);
	};
};
exports.run = function run(gamedata) {
	if (typeof gamedata === 'function') {
		return () => run(gamedata());
	}
	if (gamedata) {
		store.store.dispatch(store.doNav(require('./views/Match'), gamedata));
	} else {
		store.store.dispatch(store.doNav(require('./views/Editor')));
	}
};
