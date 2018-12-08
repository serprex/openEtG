'use strict';

var Other = 0;
var Entropy = 1;
var Death = 2;
var Gravity = 3;
var Earth = 4;
var Life = 5;
var Fire = 6;
var Water = 7;
var Light = 8;
var Air = 9;
var Time = 10;
var Darkness = 11;
var Aether = 12;
var PillarEnum = 0;
var WeaponEnum = 1;
var ShieldEnum = 2;
var PermanentEnum = 3;
var SpellEnum = 4;
var CreatureEnum = 5;
var PlayPhase = 0;
var EndPhase = 1;
var passives = new Set([
	'airborne',
	'nocturnal',
	'voodoo',
	'swarm',
	'ranged',
	'additive',
	'stackable',
	'salvage',
	'token',
	'poisonous',
	'singularity',
	'siphon',
	'mutant',
	'bounce',
]);
// adrtbl is a bitpacked 2d array
// [[0,0,0,0],[1,1,1],[2,2,2],[3,3,3],[3,2],[4,2],[4,2],[5,3],[6,3],[3],[4],[4],[4],[5],[5],[5]]
var adrtbl = new Uint16Array([
	4,
	587,
	1171,
	1755,
	154,
	162,
	162,
	234,
	242,
	25,
	33,
	33,
	33,
	41,
	41,
	41,
]);
function countAdrenaline(x) {
	x = Math.abs(x | 0);
	return x > 15 ? 1 : (adrtbl[x] & 7) + 1;
}
function getAdrenalRow(x) {
	x |= 0;
	var sign = (x > 0) - (x < 0);
	x = Math.abs(x);
	if (x > 15) return '';
	var row = adrtbl[x],
		ret = '';
	for (var i = 0; i < ret.length; i++) {
		row >>= 3;
		ret += (i ? ', ' : '') + (row & 7) * sign;
	}
	return ret;
}
function casttext(cast, castele) {
	return cast == 0 ? '0' : cast + ':' + castele;
}
exports.Player = 6;
exports.passives = passives;
exports.countAdrenaline = countAdrenaline;
exports.getAdrenalRow = getAdrenalRow;
exports.casttext = casttext;
exports.Other = 0;
exports.Entropy = 1;
exports.Death = 2;
exports.Gravity = 3;
exports.Earth = 4;
exports.Life = 5;
exports.Fire = 6;
exports.Water = 7;
exports.Light = 8;
exports.Air = 9;
exports.Time = 10;
exports.Darkness = 11;
exports.Aether = 12;
exports.Pillar = exports.PillarEnum = 0;
exports.Weapon = exports.WeaponEnum = 1;
exports.Shield = exports.ShieldEnum = 2;
exports.Permanent = exports.PermanentEnum = 3;
exports.Spell = exports.SpellEnum = 4;
exports.Creature = exports.CreatureEnum = 5;
exports.PlayPhase = 0;
exports.EndPhase = 1;
exports.PillarList = new Uint16Array([
	5002,
	5100,
	5200,
	5300,
	5400,
	5500,
	5600,
	5700,
	5800,
	5900,
	6000,
	6100,
	6200,
]);
exports.PendList = new Uint16Array([
	5004,
	5150,
	5250,
	5350,
	5450,
	5550,
	5650,
	5750,
	5850,
	5950,
	6050,
	6150,
	6250,
]);
exports.NymphList = new Uint16Array([
	0,
	5120,
	5220,
	5320,
	5420,
	5520,
	5620,
	5720,
	5820,
	5920,
	6020,
	6120,
	6220,
]);
exports.AlchemyList = new Uint16Array([
	0,
	5111,
	5212,
	5311,
	5413,
	5511,
	5611,
	5712,
	5811,
	5910,
	6011,
	6110,
	6209,
]);
exports.ShardList = new Uint16Array([
	0,
	5130,
	5230,
	5330,
	5430,
	5530,
	5630,
	5730,
	5830,
	5930,
	6030,
	6130,
	6230,
]);
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
	'Random',
];
