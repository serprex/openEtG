#!/usr/bin/node
'use strict';
const write = process.stdout.write.bind(process.stdout);
function writetd(...args) {
	write('[tr]');
	for (const arg of args) if (arg !== undefined) write(`[td]${arg}[/td]`);
	write('[/tr]');
}
import * as etg from '../src/etg.js';
import Cards from '../src/Cards.js';
import decks from '../src/Decks.json';
import { eleNames } from '../src/ui.js';
if (process.argv.length < 3) {
	write('[right][table]');
	writetd('Tot', 'E', 'C', 'P', 'S', '|', 'R', 'U', 'C', '', '');
	for (let i = 0; i < 13; i++) {
		const ofele = Cards.filter(false, x => x.element == i);
		let creas = 0,
			perms = 0,
			spels = 0,
			comm = new Uint32Array(3),
			last = 0;
		ofele.forEach(x => {
			if (x.type <= etg.Permanent) perms++;
			else if (x.type == etg.Creature) creas++;
			else if (x.type == etg.Spell) spels++;
			if (x.rarity > 0 && x.rarity < 4) {
				comm[x.rarity - 1]++;
				if (x.code > last) last = x.code;
			}
		});
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
