export default function(deck) {
	var free = '4vj 52o 52i 52q 52u 52p 52s 534 55q 5c8 5c7 5c3 5i5 5ie 5lf 5rt 5un 5uq 5uu 5v8'.split(
		' ',
	);
	var creas = 3,
		perms = 3,
		spells = 2;
	var bannedCards = etg.NymphList.concat([Cards.Names.NymphsTears.code]);
	for (var i = 0; i < deck.length; i++) {
		var card = deck[i];
		if (
			free.indexOf(card.code) == -1 &&
			(card.type != etg.Pillar || card.name.match(/^Mark of/))
		) {
			if (card.upped) return card.name + ' is upgraded. Upgrades are banned';
			if (~etg.ShardList.indexOf(card.code))
				return card.name + ' is a shard. Shards are banned';
			if (
				~etg.NymphList.indexOf(card.code) ||
				card == Cards.Names.Purify ||
				card == Cards.Names.NymphTears
			)
				return card.name + ' is banned';
			if (card.type <= etg.Permanent && !perms--) {
				return card.name + ' would be your 4th non listed permanent';
			} else if (
				(card.type == etg.Creature || card == Cards.Names.Chimera) &&
				!creas--
			) {
				return card.name + ' would be your 4th non listed creature';
			} else if (
				card.type == etg.Spell &&
				card != Cards.Names.Chimera &&
				!spells--
			) {
				return card.name + ' would be your 3rd non listed spell';
			}
		}
	}
	return 'Legal';
}
