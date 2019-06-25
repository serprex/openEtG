'use strict';
const etg = require('./etg');
exports.eleNames = [
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
exports.elecols = new Uint32Array([
	0xaa9988,
	0xaa5599,
	0x776688,
	0x996633,
	0x665544,
	0x55aa00,
	0xcc5522,
	0x225588,
	0x888877,
	0x3388dd,
	0xccaa22,
	0x333333,
	0x55aacc,
	0xddccbb,
	0xddbbcc,
	0xbbaacc,
	0xccbb99,
	0xbbaa99,
	0xaacc77,
	0xddaa88,
	0x88aacc,
	0xccccbb,
	0x99bbee,
	0xeedd88,
	0x999999,
	0xaaddee,
]);
exports.strcols = [
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
exports.maybeLighten = function(card) {
	return exports.elecols[card.element + card.upped * 13];
};
exports.maybeLightenStr = function(card) {
	return exports.strcols[card.element + card.upped * 13];
};
function reflectPos(pos) {
	pos.x = 900 - pos.x;
	pos.y = 600 - pos.y;
}
function creaturePos(j, i) {
	const row = i < 8 ? 0 : i < 15 ? 1 : 2;
	const column = row == 2 ? (i + 1) % 8 : i % 8;
	const p = {
		x: 151 + column * 79 + (row == 1 ? 79 / 2 : 0),
		y: 344 + row * 33,
	};
	if (j) reflectPos(p);
	return p;
}
function permanentPos(j, i) {
	const p = {
		x: 142 + ((i & 7) << 6),
		y: 498 + (i >> 3) * (j ? 50 : 62),
	};
	if (j) reflectPos(p);
	return p;
}
function cardPos(j, i) {
	return {
		x: (j ? 36 : 793) + 66 * (i & 1),
		y: (j ? 118 : 346) + 48 * (i >> 1),
	};
}
function tgtToPos(t) {
	if (t.type == etg.Creature) {
		return creaturePos(t.ownerId == t.game.player2Id, t.getIndex());
	} else if (t.type == etg.Weapon) {
		const p = { x: 666, y: 508 };
		if (t.ownerId == t.game.player2Id) reflectPos(p);
		return p;
	} else if (t.type == etg.Shield) {
		const p = { x: 710, y: 540 };
		if (t.ownerId == t.game.player2Id) reflectPos(p);
		return p;
	} else if (t.type == etg.Permanent) {
		return permanentPos(t.ownerId == t.game.player2Id, t.getIndex());
	} else if (t.type == etg.Player) {
		const p = { x: 50, y: 560 };
		if (t.id == t.game.player2Id) reflectPos(p);
		return p;
	} else if (t.type == etg.Spell) {
		return cardPos(t.ownerId == t.game.player2Id, t.getIndex());
	} else {
		return { x: -999, y: -999 };
	}
}
exports.creaturePos = creaturePos;
exports.permanentPos = permanentPos;
exports.cardPos = cardPos;
exports.tgtToPos = tgtToPos;
