import { deckgen_duo, deckgen_bow } from './Game.js';

export default function deckgen(uprate, markpower, maxRarity) {
	const r = Math.random() * 13,
		f = r < 12 ? deckgen_duo : deckgen_bow;
	return f(uprate, markpower, maxRarity);
}
