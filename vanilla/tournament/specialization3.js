module.exports = function(deck) {
	var cardList = {}, upped = deck.length, eleCount = [], shardList = [];
	var specialList = "4sa 4tb 4vj 4vl 52j 52o 55s 55v 590 593 5c5 5c7 5f4 5f9 5ib 5ig 5l9 5lm 5oi 5om 5rp 5ru 5um 5v1 61t 622".split(" ");
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (!eleCount[card.element]){
			eleCount[card.element] = true;
			upped--;
		};
		if (cardList[card.asUpped(false).code]) cardList[card.asUpped(false).code]++;
		else cardList[card.asUpped(false).code] = 1;
		if (~etg.ShardList.indexOf(card.asUpped(false).code)) {
			upped--;
			if (!shardList[card.element]) {
				shardList[card.element] = true;
				upped-=2;
			}
		}
		if (card.upped) upped--;
	}
	if (upped < 0) return "You have too few unupgraded cards, needs " + (-upped) + " more"
	var hasSpecial = false;
	for (var code in cardList) {
		var card = Cards.Codes[code];
		if (~specialList.indexOf(code)){
			if (cardList[code] < 6) return "You have to have at least 6 copies of " + Cards.Codes[code].name;
			hasSpecial = true;
		}
		else {
			if (cardList[code] > 4 && card.type) return "You have too many copies of " + Cards.Codes[code].name;
		}
	}
	if (!hasSpecial) return "You have to have at least 1 card from the special list in your deck"
	return "Legal";
}