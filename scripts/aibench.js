#!/usr/bin/env -Snode --experimental-wasm-modules --experimental-json-modules --prof

import perf_hooks from 'perf_hooks';
const { performance } = perf_hooks;

import CreateGame from '../src/Game.js';
import replays from './replays.json';

async function bench(name) {
	const replay = replays[name];
	if (!replay) return;
	const game = await CreateGame(replay);
	const { moves } = replay;
	const timing = [];
	for (let m = 0; m < moves.length; m++) {
		if (game.phase === game.wasm.Phase.Play) {
			const start = performance.now();
			const cmd = game.aiSearch();
			const end = performance.now();
			timing.push(end - start);
			if (game.byId(game.turn).data.ai) {
				for (const k in moves[m]) {
					if (moves[m][k] !== cmd[k]) {
						console.log(m, moves[m], cmd);
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

Error.stackTraceLimit = Infinity;
await Promise.all(process.argv.map(bench));
