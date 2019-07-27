import Cards from './Cards.js';
import * as etgutil from './etgutil.js';

export const rewardwords = {
	mark: -1,
	pillar: 0,
	rare: 3,
	shard: 4,
	nymph: 5,
};
const cardValues = new Float32Array([25 / 3, 1.375, 5, 30, 35, 250]),
	sellValues = new Uint8Array([5, 1, 3, 15, 20, 150]);
export const pveCostReward = new Uint8Array([
	0,
	10,
	5,
	25,
	10,
	60,
	20,
	222,
	10,
	55,
	20,
	111,
]);
export function cardValue(card) {
	return ~card.rarity
		? cardValues[card.rarity] * (card.upped ? 6 : 1) * (card.shiny ? 6 : 1)
		: 0;
}
export function sellValue(card) {
	return ~card.rarity
		? sellValues[card.rarity] * (card.upped ? 6 : 1) * (card.shiny ? 6 : 1)
		: 0;
}
export function arenaCost(lv) {
	return pveCostReward[lv ? 10 : 8];
}
export function calcWealth(cardpool, isDecoded) {
	if (!cardpool) return 0;
	let wealth = 0;
	function wealthIter(code, count) {
		const card = Cards.Codes[code];
		if (
			card &&
			card.rarity != -1 &&
			(card.rarity || card.upped || card.shiny)
		) {
			wealth += cardValue(card) * count;
		}
	}
	if (typeof cardpool === 'string') {
		for (const [code, count] of etgutil.iterraw(cardpool)) {
			wealthIter(code, count);
		}
	} else {
		cardpool.forEach(
			isDecoded
				? code => wealthIter(code, 1)
				: (count, code) => wealthIter(code, count),
		);
	}
	return wealth;
}
