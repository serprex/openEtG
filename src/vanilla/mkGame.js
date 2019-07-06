import * as Cards from './Cards.js';
import Game from './Game.js';
import * as etgutil from '../etgutil.js';

function deckPower(deck, amount) {
	var res = deck;
	for (var i = 1; i < amount; i++) {
		res = res.concat(deck);
	}
	return res;
}
export default function(data, ai) {
	var game = new Game(data.seed, data.flip);
	if (data.p1hp) {
		game.player1.maxhp = game.player1.hp = data.p1hp;
	}
	if (data.p2hp) {
		game.player2.maxhp = game.player2.hp = data.p2hp;
	}
	if (data.p1markpower !== undefined) {
		game.player1.markpower = data.p1markpower;
	}
	if (data.p2markpower !== undefined) {
		game.player2.markpower = data.p2markpower;
	}
	if (data.p1drawpower !== undefined) {
		game.player1.drawpower = data.p1drawpower;
	}
	if (data.p2drawpower !== undefined) {
		game.player2.drawpower = data.p2drawpower;
	}
	var deckpower = [data.p1deckpower, data.p2deckpower];
	var idx,
		code,
		decks = [data.urdeck, data.deck];
	for (var j = 0; j < 2; j++) {
		var pl = game.players(j);
		for (var i = 0; i < decks[j].length; i++) {
			if (Cards.Codes[(code = decks[j][i])]) {
				pl.deck.push(Cards.Codes[code]);
			} else if (~(idx = etgutil.fromTrueMark(code))) {
				pl.mark = idx;
			}
		}
		if (deckpower[j]) {
			pl.deck = deckPower(pl.deck, deckpower[j]);
		} else if (pl.drawpower > 1) {
			pl.deck = deckPower(pl.deck, 2);
		}
	}
	game.turn.drawhand();
	game.turn.foe.drawhand();
	if (data.foename) game.foename = data.foename;
	if (ai) game.ai = true;
	return { game, data };
}
