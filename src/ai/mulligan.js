import * as etg from '../etg.js';
import Cards from '../Cards.js';

export default function mulligan(pl) {
	return (
		pl.handIds.length < 6 ||
		pl.hand.some(
			({ card }) =>
				card.type === etg.Pillar ||
				card.isOf(Cards.Names.Nova) ||
				card.isOf(Cards.Names.Immolation) ||
				card.isOf(Cards.Names.GiftofOceanus) ||
				card.isOf(Cards.Names.QuantumLocket),
		) ||
		pl.deck.every(({ card }) => card.type != etg.Pillar)
	);
}
