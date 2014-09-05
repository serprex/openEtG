"use strict";
exports.loaded = false;
function load(preload, postload){
	var singles = ["assets/gold.png", "assets/button.png", "assets/bg_default.png",
		"assets/bg_quest.png", "assets/bg_game.png", "assets/bg_questmap.png"];
	var preLoader = new PIXI.AssetLoader(["assets/esheet.png", "assets/raritysheet.png", "assets/backsheet.png",
		"assets/cardborders.png", "assets/statussheet.png", "assets/statusborders.png", "assets/typesheet.png"].concat(singles));
	var loadingBarGraphic = new PIXI.Graphics();
	preLoader.onProgress = function(e) {
		loadingBarGraphic.clear();
		loadingBarGraphic.beginFill(0xFFFFFF);
		loadingBarGraphic.drawRect(0, 284, 900*(1-this.loadCount/this.assetURLs.length), 32);
		loadingBarGraphic.endFill();
	}
	preLoader.onComplete = function() {
		var ui = require("./uiutil");
		ui.loadSounds("cardClick", "buttonClick", "permPlay", "creaturePlay");
		var names = ["eicons", "ricons", "cardBacks", "cardBorders", "sicons", "ticons", "sborders"];
		names.forEach(function(name){
			exports[name] = [];
		});
		// Load assets we preloaded
		singles.forEach(function(single){
			exports[single.substring(7, single.length-4)] = PIXI.Texture.fromFrame(single);
		});
		var tex = PIXI.Texture.fromFrame("assets/esheet.png");
		for (var i = 0;i < 14;i++) exports.eicons.push(new PIXI.Texture(tex, new PIXI.Rectangle(i * 32, 0, 32, 32)));
		var tex = PIXI.Texture.fromFrame("assets/raritysheet.png");
		for (var i = 0;i < 6;i++) exports.ricons.push(new PIXI.Texture(tex, new PIXI.Rectangle(i * 25, 0, 25, 25)));
		exports.ricons[-1] = exports.ricons[5];
		var tex = PIXI.Texture.fromFrame("assets/backsheet.png");
		for (var i = 0;i < 26;i++) exports.cardBacks.push(new PIXI.Texture(tex, new PIXI.Rectangle(i * 132, 0, 132, 256)));
		var tex = PIXI.Texture.fromFrame("assets/cardborders.png");
		for (var i = 0;i < 26;i++) exports.cardBorders.push(new PIXI.Texture(tex, new PIXI.Rectangle(i * 128, 0, 128, 162)));
		var tex = PIXI.Texture.fromFrame("assets/statussheet.png");
		for (var i = 0;i < 7;i++) exports.sicons.push(new PIXI.Texture(tex, new PIXI.Rectangle(13 * i, 0, 13, 13)));
		var tex = PIXI.Texture.fromFrame("assets/statusborders.png");
		for (var i = 0;i < 3;i++) exports.sborders.push(new PIXI.Texture(tex, new PIXI.Rectangle(64 * i, 0, 64, 81)));
		var tex = PIXI.Texture.fromFrame("assets/typesheet.png");
		for (var i = 0;i < 6;i++) exports.ticons.push(new PIXI.Texture(tex, new PIXI.Rectangle(25 * i, 0, 25, 25)));
		exports.loaded = true;
		postload();
	}
	preload(loadingBarGraphic);
	preLoader.load();
}
if (typeof PIXI !== "undefined"){
	exports.nopic = new PIXI.Texture(new PIXI.BaseTexture());
	exports.nopic.width = exports.nopic.height = 0;
	exports.load = load;
}