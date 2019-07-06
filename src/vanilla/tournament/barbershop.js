export default function(deck) {
	if (deck.length & 3)
		return 'Deck size must be a multiple of 4. Deck size: ' + deck.length;
	var banlist = [
		Cards.Names.QuantumPillar,
		Cards.Names.Immolation,
		Cards.Names.Nova,
		Cards.Names.Discord,
		Cards.Names.Earthquake,
		Cards.Names.Trident,
		Cards.Names.BlackHole,
		Cards.Names.BlackHole,
		Cards.Names.NymphsTears,
		Cards.Names.NymphQueen,
		Cards.Names.AmberNymph,
		Cards.Names.ShardofPatience,
		Cards.Names.ShardofFocus,
	];
	var eles = {},
		eleCount = 0,
		cardEleCounts = {},
		shardCount = 0;
	for (var i = 0; i < deck.length; i++) {
		var card = deck[i];
		if (~banlist.indexOf(card)) return card.name + ' is banned';
		if (card.upped) return card.name + ' is an upgraded card';
		if (card.element) {
			if (!eles[card.element]) {
				eles[card.element] = true;
				eleCount++;
			}
			if (card.type) {
				if (!(card.element in cardEleCounts)) cardEleCounts[card.element] = 1;
				else cardEleCounts[card.element]++;
			}
		}
		if (~etg.ShardList.indexOf(card.code) && ++shardCount == 5)
			return 'You may only have at most 4 shards';
	}
	for (var ele in cardEleCounts) {
		if (cardEleCounts[ele] < 4) {
			return (
				'You must have at least 4 non pillar/pend cards of ' + etg.eleNames[ele]
			);
		}
	}
	if (eleCount != 4)
		return 'You used ' + eleCount + ' elements. You must only use 4';
	return 'Legal';
}
