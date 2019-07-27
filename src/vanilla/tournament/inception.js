export default function(deck) {
	var bannedCards = [
		Cards.Names.Blackhole,
		Cards.Names.AmberNymph,
		Cards.Names.Earthquake,
		Cards.Names.ShardofFocus,
		Cards.Names.ShardofWisdom,
		Cards.Names.Pandemonium,
		Cards.Names.Miracle,
		Cards.Names.NymphsTears,
		Cards.Names.BlueNymph,
		Cards.Names.NymphQueen,
	];
	var mindGateCount = 0;
	cardCount = {};
	for (var i = 0; i < deck.length; i++) {
		var card = deck[i];
		if (card.upped) return 'Upgraded cards are banned';
		if (~bannedCards.indexOf(card)) return card.name + ' is banned';
		if (card.isOf(Cards.Names.Mindgate)) mindGateCount++;
		else if (
			(card.type == etg.Spell && !card.isOf(Cards.Names.Chimera)) ||
			card.type == etg.Permanent
		) {
			if (cardCount[card.code]) {
				cardCount[card.code]++;
				if (cardCount[card.code] > 3)
					return 'You have too many ' + card.name + '. 3 is the maximum';
			} else cardCount[card.code] = 1;
		}
	}
	if (mindGateCount < 6)
		return 'You have only ' + mindGateCount + ' Mind Gates. You need 6';
	return 'Legal';
}
