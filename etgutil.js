function encodeCount(count){
	return count>1023?"vv":(count<32?"0":"") + count.toString(32);
}
exports.encodedeck = function(deck){
	if (!deck)return deck;
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
exports.decodedeck = function(deck){
	if (!deck)return deck;
	var out = [];
	for(var i=0; i<deck.length; i+=5){
		var count = parseInt(deck.substr(i, 2), 32), code=deck.substr(i+2, 3);
		for(var j=0; j<count; j++){
			out.push(code);
		}
	}
	return out;
}
exports.addcard = function(deck, card, x){
	if(x === undefined)x=1;
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
exports.useruser = function(servuser){
	return {
		auth: servuser.auth,
		deck: exports.decodedeck(servuser.deck),
		pool: exports.decodedeck(servuser.pool)
	};
}