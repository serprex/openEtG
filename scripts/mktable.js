#!/usr/bin/env -Snode --experimental-wasm-modules --experimental-json-modules
const write = process.stdout.write.bind(process.stdout);
function writetd(...args) {
	write('[tr]');
	for (const arg of args) if (arg !== undefined) write(`[td]${arg}[/td]`);
	write('[/tr]');
}
import Cards from '../src/Cards.js';
import decks from '../src/Decks.json' assert { type: 'json' };
import { eleNames } from '../src/ui.js';
if (process.argv.length < 3) {
	write('[right][table]');
	writetd('Tot', 'E', 'C', 'P', 'S', '|', 'R', 'U', 'C', '', '');
	for (let i = 0; i < 13; i++) {
		const ofele = [];
		Cards.Codes.forEach(card => {
			if (!card.upped && !card.shiny && card.element === i) ofele.push(card);
		});
		let creas = 0,
			perms = 0,
			spels = 0,
			comm = new Uint32Array(3),
			last = 0;
		for (const x of ofele) {
			if (x.type <= 2) perms++;
			else if (x.type === 4) creas++;
			else if (x.type === 3) spels++;
			if (x.rarity > 0 && x.rarity < 4) {
				comm[x.rarity - 1]++;
				if (x.code > last) last = x.code;
			}
		}
		writetd(
			ofele.length,
			':' + eleNames[i].toLowerCase(),
			creas,
			perms,
			spels,
			'|',
			comm[2],
			comm[1],
			comm[0],
			last.toString(32),
			(last + 2000).toString(32),
		);
	}
	write('[/table][/right]\n');
} else if (process.argv[2]) {
	decks[process.argv[2]].forEach(deck =>
		write(`[deck title=${deck[0]}]${deck[1]}[/deck]`),
	);
}
