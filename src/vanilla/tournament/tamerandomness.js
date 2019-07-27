export default function(deck) {
	var bannedCards = [
		Cards.Names.Blackhole,
		Cards.Names.AmberNymph,
		Cards.Names.ShardofFocus,
		Cards.Names.Earthquake,
		Cards.Names.Trident,
		Cards.Names.Miracle,
		Cards.Names.ShardofDivinity,
	];
	var rngCards = [
		Cards.Names.ChaosSeed,
		Cards.Names.Mutation,
		Cards.Names.Discord,
		Cards.Names.FallenElf,
		Cards.Names.Pandemonium,
		Cards.Names.ShardofSerendipity,
		Cards.Names.SkullShield,
		Cards.Names.ThornCarapace,
		Cards.Names.IceBolt,
		Cards.Names.IceShield,
		Cards.Names.FogShield,
		Cards.Names.FateEgg,
		Cards.Names.DuskMantle,
		Cards.Names.Mindgate,
	];
	var rngCount = 0,
		pillCount = 0;
	for (var i = 0; i < deck.length; i++) {
		var card = deck[i];
		if (card.upped) return 'Upgraded cards are banned';
		if (~bannedCards.indexOf(card)) return card.name + ' is banned';
		if (card.type == etg.Pillar && card.element) pillCount++;
		if (~rngCards.indexOf(card)) rngCount++;
	}
	if (pillCount > 5) return 'Too many non-quantum pillars';
	var rngNeeded = Math.round(deck.length * 0.4);
	if (rngCount < rngNeeded)
		return 'Too few random cards: ' + rngCount + ' / ' + rngNeeded;
	return 'Legal';
}
