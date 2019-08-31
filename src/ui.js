import * as etg from './etg.js';
export const eleNames = [
	'Chroma',
	'Entropy',
	'Death',
	'Gravity',
	'Earth',
	'Life',
	'Fire',
	'Water',
	'Light',
	'Air',
	'Time',
	'Darkness',
	'Aether',
	'Build your own',
	'Random',
];
export const strcols = [
	'#986',
	'#a59',
	'#768',
	'#963',
	'#654',
	'#480',
	'#a31',
	'#248',
	'#776',
	'#38d',
	'#a80',
	'#333',
	'#49b',
	'#dcb',
	'#dbc',
	'#bac',
	'#ca9',
	'#ba9',
	'#ac7',
	'#da8',
	'#8ac',
	'#ccb',
	'#9be',
	'#ed8',
	'#999',
	'#ade',
];
export function maybeLightenStr(card) {
	return strcols[card.element + card.upped * 13];
}
function reflectPos(j, pos) {
	if (j) pos.y = 594 - pos.y;
	return pos;
}
function creaturePos(j, i) {
	const row = i < 8 ? 0 : i < 15 ? 1 : 2;
	const column = row == 2 ? (i + 1) % 8 : i % 8;
	return reflectPos(j, {
		x: 204 + column * 90 + (row == 1 ? 45 : 0),
		y: 334 + row * 44,
	});
}
function permanentPos(j, i) {
	return reflectPos(j, {
		x: 280 + (i % 9) * 70,
		y: 492 + Math.floor(i / 9) * 70,
	});
}
function cardPos(j, i) {
	return {
		x: 132,
		y: (j ? 36 : 336) + 28 * i,
	};
}
export function tgtToPos(t, p1id) {
	const { type } = t;
	if (type === etg.Player) {
		return reflectPos(t.id !== p1id, { x: 50, y: 560 });
	}
	if (~t.getIndex()) {
		switch (type) {
			case etg.Creature:
				return creaturePos(t.ownerId !== p1id, t.getIndex());
			case etg.Weapon:
				return reflectPos(t.ownerId !== p1id, { x: 207, y: 492 });
			case etg.Shield:
				return reflectPos(t.ownerId !== p1id, { x: 207, y: 562 });
			case etg.Permanent:
				return permanentPos(t.ownerId !== p1id, t.getIndex());
			case etg.Spell:
				return cardPos(t.ownerId !== p1id, t.getIndex());
		}
	}
	return null;
}
