#!/usr/bin/env -Snode --experimental-wasm-modules --experimental-json-modules
import Cards from '../src/Cards.js';
import * as etgutil from '../src/etgutil.js';
import decks from '../src/Decks.json' assert { type: 'json' };
let pool = '';
function buildPool(x) {
	pool = etgutil.mergedecks(pool, x[1]);
}
decks.mage.forEach(buildPool);
decks.demigod.forEach(buildPool);
const a = [];
Cards.Codes.forEach(card => {
	if (
		!card.upped &&
		!card.shiny &&
		card.rarity > 0 &&
		card.rarity < 4 &&
		etgutil.count(pool, card.asUpped(false).code) === 0 &&
		etgutil.count(pool, card.asUpped(true).code) === 0
	)
		a.push(card);
});
a.forEach(x => console.log(x.name));
const pool2 = etgutil.deck2pool(pool),
	poolrank = [];
pool2.forEach((code, count) => {
	if (etgutil.asUpped(code, true) === code)
		pool2[etgutil.asUpped(code, false)] =
			(pool2[etgutil.asUpped(code, false)] ?? 0) + count;
});
pool2.forEach((code, count) => {
	const card = Cards.Codes[code];
	if (!card || card.upped || card.rarity < 1) return;
	poolrank.push([card.name, count]);
});
poolrank.sort((x, y) => x[1] - y[1]);
console.log(poolrank);
console.log(etgutil.encodedeck(a.map(x => x.code)));
