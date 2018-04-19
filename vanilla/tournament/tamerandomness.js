module.exports = function(deck) {
	var bannedCards = [Cards.Blackhole, Cards.AmberNymph, Cards.ShardofFocus, Cards.Earthquake, Cards.Trident, Cards.Miracle, Cards.ShardofDivinity];
	var rngCards = [Cards.ChaosSeed, Cards.Mutation, Cards.Discord, Cards.FallenElf, Cards.Pandemonium, Cards.ShardofSerendipity, Cards.SkullShield, Cards.ThornCarapace,
		Cards.IceBolt, Cards.IceShield, Cards.FogShield, Cards.FateEgg, Cards.DuskMantle, Cards.Mindgate];
	var rngCount = 0, pillCount = 0;
	for(var i=0; i<deck.length; i++){
		var card = deck[i];
		if (card.upped)return "Upgraded cards are banned";
		if (~bannedCards.indexOf(card))return card.name + " is banned";
		if (card.type == etg.PillarEnum && card.element)pillCount++;
		if (~rngCards.indexOf(card))rngCount++;
	}
	if (pillCount > 5)return "Too many non-quantum pillars";
	var rngNeeded = Math.round(deck.length*.4);
	if (rngCount < rngNeeded)return "Too few random cards: " + rngCount + " / " + rngNeeded;
	return "Legal";
}