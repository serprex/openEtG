import * as etg from '../etg.js';
import Cards from '../Cards.js';
import RngMock from '../RngMock.js';
import Builder from './Builder.js';

export default function duo(uprate, markpower, maxRarity) {
	const eles = new Uint8Array([RngMock.upto(12) + 1, RngMock.upto(12) + 1]),
		build = new Builder(eles[1], uprate, markpower);
	for (let j = 0; j < 2; j++) {
		const ele = eles[j];
		for (let i = 20 - j * 10; i > 0; i--) {
			const card = RngMock.randomcard(
				Math.random() < uprate,
				x =>
					x.element === ele &&
					x.type !== etg.Pillar &&
					x.rarity <= maxRarity &&
					build.cardcount[x.code] !== 6 &&
					!(x.type === etg.Shield && build.anyshield >= 3) &&
					!(x.type === etg.Weapon && build.anyweapon >= 3) &&
					!x.isOf(Cards.Names.Give) &&
					!x.isOf(Cards.Names.Precognition),
			);
			build.addCard(card);
		}
	}
	build.filterCards();
	build.addEquipment();
	build.addPillars();
	return build.finish();
}
