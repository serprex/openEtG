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
	'#a98',
	'#a59',
	'#768',
	'#963',
	'#654',
	'#5a0',
	'#c52',
	'#258',
	'#887',
	'#38d',
	'#ca2',
	'#333',
	'#5ac',
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
export function reflectPos(pos) {
	pos.x = 900 - pos.x;
	pos.y = 600 - pos.y;
}
export function creaturePos(j, i) {
	const row = i < 8 ? 0 : i < 15 ? 1 : 2;
	const column = row == 2 ? (i + 1) % 8 : i % 8;
	const p = {
		x: 151 + column * 79 + (row == 1 ? 79 / 2 : 0),
		y: 344 + row * 33,
	};
	if (j) reflectPos(p);
	return p;
}
export function permanentPos(j, i) {
	const p = {
		x: 142 + ((i & 7) << 6),
		y: 498 + (i >> 3) * (j ? 50 : 62),
	};
	if (j) reflectPos(p);
	return p;
}
export function cardPos(j, i) {
	return {
		x: (j ? 36 : 793) + 66 * (i & 1),
		y: (j ? 118 : 346) + 48 * (i >> 1),
	};
}
export function tgtToPos(t, p1id) {
	if (t.type == etg.Creature) {
		return creaturePos(t.ownerId !== p1id, t.getIndex());
	} else if (t.type === etg.Weapon) {
		const p = { x: 666, y: 508 };
		if (t.ownerId !== p1id) reflectPos(p);
		return p;
	} else if (t.type === etg.Shield) {
		const p = { x: 710, y: 540 };
		if (t.ownerId !== p1id) reflectPos(p);
		return p;
	} else if (t.type === etg.Permanent) {
		return permanentPos(t.ownerId !== p1id, t.getIndex());
	} else if (t.type === etg.Player) {
		const p = { x: 50, y: 560 };
		if (t.id !== p1id) reflectPos(p);
		return p;
	} else if (t.type === etg.Spell) {
		return cardPos(t.ownerId !== p1id, t.getIndex());
	} else {
		return { x: -999, y: -999 };
	}
}
