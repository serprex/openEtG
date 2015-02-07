"use strict";
var ui = require("./uiutil");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var options = require("./options");
exports.loaded = false;
function load(progress, postload){
	exports.load = undefined;
	var singles = ["bg_quest", "bg_game", "bg_questmap", "protection", "sacrifice"];
	var assets = ["eicons", "cardBacks", "cardBorders", "sicons", "sborders", "hborders", "ticons", "ricons"].concat(singles);
	var widths = {
		eicons: 32,
		cardBacks: 132,
		cardBorders: 128,
		sicons: 13,
		ticons: 25,
		sborders: 64,
		hborders: 112,
		ricons: 25,
	};
	var loadCount = 0;
	assets.forEach(function(asset){
		var img = new Image();
		img.addEventListener("load", function(){
			loadCount++;
			progress(loadCount/assets.length);
			var w = widths[asset], tex = new PIXI.Texture(new PIXI.BaseTexture(this));
			if (w){
				var ts = [];
				for (var x = 0; x < tex.width; x += w){
					ts.push(new PIXI.Texture(tex, new PIXI.math.Rectangle(x, 0, w, tex.height)));
				}
				exports[asset] = ts;
			}else exports[asset] = tex;
			if (loadCount == assets.length){
				var ui = require("./uiutil");
				ui.loadSounds("cardClick", "buttonClick", "permPlay", "creaturePlay");
				exports.ricons[-1] = exports.ricons[5];
				exports.loaded = true;
				postload();
			}
		});
		img.src = "assets/" + asset + ".png";
	});
}
var caimgcache = {}, crimgcache = {}, wsimgcache = {}, artcache = {}, artimagecache = {};
function makeArt(card, art, oldrend) {
	var rend = oldrend || require("./px").mkRenderTexture(132, 256);
	var template = new PIXI.Container();
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
	var nametag = new PIXI.Sprite(Text(card.name, 12, card.upped ? "black" : "white"));
	nametag.position.set(2, 2);
	template.addChild(nametag);
	if (card.cost) {
		var text = new PIXI.Sprite(Text(card.cost, 12, card.upped ? "black" : "white"));
		text.anchor.x = 1;
		text.position.set(rend.width-3, 2);
		template.addChild(text);
		if (card.element && ((card.costele == card.element) ^ !!options.hideCostIcon)) {
			var eleicon = new PIXI.Sprite(exports.eicons[card.costele]);
			eleicon.position.set(rend.width-text.width-5, 10);
			eleicon.anchor.set(1, .5);
			eleicon.scale.set(.5, .5);
			template.addChild(eleicon);
		}
	}
	var infospr = new PIXI.Sprite(ui.getTextImage(card.info(), 11, card.upped ? "black" : "white", "", rend.width-4));
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
		var img = new Image();
		img.addEventListener("load", function(){
			cb(artimagecache[code] = new PIXI.Texture(new PIXI.BaseTexture(img)));
		});
		img.src = "Cards/" + redcode + ".png";
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
		var rend = require("./px").mkRenderTexture(100, 20);
		var graphics = new PIXI.Graphics();
		graphics.lineStyle(1, card && card.shiny ? 0xdaa520 : 0x222222);
		graphics.beginFill(card ? ui.maybeLighten(card) : code == "0" ? 0x887766 : 0x111111);
		graphics.drawRect(0, 0, 99, 19);
		graphics.endFill();
		if (card) {
			var clipwidth = rend.width-2;
			if (card.cost) {
				var text = new PIXI.Sprite(Text(card.cost, 11, card.upped ? "black" : "white"));
				text.anchor.x = 1;
				text.position.set(rend.width-2, 3);
				graphics.addChild(text);
				clipwidth -= text.width+2;
				if (card.element && ((card.costele == card.element) ^ !!options.hideCostIcon)) {
					var eleicon = new PIXI.Sprite(exports.eicons[card.costele]);
					eleicon.position.set(clipwidth, 10);
					eleicon.anchor.set(1, .5);
					eleicon.scale.set(.5, .5);
					graphics.addChild(eleicon);
					clipwidth -= 18;
				}
			}
			var text = new PIXI.Sprite(Text(card.name, 11, card.upped ? "black" : "white"));
			text.position.set(2, 3);
			if (text.width > clipwidth){
				text.width = clipwidth;
			}
			graphics.addChild(text);
		}
		rend.render(graphics);
		return caimgcache[code] = rend;
	}
}
function getInstImage(code, scale, cache){
	return cache[code] || getArtImage(code, function(art) {
		var card = Cards.Codes[code];
		var rend = require("./px").mkRenderTexture(Math.ceil(128 * scale), Math.ceil(164 * scale));
		var border = new PIXI.Sprite(exports.cardBorders[card.element + (card.upped ? 13 : 0)]);
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
		var text = new PIXI.Sprite(Text(card.name, 16, card.upped ? "black" : "white"));
		text.anchor.x = .5;
		text.position.set(64, 142);
		border.addChild(text);
		var mtx = new PIXI.math.Matrix();
		mtx.scale(scale, scale);
		rend.render(border, mtx);
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
exports.clearCaches = function() {
	caimgcache = {};
	artcache = {};
}
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
function Text(text, fontsize, color){
	var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
	var font = ctx.font = fontsize + "px Dosis";
	canvas.width = ctx.measureText(text).width;
	canvas.height = fontsize*1.4;
	ctx.font = font;
	ctx.fillStyle = color || "black";
	ctx.fillText(text, 0, fontsize);
	return PIXI.Texture.fromCanvas(canvas);
}
if (typeof PIXI !== "undefined"){
	exports.nopic = PIXI.Texture.emptyTexture;
	exports.nopic.width = exports.nopic.height = 0;
	exports.load = load;
	exports.getPermanentImage = exports.getCreatureImage = getCreatureImage;
	exports.getArt = getArt;
	exports.getCardImage = getCardImage;
	exports.getWeaponShieldImage = getWeaponShieldImage;
	exports.Text = Text;
	var Text = require("./Text");
	var shinyFilter = new (require("./ColorMatrixFilter"))([
		0,1,0,0,
		0,0,1,0,
		1,0,0,0,
		0,0,0,1,
	]);
}