import * as etg from '../../etg';
import Cards from '../Cards.js';
import Actives from '../../Skills.js';
import * as etgutil from '../../etgutil.js';
import RngMock from '../RngMock.js';

var hasBuff = new Uint16Array([
	5125,
	5318,
	8230,
	5306,
	5730,
	5721,
	5807,
	6115,
	6218,
	6230,
	7106,
	7125,
	7306,
	7318,
	7730,
	7721,
	7807,
	8115,
	8218,
	9015,
]);
var hasPoison = new Uint16Array([
	5218,
	5219,
	5225,
	7208,
	5208,
	5210,
	5214,
	5212,
	5512,
	5518,
	5507,
	5701,
	7218,
	7210,
	7225,
	7214,
	7219,
	7212,
	7512,
	7518,
	7507,
	7701,
	7710,
]);
var canInfect = new Uint16Array([
	5220,
	5224,
	7202,
	7209,
	5202,
	5212,
	5710,
	6103,
	6110,
	6120,
	7212,
	7224,
	7220,
	8103,
	8110,
	8120,
]);
var hasBurrow = new Uint16Array([5408, 5409, 5416, 5401]);
var hasLight = new Uint16Array([5811, 5820, 5908, 7811, 7801, 7820]);
function scorpion(card, deck) {
	var isDeath = card.isOf(Cards.Names.Deathstalker); // Scan for Nightfall
	for (var i = 0; i < deck.length; i++) {
		if (
			~hasBuff.indexOf(deck[i]) ||
			(isDeath && (deck[i] == 6106 || deck[i] == 8106))
		)
			return true;
	}
}
var filters = {
	5036: function rustler(card, deck, ecost) {
		if (Math.abs(ecost[etg.Light]) > 5) return true;
		var qpe = 0;
		for (var i = 1; i < 13; i++) {
			if (i != etg.Light && ecost[i] > 0) qpe++;
		}
		return qpe > 3;
	},
	5214: scorpion,
	5430: function integrity(card, deck) {
		var shardCount = 0;
		for (var i = 0; i < deck.length; i++) {
			if (~etg.ShardList.indexOf(deck[i]) && ++shardCount > 3) return true;
		}
	},
	5812: function hope(card, deck) {
		for (var i = 0; i < deck.length; i++) {
			if (~hasLight.indexOf(deck[i])) return true;
		}
	},
	6013: scorpion,
	6015: function neurotoxin(card, deck) {
		for (var i = 0; i < deck.length; i++) {
			if (~hasPoison.indexOf(deck[i])) return true;
			if (deck[i] == 6112 || deck[i] == 8112) {
				for (var i = 0; i < deck.length; i++) {
					if (~canInfect.indexOf(deck[i])) return true;
				}
			}
		}
	},
};

export default function(level) {
	var uprate = level == 0 ? 0 : level == 1 ? 0.1 : 0.3;
	function upCode(x) {
		return uprate ? etgutil.asUpped(x, Math.random() < uprate) : x;
	}
	var cardcount = [];
	var eles = [RngMock.upto(12) + 1, RngMock.upto(12) + 1],
		ecost = new Float32Array(13);
	for (var i = 0; i < 13; i++) {
		ecost[i] = 0;
	}
	ecost[eles[1]] -= 5 * (level > 1 ? 2 : 1);
	var deck = [];
	var anyshield = 0,
		anyweapon = 0;
	eles.forEach(function(ele, j) {
		for (var i = 20 - j * 10; i > 0; i--) {
			var card = RngMock.randomcard(Math.random() < uprate, function(x) {
				return (
					x.element == ele &&
					x.type != etg.Pillar &&
					cardcount[x.code] != 6 &&
					!(x.type == etg.Shield && anyshield == 3) &&
					!(x.type == etg.Weapon && anyweapon == 3) &&
					!x.isOf(Cards.Names.Precognition)
				);
			});
			deck.push(card.code);
			cardcount[card.code] = (cardcount[card.code] || 0) + 1;
			if (
				!(
					((card.type == etg.Weapon && !anyweapon) ||
						(card.type == etg.Shield && !anyshield)) &&
					cardcount[card.code]
				)
			) {
				ecost[card.costele] += card.cost;
			}
			if (card.cast) {
				ecost[card.castele] += card.cast * 1.5;
			}
			if (card.isOf(Cards.Names.Nova)) {
				for (var k = 1; k < 13; k++) {
					ecost[k] -= card.upped ? 2 : 1;
				}
			} else if (card.type == etg.Creature) {
				var auto = card.active.auto;
				if (auto == Actives.light) ecost[etg.Light] -= 2;
				else if (auto == Actives.fire) ecost[etg.Fire] -= 2;
				else if (auto == Actives.air) ecost[etg.Air] -= 2;
				else if (auto == Actives.earth) ecost[etg.Earth] -= 2;
			} else if (card.type == etg.Shield) anyshield++;
			else if (card.type == etg.Weapon) anyweapon++;
		}
	});
	for (var i = deck.length - 1; ~i; i--) {
		var filterFunc = filters[etgutil.asUpped(deck[i], false)];
		if (filterFunc) {
			var card = Cards.Codes[deck[i]];
			if (!filterFunc(card, deck, ecost)) {
				ecost[card.element] -= card.cost;
				deck.splice(i, 1);
				i = deck.length;
			}
		}
	}
	if (!anyshield) {
		deck.push(upCode(Cards.Names.Shield.code));
		ecost[0] += Cards.Codes[deck[deck.length - 1]].cost;
	}
	if (!anyweapon) {
		deck.push(
			upCode(
				(eles[1] == etg.Air || eles[1] == etg.Light
					? Cards.Names.ShortBow
					: eles[1] == etg.Gravity || eles[1] == etg.Earth
					? Cards.Names.Hammer
					: eles[1] == etg.Darkness || eles[1] == etg.Death
					? Cards.Names.Dagger
					: Cards.Names.ShortSword
				).code,
			),
		);
		ecost[0] += Cards.Codes[deck[deck.length - 1]].cost;
	}
	var qpe = 0,
		qpesum = ecost[0],
		ismono = eles[0] == eles[1];
	for (var i = 1; i < 13; i++) {
		if (!ecost[i] || ~eles.indexOf(i)) continue;
		qpe++;
		qpesum += ecost[i];
	}
	for (var i = 1; i < 13; i++) {
		if (ecost[i] > 0) ecost[i] += ecost[0] / (qpe + (ismono ? 1 : 2));
	}
	if (qpe >= (ismono ? 3 : 2)) {
		qpesum /= qpe + (ismono ? 2 : 1);
		for (var i = 0; i < qpesum * 0.8; i++) {
			deck.push(upCode(Cards.Names.QuantumPillar.code));
			qpe++;
		}
	} else qpesum = 0;
	for (var i = 1; i < 13; i++) {
		if (ecost[i] > 0) {
			for (var j = 0; j < Math.round((ecost[i] - qpesum) / 5); j++) {
				deck.push(upCode(etg.PillarList[i]));
			}
		}
	}
	deck.push(etgutil.toTrueMark(eles[1]));
	return deck;
}
