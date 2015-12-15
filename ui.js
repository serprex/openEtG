"use strict";
var etg = require("./etg");
exports.eleNames = Object.freeze(["Chroma", "Entropy", "Death", "Gravity", "Earth", "Life", "Fire", "Water", "Light", "Air", "Time", "Darkness", "Aether", "Build your own", "Random"]);
exports.elecols = new Uint32Array([
	0xaa9988, 0xaa5599, 0x776688, 0x996633, 0x665544, 0x55aa00, 0xcc5522, 0x225588, 0x888877, 0x3388dd, 0xccaa22, 0x333333, 0x55aacc,
	0xddccbb, 0xddbbcc, 0xbbaacc, 0xccbb99, 0xbbaa99, 0xaacc77, 0xddaa88, 0x88aacc, 0xccccbb, 0x99bbee, 0xeedd88, 0x999999, 0xaaddee]);
exports.strcols = [
	'#a98', '#a59', '#768', '#963', '#654', '#5a0', '#c52', '#258', '#887', '#38d', '#ca2', '#333', '#5ac',
	'#dcb', '#dbc', '#bac', '#cb9', '#ba9', '#ac7', '#da8', '#8ac', '#ccb', '#9be', '#ed8', '#999', '#ade'];
exports.maybeLighten = function(card){
	return exports.elecols[card.element+card.upped*13];
}
exports.maybeLightenStr = function(card){
	return exports.strcols[card.element+card.upped*13];
}
var Point;
if (typeof PIXI === "undefined"){
	Point = function(x,y){
		this.x = x;
		this.y = y;
	};
	Point.prototype.set = Point;
}else Point = PIXI.math.Point;
function reflectPos(obj) {
	var pos = obj instanceof Point ? obj : obj.position;
	pos.set(900 - pos.x, 600 - pos.y);
}
function creaturePos(j, i) {
	var row = i < 8 ? 0 : i < 15 ? 1 : 2;
	var column = row == 2 ? (i+1) % 8 : i % 8;
	var p = new Point(151 + column * 79 + (row == 1 ? 79/2 : 0), 344 + row * 33);
	if (j) reflectPos(p);
	return p;
}
function permanentPos(j, i) {
	var p = new Point(140 + (i % 8) * 64  , 504 + Math.floor(i / 8) * 40);
	if (j) reflectPos(p);
	return p;
}
function cardPos(j, i) {
	return new Point((j ? 6 : 766) + 66*(i&1), (j ? 80 : 308) + 48 * (i>>1));
}
function tgtToPos(t) {
	if (t.type == etg.Creature) {
		return creaturePos(t.owner == t.owner.game.player2, t.getIndex());
	} else if (t.type == etg.Weapon) {
		var p = new Point(666, 512);
		if (t.owner == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t.type == etg.Shield) {
		var p = new Point(710, 532);
		if (t.owner == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t.type == etg.Permanent) {
		return permanentPos(t.owner == t.owner.game.player2, t.getIndex());
	} else if (t.type == etg.Player) {
		var p = new Point(50, 560);
		if (t == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t.type == etg.Spell) {
		return cardPos(t.owner == t.owner.game.player2, t.owner.hand.indexOf(t));
	} else console.log("Unknown target");
}
exports.reflectPos = reflectPos;
exports.creaturePos = creaturePos;
exports.permanentPos = permanentPos;
exports.cardPos = cardPos;
exports.tgtToPos = tgtToPos;