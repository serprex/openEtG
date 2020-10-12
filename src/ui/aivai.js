import Game from '../Game.js';
import * as etg from '../etg.js';
import * as etgutil from '../etgutil.js';
import aiSearch from '../ai/search.js';
import aiMulligan from '../ai/mulligan.js';
import * as util from '../util.js';
import AsyncWorker from '../AsyncWorker.js';

const aiWorker = new AsyncWorker(import('../ai/ai.worker.js'));

const deckeles = [
	document.getElementById('deck1'),
	document.getElementById('deck2'),
];
const seedput = document.getElementById('seed'),
	result = document.getElementById('result'),
	fight = document.getElementById('fight'),
	fight1000 = document.getElementById('fight1000');
fight.addEventListener('click', fightItOut);
fight1000.addEventListener('click', fightItOut);
function mkGame(seed, set, decks) {
	const players = decks.map((deck, i) => ({
		idx: i,
		user: i,
		deck,
	}));
	if (seed & 1) players.reverse();
	return new Game({ seed, set, players });
}
let stopFight = false;
function fightItOut() {
	const start = Date.now();
	let mode = this,
		fc = new Uint16Array(2);
	if (mode === fight1000) {
		if (fight1000.value.match(/^Stop/)) {
			stopFight = true;
			fight1000.value = 'Stopping..';
			return;
		} else {
			fight1000.value = 'Stop';
		}
	}
	const decks = deckeles.map(item => {
		const deckstr = item.value.trim();
		if (deckstr.charAt(3) === ' ') {
			return etgutil.encodedeck(
				deckstr.split(' ').map(x => parseInt(x, 32) - 4000),
			);
		}
		return deckstr;
	});
	const seed = parseInt(seedput.value) || util.randint();
	let set = undefined;
	for (const [code, count] of etgutil.iterraw(decks[0])) {
		if (code < 5000) {
			set = 'Original';
			break;
		}
	}
	result.textContent = '';
	let game = mkGame(seed, set, decks),
		realp1 = game.byUser(0).id;
	result.textContent = '';
	const cmds = {
		end(data) {
			if (mode === fight) {
				result.textContent += `${
					game.turn === realp1 ? 1 : 2
				}\tEND TURN ${game.countPlies()}\n`;
			}
		},
		cast(data) {
			const c = game.byId(data.c),
				t = game.byId(data.t);
			if (mode === fight) {
				result.textContent += `${game.turn === realp1 ? 1 : 2}\t${c}${
					t ? ' targets ' + t : ''
				}\n`;
			}
		},
	};
	async function gameStep() {
		if (game.phase === etg.MulliganPhase) {
			game.next({
				x: aiMulligan(game.byId(game.turn)) ? 'accept' : 'mulligan',
			});
		}
		if (game.phase === etg.PlayPhase) {
			const {
				data: { cmd },
			} = await aiWorker.send({
				data: {
					seed: game.data.seed,
					set: game.data.set,
					players: game.data.players,
				},
				moves: game.bonusstats.get('replay'),
			});
			if (cmd.x in cmds) {
				cmds[cmd.x](cmd);
			}
			game.next(cmd);
		}
		if (!game.winner) setTimeout(gameStep, 0);
		else {
			if (mode === fight) {
				console.log(Date.now() - start);
				result.textContent = `Player ${
					game.winner === realp1 ? 1 : 2
				} wins. ${game.countPlies()}\n${result.textContent}`;
			} else {
				fc[(game.winner !== realp1) | 0]++;
				result.textContent = `${fc[0]} : ${fc[1]} (${(
					(fc[0] / (fc[0] + fc[1])) *
					100
				).toFixed(2)}%)`;
				game = mkGame(util.randint(), set, decks);
				realp1 = game.byUser(0).id;
				if (!stopFight) setTimeout(gameStep, 0);
				else {
					stopFight = false;
					fight1000.value = 'Fight!!';
				}
			}
		}
	}
	gameStep();
}
