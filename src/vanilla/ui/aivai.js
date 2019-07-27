import Effect from '../../Effect.js';
import Cards from '../Cards.js';
import Game from '../../Game.js';
import * as etg from '../../etg.js';
import * as etgutil from '../../etgutil.js';
import aiSearch from '../ai/search.js';
import * as util from '../../util.js';

const deckeles = [
		document.getElementById('deck1'),
		document.getElementById('deck2'),
	],
	seedput = document.getElementById('seed'),
	result = document.getElementById('result'),
	fight = document.getElementById('fight'),
	fight1000 = document.getElementById('fight1000');
fight.addEventListener('click', fightItOut);
fight1000.addEventListener('click', fightItOut);
function mkGame(seed, decks) {
	var game = new Game(seed, 0);
	var idx, code;
	for (var j = 0; j < 2; j++) {
		var pl = game.players(j);
		for (var i = 0; i < decks[j].length; i++) {
			if (Cards.Codes[(code = decks[j][i])]) {
				pl.deck.push(Cards.Codes[code]);
			} else if (~(idx = etgutil.fromTrueMark(code))) {
				pl.mark = idx;
			} else {
				result.textContent = 'Unknown card code: ' + code.toString(32);
				return;
			}
		}
	}
	game.turn.drawhand();
	game.turn.foe.drawhand();
	return game;
}
var stopFight = false;
function fightItOut() {
	var start = Date.now();
	var mode = this,
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
	var decks = deckeles.map(item =>
		item.value.split(' ').map(x => parseInt(x, 32)),
	);
	var seed = parseInt(seedput.value) || util.randint();
	var game = mkGame(seed, decks);
	if (!game) return;
	result.textContent = '';
	var aiState = undefined;
	var realp1 = game.player1;
	var cmds = {
		end: function(data) {
			if (mode == fight) {
				result.textContent +=
					(game.turn == realp1 ? 1 : 2) + '\tEND TURN' + game.ply + '\n';
			}
			game.player2.endturn(data.bits);
		},
		cast: function(data) {
			var bits = data.bits,
				c = game.bitsToTgt(bits & 511),
				t = game.bitsToTgt((bits >> 9) & 511);
			if (mode == fight) {
				result.textContent +=
					(game.turn == realp1 ? 1 : 2) +
					'\t' +
					c +
					(t ? ' targets ' + t : '') +
					'\n';
			}
			c.useactive(t);
		},
	};
	function gameStep() {
		if (game.turn == game.player1) {
			var p1 = game.player1;
			game.player1 = game.player2;
			game.player2 = p1;
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
					' wins.' +
					game.ply +
					'\n' +
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
				if (!game) return;
				realp1 = game.player1;
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
