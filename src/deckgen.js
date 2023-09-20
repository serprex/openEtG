import * as wasm from './rs/pkg/etg.js';
import { randint, upto } from './util.js';
import { encodedeck } from './etgutil.js';

// prettier-ignore
export const aiNames = [
	,,
	'Dis', 'cord',
	'Mor', 'tis',
	'Mas', 'sa',
	'Ter', 'ra',
	'Vit', 'al',
	'Pyr', 'ofuze',
	'Aqua', 'rius',
	'Lum', 'iel',
	'Ari', 'es',
	'Chr', 'onos',
	'Shad', 'ow',
	'Aeth', 'eric',
];

export function deckgen(uprate, markpower, maxRarity) {
	const es = upto(150);
	if (es < 144) {
		const e1 = ((es / 12) | 0) + 1,
			e2 = (es % 12) + 1;
		return [
			aiNames[e1 * 2] + aiNames[e2 * 2 + 1],
			encodedeck(
				wasm.deckgen_duo(e1, e2, uprate, markpower, maxRarity, randint()),
			),
		];
	} else {
		return [
			'Celeste',
			encodedeck(wasm.deckgen_bow(uprate, markpower, maxRarity, randint())),
		];
	}
}

export function deckgenAi4() {
	const es = upto(144),
		e1 = ((es / 12) | 0) + 1,
		e2 = (es % 12) + 1;
	return [
		aiNames[e1 * 2] + aiNames[e2 * 2 + 1],
		encodedeck(wasm.deckgen_ai4(e1, e2)),
	];
}
