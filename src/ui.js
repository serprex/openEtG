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
function reflectPos(j, pos) {
	if (j) pos.y = 602 - pos.y;
	return pos;
}
export function creaturePos(j, i) {
	const row = i < 8 ? 0 : i < 15 ? 1 : 2;
	const column = row == 2 ? (i + 1) % 8 : i % 8;
	return reflectPos(j, {
		x: 204 + column * 90 + (row == 1 ? 45 : 0),
		y: 340 + row * 48,
	});
}
export function permanentPos(j, i) {
	return reflectPos(j, {
		x: 280 + (i % 9) * 70,
		y: 492 + Math.floor(i / 9) * 70,
	});
}
export function cardPos(j, i) {
	return {
		x: 132,
		y: (j ? 50 : 340) + 24 * i,
	};
}
export function tgtToPos(t, p1id) {
	if (t.type == etg.Creature) {
		return creaturePos(t.ownerId !== p1id, t.getIndex());
	} else if (t.type === etg.Weapon) {
		return reflectPos(t.ownerId !== p1id, { x: 206, y: 492 });
	} else if (t.type === etg.Shield) {
		return reflectPos(t.ownerId !== p1id, { x: 206, y: 562 });
	} else if (t.type === etg.Permanent) {
		return permanentPos(t.ownerId !== p1id, t.getIndex());
	} else if (t.type === etg.Player) {
		return reflectPos(t.id !== p1id, { x: 50, y: 560 });
	} else if (t.type === etg.Spell) {
		return cardPos(t.ownerId !== p1id, t.getIndex());
	} else {
		return { x: -999, y: -999 };
	}
}
