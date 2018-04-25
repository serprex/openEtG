module.exports = function(deck) {
	var bannedCards = ["4vl", "55v", "593", "5ih", "5ig", "5oi"];
	var legsCount = {
		1: ["5le", "5ru", "625", "626"],
		2: "4ve 4vh 4vm 52k 52m 52t 55m 55n 55o 55r 55u 563 58p 58q 58r 596 5c0 5f2 5fa 5fc 5fe 5id 5if 5ii 5ll 5of 5oj 5rn 5rs 5ut 5uv 5v0 61s 61v".split(" "),
		4: "4vd 4vq 55l 58u 5bt 5bu 5bv 5la 5lb 5rm".split(" "),
		6: "591 5f1 5i6 5od 5ok 5rq 620".split(" "),
		8: "52j 52u 5c8 5rt 5un".split(" "),
		10: ["590"]
	};
	function addLegs(code) {
		for (var leg in legsCount) {
			if (~legsCount[leg].indexOf(code)) {
				return parseInt(leg);
			}
		}
		return 0;
	}
	var legs = 0;
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (~bannedCards.indexOf(card.code)) return card.name + " is banned";
		if (~etg.ShardList.indexOf(card.code)) return "Shards are banned";
		if (card.upped) "Upgraded cards are banned";
		if (~etg.NymphList.indexOf(card.code) && card.type != etg.PillarEnum) return "Nymphs are banned";
		legs += addLegs(card.code);
	}
	if (legs != 30) return "You have " + legs + " legs. This is too " + (legs > 30 ? "many" : "few");
	return "Legal";
}