import perf_hooks from 'perf_hooks';
const { performance } = perf_hooks;

import * as etg from '../src/etg.js';
import Game from '../src/Game.js';
import aiSearch from '../src/ai/search.js';
import replays from './replays.json';

function bench(name) {
	const replay = replays[name];
	const game = new Game(replay);
	game.effects = null;
	const { moves } = replay;
	const timing = [];
	for (let m = 0; m < moves.length; m++) {
		const start = performance.now();
		game.next(moves[m]);
		if (game.phase === etg.PlayPhase) {
			const aiState = new aiSearch(game);
			while (!aiState.cmd) {
				aiState.step(game);
			}
			const end = performance.now();
			timing.push(end - start);
		}
	}
	let totalTime = 0;
	for (const t of timing) {
		totalTime += t;
	}
	console.log(name, totalTime, totalTime / timing.length);
}

bench('goose-elf');
