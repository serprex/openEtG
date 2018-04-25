'use strict';
var etg = require('./etg');
var util = require('../util');
var Effect = require('./Effect');
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
exports.maybeLighten = function(card) {
	return exports.elecols[card.element + card.upped * 13];
};
var Point;
if (typeof PIXI === 'undefined') {
	Point = function(x, y) {
		this.x = x;
		this.y = y;
	};
	Point.prototype.set = Point;
} else Point = PIXI.math.Point;
function reflectPos(obj) {
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
function creaturePos(j, i) {
	var column = crpos[i * 2],
		row = crpos[i * 2 + 1];
	var p = new Point(
		151 + column * 79 + (row == 1 ? 79 / 2 : 0),
		344 + row * 33,
	);
	if (j) reflectPos(p);
	return p;
}
function permanentPos(j, i) {
	var p = new Point(140 + (i % 8) * 64, 504 + Math.floor(i / 8) * 40);
	if (j) reflectPos(p);
	return p;
}
function tgtToPos(t) {
	if (t instanceof etg.Creature) {
		return creaturePos(t.owner == t.owner.game.player2, t.getIndex());
	} else if (t instanceof etg.Weapon) {
		var p = new Point(666, 512);
		if (t.owner == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t instanceof etg.Shield) {
		var p = new Point(710, 532);
		if (t.owner == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t instanceof etg.Permanent) {
		return permanentPos(t.owner == t.owner.game.player2, t.getIndex());
	} else if (t.type == etg.Player) {
		var p = new Point(50, 560);
		if (t == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t instanceof etg.CardInstance) {
		return new Point(
			t.owner == t.owner.game.player2 ? 20 : 780,
			(t.owner == t.owner.game.player2 ? 140 : 300) +
				20 * t.owner.hand.indexOf(t),
		);
	} else console.log('Unknown target');
}
var sounds = {},
	musics = {},
	currentMusic;
var soundEnabled = false,
	musicEnabled = false;
function loadSounds() {
}
function loadMusics() {
}
function playSound(name, dontreset) {
}
function playMusic(name) {
}
function changeSound(enabled) {
}
function changeMusic(enabled) {
}
function parseInput(data, key, value, limit) {
	var value = parseInt(value);
	if (value === 0 || value > 0) data[key] = Math.min(value, limit || Infinity);
}
function parsepvpstats(data) {
	parseInput(data, 'p1hp', options.pvphp);
	parseInput(data, 'p1drawpower', options.pvpdraw, 8);
	parseInput(data, 'p1markpower', options.pvpmark, 1188);
	parseInput(data, 'p1deckpower', options.pvpdeck);
}
function parseaistats(data) {
	parseInput(data, 'p2hp', options.aihp);
	parseInput(data, 'p2drawpower', options.aidraw, 8);
	parseInput(data, 'p2markpower', options.aimark, 1188);
	parseInput(data, 'p2deckpower', options.aideckpower);
}
exports.reflectPos = reflectPos;
exports.creaturePos = creaturePos;
exports.permanentPos = permanentPos;
exports.tgtToPos = tgtToPos;
exports.loadSounds = loadSounds;
exports.loadMusics = loadMusics;
exports.playSound = playSound;
exports.playMusic = playMusic;
exports.changeSound = changeSound;
exports.changeMusic = changeMusic;
exports.parseInput = parseInput;
exports.parsepvpstats = parsepvpstats;
exports.parseaistats = parseaistats;
