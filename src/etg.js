// adrtbl is a bitpacked 2d array
// [[0,0,0,0],[1,1,1],[2,2,2],[3,3,3],[3,2],[4,2],[4,2],[5,3],[6,3],[3],[4],[4],[4],[5],[5],[5]]
const adrtbl = new Uint16Array([
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
export function getAdrenalRow(x) {
	x |= 0;
	const sign = (x > 0) - (x < 0);
	x = Math.abs(x);
	if (x > 15) return '';
	let row = adrtbl[x],
		atks = row & 7,
		ret = '';
	for (let i = 0; i < atks; i++) {
		row >>= 3;
		ret += (i ? ', ' : '') + (row & 7) * sign;
	}
	return ret;
}
export function countAdrenaline(x) {
	x = Math.abs(x | 0);
	return x > 15 ? 1 : (adrtbl[x] & 7) + 1;
}
export function calcAdrenaline(y, dmg) {
	if (y < 2) return dmg;
	const row = adrtbl[Math.abs(dmg)];
	if (y - 2 >= (row & 7)) return 0;
	return ((row >> ((y - 1) * 3)) & 7) * ((dmg > 0) - (dmg < 0));
}
export const Chroma = 0;
export const Entropy = 1;
export const Death = 2;
export const Gravity = 3;
export const Earth = 4;
export const Life = 5;
export const Fire = 6;
export const Water = 7;
export const Light = 8;
export const Air = 9;
export const Time = 10;
export const Darkness = 11;
export const Aether = 12;
export const Pillar = 0;
export const Weapon = 1;
export const Shield = 2;
export const Permanent = 3;
export const Spell = 4;
export const Creature = 5;
export const Player = 6;
export const MulliganPhase = 0;
export const PlayPhase = 1;
export const EndPhase = 2;
export const PillarList = new Uint16Array([
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
export const PendList = new Uint16Array([
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
export const NymphList = new Uint16Array([
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
export const AlchemyList = new Uint16Array([
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
export const ShardList = new Uint16Array([
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
