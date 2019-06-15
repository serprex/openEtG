const Effect = require('./Effect');
const Cards = require('./Cards');
const Game = require('./Game');
const Thing = require('./Thing');
const etg = require('./etg');
const etgutil = require('./etgutil');
const aiSearch = require('./ai/search');
const util = require('./util');
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
		const pl = game.players(j);
		for (let i = 0; i < decks[j].length; i++) {
			if (Cards.Codes[(code = decks[j][i])]) {
				pl.deck.push(new Thing(Cards.Codes[code]));
			} else if (~(idx = etgutil.fromTrueMark(code))) {
				pl.mark = idx;
			} else {
				result.textContent = 'Unknown card code: ' + code.toString(32);
				return;
			}
		}
	}
	game.byId(turn).drawhand();
	game.byId(turn).foe.drawhand();
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
	const decks = deckeles.map(item =>
		item.value.split(' ').map(x => parseInt(x, 32)),
	);
	const seed = parseInt(seedput.value) || util.randint();
	let game = mkGame(seed, decks),
		realp1 = game.player1.id;
	result.textContent = '';
	let aiState = undefined;
	const cmds = {
		endturn: function(data) {
			if (mode == fight) {
				result.textContent += `${game.turn == realp1 ? 1 : 2}\tEND TURN\n`;
			}
			game.player2.endturn(data.bits);
		},
		cast: function(data) {
			const bits = data.bits,
				c = game.bitsToTgt(bits & 511),
				t = game.bitsToTgt((bits >> 9) & 511);
			if (mode == fight) {
				result.textContent += `${game.turn == realp1 ? 1 : 2}\t${c}${
					t ? ' targets ' + t : ''
				}\n`;
			}
			c.useactive(t);
		},
	};
	function gameStep() {
		if (game.turn == game.player1) {
			[game.player1, game.player2] = [game.player2, game.player1];
		}
		if (game.phase == etg.PlayPhase) {
			Effect.disable = true;
			if (aiState) {
				aiState.step(game);
			} else {
				aiState = new aiSearch(game);
			}
			if (aiState.cmd) {
				cmds[aiState.cmd]({ bits: aiState.cmdct });
				aiState = undefined;
			}
		}
		if (!game.winner) setTimeout(gameStep, 0);
		else {
			if (mode == fight) {
				console.log(Date.now() - start);
				result.textContent =
					'Player ' +
					(game.winner == realp1 ? 1 : 2) +
					' wins.\n' +
					result.textContent;
			} else {
				fc[(game.winner != realp1) | 0]++;
				result.textContent =
					fc[0] +
					' : ' +
					fc[1] +
					'(' +
					((fc[0] / (fc[0] + fc[1])) * 100).toFixed(2) +
					'%)';
				game = mkGame(util.randint(), decks);
				realp1 = game.player1.id;
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
