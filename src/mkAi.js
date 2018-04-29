const etgutil = require('./etgutil'),
	Decks = require('./Decks.json'),
	options = require('./options'),
	RngMock = require('./RngMock'),
	sock = require('./sock'),
	store = require('./store'),
	userutil = require('./userutil'),
	util = require('./util'),
	mkDeck = require('./ai/deck'),
	mkGame = require('./mkGame');

exports.mkPremade = function(level, daily) {
	const name = level == 1 ? 'mage' : 'demigod';
	return () => {
		const urdeck = sock.getDeck(),
			{user} = store.store.getState(),
			minsize = user ? 31 : 11;
		if (etgutil.decklength(urdeck) < minsize) {
			store.store.dispatch(store.chatMsg(`Deck requires ${minsize} cards`, 'System'))
			return;
		}
		const cost = daily !== undefined ? 0 : userutil.pveCostReward[level * 2];
		let foedata;
		if (user) {
			if (daily === undefined) {
				if (user.gold < cost) {
					store.store.dispatch(store.chatMsg(`Requires ${cost}$`, 'System'));
					return;
				}
			} else {
				foedata = Decks[name][user[level == 1 ? 'dailymage' : 'dailydg']];
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
		if (!user) options.parsepvpstats(gameData);
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
		const urdeck = sock.getDeck(),
			{user} = store.store.getState(),
			minsize = user ? 31 : 11;
		if (etgutil.decklength(urdeck) < minsize) {
			store.store.dispatch(store.chatMsg(`Deck requires ${minsize} cards`, 'System'))
			return;
		}
		const cost = daily !== undefined ? 0 : userutil.pveCostReward[level * 2];
		if (user && cost) {
			if (user.gold < cost) {
				store.store.dispatch(store.chatMsg(`Requires ${cost}$`, 'System'));
				return;
			}
		}
		const deck = level == 0 ? mkDeck(0, 1, 2) : mkDeck(0.4, 2, 4);
		store.store.dispatch(store.setOptTemp('aideck', deck));

		const gameData = {
			level: level,
			deck: deck,
			urdeck: urdeck,
			seed: util.randint(),
			p2hp: level == 0 ? 100 : level == 1 ? 125 : 150,
			p2markpower: level > 1 ? 2 : 1,
			foename: RngMock.choose(randomNames),
			p2drawpower: level == 2 ? 2 : 1,
			ai: true,
		};
		if (!user) options.parsepvpstats(gameData);
		else gameData.cost = cost;
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
	}
};
