const etgutil = require('./etgutil'),
	Cards = require('./Cards'),
	Decks = require('./Decks.json'),
	options = require('./options'),
	RngMock = require('./RngMock'),
	sock = require('./sock'),
	store = require('./store'),
	userutil = require('./userutil'),
	util = require('./util'),
	mkDeck = require('./ai/deck'),
	mkGame = require('./mkGame');

function run(game) {
	if (game) {
		store.store.dispatch(store.doNav(require('./views/Match'), { game }));
	}
}

exports.mkPremade = function mkPremade(level, daily, datafn = null) {
	const name = level == 1 ? 'mage' : 'demigod';
	const urdeck = sock.getDeck(),
		{ user } = store.store.getState(),
		minsize = user ? 30 : 10;
	if (!Cards.isDeckLegal(etgutil.decodedeck(urdeck), user, minsize)) {
		store.store.dispatch(store.chatMsg(`Invalid deck`, 'System'));
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
		ai: 1,
		rematch: () => run(mkPremade(level)),
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
	return mkGame(datafn ? datafn(gameData) : gameData);
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
exports.mkAi = function mkAi(level, daily, datafn = null) {
	const urdeck = sock.getDeck(),
		{ user } = store.store.getState(),
		minsize = user ? 30 : 10;
	if (!Cards.isDeckLegal(etgutil.decodedeck(urdeck), user, minsize)) {
		store.store.dispatch(store.chatMsg(`Invalid deck`, 'System'));
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
		ai: 1,
		rematch: () => run(mkAi(level)),
	};
	if (!user) options.parsepvpstats(gameData);
	else gameData.cost = cost;
	if (daily !== undefined) gameData.daily = daily;
	return mkGame(datafn ? datafn(gameData) : gameData);
};
exports.run = run;
