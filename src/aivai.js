import Effect from './Effect.js';
import Game from './Game.js';
import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import aiSearch from './ai/search.js';
import * as util from './util.js';
import RngMock from './RngMock.js';
Effect.disable = true;
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
let stopFight = false;
function fightItOut() {
	const start = Date.now();
	let mode = this,
		fc = new Uint16Array(2);
	if (mode == fight1000) {
		if (fight1000.value.match(/^Stop/)) {
			stopFight = true;
			fight1000.value = 'Stopping..';
			return;
		} else {
			fight1000.value = 'Stop';
		}
	}
	const decks = deckeles.map(item => item.value);
	const seed = parseInt(seedput.value) || util.randint();
	let game = new Game({
			seed,
			players: RngMock.shuffle(
				decks.map((deck, i) => {
					idx: i, deck;
				}),
			),
		}),
		realp1 = game.getByIdx(0);
	result.textContent = '';
	let aiState = undefined;
	const cmds = {
		end(data) {
			if (mode === fight) {
				result.textContent += `${game.turn == realp1 ? 1 : 2}\tEND TURN\n`;
			}
		},
		cast(data) {
			const c = game.byId(data.c),
				t = game.byId(data.t);
			if (mode == fight) {
				result.textContent += `${game.turn == realp1 ? 1 : 2}\t${c}${
					t ? ' targets ' + t : ''
				}\n`;
			}
		},
	};
	function gameStep() {
		if (game.phase === etg.PlayPhase) {
			if (aiState) {
				aiState.step(game);
			} else {
				aiState = new aiSearch(game);
			}
			if (aiState.cmd) {
				if (aiState.cmd.x in cmds) {
					cmds[aiState.cmd.x](aiState.cmd);
				}
				game.next(aiState.cmd);
				aiState = undefined;
			}
		}
		if (!game.winner) setTimeout(gameStep, 0);
		else {
			if (mode == fight) {
				console.log(Date.now() - start);
				result.textContent = `Player ${game.winner === realp1 ? 1 : 2} wins.\n${
					result.textContent
				}`;
			} else {
				fc[(game.winner !== realp1) | 0]++;
				result.textContent = `${fc[0]} : ${fc[1]} (${(
					(fc[0] / (fc[0] + fc[1])) *
					100
				).toFixed(2)}%)`;
				game = mkGame(util.randint(), decks);
				realp1 = game.player1Id;
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
