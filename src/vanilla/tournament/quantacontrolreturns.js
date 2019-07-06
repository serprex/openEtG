export default function(deck) {
	function pushElement(ele) {
		if (!~elements.indexOf(ele)) {
			elements.push(ele);
		}
	}
	var bannedCards = [
		Cards.Names.Discord,
		Cards.Names.Trident,
		Cards.Names.ShardofSacrifice,
		Cards.Names.ShardofFocus,
		Cards.Names.Earthquake,
		Cards.Names.ShardofPatience,
		Cards.Names.ShardofFreedom,
		Cards.Names.Fractal,
		Cards.Names.BlueNymph,
	];
	var elements = [];
	for (var i = 0; i < deck.length; i++) {
		if (
			bannedCards.some(function(ban) {
				return deck[i].isOf(ban);
			})
		)
			return deck[i].name + ' banned';
		pushElement(deck[i].element);
		if (deck[i].active.cast && deck[i].cast) {
			pushElement(deck[i].castele);
		}
	}
	if (elements.length > 3)
		return (
			'Illegal. Elements used: ' +
			elements
				.map(function(x) {
					return etg.eleNames[x];
				})
				.join(' ')
		);
	return (
		'Legal if elements include ' +
		elements
			.map(function(x) {
				return etg.eleNames[x];
			})
			.join(' ')
	);
}
