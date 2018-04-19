function superstitious(deck){
	var superset = "4vi 4vk 4vl 4vm 4vp 50a 52l 52m 5c3 5i9 5pa 5ri 5rr 5um 5uo 623".split(" "), sups = 0;
	deck.forEach(function(card){
		if (~superset.indexOf(card.asUpped(false).code)) sups++;
	});
	return sups == 13 || (sups > 13 ? ". Too much superstition" : ". Not enough superstition");
}
function rationality(deck){
	var unupped = 0, shields = 0, weapons = 0, spells = 0, creas = 0, perms = 0;
	if (deck.length != 31) return ". Rational needs 31 cards";
	deck.forEach(function(card){
		if (~etg.ShardList.indexOf(card.asUpped(false).code)) unupped += 4;
		if (!card.upped) unupped--;
		if (card.type == etg.ShieldEnum) shields++;
		if (card.type == etg.WeaponEnum) weapons++;
		if (card.type == etg.SpellEnum || card.isOf(Cards.Chimera)) spells++;
		else if (card.type == etg.CreatureEnum) creas++;
		else if (card.type == etg.PermanentEnum) perms++;
	});
	if (unupped > 0) return ". Unupgrade " + unupped + " cards";
	if (shields != 1) return ". Must have 1 shield";
	if (weapons != 1) return ". Must have 1 weapon";
	if (spells != 5) return ". Must have 5 spells";
	if (creas != 9) return ". Must have 9 creatures";
	if (perms != 2) return ". Must have 2 non-weapon, non-shield, non-pillar permanents";
	return true;
}
module.exports = function(deck){
	var sup = superstitious(deck), rat = rationality(deck);
	return sup === true && rat === true ? "Both" : sup === true ? "Superstitious" : rat === true ? "Rationality" : "Illegal" + sup + rat;
}