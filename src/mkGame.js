'use strict';
const Game = require('./Game'),
	Cards = require('./Cards'),
	Thing = require('./Thing'),
	etgutil = require('./etgutil');

function deckPower(deck, amount) {
	const res = [];
	for (let i = 0; i < amount; i++) {
		for (let j = 0; j < deck.length; j++) {
			res.push(new Thing(deck[j]));
		}
	}
	return res;
}
module.exports = function(data) {
	const game = new Game(data.seed, data.flip);
	game.addData(data);
	game.player1.maxhp = game.player1.hp;
	game.player2.maxhp = game.player2.hp;
	const deckpower = [data.p1deckpower, data.p2deckpower];
	const decks = [data.urdeck, data.deck];
	for (let j = 0; j < 2; j++) {
		const pl = game.players(j),
			deck = [];
		etgutil.iterdeck(decks[j], code => {
			let idx;
			if (code in Cards.Codes) {
				deck.push(Cards.Codes[code]);
			} else if (~(idx = etgutil.fromTrueMark(code))) {
				pl.mark = idx;
			}
		});
		pl.deckpower = deckpower[j] || (pl.drawpower > 1 ? 2 : 1);
		pl.deck = deckPower(deck, pl.deckpower);
	}
	game.turn.drawhand(7);
	game.turn.foe.drawhand(7);
	return { game, data };
};
