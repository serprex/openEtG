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
	const column = row === 2 ? (i + 1) % 8 : i % 8;
	return reflectPos(j, {
		x: 204 + column * 90 + (row === 1 ? 45 : 0),
		y: 334 + row * 44,
	});
}
function permanentPos(j, i) {
	return reflectPos(j, { x: 280 + (i % 9) * 70, y: 492 + ((i / 9) | 0) * 70 });
}
function cardPos(j, i) {
	return { x: 132, y: (j ? 36 : 336) + 28 * i };
}
export function tgtToPos(game, id, p1id) {
	const type = game.get_kind(id);
	if (type === etg.Player) {
		return reflectPos(id !== p1id, { x: 50, y: 560 });
	}
	const index = game.getIndex(id);
	if (~index) {
		const ownerId = game.get_owner(id);
		switch (type) {
			case etg.Creature:
				return creaturePos(ownerId !== p1id, index);
			case etg.Weapon:
				return reflectPos(ownerId !== p1id, { x: 207, y: 492 });
			case etg.Shield:
				return reflectPos(ownerId !== p1id, { x: 207, y: 562 });
			case etg.Permanent:
				return permanentPos(ownerId !== p1id, index);
			case etg.Spell:
				return cardPos(ownerId !== p1id, index);
		}
	}
	return null;
}
