function encodeCount(count){
	return count>1023?"vv":(count<32?"0":"") + count.toString(32);
}
exports.MAX_INT = 4294967296;
exports.encodedeck = function(deck){
	if (!deck)return "";
	var count={}, out="";
	for(var i=0; i<deck.length; i++){
		if (deck[i] in count){
			count[deck[i]]++;
		}else{
			count[deck[i]]=1;
		}
	}
	for(var key in count){
		out += encodeCount(count[key]) + key;
	}
	return out;
}
exports.decodedeck = function (deck) {
    if (!deck) return [];
    var out = [];
    for (var i = 0; i < deck.length; i += 5) {
        var count = parseInt(deck.substr(i, 2), 32), code = deck.substr(i + 2, 3);
        for (var j = 0; j < count; j++) {
            out.push(code);
        }
    }
    return out;
}
exports.addcard = function(deck, card, x){
	if (deck === undefined) deck = "";
	if (x === undefined) x = 1;
	for(var i=0; i<deck.length; i+=5){
		var code = deck.substr(i+2, 3);
		if (code == card){
			var count = parseInt(deck.substr(i, 2), 32)+x;
			return count<=0?deck.substring(0, i) + deck.substring(i+5):
				deck.substring(0, i) + encodeCount(count) + deck.substring(i+2);
		}
	}
	return x<=0?deck:deck + encodeCount(x) + card;
}
exports.countcard = function(deck, card){
	if (!deck || !card) return -1;
	for(var i=0; i<deck.length; i+=5){
		if (card == deck.substr(i+2, 3)) return parseInt(deck.substr(i, 2), 32);
	}
	return -1;
}
exports.mergedecks = function(deck){
	for (var i=1; i<arguments.length; i++){
		var from = arguments[i];
		for(var j=0; j<from.length; j+=5){
			deck = exports.addcard(deck, from.substr(j+2, 3), parseInt(from.substr(j, 2), 32));
		}
	}
	return deck;
}