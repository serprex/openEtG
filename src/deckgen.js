import wasm from './wasm.js';
import { randint } from './util.js';
import { encodedeck } from './etgutil.js';

export default function deckgen(uprate, markpower, maxRarity) {
	const r = Math.random() * 13,
		f = r < 12 ? wasm.deckgen_duo : wasm.deckgen_bow;
	return encodedeck(f(uprate, markpower, maxRarity, randint()));
}
