"use strict";
var etg = require("../etg");
var Cards = require("../Cards");
var Skills = require("../Skills");
var etgutil = require("../etgutil");

function scorpion(card, deck){
	var hasBuff = ["505","566","816","55q","5j2","5ip","5lf","5v3","62a","62m","6u2","6ul","74a","74m","7hi","7h9","7jv","7tj","80q","8pn"];
	if (card.isOf(Cards.Deathstalker)) hasBuff.push(Cards.Nightfall.code, etgutil.asUpped(Cards.Nightfall.code, true));
	for(var i=0; i<deck.length; i++){
		if (~hasBuff.indexOf(deck[i])) return true;
	}
}
var filters = {
	"4tc":function rustler(card, deck, ecost){
		if (Math.abs(ecost[etg.Light]) > 5) return true;
		var qpe=0;
		for(var i=1; i<13; i++){
			if (i != etg.Light && ecost[i]>0) qpe++;
		}
		return qpe>3;
	},
	"52u":scorpion,
	"56d":function tidalHealing(card, deck){
		var aquaticCount = 0;
		for(var i=0; i<deck.length; i++){
			if (Cards.Codes[deck[i]].status.aquatic && ++aquaticCount>4) return true;
		}
	},
	"59a":function tunneling(card, deck){
		var hasBurrow = ["590", "591", "598", "58p"];
		for(var i=0; i<deck.length; i++){
			if (~hasBurrow.indexOf(deck[i])) return true;
		}
	},
	"59m":function integrity(card, deck){
		var shardCount=0;
		for(var i=0; i<deck.length; i++){
			if (~etg.ShardList.indexOf(deck[i]) && ++shardCount>3) return true;
		}
	},
	"5lk":function hope(card, deck){
		var hasLight = ["5lj","5ls","5ok","7k3","7jp","7kc"];
		for(var i=0; i<deck.length; i++){
			if (~hasLight.indexOf(deck[i])) return true;
		}
	},
	"5rt":scorpion,
	"5rv":function neurotoxin(card, deck){
		var hasPoison = ["532","533","539","718","52o","52q","52u","52s","5c8","5ce","5c3","5i5","71i","71a","71p","71e","71j","71c","7ao","7au","7aj","7gl","7gu"];
		var canInfect = ["534","538","712","719","52i","52s","5ie","5un","5uu","5v8","71c","71o","71k","7t7","7te","7to"];
		for(var i=0; i<deck.length; i++){
			if (~hasPoison.indexOf(deck[i])) return true;
			if (deck[i] == "5v0" || deck[i] == "7tg"){
				for(var i=0; i<deck.length; i++){
					if (~canInfect.indexOf(deck[i])) return true;
				}
			}
		}
	},
}
module.exports = function(uprate, markpower, maxRarity) {
	function upCode(x) {
		return uprate ? etgutil.asUpped(x, Math.random() < uprate) : x;
	}
	var cardcount = {};
	var eles = [etg.PlayerRng.uptoceil(12), etg.PlayerRng.uptoceil(12)], ecost = new Float32Array(13);
	for (var i = 0;i < 13;i++) {
		ecost[i] = 0;
	}
	ecost[eles[1]] -= 5 * markpower;
	var deck = [];
	var anyshield = 0, anyweapon = 0;
	eles.forEach(function(ele, j){
		for (var i = 20-j*10; i>0; i--) {
			var card = etg.PlayerRng.randomcard(Math.random() < uprate, function(x) {
				return x.element == ele && x.type != etg.PillarEnum && x.rarity <= maxRarity && cardcount[x.code] != 6 &&
					!(x.type == etg.ShieldEnum && anyshield == 3) && !(x.type == etg.WeaponEnum && anyweapon == 3) && !x.isOf(Cards.Give) && !x.isOf(Cards.Precognition);
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
					ecost[k] -= card.upped?2:1;
				}
			}else if (card.isOf(Cards.GiftofOceanus)){
				if (eles[1] == etg.Water) ecost[etg.Water] -= 3;
				else{
					ecost[etg.Water] -= 2;
					ecost[eles[1]] -= 2;
				}
			}else if (card.isOf(Cards.Georesonator)){
				ecost[ele[1]] -= 8;
			}else if (card.type == etg.CreatureEnum){
				var auto = card.active.auto;
				if (auto == Skills.light) ecost[etg.Light] -= 2;
				else if (auto == Skills.fire) ecost[etg.Fire] -= 2;
				else if (auto == Skills.air) ecost[etg.Air] -= 2;
				else if (auto == Skills.earth) ecost[etg.Earth] -= 2;
			}else if (card.type == etg.ShieldEnum) anyshield++;
			else if (card.type == etg.WeaponEnum) anyweapon++;
		}
	});
	for (var i=deck.length-1; ~i; i--){
		var filterFunc = filters[etgutil.asUpped(deck[i], false)];
		if (filterFunc){
			var card = Cards.Codes[deck[i]];
			if (!filterFunc(card, deck, ecost)){
				ecost[card.element] -= card.cost;
				deck.splice(i, 1);
				i = deck.length;
			}
		}
	}
	if (!anyshield) {
		deck.push(upCode(Cards.Shield.code));
		ecost[0] += Cards.Codes[deck[deck.length-1]].cost;
	}
	if (!anyweapon) {
		deck.push(upCode((eles[1] == etg.Air || eles[1] == etg.Light ? Cards.ShortBow :
			eles[1] == etg.Gravity || eles[1] == etg.Earth ? Cards.Hammer :
			eles[1] == etg.Water || eles[1] == etg.Life ? Cards.Wand :
			eles[1] == etg.Darkness || eles[1] == etg.Death ? Cards.Dagger :
			eles[1] == etg.Entropy || eles[1] == etg.Aether ? Cards.Disc :
			eles[1] == etg.Fire || eles[1] == etg.Time ? Cards.BattleAxe :
			Cards.ShortSword).code));
		ecost[0] += Cards.Codes[deck[deck.length-1]].cost;
	}
	var qpe = 0, qpesum = ecost[0], ismono = eles[0] == eles[1];
	for (var i = 1;i < 13;i++) {
		if (!ecost[i] || ~eles.indexOf(i)) continue;
		qpe++;
		qpesum += ecost[i];
	}
	for (var i = 1;i < 13;i++){
		if (ecost[i]>0) ecost[i] += ecost[0]/(qpe+(ismono?1:2));
	}
	if (qpe >= (ismono?3:2)) {
		qpesum /= qpe+(ismono?2:1);
		for (var i = 0;i < qpesum * .8;i++) {
			deck.push(upCode(Cards.QuantumPillar.code));
			qpe++;
		}
	} else qpesum = 0;
	for (var i = 1;i < 13;i++) {
		if (ecost[i] > 0){
			for (var j = 0;j < Math.round((ecost[i] - qpesum) / 5); j++) {
				deck.push(upCode(etg.PillarList[i]));
			}
		}
	}
	deck.push(etg.toTrueMark(eles[1]));
	return etgutil.encodedeck(deck);
}