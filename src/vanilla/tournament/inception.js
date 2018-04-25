module.exports = function(deck) {
	var bannedCards = [Cards.Blackhole, Cards.AmberNymph, Cards.Earthquake, Cards.ShardofFocus, Cards.ShardofWisdom, Cards.Pandemonium, Cards.Miracle, Cards.NymphsTears, Cards.BlueNymph, Cards.NymphQueen];
	var mindGateCount = 0;
	cardCount = {};
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (card.upped) return "Upgraded cards are banned"
		if (~bannedCards.indexOf(card)) return card.name + " is banned";
		if (card.isOf(Cards.Mindgate)) mindGateCount++;
		else if ((card.type == etg.SpellEnum  && !card.isOf(Cards.Chimera)) || card.type == etg.PermanentEnum) {
			if (cardCount[card.code]) {
				cardCount[card.code]++;
				if (cardCount[card.code] > 3)
					return "You have too many " + card.name + ". 3 is the maximum";
			}
			else cardCount[card.code] = 1;
		}
	}
	if (mindGateCount < 6) return "You have only " + mindGateCount + " Mind Gates. You need 6"
	return "Legal";
}