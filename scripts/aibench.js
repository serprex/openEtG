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
		if (game.phase === etg.PlayPhase) {
			const aiState = new aiSearch(game);
			while (!aiState.cmd) {
				aiState.step(game);
			}
			const end = performance.now();
			timing.push(end - start);
			if (game.byId(game.turn).data.ai === 1) {
				for (const k in moves[m]) {
					if (moves[m][k] !== aiState.cmd[k]) {
						console.log(m, moves[m], aiState.cmd);
						break;
					}
				}
			}
		}
		game.next(moves[m]);
	}
	let totalTime = 0;
	for (const t of timing) {
		totalTime += t;
	}
	console.log(name, totalTime, totalTime / timing.length);
}

bench('goose-elf');
