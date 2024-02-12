import Game from '../Game.js';
import * as wasm from '../rs/pkg/etg.js';
import { encodedeck, fromTrueMark } from '../etgutil.js';
import { randint } from '../util.js';
import AiWorker from '../AiWorker.js';

let aiWorker = null;

const deckeles = [
	document.getElementById('deck1'),
	document.getElementById('deck2'),
];
const seedput = document.getElementById('seed'),
	result = document.getElementById('result'),
	replay = document.getElementById('replay'),
	stop = document.getElementById('stop'),
	fight = document.getElementById('fight'),
	fight1000 = document.getElementById('fight1000'),
	threads = document.getElementById('threads'),
	threadspan = document.getElementById('threadspan'),
	limit = document.getElementById('limit');
fight.addEventListener('click', fightItOut);
fight1000.addEventListener('click', fightItOut);
threadspan.textContent = threads.value;
document.getElementById('threads').addEventListener('input', e => {
	threadspan.textContent = threads.value;
});
function stopFight() {
	fight.style.visibility = 'visible';
	fight1000.style.visibility = 'visible';
	stop.style.visibility = 'hidden';

	if (aiWorker) {
		if (aiWorker instanceof Array) {
			for (const w of aiWorker) w.terminate();
		} else {
			aiWorker.terminate();
		}
		aiWorker = null;
	}
}
stop.addEventListener('click', stopFight);
function fightItOut() {
	const start = Date.now();
	fight.style.visibility = 'hidden';
	fight1000.style.visibility = 'hidden';
	stop.style.visibility = 'visible';
	replay.textContent = '';
	let mode = this,
		fc = new Uint16Array(4),
		plysum = 0;
	if (mode === fight1000) {
		aiWorker = [];
		for (let i = 0; i < threads.value; i++) aiWorker.push(new AiWorker());
	} else {
		aiWorker = new AiWorker();
	}
	const decks = deckeles.map(item => {
		const deckstr = item.value.trim();
		return deckstr.charAt(3) === ' ' ?
				encodedeck(
					deckstr.split(' ').map(x => {
						const code = parseInt(x, 32);
						return ~fromTrueMark(code) ? code : code - 4000;
					}),
				)
			:	deckstr;
	});
	const set =
		parseInt(decks[0].slice(2, 5), 32) < 5000 ? 'Original' : undefined;
	result.textContent = '';
	replay.textContent = '';
	const cmds = {
		mulligan(game, player, data) {
			return `${player}\tMULLIGAN\n`;
		},
		end(game, player, data) {
			return `${player}\tEND TURN ${game.countPlies()}${
				data.t ? '\tDISCARD ' + game.getCard(data.t).name : ''
			}\n`;
		},
		cast(game, player, data) {
			return `${player}\t${game.getCard(data.c).name}${
				data.t ?
					` targets ${
						game.getCard(data.t) ? game.getCard(data.t).name : data.t
					}`
				:	''
			}\n`;
		},
	};
	async function gameStep(worker) {
		for (;;) {
			const seed = (mode === fight && parseInt(seedput.value)) || randint();
			const players = decks.map((deck, i) => ({
				idx: i,
				user: i,
				name: i.toString(),
				deck,
			}));
			if (seed & 1) players.reverse();
			const game = new Game({ seed, set, players });
			const realp1 = game.userId(0);

			while (game.phase < wasm.Phase.End) {
				const msg = await worker.send({
					data: game.data,
					moves: game.replay,
				});
				if (!msg) return;
				const {
					data: { cmd },
				} = msg;
				if (mode === fight && cmds[cmd.x]) {
					result.textContent += cmds[cmd.x](
						game,
						game.turn === realp1 ? 1 : 2,
						cmd,
					);
				}
				game.nextCmd(cmd, false);
			}

			if (mode === fight) {
				console.log(Date.now() - start);
				result.textContent = `Player ${
					game.winner === realp1 ? 1 : 2
				} wins. ${game.countPlies()}\n${result.textContent}`;
				replay.textContent = JSON.stringify({
					...game.data,
					moves: game.replay,
				});
				return stopFight();
			} else {
				fc[(game.winner !== realp1) | (players[0].user << 1)]++;
				plysum += game.countPlies();
				const p0 = fc[0] + fc[2],
					p1 = fc[1] + fc[3],
					p01 = p0 + p1;
				result.textContent = `${p0} : ${p1} (${((p0 / p01) * 100).toFixed(
					2,
				)}%) ${(plysum / p01).toFixed(2)}ptw\nWith coin ${fc[0]} : ${fc[1]} (${(
					(fc[0] / (fc[0] + fc[1])) *
					100
				).toFixed(2)}%)\nWithout ${fc[2]} : ${fc[3]} (${(
					(fc[2] / (fc[2] + fc[3])) *
					100
				).toFixed(2)}%)`;
				if (limit.value && limit.value <= p01) {
					return stopFight();
				}
			}
		}
	}
	if (aiWorker instanceof Array) {
		for (const w of aiWorker) gameStep(w);
	} else {
		gameStep(aiWorker);
	}
}
