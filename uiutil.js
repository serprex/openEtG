"use strict";
var etg = require("./etg");
if (typeof PIXI === "undefined"){
	var PIXI = {};
	PIXI.Point = function (x,y){
		this.x = x;
		this.y = y;
	}
	PIXI.Point.prototype.set = PIXI.Point;
}
function mkFont(font, color){
	if (typeof font == "number"){
		font += "px Dosis";
	}
	return {font: font, fill: color || "black"};
}
function reflectPos(obj) {
	var pos = obj instanceof PIXI.Point ? obj : obj.position;
	pos.set(900 - pos.x, 600 - pos.y);
}
function creaturePos(j, i) {
	var row = i < 8 ? 0 : i < 15 ? 1 : 2;
	var column = row == 2 ? (i+1) % 8 : i % 8;
	var p = new PIXI.Point(151 + column * 79 + (row == 1 ? 79/2 : 0), 344 + row * 33);
	if (j) {
		reflectPos(p);
	}
	return p;
}
function permanentPos(j, i) {
	var p = new PIXI.Point(140 + (i % 8) * 64  , 504 + Math.floor(i / 8) * 40);
	if (j) {
		reflectPos(p);
	}
	return p;
}
function tgtToPos(t) {
	if (t instanceof etg.Creature) {
		return creaturePos(t.owner == t.owner.game.player2, t.getIndex());
	} else if (t instanceof etg.Weapon) {
		var p = new PIXI.Point(666, 512);
		if (t.owner == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t instanceof etg.Shield) {
		var p = new PIXI.Point(710, 532);
		if (t.owner == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t instanceof etg.Permanent) {
		return permanentPos(t.owner == t.owner.game.player2, t.getIndex());
	} else if (t instanceof etg.Player) {
		var p = new PIXI.Point(50, 560);
		if (t == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t instanceof etg.CardInstance) {
		return new PIXI.Point(t.owner == t.owner.game.player2 ? 20 : 780, (t.owner == t.owner.game.player2 ? 140 : 300) + 20 * t.owner.hand.indexOf(t));
	} else console.log("Unknown target");
}
exports.mkFont = mkFont;
exports.reflectPos = reflectPos;
exports.creaturePos = creaturePos;
exports.permanentPos = permanentPos;
exports.tgtToPos = tgtToPos;