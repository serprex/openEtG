const etgutil = require('./etgutil'),
	Cards = require('./Cards'),
	Decks = require('./Decks.json'),
	RngMock = require('./RngMock'),
	sock = require('./sock'),
	store = require('./store'),
	userutil = require('./userutil'),
	util = require('./util'),
	mkDeck = require('./deckgen/index'),
	Game = require('./Game');

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
	const data = {
		level: level,
		seed: util.randint(),
		cost,
		rematch: () => run(mkPremade(level)),
		players: [
			{
				idx: 1,
				name: user && user.name,
				user: user ? user.name : '',
				deck: urdeck,
			},
			{
				idx: 2,
				ai: 1,
				name: foedata[0],
				deck: foedata[1],
			},
		],
	};
	if (level == 1) {
		data.players[1].hp = 125;
	} else {
		data.players[1].hp = 200;
		data.players[1].markpower = 3;
		data.players[1].drawpower = 2;
	}
	RngMock.shuffle(data.players);
	if (daily !== undefined) data.daily = daily;
	return new Game(datafn ? datafn(data) : data);
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
		store.store.dispatch(store.chatMsg('Invalid deck', 'System'));
		return;
	}
	const cost = daily !== undefined ? 0 : userutil.pveCostReward[level * 2];
	if (user && cost && user.gold < cost) {
		store.store.dispatch(store.chatMsg(`Requires ${cost}$`, 'System'));
		return;
	}
	const deck = level == 0 ? mkDeck(0, 1, 2) : mkDeck(0.4, 2, 4);
	store.store.dispatch(store.setOptTemp('aideck', deck));

	const data = {
		level: level,
		seed: util.randint(),
		cost,
		rematch: () => run(mkAi(level)),
		players: [
			{ idx: 1, name: user.name, user: user ? user.name : '', deck: urdeck },
			{
				idx: 2,
				ai: 1,
				name: RngMock.choose(randomNames),
				deck: deck,
				hp: level === 0 ? 100 : level === 1 ? 125 : 150,
				drawpower: level > 1 ? 2 : 1,
				markpower: level > 1 ? 2 : 1,
			},
		],
	};
	if (daily !== undefined) data.daily = daily;
	RngMock.shuffle(data.players);
	return new Game(datafn ? datafn(data) : data);
};
exports.run = run;
