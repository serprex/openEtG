module.exports = function(deck) {
	deck.sort(function(x,y){return (x.code>y.code)-(x.code<y.code)});
	var bans = "4vd 4vl 4vo 4vp 52i 52l 52p 52s 534 55m 55r 55t 561 562 58v 593 596 5c3 5f4 5f5 5f6 5f8 5f9 5fb 5fk 5i8 5ic 5if 5ig 5ih 5ij 5io 5lc 5oh 5ol 5om 5on 5p0 5rq 5rs 5un 5us 5uu 5v8 61q 61t 61u".split(" ");
	var unuppedbans = "4vi 4vk 4vm 5ie".split(" ");
	var cards = {}, nymphs = {};
	if (deck.length > 35) return "Deck may be only 35 cards at most, not " + deck.length;
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (etg.ShardList.some(function(x){return x && card.asUpped(false).code == x})) return "Shards are banned";
		if (bans.some(function(x){return card.asUpped(false).code == x}) || ~unuppedbans.indexOf(card.code)) return card.name + " is banned";
		if (card.type == etg.PillarEnum) continue;
		var nymph = etg.NymphList.indexOf(card.asUpped(false).code);
		if (~nymph){
			if (nymphs[nymph]) return "You may only have 1 " + card.name;
			nymphs[nymph] = 1;
		}else if (card.type == etg.CreatureEnum || card.isOf(Cards.Chimera)) cards[card.asUpped(false).code] = (cards[card.asUpped(false).code] || 0) + 1;
	}
	for (var code in cards){
		if (cards[code] > 2) return "May not have more than 2 copies of " + Cards.Codes[card].name;
		else if (cards[code] == 1){
			var ele = Cards.Codes[code].element;
			if (nymphs[ele]) nymphs[ele]++;
			else return "Nymphless single: " + Cards.Codes[code].name;
		}
	}
	for (var ele in nymphs){
		if (nymphs[ele] > 4) return "Too many singles in " + etg.eleNames[ele];
	}
	return "Legal";
}