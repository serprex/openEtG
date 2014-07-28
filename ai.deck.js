var etg = require("./etg");
module.exports = function(level) {
	var uprate = level == 0 ? 0 : level == 1 ? .1 : .3;
	function upCode(x) {
		return CardCodes[x].asUpped(Math.random() < uprate).code;
	}
	var deck;
	var cardcount = {};
	var eles = [Math.ceil(Math.random() * 12), Math.ceil(Math.random() * 12)], ecost = [];
	var pillars = etg.filtercards(false, function(x) { return x.type == etg.PillarEnum && !x.rarity; });
	for (var i = 0;i < 13;i++) {
		ecost[i] = 0;
	}
	deck = [];
	var anyshield = 0, anyweapon = 0;
	for (var j = 0;j < 2;j++) {
		for (var i = 0;i < (j == 0 ? 20 : 10) ;i++) {
			var maxRarity = level == 0 ? 2 : (level == 1 ? 3 : 4);
			var card = etg.PlayerRng.randomcard(Math.random() < uprate, function(x) { return x.element == eles[j] && x.type != etg.PillarEnum && x.rarity <= maxRarity && cardcount[x.code] != 6 && !(x.type == etg.ShieldEnum && anyshield == 3) && !(x.type == etg.WeaponEnum && anyweapon == 3); });
			deck.push(card.code);
			cardcount[card.code] = (cardcount[card.code] || 0) + 1;
			if (!(((card.type == etg.WeaponEnum && !anyweapon) || (card.type == etg.ShieldEnum && !anyshield)) && cardcount[card.code])) {
				ecost[card.costele] += card.cost;
			}
			if (card.cast) {
				ecost[card.castele] += card.cast * 1.5;
			}
			if (card.isOf(Cards.Nova)) {
				for (var k = 1;k < 13;k++) {
					ecost[k]--;
				}
			} else if (card.type == etg.ShieldEnum) anyshield++;
			else if (card.type == etg.WeaponEnum) anyweapon++;
		}
	}
	if (!anyshield) {
		var card = CardCodes[deck[0]];
		ecost[card.costele] -= card.cost;
		deck[0] = Cards.Shield.asUpped(Math.random() < uprate).code;
	}
	if (!anyweapon) {
		var card = CardCodes[deck[1]];
		ecost[card.costele] -= card.cost;
		deck[1] = (eles[1] == etg.Air || eles[1] == etg.Light ? Cards.ShortBow :
			eles[1] == etg.Gravity || eles[1] == etg.Earth ? Cards.Hammer :
			eles[1] == etg.Water || eles[1] == etg.Life ? Cards.Wand :
			eles[1] == etg.Darkness || eles[1] == etg.Death ? Cards.Dagger :
			eles[1] == etg.Entropy || eles[1] == etg.Aether ? Cards.Disc :
			Cards.ShortSword).asUpped(Math.random() < uprate).code;
	}
	var pillarstart = deck.length, qpe = 0, qpemin = 99;
	for (var i = 1;i < 13;i++) {
		if (!ecost[i]) continue;
		qpe++;
		qpemin = Math.min(qpemin, ecost[i]);
	}
	if (qpe >= 4) {
		for (var i = 0;i < qpemin * .8;i++) {
			deck.push(upCode(Cards.QuantumPillar.code));
			qpe++;
		}
	} else qpemin = 0;
	for (var i = 1;i < 13;i++) {
		if (!ecost[i]) continue;
		for (var j = 0;j < Math.round((ecost[i] - qpemin) / 5) ;j++) {
			deck.push(upCode(pillars[i * 2]));
		}
	}
	deck.push(etg.TrueMarks[eles[1]]);
	return deck;
}