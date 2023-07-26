import * as etg from './etg.js';
import * as wasm from './rs/pkg/etg.js';
import { randint, upto } from './util.js';
import { encodedeck } from './etgutil.js';

const aiNames = {
	[etg.Air]: ['Ari', 'es'],
	[etg.Aether]: ['Aeth', 'eric'],
	[etg.Darkness]: ['Shad', 'ow'],
	[etg.Death]: ['Mor', 'tis'],
	[etg.Earth]: ['Ter', 'ra'],
	[etg.Entropy]: ['Dis', 'cord'],
	[etg.Fire]: ['Pyr', 'ofuze'],
	[etg.Gravity]: ['Mas', 'sa'],
	[etg.Life]: ['Vit', 'al'],
	[etg.Light]: ['Lum', 'iel'],
	[etg.Time]: ['Chr', 'onos'],
	[etg.Water]: ['Aqua', 'rius'],
};

export function deckgen(uprate, markpower, maxRarity) {
	const es = upto(150);
	if (es < 144) {
		const e1 = ((es / 12) | 0) + 1,
			e2 = (es % 12) + 1;
		return [
			aiNames[e1][0] + aiNames[e2][1],
			encodedeck(wasm.deckgen_duo(e1, e2, uprate, markpower, maxRarity, randint())),
		]
	} else {
		return [
			"Celeste",
			encodedeck(wasm.deckgen_bow(uprate, markpower, maxRarity, randint())),
		];
	}
}

export function deckgenAi4() {
	const es = upto(144),
		e1 = ((es / 12) | 0) + 1,
		e2 = (es % 12) + 1;
	return [
		aiNames[e1][0] + aiNames[e2][1],
		encodedeck(wasm.deckgen_ai4(e1, e2)),
	];
}
