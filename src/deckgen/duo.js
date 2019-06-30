const etg = require('../etg'),
	Cards = require('../Cards'),
	RngMock = require('../RngMock'),
	Builder = require('./Builder');

module.exports = function(uprate, markpower, maxRarity) {
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
					!x.isOf(Cards.Give) &&
					!x.isOf(Cards.Precognition),
			);
			build.addCard(card);
		}
	}
	build.filterCards();
	build.addEquipment();
	build.addPillars();
	return build.finish();
};
