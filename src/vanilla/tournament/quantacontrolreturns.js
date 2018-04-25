module.exports = function(deck){
	function pushElement(ele){
		if (!~elements.indexOf(ele)){
			elements.push(ele);
		}
	}
	var bannedCards = [Cards.Discord, Cards.Trident, Cards.ShardofSacrifice, Cards.ShardofFocus, Cards.Earthquake, Cards.ShardofPatience, Cards.ShardofFreedom, Cards.Fractal, Cards.BlueNymph];
	var elements = [];
	for(var i=0; i<deck.length; i++){
		if (bannedCards.some(function(ban){return deck[i].isOf(ban)}))return deck[i].name + " banned";
		pushElement(deck[i].element);
		if (deck[i].active.cast && deck[i].cast){
			pushElement(deck[i].castele);
		}
	}
	if (elements.length > 3)return "Illegal. Elements used: " + elements.map(function(x){return etg.eleNames[x]}).join(" ");
	return "Legal if elements include " + elements.map(function(x){return etg.eleNames[x]}).join(" ");
}