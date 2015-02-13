"use strict";
var etg = require("../etg");
var Cards = require("../Cards");
var Actives = require("../Actives");
var etgutil = require("../etgutil");
module.exports = function(level) {
	if (!Cards.loaded){
		return;
	}
	var uprate = level == 0 ? 0 : level == 1 ? .1 : .3;
	function upCode(x) {
		return uprate ? etgutil.asUpped(x, Math.random() < uprate) : x;
	}
	var cardcount = {};
	var eles = [etg.PlayerRng.uptoceil(12), etg.PlayerRng.uptoceil(12)], ecost = new Array(13);
	for (var i = 0;i < 13;i++) {
		ecost[i] = 0;
	}
	ecost[eles[1]] -= 5 * (level > 1 ? 2 : 1);
	var deck = [];
	var anyshield = 0, anyweapon = 0;
	eles.forEach(function(ele, j){
		for (var i = 20-j*10; i>0; i--) {
			var maxRarity = level == 0 ? 2 : (level == 1 ? 3 : 4);
			var card = etg.PlayerRng.randomcard(Math.random() < uprate, function(x) {
				return x.element == ele && x.type != etg.PillarEnum && x.rarity <= maxRarity && cardcount[x.code] != 6 &&
					!(x.type == etg.ShieldEnum && anyshield == 3) && !(x.type == etg.WeaponEnum && anyweapon == 3) && !x.isOf(Cards.Give);
			});
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
			}else if (card.isOf(Cards.GiftofOceanus)){
				ecost[etg.Water] -= 3;
				ecost[eles[1]] -= 2;
			}else if (card.type == etg.CreatureEnum){
				var auto = card.active.auto;
				if (auto == Actives.light) ecost[etg.Light]--;
				else if (auto == Actives.fire) ecost[etg.Fire]--;
				else if (auto == Actives.air) ecost[etg.Air]--;
				else if (auto == Actives.earth) ecost[etg.Earth]--;
			}else if (card.type == etg.ShieldEnum) anyshield++;
			else if (card.type == etg.WeaponEnum) anyweapon++;
		}
	});
	if (!anyshield) {
		var card = Cards.Codes[deck[0]];
		ecost[card.costele] -= card.cost;
		deck[0] = upCode(Cards.Shield.code);
	}
	if (!anyweapon) {
		var card = Cards.Codes[deck[1]];
		ecost[card.costele] -= card.cost;
		deck[1] = upCode((eles[1] == etg.Air || eles[1] == etg.Light ? Cards.ShortBow :
			eles[1] == etg.Gravity || eles[1] == etg.Earth ? Cards.Hammer :
			eles[1] == etg.Water || eles[1] == etg.Life ? Cards.Wand :
			eles[1] == etg.Darkness || eles[1] == etg.Death ? Cards.Dagger :
			eles[1] == etg.Entropy || eles[1] == etg.Aether ? Cards.Disc :
			Cards.ShortSword).code);
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
		if (ecost[i] > 0){
			for (var j = 0;j < Math.round((ecost[i] - qpemin) / 5); j++) {
				deck.push(upCode(etg.PillarList[i]));
			}
		}
	}
	deck.push(etg.toTrueMark(eles[1]));
	return etgutil.encodedeck(deck);
}