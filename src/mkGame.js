'use strict';
const Game = require('./Game'),
	Cards = require('./Cards'),
	etgutil = require('./etgutil');

function deckPower(pl, deck) {
	const res = [],
		{ deckpower } = pl;
	for (let i = 0; i < deckpower; i++) {
		for (let j = 0; j < deck.length; j++) {
			res.push(pl.newThing(deck[j]).id);
		}
	}
	return res;
}
module.exports = function(data) {
	const game = new Game(data.seed, data.flip);
	game.addData(data);
	if (!data.p1maxhp) game.player1.maxhp = game.player1.hp;
	if (!data.p2maxhp) game.player2.maxhp = game.player2.hp;
	for (let j = 0; j < 2; j++) {
		const pl = game.byId(2 + j),
			deck = [],
			deckdata =
				pl.id === game.player1Id
					? { deck: data.urdeck, power: data.p1deckpower }
					: { deck: data.deck, power: data.p2deckpower };
		etgutil.iterdeck(deckdata.deck, code => {
			let idx;
			if (code in Cards.Codes) {
				deck.push(Cards.Codes[code]);
			} else if (~(idx = etgutil.fromTrueMark(code))) {
				pl.mark = idx;
			}
		});
		pl.deckpower = deckdata.power || (pl.drawpower > 1 ? 2 : 1);
		pl.deckIds = deckPower(pl, deck);
		pl.drawhand(7);
	}
	return game;
};
