module.exports = function(deck) {
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (card.rarity > 1)
			return card.name + " is too high in rarity";
		if (card.upped) return "Your deck contains at least one upgraded card";
	}
	return "Legal";
}