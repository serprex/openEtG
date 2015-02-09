"use strict";
var etg = require("./etg");
var gfx = require("./gfx");
var options = require("./options");
var Effect = require("./Effect");
exports.elecols = [0xa99683, 0xaa5999, 0x636069, 0x996633, 0x5f4930, 0x50a005, 0xcc6611, 0x205080, 0x999990, 0x337ddd, 0xbfa622, 0x333333, 0x55aacc];
function lighten(c) {
	return ((c & 255) + 255 >> 1) | (((c >> 8) & 255) + 255 >> 1 << 8) | (((c >> 16) & 255) + 255 >> 1 << 16);
}
exports.maybeLighten = function(card){
	return card.upped ? lighten(exports.elecols[card.element]) : exports.elecols[card.element];
}
function fakepoint(x,y){
	this.x = x;
	this.y = y;
}
var Point;
if (typeof PIXI === "undefined"){
	Point = fakepoint;
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
function getTextImage(text, size, color, bgcolor, width) {
	if (!gfx.loaded || !text) return gfx.nopic;
	if (bgcolor === undefined) bgcolor = "";
	var key = JSON.stringify(arguments);
	if (key in tximgcache) {
		return tximgcache[key];
	}
	var doc = new PIXI.Container();
	if (bgcolor !== ""){
		var bg = new PIXI.Graphics();
		doc.addChild(bg);
	}
	var pieces = text.replace(/\|/g, " | ").split(/(\d\d?:\d\d?|\n)/);
	var x = 0, y = 0, h = Math.floor(size*1.4), w = 0;
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
				pushChild(new PIXI.Sprite(gfx.Text(num, size, color)), spr);
			}
		} else if (piece) {
			var txt = new PIXI.Sprite(gfx.Text(piece, size, color));
			if (!width || x + txt.width < width){
				pushChild(txt);
			}else{
				piece.split(" ").forEach(function(word){
					if (word){
						pushChild(new PIXI.Sprite(gfx.Text(word, size, color)));
						if (x){
							x += 3;
						}
					}
				});
			}
		}
	});
	var rtex = require("./px").mkRenderTexture(width || Math.max(w, x), y+h);
	if (bg){
		bg.beginFill(bgcolor);
		bg.drawRect(0, 0, rtex.width, rtex.height);
	}
	rtex.render(doc);
	return tximgcache[key] = rtex;
}
var sounds = {}, musics = {}, currentMusic;
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
	if (soundEnabled && !Effect.disable) {
		var sound = sounds[name];
		if (!sound){
			sound = sounds[name] = new Audio("sound/" + name + ".ogg");
		}
		if (!dontreset && sound.duration) sound.currentTime = 0;
		sound.play();
	}
}
function playMusic(name) {
	if (name == currentMusic || Effect.disable) return;
	var music;
	if (musicEnabled && (music = musics[currentMusic])) music.pause();
	currentMusic = name;
	if (musicEnabled){
		music = musics[name];
		if (!music){
			music = musics[name] = new Audio("sound/" + name + ".ogg");
			music.loop = true;
		}
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
		var music = musics[currentMusic];
		if (music) music.pause();
	}else{
		var name = currentMusic;
		currentMusic = null;
		playMusic(name);
	}
}
function parseInput(data, key, value, limit) {
	var value = parseInt(value);
	if (value === 0 || value > 0)
		data[key] = Math.min(value, limit || Infinity);
}
function parsepvpstats(data){
	parseInput(data, "p1hp", options.pvphp);
	parseInput(data, "p1drawpower", options.pvpdraw, 8);
	parseInput(data, "p1markpower", options.pvpmark, 1188);
	parseInput(data, "p1deckpower", options.pvpdeck);
}
function parseaistats(data){
	parseInput(data, "p2hp", options.aihp);
	parseInput(data, "p2drawpower", options.aidraw, 8);
	parseInput(data, "p2markpower", options.aimark, 1188);
	parseInput(data, "p2deckpower", options.aideckpower);
}
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
exports.parseInput = parseInput;
exports.parsepvpstats = parsepvpstats;
exports.parseaistats = parseaistats;