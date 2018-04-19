module.exports = function(deck, mark){
	function prevMark() {
		if (mark == 1)
			return etg.eleNames[12];
		return etg.eleNames[mark - 1];
	}
	var markPillars = 0;
	var markCards = [];
	var elementCount = [];
	bannedCards = [Cards.DimensionalShield, Cards.Fractal, Cards.ShardofPatience, Cards.Trident, Cards.Earthquake];
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (card.upped) return "Upgraded cards are banned"
		if (~bannedCards.indexOf(card)) return card.name + " is banned";
		if (card.element && !~elementCount.indexOf(card.element)) elementCount.push(card.element);
		if (card.element == mark) {
			if (card.type == etg.PillarEnum) {
				markPillars++;
				if (markPillars > 4) return "You have too many pillars/pends/mark cards of your mark's element"
			}
			else {
				markCards.push(card.name);
				if (markCards.length > 7) return "You have too many cards of your mark's element, 7 is the maximum"
			}
		}
	}
	if (markCards.length < 4) return "You have too few cards of your mark's element, 4 is the minimum"
	if (elementCount.length > 2) return "You are using " + elementCount.length + " elements, you have to use one or two"
	return "Legal if your previous mark was " + prevMark();
}