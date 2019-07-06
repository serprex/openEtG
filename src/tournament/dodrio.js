import { eleNames } from '../ui.js';

const bannedCards = new Set([
	'4vj',
	'4vl',
	'55v',
	'593',
	'5f9',
	'5ik',
	'5ig',
	'5io',
]);
export default function(deck) {
	const elementList = [];
	let eleCount, rareElement;
	for (let i = 0; i < deck.length; i++) {
		const card = deck[i];
		if (card.upped) return 'Your deck contains at least one upgraded card';
		if (~bannedCards.has(card.code)) return card.name + ' is banned';
		const ele = card.element;
		if (ele) {
			if (!elementList[ele]) {
				elementList[ele] = 0;
				eleCount++;
			}
			elementList[ele]++;
			if (eleCount > 3) return 'Your deck contains too many elements';
		}
		if (card.rarity >= 3) {
			if (!rareElement) rareElement = card.element;
			else if (rareElement != card.element)
				return 'Your deck contains rare cards from more than one element';
		}
	}
	for (let i = 0; i < elementList.length; i++) {
		if (elementList[i] && elementList[i] < 6)
			return `You have too few ${eleNames[i]} cards`;
	}
	if (eleCount < 3)
		return `Your deck contains too few elements (only ${eleCount})`;
	return 'Legal';
}
