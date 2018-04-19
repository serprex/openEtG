'use strict';
const Game = require('./Game'),
	Cards = require('./Cards'),
	etgutil = require('./etgutil');

function deckPower(deck, amount) {
	if (amount > 1) {
		var res = deck.slice();
		for (var i = 1; i < amount; i++) {
			Array.prototype.push.apply(res, deck);
		}
		return res;
	} else return deck;
}
module.exports = function(data) {
	const game = new Game(data.seed, data.flip);
	game.addData(data);
	game.player1.maxhp = game.player1.hp;
	game.player2.maxhp = game.player2.hp;
	const deckpower = [data.p1deckpower, data.p2deckpower];
	const decks = [data.urdeck, data.deck];
	for (var j = 0; j < 2; j++) {
		const pl = game.players(j);
		etgutil.iterdeck(decks[j], code => {
			var idx;
			if (code in Cards.Codes) {
				pl.deck.push(Cards.Codes[code]);
			} else if (~(idx = etgutil.fromTrueMark(code))) {
				pl.mark = idx;
			}
		});
		if (deckpower[j]) {
			pl.deck = deckPower(pl.deck, deckpower[j]);
			pl.deckpower = deckpower[j];
		} else if (pl.drawpower > 1) {
			pl.deck = deckPower(pl.deck, 2);
			pl.deckpower = 2;
		}
	}
	game.turn.drawhand(7);
	game.turn.foe.drawhand(7);
	data.p2deck = game.player2.deck.slice();
	return { game, data };
};
