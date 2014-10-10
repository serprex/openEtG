"use strict";
var ui = require("./uiutil");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
exports.loaded = false;
function load(preload, postload){
	exports.bg_default = new PIXI.Texture(new PIXI.BaseTexture(document.getElementById("bgimg")));
	var singles = ["assets/gold.png", "assets/button.png", "assets/bg_quest.png", "assets/bg_game.png", "assets/bg_questmap.png"];
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
		for (var i = 0;i < 15;i++) exports.eicons.push(new PIXI.Texture(tex, new PIXI.Rectangle(i * 32, 0, 32, 32)));
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
var caimgcache = {}, crimgcache = {}, wsimgcache = {}, artcache = {}, artimagecache = {};
function makeArt(card, art, oldrend) {
	var rend = oldrend || new PIXI.RenderTexture(132, 256);
	var template = new PIXI.DisplayObjectContainer();
	template.addChild(new PIXI.Sprite(exports.cardBacks[card.element+(card.upped?13:0)]));
	var rarity = new PIXI.Sprite(exports.ricons[card.rarity]);
	rarity.anchor.set(0, 1);
	rarity.position.set(5, 252);
	template.addChild(rarity);
	if (art) {
		var artspr = new PIXI.Sprite(art);
		artspr.position.set(2, 20);
		if (card.shiny) artspr.filters = [shinyFilter];
		template.addChild(artspr);
	}
	var typemark = new PIXI.Sprite(exports.ticons[card.type]);
	typemark.anchor.set(1, 1);
	typemark.position.set(128, 252);
	template.addChild(typemark);
	var nametag = new PIXI.Text(card.name, { font: "12px Dosis", fill: card.upped ? "black" : "white" });
	nametag.position.set(2, 4);
	template.addChild(nametag);
	if (card.cost) {
		var text = new PIXI.Text(card.cost, { font: "12px Dosis", fill: card.upped ? "black" : "white" });
		text.anchor.x = 1;
		text.position.set(rend.width - 20, 4);
		template.addChild(text);
		if (card.costele) {
			var eleicon = new PIXI.Sprite(exports.eicons[card.costele]);
			eleicon.position.set(rend.width - 1, 10);
			eleicon.anchor.set(1, .5);
			eleicon.scale.set(.5, .5);
			template.addChild(eleicon);
		}
	}
	var infospr = new PIXI.Sprite(ui.getTextImage(card.info(), ui.mkFont(11, card.upped ? "black" : "white"), "", rend.width-4));
	infospr.position.set(2, 150);
	template.addChild(infospr);
	rend.render(template, null, true);
	return rend;
}
function getArtImage(code, cb){
	if (!(code in artimagecache)){
		var redcode = code;
		if (artpool){
			while (!(redcode in artpool) && redcode >= "6qo"){
				redcode = etgutil[redcode >= "g00"?"asShiny":"asUpped"](redcode, false);
			}
			if (!(redcode in artpool)) return cb(artimagecache[code] = undefined);
			else if (redcode in artimagecache) return cb(artimagecache[code] = artimagecache[redcode]);
		}
		var loader = new PIXI.ImageLoader("Cards/" + redcode + ".png");
		loader.addEventListener("loaded", function() {
			return cb(artimagecache[code] = PIXI.Texture.fromFrame("Cards/" + redcode + ".png"));
		});
		loader.load();
	}
	return cb(artimagecache[code]);
}
function getArt(code) {
	if (artcache[code]) return artcache[code];
	else {
		return getArtImage(code, function(art){
			return artcache[code] = makeArt(Cards.Codes[code], art, artcache[code]);
		});
	}
}
function getCardImage(code) {
	if (caimgcache[code]) return caimgcache[code];
	else {
		var card = Cards.Codes[code];
		var rend = new PIXI.RenderTexture(100, 20);
		var graphics = new PIXI.Graphics();
		graphics.lineStyle(1, card && card.shiny ? 0xdaa520 : 0x222222);
		graphics.beginFill(card ? ui.maybeLighten(card) : code == "0" ? 0x887766 : 0x111111);
		graphics.drawRect(0, 0, 99, 19);
		graphics.endFill();
		if (card) {
			var clipwidth = 2;
			if (card.cost) {
				var text = new PIXI.Text(card.cost, { font: "11px Dosis", fill: card.upped ? "black" : "white" });
				text.anchor.x = 1;
				text.position.set(rend.width - 20, 5);
				graphics.addChild(text);
				clipwidth += text.width + 22;
				if (card.costele) {
					var eleicon = new PIXI.Sprite(exports.eicons[card.costele]);
					eleicon.position.set(rend.width - 1, 10);
					eleicon.anchor.set(1, .5);
					eleicon.scale.set(.5, .5);
					graphics.addChild(eleicon);
				}
			}
			var text, loopi = 0;
			do text = new PIXI.Text(card.name.substring(0, card.name.length - (loopi++)), { font: "11px Dosis", fill: card.upped ? "black" : "white" }); while (text.width > rend.width - clipwidth);
			text.position.set(2, 5);
			graphics.addChild(text);
		}
		rend.render(graphics);
		return caimgcache[code] = rend;
	}
}
function getInstImage(code, scale, cache){
	return cache[code] || getArtImage(code, function(art) {
		var card = Cards.Codes[code];
		var rend = new PIXI.RenderTexture(128 * scale, 164 * scale);
		var border = new PIXI.Sprite(exports.cardBorders[card.element + (card.upped ? 13 : 0)]);
		border.scale.set(scale, scale);
		var graphics = new PIXI.Graphics();
		border.addChild(graphics);
		graphics.beginFill(ui.maybeLighten(card));
		graphics.drawRect(0, 16, 128, 128);
		graphics.endFill();
		if (card.shiny){
			graphics.lineStyle(2, 0xdaa520);
			graphics.moveTo(0, 14);
			graphics.lineTo(128, 14);
			graphics.moveTo(0, 147);
			graphics.lineTo(128, 147);
		}
		if (art) {
			var artspr = new PIXI.Sprite(art);
			artspr.position.set(0, 16);
			if (card.shiny) artspr.filters = [shinyFilter];
			border.addChild(artspr);
		}
		var text = new PIXI.Text(card.name, { font: "16px Dosis", fill: card.upped ? "black" : "white" });
		text.anchor.x = .5;
		text.position.set(64, 144);
		border.addChild(text);
		var doc = new PIXI.DisplayObjectContainer();
		doc.addChild(border);
		rend.render(doc);
		return cache[code] = rend;
	});
}
function getCreatureImage(code) {
	return getInstImage(code, .5, crimgcache);
}
function getWeaponShieldImage(code) {
	return getInstImage(code, 5/8, wsimgcache);
}
var artpool;
exports.preloadCardArt = function(art){
	var pool = {};
	for(var i=0; i<art.length; i+=3){
		pool[art.substr(i, 3)] = true;
	}
	artpool = pool;
	(function loadArt(i){
		if (i == art.length) return;
		var code = art.substr(i, 3);
		var img = new Image();
		img.onload = function(){
			this.onload = undefined;
			artimagecache[code] = new PIXI.Texture(new PIXI.BaseTexture(this));
			loadArt(i+3);
		}
		img.src = "Cards/" + code + ".png";
	})(0);
}
if (typeof PIXI !== "undefined"){
	exports.nopic = new PIXI.Texture(new PIXI.BaseTexture());
	exports.nopic.width = exports.nopic.height = 0;
	exports.load = load;
	exports.getPermanentImage = exports.getCreatureImage = getCreatureImage;
	exports.getArt = getArt;
	exports.getCardImage = getCardImage;
	exports.getWeaponShieldImage = getWeaponShieldImage;
	var shinyFilter = new PIXI.ColorMatrixFilter();
	shinyFilter.matrix = [
		0,1,0,0,
		0,0,1,0,
		1,0,0,0,
		0,0,0,1,
	];
}