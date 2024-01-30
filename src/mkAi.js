import { decodedeck } from './etgutil.js';
import Cards from './Cards.js';
import Decks from './Decks.json' assert { type: 'json' };
import * as store from './store.jsx';
import { pveCostReward } from './userutil.js';
import { choose, randint, shuffle } from './util.js';
import { deckgen } from './deckgen.js';
import Game from './Game.js';

export function mkPremade(level, daily, datafn = null) {
	const name = level === 1 ? 'mage' : 'demigod';
	const urdeck = store.getDeck(),
		{ user } = store.state,
		minsize = user ? 30 : 10;
	if (!Cards.isDeckLegal(decodedeck(urdeck), user, minsize)) {
		store.chatMsg('Invalid deck', 'System');
		return;
	}
	const cost = daily !== undefined ? 0 : pveCostReward[level * 2];
	let foedata;
	if (user) {
		if (daily === undefined) {
			if (user.gold < cost) {
				store.requiresGold(cost);
				return;
			}
		} else {
			foedata = Decks[name][user[level === 1 ? 'dailymage' : 'dailydg']];
		}
	}
	foedata ??= choose(Decks[name]);
	const data = {
		level: level,
		seed: randint(),
		cost,
		rematch: () => store.navGame(mkPremade(level)),
		players: [
			{
				idx: 1,
				name: store.state.username,
				user: store.state.username,
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
	if (level === 1) {
		data.players[1].hp = 125;
	} else {
		data.players[1].hp = 200;
		data.players[1].markpower = 3;
		data.players[1].drawpower = 2;
	}
	shuffle(data.players);
	return new Game(datafn ? datafn(data) : data);
}
export function mkAi(level, daily, datafn = null) {
	const urdeck = store.getDeck(),
		{ user } = store.state,
		minsize = user ? 30 : 10;
	if (!Cards.isDeckLegal(decodedeck(urdeck), user, minsize)) {
		store.chatMsg('Invalid deck', 'System');
		return;
	}
	const cost = daily !== undefined ? 0 : pveCostReward[level * 2];
	if (cost && user.gold < cost) {
		store.requiresGold(cost);
		return;
	}
	const [aiName, deck] = level === 0 ? deckgen(0, 1, 2) : deckgen(40, 2, 3);
	store.setOptTemp('aideck', deck);

	const data = {
		level,
		seed: randint(),
		cost,
		rematch: () => store.navGame(mkAi(level)),
		players: [
			{
				idx: 1,
				name: store.state.username,
				user: store.state.username ?? '',
				deck: urdeck,
			},
			{
				idx: 2,
				ai: 1,
				name: aiName,
				deck: deck,
				hp:
					level === 0 ? 100
					: level === 1 ? 125
					: 150,
				drawpower: level > 1 ? 2 : 1,
				markpower: level > 1 ? 2 : 1,
			},
		],
	};
	if (daily !== undefined) data.daily = daily;
	shuffle(data.players);
	return new Game(datafn ? datafn(data) : data);
}
