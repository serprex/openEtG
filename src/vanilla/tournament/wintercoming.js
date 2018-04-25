module.exports = function(deck) {
	bannedCards = [Cards.ShardofFreedom, Cards.ShardofDivinity, Cards.Earthquake, Cards.Trident];
	var summerElements = [etg.Fire, etg.Light, etg.Earth, etg.Life];
	var winterElements = [etg.Water, etg.Darkness, etg.Air, etg.Death];
	var side;
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (card.upped) return "Upgraded cards are banned"
		if (~bannedCards.indexOf(card)) return card.name + " is banned";
		if (card.element) {
			if (~summerElements.indexOf(card.element)) {
				if (side == "Winter")
					return "Illegal, you are using both Summer and Winter elements";
				side = "Summer";
			}
			else if (~winterElements.indexOf(card.element)) {
				if (side == "Summer")
					return "Illegal, you are using both Summer and Winter elements";
				side = "Winter";
			}
			else return etg.eleNames[card.element] + " is neither a Summer or Winter element"
		}
	}
	return "Legal" + (side ? " if you are " + side : "");
}