module.exports = function(deck) {
	deck.sort(function(x,y){return (x.code>y.code)-(x.code<y.code)});
	var cards = [];
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (card.upped) return "No upgrades allowed";
		if (card.type == etg.PillarEnum) continue;
		if (cards.length && cards[cards.length-1][0] == card) cards[cards.length-1][1]++;
		else cards.push([card, 1]);
	}
	if (cards.length < 4) return "Need at least 4 non pillar card kinds";
	for(var i=0; i<cards.length/2; i++){
		if (cards[i][1] != cards[cards.length-1-i][1]) return cards[i][0].name + " counts differently than " + cards[cards.length-1-i][0].name;
	}
	return "Legal";
}