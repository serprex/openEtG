module.exports = function(deck, mark) {
	bannedCards = [Cards.ShardofFocus, Cards.ShardofPatience, Cards.ShardofIntegrity, Cards.Graboid, Cards.Earthquake, Cards.Trident, Cards.BlackHole, Cards.AmberNymph];
	rareCards = "4sj 4sk 4sl 4sm 4sn 4so 4sp 4sq 4sr 4ss 4st 4su 4vl 500 50a 52q 534 53e 55s 58v 59c 5c5 5cg 5cq 5f7 5fk 5fu 5io 5lh 5ls 5m6 5ol 5p0 5pa 5ro 5s4 5se 5ur 5v8 5vi 61u 62c 62m".split(" ");
	usedCards = {};
	if (deck.length > 30) "Deck is too large, max 30 cards";
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (card.isOf(Cards.QuantumPillar)) continue;
		if (card.type != etg.CreatureEnum && card.element != mark) return "Spells and Permanents must be of your mark element";
		if (bannedCards.some(function(ban) { return card.isOf(ban) }) || (card.type == etg.PillarEnum && !~rareCards.indexOf(card.asUpped(false).code))) return card.name + " is banned";
		if (usedCards[card.code]) {
			usedCards[card.code]++;
			if (usedCards[card.code] > (~rareCards.indexOf(card.asUpped(false).code) ? 1 : 2)) return "You have too many " + card.name;
		}
		else {
			usedCards[card.code] = 1;
		}
	}
	return "Legal";
}