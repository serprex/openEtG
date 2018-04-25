module.exports = function(deck) {
	function countOther(e){
		var ret = 0;
		for(var i=0; i<13; i++){
			if (i != e && eleCount[i]){
				ret += eleCount[i];
			}
		}
		return ret;
	}
	var eleList = [], upped = deck.length, eleCount = [];
	var cardlist = "6u8 6ua 717 71e 74g 74h 779 77c 7af 7am 7dh 7dj 7h1 7h3 7js 7k3 7n4 7n9 7q1 7q7 7t7 7te 80h 80k".split(" ");
	for (var i = 0;i < deck.length;i++) {
		var card = deck[i];
		if (eleCount[card.element]) eleCount[card.element]++;
		else eleCount[card.element] = 1;
		var idx = cardlist.indexOf(card.asUpped(true).code);
		if (~idx){
			var ele = (idx>>1)+1;
			if (eleList[ele]) eleList[ele]++;
			else eleList[ele] = 1;
		}
		if (~etg.ShardList.indexOf(card.code)) upped -= 4;
		if (card.upped) upped--;
	}
	if (upped < 0) return "Too many upgrades due to shard restrictions";
	var ret = [];
	for(var i=1; i<13; i++){
		if (eleList[i]>=6 && upped >= countOther(i)*2){
			ret.push(etg.eleNames[i]);
		}
	}
	return ret.length ? "Legal for " + ret.join(", ") : "Illegal";
}