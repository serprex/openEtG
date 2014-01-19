function encodeCount(count){
	return (count<32?"0":"") + count.toString(32);
}
exports.encodedeck = function(deck){
	if (!deck)return deck;
	var count={}, out="";
	for(var i=0; i<deck.length; i++){
		if (deck[i] in count){
			if (count[deck[i]]<1023){
				count[deck[i]]++;
			}
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
exports.addcard = function(deck, card){
	for(var i=0; i<deck.length; i+=5){
		var code = deck.substr(i+2, 3);
		if (code == card){
			var count = parseInt(deck.substr(i, 2), 32)+1;
			return deck.substring(0, i) + encodeCount(count) + deck.substring(i+2);
		}
	}
	return deck + "01" + card;
}
exports.useruser = function(servuser){
	return {
		auth: servuser.auth,
		deck: exports.decodedeck(servuser.deck),
		pool: exports.decodedeck(servuser.pool)
	};
}