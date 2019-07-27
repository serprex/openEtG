export default function(deck) {
	var cardtypes = [],
		typecount = 0,
		cardcount = {},
		countcount = [];
	for (var i = 0; i < deck.length; i++) {
		var card = deck[i];
		if (card.upped) return card.name + ' is an upgraded card';
		if (~etg.ShardList.indexOf(card.code)) return card.name + ' is a shard';
		if (card.type == etg.Pillar) continue;
		var type = Math.max(
			card == Cards.Chimera ? etg.Creature : card.type,
			etg.Permanent,
		);
		if (!cardtypes[type]) {
			cardtypes[type] = 1;
			typecount++;
			countcount[type] = 0;
		}
		if (!cardcount[card.code]) {
			cardcount[card.code] = 1;
			countcount[type]++;
		} else cardcount[card.code]++;
	}
	if (typecount != 2) {
		return 'Must have 2 kinds of cards, have ' + typecount;
	}
	for (var key in countcount) {
		if (countcount[key] != 3)
			return 'Must include exactly 3 copies of type ' + key;
	}
	var countsame = -1;
	for (var key in cardcount) {
		if (countsame == -1) countsame = cardcount[key];
		else if (countsame != cardcount[key])
			return (
				'Card counts off: ' +
				countsame +
				' vs ' +
				cardcount[key] +
				' copies of ' +
				Cards.Codes[key].name
			);
	}
	return 'Legal';
}
