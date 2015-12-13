"use strict";
var DefaultStatus = exports.DefaultStatus = {
	adrenaline:0,
	chargecap:0,
	delayed:0,
	dive:0,
	frozen:0,
	neuro:false,
	poison:0,
	steamatk:0,
	storedAtk:0,
	storedpower:0,
};
function cloneStatus(status){
	var result = Object.create(DefaultStatus);
	for(var key in status){
		if (DefaultStatus[key] != status[key]){
			result[key] = status[key];
		}
	}
	return result;
}
function parseSkill(name){
	if (name in Skills){
		return Skills[name];
	}else{
		var spidx = name.indexOf(" ");
		if (~spidx){
			Skills[name] = Skills[name.slice(0, spidx)](name.slice(spidx+1));
			Skills[name].activename = [name];
			return Skills[name];
		}
	}
	console.log("Unknown active", name);
}
// adrtbl is a bitpacked 2d array
// [[0,0,0,0],[1,1,1],[2,2,2],[3,3,3],[3,2],[4,2],[4,2],[5,3],[6,3],[3],[4],[4],[4],[5],[5],[5]]
var adrtbl = new Uint16Array([4, 587, 1171, 1755, 154, 162, 162, 234, 242, 25, 33, 33, 33, 41, 41, 41]);
function getAdrenalRow(x){
	x|=0;
	var sign=(x>0)-(x<0);
	x = Math.abs(x);
	if (x>15) return "";
	var row = adrtbl[x], atks = row&7, ret = "";
	for(var i=0; i<atks; i++){
		row >>= 3;
		ret += (i?", ":"")+((row&7)*sign);
	}
	return ret;
}
function countAdrenaline(x){
	x = Math.abs(x|0);
	return x>15?1:(adrtbl[x]&7)+1;
}
function calcAdrenaline(y, dmg){
	if (y<2)return dmg;
	var row = adrtbl[Math.abs(dmg)];
	if (y-2 >= (row&7)) return 0;
	return ((row>>(y-1)*3)&7)*((dmg>0)-(dmg<0));
}
exports.countAdrenaline = countAdrenaline;
exports.getAdrenalRow = getAdrenalRow;
exports.calcAdrenaline = calcAdrenaline;
exports.cloneStatus = cloneStatus;
exports.parseSkill = parseSkill;
exports.Chroma = 0;
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
exports.PillarEnum = 0;
exports.WeaponEnum = 1;
exports.ShieldEnum = 2;
exports.PermanentEnum = 3;
exports.SpellEnum = 4;
exports.CreatureEnum = 5;
exports.PlayerEnum = 6;
exports.MulliganPhase1 = 0;
exports.MulliganPhase2 = 1;
exports.PlayPhase = 2;
exports.EndPhase = 3;
exports.PillarList = new Uint16Array([5002, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200]);
exports.PendList = new Uint16Array([5004, 5150, 5250, 5350, 5450, 5550, 5650, 5750, 5850, 5950, 6050, 6150, 6250]);
exports.NymphList = new Uint16Array([0, 5120, 5220, 5320, 5420, 5520, 5620, 5720, 5820, 5920, 6020, 6120, 6220]);
exports.AlchemyList = new Uint16Array([0, 5111, 5212, 5311, 5413, 5511, 5611, 5712, 5811, 5910, 6011, 6110, 6209]);
exports.ShardList = new Uint16Array([0, 5130, 5230, 5330, 5430, 5530, 5630, 5730, 5830, 5930, 6030, 6130, 6230]);

var Skills = require("./Skills");