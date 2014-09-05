"use strict";
var etg = require("./etg");
var gfx = require("./gfx");
function fakepoint(x,y){
	this.x = x;
	this.y = y;
}
var Point;
if (typeof PIXI === "undefined"){
	Point = fakepoint;
	Point.prototype.set = Point;
}else Point = PIXI.Point;
function mkFont(font, color){
	if (typeof font == "number"){
		font += "px Dosis";
	}
	return {font: font, fill: color || "black"};
}
function reflectPos(obj) {
	var pos = obj instanceof Point ? obj : obj.position;
	pos.set(900 - pos.x, 600 - pos.y);
}
function creaturePos(j, i) {
	var row = i < 8 ? 0 : i < 15 ? 1 : 2;
	var column = row == 2 ? (i+1) % 8 : i % 8;
	var p = new Point(151 + column * 79 + (row == 1 ? 79/2 : 0), 344 + row * 33);
	if (j) {
		reflectPos(p);
	}
	return p;
}
function permanentPos(j, i) {
	var p = new Point(140 + (i % 8) * 64  , 504 + Math.floor(i / 8) * 40);
	if (j) {
		reflectPos(p);
	}
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
	} else if (t instanceof etg.Player) {
		var p = new Point(50, 560);
		if (t == t.owner.game.player2) reflectPos(p);
		return p;
	} else if (t instanceof etg.CardInstance) {
		return new Point(t.owner == t.owner.game.player2 ? 20 : 780, (t.owner == t.owner.game.player2 ? 140 : 300) + 20 * t.owner.hand.indexOf(t));
	} else console.log("Unknown target");
}
var tximgcache = {};
function getTextImage(text, font, bgcolor, width) {
	if (!gfx.loaded || !text) return gfx.nopic;
	if (bgcolor === undefined) bgcolor = "";
	var size;
	if (typeof font == "number"){
		size = font;
		font = mkFont(font);
	}else size = parseInt(font.font);
	var fontkey = JSON.stringify(font) + bgcolor + "w" + width;
	if (!(fontkey in tximgcache)) {
		tximgcache[fontkey] = {};
	}
	if (text in tximgcache[fontkey]) {
		return tximgcache[fontkey][text];
	}
	var doc = new PIXI.DisplayObjectContainer();
	if (bgcolor !== ""){
		var bg = new PIXI.Graphics();
		doc.addChild(bg);
	}
	var pieces = text.replace(/\|/g, " | ").split(/(\d\d?:\d\d?|\$|\n)/);
	var x = 0, y = 0, h = Math.max(size, new PIXI.Text("j", font).height), w = 0;
	function pushChild(){
		var w = 0;
		if (x > 0){
			for (var i = 0; i<arguments.length; i++){
				w += arguments[i].width;
			}
		}
		if (width && x + w > width){
			x = 0;
			y += h;
		}
		for (var i = 0; i<arguments.length; i++){
			var c = arguments[i];
			c.position.set(x, y);
			x += c.width;
			doc.addChild(c);
		}
	}
	pieces.forEach(function(piece){
		if (piece == "\n"){
			w = Math.max(w, x);
			x = 0;
			y += h;
		}else if (piece == "$"){
			var spr = new PIXI.Sprite(gfx.gold);
			spr.scale.set(size/16, size/16);
			pushChild(spr);
		}else if (/^\d\d?:\d\d?$/.test(piece)) {
			var parse = piece.split(":");
			var num = parseInt(parse[0]);
			var icon = gfx.eicons[parseInt(parse[1])];
			if (num < 4) {
				var icons = [];
				for (var j = 0;j < num;j++) {
					var spr = new PIXI.Sprite(icon);
					spr.scale.set(size/32, size/32);
					icons.push(spr);
				}
				pushChild.apply(null, icons);
			}else{
				var spr = new PIXI.Sprite(icon);
				spr.scale.set(size/32, size/32);
				pushChild(new PIXI.Text(num, font), spr);
			}
		} else if (piece) {
			var txt = new PIXI.Text(piece, font);
			if (!width || x + txt.width < width){
				pushChild(txt);
			}else{
				piece.split(" ").forEach(function(word){
					if (word){
						pushChild(new PIXI.Text(word, font));
						if (x){
							x += 3;
						}
					}
				});
			}
		}
	});
	var rtex = new PIXI.RenderTexture(width || Math.max(w, x), y+h);
	if (bg){
		bg.beginFill(bgcolor);
		bg.drawRect(0, 0, rtex.width, rtex.height);
		bg.endFill();
	}
	rtex.render(doc);
	return tximgcache[fontkey][text] = rtex;
}
var sounds = {}, musics = {};
var soundEnabled = false, musicEnabled = false;
function loadSounds() {
	if (soundEnabled){
		for (var i = 0;i < arguments.length;i++) {
			sounds[arguments[i]] = new Audio("sound/" + arguments[i] + ".ogg");
		}
	}
}
function loadMusics() {
	if (musicEnabled){
		for (var i = 0;i < arguments.length;i++) {
			musics[arguments[i]] = new Audio("sound/" + arguments[i] + ".ogg");
		}
	}
}
function playSound(name, dontreset) {
	var sound = sounds[name];
	if (soundEnabled) {
		if (!sound){
			sound = sounds[name] = new Audio("sound/" + name + ".ogg");
		}
		if (!dontreset && sound.duration) sound.currentTime = 0;
		sound.play();
	}
}
function playMusic(name) {
	var music = musics[name];
	if (musicEnabled){
		if (!music){
			music = musics[name] = new Audio("sound/" + name + ".ogg");
		}
		if (music.duration) music.currentTime = 0;
		music.play();
	}
}
function changeSound(enabled) {
	soundEnabled = enabled;
	if (!soundEnabled) {
		for (var sound in sounds) {
			sounds[sound].pause();
		}
	}
}
function changeMusic(enabled) {
	musicEnabled = enabled;
	if (!musicEnabled) {
		for (var music in musics) {
			musics[music].pause();
		}
	}
}
exports.mkFont = mkFont;
exports.reflectPos = reflectPos;
exports.creaturePos = creaturePos;
exports.permanentPos = permanentPos;
exports.tgtToPos = tgtToPos;
if (typeof PIXI !== "undefined") exports.getTextImage = getTextImage;
exports.loadSounds = loadSounds;
exports.loadMusics = loadMusics;
exports.playSound = playSound;
exports.playMusic = playMusic;
exports.changeSound = changeSound;
exports.changeMusic = changeMusic;