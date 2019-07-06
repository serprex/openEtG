import Effect from './Effect.js';
import * as Cards from './Cards.js';
import Game from './Game.js';
import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import aiSearch from './ai/search.js';
import * as util from './util.js';
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
function mkGame(seed, decks) {
	const game = new Game(seed, 0);
	let idx, code;
	for (let j = 0; j < 2; j++) {
		const pl = j ? game.byId(game.turn) : game.byId(game.turn).foe,
			deck = [];
		for (let i = 0; i < decks[j].length; i++) {
			if (Cards.Codes[(code = decks[j][i])]) {
				const cardinst = game.newThing(Cards.Codes[code]);
				cardinst.ownerId = pl.id;
				deck.push(cardinst.id);
			} else if (~(idx = etgutil.fromTrueMark(code))) {
				pl.mark = idx;
			} else {
				result.textContent = 'Unknown card code: ' + code.toString(32);
				return;
			}
		}
		pl.deckIds = deck;
	}
	game.byId(game.turn).drawhand();
	game.byId(game.turn).foe.drawhand();
	game.set(game.id, 'phase', etg.PlayPhase);
	return game;
}
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
	const decks = deckeles.map(item => etgutil.decodedeck(item.value));
	const seed = parseInt(seedput.value) || util.randint();
	let game = mkGame(seed, decks),
		realp1 = game.player1Id;
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
