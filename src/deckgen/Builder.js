import * as etg from '../etg.js';
import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import Skills from '../Skills.js';

const hasBuff = new Uint16Array([
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
const hasPoison = new Uint16Array([
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
const canInfect = new Uint16Array([
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
const hasBurrow = new Uint16Array([5408, 5409, 5416, 5401]);
const hasLight = new Uint16Array([5811, 5820, 5908, 7811, 7801, 7820]);
function scorpion(card, deck) {
	const isDeath = card.isOf(Cards.Names.Deathstalker); // Scan for Nightfall
	for (let i = 0; i < deck.length; i++) {
		if (
			~hasBuff.indexOf(deck[i]) ||
			(isDeath && (deck[i] === 6106 || deck[i] === 8106))
		)
			return true;
	}
}
const filters = {
	5114: function dingercat(card, deck) {
		let n = 0;
		for (let i = 0; i < deck.length; i++) {
			const c = Cards.Codes[deck[i]],
				cast = c.active.get('cast');
			if (
				cast &&
				(cast === Skills.mutation ||
					cast === Skills.improve ||
					cast === Skills.jelly ||
					cast === Skills.trick ||
					cast === Skills.immolate ||
					cast === Skills.appease)
			) {
				n++;
			}
			if (c.active.get('death')) n++;
		}
		return n > 3;
	},
	5214: scorpion,
	5325: function tidalHealing(card, deck) {
		let aquaticCount = 0;
		for (let i = 0; i < deck.length; i++) {
			if (Cards.Codes[deck[i]].getStatus('aquatic') && ++aquaticCount > 4)
				return true;
		}
	},
	5418: function tunneling(card, deck) {
		for (let i = 0; i < deck.length; i++) {
			if (~hasBurrow.indexOf(deck[i])) return true;
		}
	},
	5430: function integrity(card, deck) {
		let shardCount = 0;
		for (let i = 0; i < deck.length; i++) {
			if (~etg.ShardList.indexOf(deck[i]) && ++shardCount > 5) return true;
		}
	},
	5503: function rustler(card, deck, ecost) {
		if (Math.abs(ecost[etg.Light]) > 5) return true;
		let qpe = 0;
		for (let i = 1; i < 13; i++) {
			if (ecost[i] > 2) qpe++;
		}
		return qpe > 3;
	},
	5812: function hope(card, deck) {
		for (let i = 0; i < deck.length; i++) {
			if (~hasLight.indexOf(deck[i])) return true;
		}
	},
	6013: scorpion,
	6015: function neurotoxin(card, deck) {
		for (let i = 0; i < deck.length; i++) {
			if (~hasPoison.indexOf(deck[i])) return true;
			if (deck[i] === 6112 || deck[i] === 8112) {
				for (let i = 0; i < deck.length; i++) {
					if (~canInfect.indexOf(deck[i])) return true;
				}
			}
		}
	},
};

const material = new Set([4, 6, 7, 9]),
	spiritual = new Set([4, 6, 7, 9]),
	cardinal = new Set([1, 3, 10, 12]);
export default class Builder {
	constructor(mark, uprate, markpower) {
		this.mark = mark;
		this.cardcount = [];
		this.deck = [];
		this.anyshield = 0;
		this.anyweapon = 0;
		this.ecost = new Float32Array(13);
		this.ecost[this.mark] -= 8 * markpower;
		this.uprate = uprate;
	}

	filterCards() {
		const { deck, ecost } = this;
		for (let i = deck.length - 1; ~i; i--) {
			const filterFunc = filters[etgutil.asUpped(deck[i], false)];
			if (filterFunc) {
				const card = Cards.Codes[deck[i]];
				if (!filterFunc(card, deck, ecost)) {
					this.removeCardCost(card);
					deck.splice(i, 1);
					i = deck.length;
				}
			}
		}
	}

	removeCardCost(card) {
		this.ecost[card.element] -= card.cost;
	}

	addCard(card) {
		const { deck, cardcount, ecost } = this;
		deck.push(card.code);
		cardcount[card.code] = (cardcount[card.code] || 0) + 1;
		if (
			!(
				((card.type === etg.Weapon && !this.anyweapon) ||
					(card.type === etg.Shield && !this.anyshield)) &&
				cardcount[card.code]
			)
		) {
			ecost[card.costele] += card.cost;
		}
		if (card.type !== etg.Spell && card.cast) {
			ecost[card.castele] += card.cast * 1.5;
		}
		if (card.isOf(Cards.Names.Nova)) {
			ecost[0] -= card.upped ? 24 : 12;
		} else if (card.isOf(Cards.Names.Immolation)) {
			ecost[0] -= 12;
			ecost[etg.Fire] -= card.upped ? 7 : 5;
		} else if (card.isOf(Cards.Names.GiftofOceanus)) {
			if (this.mark === etg.Water) ecost[etg.Water] -= 3;
			else {
				ecost[etg.Water] -= 2;
				ecost[this.mark] -= 2;
			}
		} else if (card.isOf(Cards.Names.Georesonator)) {
			ecost[this.mark] -= 6;
			ecost[0] -= 4;
		}
		if (card.type === etg.Creature) {
			const auto = card.active.get('ownattack'),
				castText = auto ? auto.castText : '';
			if (castText && castText.startsWith('quanta '))
				ecost[castText.split(' ')[1]] -= 3;
			else if (auto === Skills.siphon) ecost[etg.Darkness] -= 2;
		} else if (card.type === etg.Shield) this.anyshield++;
		else if (card.type === etg.Weapon) this.anyweapon++;
	}

	addPillars() {
		const { deck, ecost } = this;
		for (let i = 1; i < 13; i++) {
			ecost[i] += ecost[0] / 12;
		}
		const qc = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
		while (true) {
			for (let i = qc.length - 1; ~i; i--) {
				if (ecost[qc[i]] < 2) {
					qc.splice(i, 1);
				}
			}
			if (qc.length > 2) {
				if (qc.every(x => material.has(x))) {
					deck.push(this.upCode(Cards.Names.MaterialPillar.code));
					for (const e of material) {
						ecost[e] -= 2;
					}
				} else if (qc.every(x => spiritual.has(x))) {
					deck.push(this.upCode(Cards.Names.SpiritualPillar.code));
					for (const e of spiritual) {
						ecost[e] -= 2;
					}
				} else if (qc.every(x => cardinal.has(x))) {
					deck.push(this.upCode(Cards.Names.CardinalPillar.code));
					for (const e of cardinal) {
						ecost[e] -= 2;
					}
				}
				deck.push(this.upCode(Cards.Names.QuantumPillar.code));
				for (let i = 1; i < 13; i++) {
					ecost[i] -= 1.25;
				}
			} else {
				break;
			}
		}
		for (let i = 0; i < qc.length; i++) {
			const e = qc[i];
			for (let j = 0; j < ecost[e]; j += 5) {
				deck.push(this.upCode(etg.PillarList[e]));
			}
		}
	}

	upCard(x) {
		return this.uprate ? x.asUpped(Math.random() < this.uprate) : x;
	}

	upCode(x) {
		return this.uprate ? etgutil.asUpped(x, Math.random() < this.uprate) : x;
	}

	addEquipment() {
		if (!this.anyshield) {
			this.addCard(this.upCard(Cards.Names.Shield));
		}
		if (!this.anyweapon) {
			this.addCard(this.defaultWeapon());
		}
	}

	defaultWeapon() {
		const e = this.mark;
		return this.upCard(
			e === etg.Air || e === etg.Light
				? Cards.Names.ShortBow
				: e === etg.Gravity || e === etg.Earth
				? Cards.Names.Hammer
				: e === etg.Water || e === etg.Life
				? Cards.Names.Wand
				: e === etg.Darkness || e === etg.Death
				? Cards.Names.Dagger
				: e === etg.Entropy || e === etg.Aether
				? Cards.Names.Disc
				: e === etg.Fire || e === etg.Time
				? Cards.Names.BattleAxe
				: Cards.Names.ShortSword,
		);
	}

	finish() {
		this.deck.push(etgutil.toTrueMark(this.mark));
		return etgutil.encodedeck(this.deck);
	}
}
