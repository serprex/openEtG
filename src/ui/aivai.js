import CreateGame from '../Game.js';
import * as etg from '../etg.js';
import * as etgutil from '../etgutil.js';
import { randint } from '../util.js';
import AsyncWorker from '../AsyncWorker.js';

const AiWorker = import('../ai.worker.js');
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
	threadspan = document.getElementById('threadspan');
fight.addEventListener('click', fightItOut);
fight1000.addEventListener('click', fightItOut);
threadspan.textContent = threads.value;
document.getElementById('threads').addEventListener('input', e => {
	threadspan.textContent = threads.value;
});
function stopFight() {
	fight.style.display = 'block';
	fight1000.style.display = 'block';
	stop.style.display = 'none';

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
	fight.style.display = 'none';
	fight1000.style.display = 'none';
	stop.style.display = 'block';
	replay.textContent = '';
	let mode = this,
		fc = new Uint16Array(4);
	if (mode === fight1000) {
		aiWorker = [];
		for (let i = 0; i < threads.value; i++)
			aiWorker.push(new AsyncWorker(AiWorker));
	} else {
		aiWorker = new AsyncWorker(AiWorker);
	}
	const decks = deckeles.map(item => {
		const deckstr = item.value.trim();
		return deckstr.charAt(3) === ' '
			? etgutil.encodedeck(
					deckstr.split(' ').map(x => {
						const code = parseInt(x, 32);
						return ~etgutil.fromTrueMark(code) ? code : code - 4000;
					}),
			  )
			: deckstr;
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
				data.t ? '\tDISCARD ' + game.byId(data.t).card.name : ''
			}\n`;
		},
		cast(game, player, data) {
			const t = game.byId(data.t);
			return `${player}\t${game.byId(data.c).card.name}${
				t ? ` targets ${t.card ? t.card.name : t.id}` : ''
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
			const game = await CreateGame({ seed, set, players });
			const realp1 = game.byUser(0).id;

			while (game.phase < game.wasm.Phase.End) {
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
				game.next(cmd);
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
				const p0 = fc[0] + fc[2],
					p1 = fc[1] + fc[3];
				result.textContent = `${p0} : ${p1} (${((p0 / (p0 + p1)) * 100).toFixed(
					2,
				)}%)\nWith coin ${fc[0]} : ${fc[1]} (${(
					(fc[0] / (fc[0] + fc[1])) *
					100
				).toFixed(2)}%)\nWithout ${fc[2]} : ${fc[3]} (${(
					(fc[2] / (fc[2] + fc[3])) *
					100
				).toFixed(2)}%)`;
			}
		}
	}
	if (aiWorker instanceof Array) {
		for (const w of aiWorker) gameStep(w);
	} else {
		gameStep(aiWorker);
	}
}
