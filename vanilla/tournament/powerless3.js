module.exports = function(deck) {
	var elements = [], anyupped = false, disco = false;
	var bannedCards = ["593", "5ic", "77j", "7gs"];
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (~bannedCards.indexOf(card.code)) return card.name + " is banned";
		if (!card.element)
			return card.name + " is Other";
		else if (~etg.ShardList.indexOf(card.code))
			return card.name + " is a Shard";
		if (card.type != etg.PillarEnum) elements[card.element] = 1;
		if (card.upped) anyupped = true;
		if (card.isOf(Cards.Discord)) disco = true;
	}
	var elementCount = 0, ret = "";
	for(var i=1; i<13; i++){
		if (elements[i]){
			elementCount++;
			ret += " " + etg.eleNames[i];
		}
	}
	if (elementCount > 4){
		return "You're using " + elementCount + " elements";
	}
	if (elementCount > 2 && anyupped){
		return "You're using upped cards in a Quartz deck";
	}
	if (elementCount < 3 && disco) ret += ". This deck is only legal if you are Quartz"
	return "Legal. You are using " + ret;
}