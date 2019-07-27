import * as etg from '../etg.js';
import Cards from '../Cards.js';
import RngMock from '../RngMock.js';
import Builder from './Builder.js';
import duo from './duo.js';

export default function bow(uprate, markpower, maxRarity) {
	let build;
	if (Math.random() < uprate / 2) {
		build = new Builder(etg.Entropy, uprate, markpower);
		for (let i = 0; i < 5 + RngMock.upto(1); i++) {
			build.addCard(Cards.Names.Nova.asUpped(true));
		}
	} else {
		build = new Builder(etg.Chroma, uprate, markpower);
		for (let i = 0; i < RngMock.upto(12) - 6; i++) {
			build.addCard(Cards.Names.Nova);
		}
	}
	for (let ele = 1; ele <= 12; ele++) {
		for (let i = 1 + RngMock.upto(3); ~i; i--) {
			const card = RngMock.randomcard(
				Math.random() < uprate,
				x =>
					x.element === ele &&
					x.type !== etg.Pillar &&
					x.cost < 7 &&
					x.rarity <= maxRarity &&
					build.cardcount[x.code] !== 6 &&
					!(x.type === etg.Shield && build.anyshield >= 3) &&
					!(x.type === etg.Weapon && build.anyweapon >= 3) &&
					!x.isOf(Cards.Names.Give) &&
					!x.isOf(Cards.Names.GiftofOceanus) &&
					!x.isOf(Cards.Names.Precognition),
			);
			if (build.ecost[ele] + card.cost < 10) {
				build.addCard(card);
			}
		}
	}
	build.filterCards();
	let cost = build.ecost[0] / 4;
	for (let i = 1; i < 13; i++) {
		cost += build.ecost[i];
	}
	for (let i = 0; i < cost; i += 12) {
		build.deck.push(build.upCode(Cards.Names.QuantumPillar.code));
	}
	return build.deck.length < 30
		? duo(uprate, markpower, maxRarity)
		: build.finish();
}
