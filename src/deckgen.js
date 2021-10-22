import etgwasm from './wasm.js';
import { randint } from './util.js';
import { encodedeck } from './etgutil.js';

export default async function deckgen(uprate, markpower, maxRarity) {
	const wasm = await etgwasm,
		r = Math.random() * 13,
		f = r < 12 ? wasm.deckgen_duo : wasm.deckgen_bow;
	return encodedeck(f(uprate, markpower, maxRarity, randint()));
}
