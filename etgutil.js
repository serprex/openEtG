function encodeCount(count){
	return count>1023?"vv":(count<32?"0":"") + count.toString(32);
}
exports.MAX_INT = 4294967296;
exports.iterdeck = function(deck, func){
	var len = 0;
	for(var i=0; i<deck.length; i+=5){
		var count = parseInt(deck.substr(i, 2), 32), code = deck.substr(i+2, 3);
		for(var j=0; j<count; j++) func(code, len++);
	}
}
exports.iterraw = function(deck, func){
	for(var i=0; i<deck.length; i+=5){
		var count = parseInt(deck.substr(i, 2), 32), code = deck.substr(i+2, 3);
		func(code, count);
	}
}
exports.count = function(deck, code){
	for(var i=0; i<deck.length; i+=5){
		if (code == deck.substr(i+2, 3)){
			return parseInt(deck.substr(i, 2), 32);
		}
	}
	return 0;
}
exports.decklength = function(deck){
	var r = 0;
	for(var i=0; i<deck.length; i+=5){
		r += parseInt(deck.substr(i, 2), 32);
	}
	return r;
}
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
	exports.iterdeck(deck, function(code){
		out.push(code);
	});
    return out;
}
exports.deck2pool = function (deck, pool) {
	if (!deck) return {};
	pool = pool || {};
	exports.iterraw(deck, function(code, count){
		if (code in pool){
			pool[code] += count;
		} else {
			pool[code] = count;
		}
	});
	return pool;
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
		exports.iterraw(from, function(code, count){
			deck = exports.addcard(deck, code, count);
		});
	}
	return deck;
}
exports.removedecks = function(deck){
	for (var i=1; i<arguments.length; i++){
		var from = arguments[i];
		exports.iterraw(from, function(code, count){
			deck = exports.addcard(deck, code, -count);
		});
	}
	return deck;
}