import * as etg from './etg.js';

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
function Point(x, y) {
	this.x = x;
	this.y = y;
}
Point.prototype.set = Point;
export function reflectPos(obj) {
	var pos = obj instanceof Point ? obj : obj.position;
	pos.set(900 - pos.x, 600 - pos.y);
}
var crpos = new Uint8Array([
	3,
	1,
	5,
	1,
	1,
	1,
	2,
	1,
	4,
	1,
	6,
	1,
	0,
	1,
	1,
	2,
	3,
	2,
	5,
	2,
	7,
	2,
	0,
	0,
	2,
	0,
	4,
	0,
	6,
	0,
	0,
	2,
	2,
	2,
	4,
	2,
	6,
	2,
	1,
	0,
	3,
	0,
	5,
	0,
	7,
	0,
]);
export function creaturePos(j, i) {
	var column = crpos[i * 2],
		row = crpos[i * 2 + 1];
	var p = new Point(
		151 + column * 79 + (row == 1 ? 79 / 2 : 0),
		344 + row * 33,
	);
	if (j) reflectPos(p);
	return p;
}
export function permanentPos(j, i) {
	var p = new Point(140 + (i % 8) * 64, 504 + Math.floor(i / 8) * 40);
	if (j) reflectPos(p);
	return p;
}
export function cardPos(j, i) {
	return {
		x: (j ? 36 : 793) + 66 * (i & 1),
		y: (j ? 118 : 346) + 48 * (i >> 1),
	};
}
export function tgtToPos(t) {
	if (t.type === etg.Creature) {
		return creaturePos(t.owner == t.owner.game.player2, t.getIndex());
	} else if (t.type === etg.Weapon) {
		var p = new Point(666, 512);
		if (t.owner == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t.type === etg.Shield) {
		var p = new Point(710, 532);
		if (t.owner == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t.type === etg.Permanent) {
		return permanentPos(t.owner == t.owner.game.player2, t.getIndex());
	} else if (t.type == etg.Player) {
		var p = new Point(50, 560);
		if (t == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t.type === etg.Spell) {
		return cardPos(t.owner == t.owner.game.player2, t.getIndex());
	} else console.log('Unknown target', t);
}
var sounds = {},
	musics = {},
	currentMusic;
var soundEnabled = false,
	musicEnabled = false;
export function loadSounds() {}
export function loadMusics() {}
export function playSound(name, dontreset) {}
export function playMusic(name) {}
export function changeSound(enabled) {}
export function changeMusic(enabled) {}
export function parseInput(data, key, value, limit) {
	var value = parseInt(value);
	if (value === 0 || value > 0) data[key] = Math.min(value, limit || Infinity);
}
export function parsepvpstats(data) {
	parseInput(data, 'p1hp', options.pvphp);
	parseInput(data, 'p1drawpower', options.pvpdraw, 8);
	parseInput(data, 'p1markpower', options.pvpmark, 1188);
	parseInput(data, 'p1deckpower', options.pvpdeck);
}
export function parseaistats(data) {
	parseInput(data, 'p2hp', options.aihp);
	parseInput(data, 'p2drawpower', options.aidraw, 8);
	parseInput(data, 'p2markpower', options.aimark, 1188);
	parseInput(data, 'p2deckpower', options.aideckpower);
}
