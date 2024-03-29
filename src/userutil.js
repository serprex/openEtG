import { iterraw } from './etgutil.js';

const cardValues24 = new Uint16Array([200, 33, 120, 720, 6000]),
	sellValues = new Uint8Array([5, 1, 3, 15, 150]);
export const pveCostReward = new Uint8Array([
	0, 9, 1, 16, 15, 70, 30, 250, 20, 100, 30, 200,
]);
function cardValue24(card) {
	return ~card.rarity ?
			cardValues24[card.rarity] * (card.upped ? 6 : 1) * (card.shiny ? 6 : 1)
		:	0;
}
export function cardValue(card) {
	return cardValue24(card) / 24;
}
export function sellValue(card) {
	return ~card.rarity ?
			sellValues[card.rarity] * (card.upped ? 6 : 1) * (card.shiny ? 6 : 1)
		:	0;
}
export function arenaCost(lv) {
	return pveCostReward[lv ? 10 : 8];
}
export function calcWealth(Cards, cardpool, isDecoded) {
	if (!cardpool) return 0;
	let wealth = 0;
	function wealthIter(code, count) {
		const card = Cards.Codes[code];
		if (
			card &&
			card.rarity !== -1 &&
			(card.rarity || card.upped || card.shiny)
		) {
			wealth += cardValue24(card) * count;
		}
	}
	if (typeof cardpool === 'string') {
		for (const [code, count] of iterraw(cardpool)) {
			wealthIter(code, count);
		}
	} else {
		cardpool.forEach(
			isDecoded ?
				code => wealthIter(code, 1)
			:	(count, code) => wealthIter(code, count),
		);
	}
	return wealth / 24;
}
