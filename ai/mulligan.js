'use strict';
const etg = require('../etg'),
	Cards = require('../Cards');
module.exports = pl =>
	pl.hand.length < 6 ||
	pl.hand.some(
		({ card }) =>
			card.type == etg.Pillar ||
			card.isOf(Cards.Nova) ||
			card.isOf(Cards.Immolation) ||
			card.isOf(Cards.GiftofOceanus) ||
			card.isOf(Cards.QuantumLocket),
	) ||
	pl.deck.every(code => Cards.Codes[code].type != etg.Pillar);
