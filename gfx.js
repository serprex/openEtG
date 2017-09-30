"use strict";
var ui = require("./ui");
var util = require("./util");
var audio = require("./audio");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var options = require("./options");
var Shaders = require("./Shaders");
exports.loaded = false;
function load(progress, postload){
	exports.load = undefined;
	var assets = ["cardBacks", "atlas"];
	function process(asset, tex, base){
		var id = asset.match(/\d+$/), tex = new PIXI.Texture(tex, base?new PIXI.math.Rectangle(base[0], base[1], base[2], base[3]):null);
		if (id){
			asset = asset.slice(0, -id[0].length);
			if (!(asset in exports)) exports[asset] = [];
			exports[asset][id[0]] = tex;
		}else exports[asset] = tex;
	}
	var loadCount = 0;
	assets.forEach(function(asset){
		var img = new Image();
		img.addEventListener("load", function(){
			loadCount++;
			progress(loadCount/assets.length);
			var tex = new PIXI.BaseTexture(this);
			if (asset == "cardBacks"){
				var ts = [], bs = [];
				for (var x = 0; x < tex.width; x += 128){
					bs.push(new PIXI.Texture(tex, new PIXI.math.Rectangle(x, 0, 128, 20)));
					ts.push(new PIXI.Texture(tex, new PIXI.math.Rectangle(x, 20, 128, tex.height-20)));
				}
				exports.cardBacks = ts;
				exports.cardBorders = bs;
			}else if (asset == "atlas"){
				var atlas = require("./assets/atlas");
				for(var key in atlas){
					process(key, tex, atlas[key]);
				}
			}else process(asset, tex);
			if (loadCount == assets.length){
				audio.loadSounds("cardClick", "buttonClick", "permPlay", "creaturePlay");
				exports.r[0] = exports.nopic;
				exports.r[-1] = exports.r[5];
				exports.loaded = true;
				postload();
			}
		});
		img.src = "assets/" + asset + ".png";
	});
}
var btximgcache = {};
function Text(text, fontsize, color, bgcolor){
	if (!text) return exports.nopic;
	var key = text + "#" + fontsize + "#" + color + "#" + bgcolor;
	if (key in btximgcache) return btximgcache[key];
	var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
	var font = ctx.font = fontsize + "px Dosis";
	canvas.width = ctx.measureText(text).width+1;
	canvas.height = fontsize*1.4;
	if (bgcolor !== undefined){
		ctx.fillStyle = bgcolor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	ctx.font = font;
	ctx.fillStyle = color || "#000";
	ctx.fillText(text, 0, fontsize);
	return btximgcache[key] = new PIXI.Texture(new PIXI.BaseTexture(canvas));
}
var caimgcache = [], artimagecache = [], shinyShader, grayShader;
function setShinyShader(renderer, sprite, card){
	if (card.shiny && PIXI.gl) sprite.shader = shinyShader || (shinyShader = Shaders.GBRA(renderer));
	return sprite;
}
function setGrayBorderShader(renderer, sprite, card){
	if (!card.upped && PIXI.gl) sprite.shader = grayShader || (grayShader = Shaders.DarkGrayScale(renderer));
	return sprite;
}
function artFactory(realcb){
	var cache = {};
	return function(code){
		function cb(art){
			cache[code] = realcb(code, art, cache[code]);
			return cache[code];
		}
		function mkOnError(code){
			return function onError(){
				if (code > 6999){
					var redcode = etgutil[code & 16384?"asShiny":"asUpped"](code, false);
					if (redcode in artimagecache) cb(artimagecache[code] = artimagecache[redcode]);
					else{
						this.removeEventListener("error", onError);
						this.addEventListener("error", mkOnError(redcode));
						this.addEventListener("load", function(){
							artimagecache[redcode] = artimagecache[code];
						});
						this.src = "Cards/" + redcode.toString(32) + ".png";
					}
				}else artimagecache[code] = undefined;
			}
		}
		if (!(code in artimagecache)){
			var img = new Image();
			img.addEventListener("load", function(){
				cb(artimagecache[code] = new PIXI.Texture(new PIXI.BaseTexture(this)));
			});
			img.addEventListener("error", mkOnError(code));
			img.src = "Cards/" + code.toString(32) + ".png";
		}
		return cache[code] || cb(artimagecache[code]);
	}
}
function getSlotImage(card, code){
	if (code in caimgcache) return caimgcache[code];
	else{
		var rend = require("./px").mkRenderTexture(100, 20);
		var graphics = new PIXI.Graphics();
		graphics.lineStyle(1, card && card.shiny ? 0xdaa520 : 0x222222);
		graphics.beginFill(card ? ui.maybeLighten(card) : code == 0 ? 0x887766 : 0x111111);
		graphics.drawRect(0, 0, 99, 19);
		if (card) {
			var clipwidth = rend.width-2;
			if (card.cost) {
				var text = new PIXI.Sprite(Text(card.cost, 11, card.upped ? "#000" : "#fff"));
				text.anchor.x = 1;
				text.position.set(rend.width-2, 3);
				graphics.addChild(text);
				clipwidth -= text.width+2;
				if (card.costele == card.element) {
					var eleicon = new PIXI.Sprite(exports.e[card.costele]);
					eleicon.position.set(clipwidth, 10);
					eleicon.anchor.set(1, .5);
					eleicon.scale.set(.5, .5);
					graphics.addChild(eleicon);
					clipwidth -= 18;
				}
			}
			var text = new PIXI.Sprite(Text(card.name, 11, card.upped ? "#000" : "#fff"));
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
function getCardImage(code) {
	return getSlotImage(Cards.Codes[code], code);
}
function getInstImage(scale){
	return artFactory(function(code, art, rend){
		if (!rend) rend = require("./px").mkRenderTexture(Math.ceil(128 * scale), Math.ceil(152 * scale));
		var card = Cards.Codes[code];
		var btex = exports.cardBorders[card.element + (card.upped ? 13 : 0)];
		var c = new PIXI.Container();
		var border = new PIXI.Sprite(btex), border2 = new PIXI.Sprite(btex);
		border2.position.y = 152;
		border2.scale.y = -.2;
		c.addChild(border);
		c.addChild(border2);
		var graphics = new PIXI.Graphics();
		c.addChild(graphics);
		graphics.beginFill(ui.maybeLighten(card));
		graphics.drawRect(0, 20, 128, 128);
		if (card.shiny){
			graphics.lineStyle(2, 0xdaa520);
			graphics.moveTo(0, 20);
			graphics.lineTo(128, 20);
		}
		if (art) {
			var artspr = new PIXI.Sprite(art);
			artspr.position.y = 20;
			setShinyShader(rend.renderer, artspr, card);
			c.addChild(artspr);
		}
		var mtx = new PIXI.math.Matrix();
		mtx.scale(scale, scale);
		rend.render(c, mtx);
		return rend;
	});
}
var tximgcache = {};
exports.getTextImage = function(text, size, color, bgcolor, width) {
	if (!text) return exports.nopic;
	var key = text + "#" + size + "#" + color + "#" + bgcolor + "#" + width;
	if (key in tximgcache) return tximgcache[key];
	var x = 0, y = 0, h = Math.floor(size*1.4), w = 0;
	function pushIcon(texture, num){
		if (num === undefined) num = 1;
		setMode(1);
		var w = size * num;
		if (width && x + w > width){
			x = 0;
			y += h;
		}
		for (var i = 0; i<num; i++){
			iconxy.push(texture, x, y);
			x += size;
		}
	}
	var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
	var textxy = [], font = ctx.font = size + "px Dosis", mode = 0, iconxy = [];
	function setMode(m){
		if (mode != m){
			if (x) x += 3;
			mode = m;
		}
	}
	function pushText(text){
		text = text.trim();
		if (!text) return;
		setMode(0);
		var spacedText = text.replace(/\|/g, " / ");
		var w = ctx.measureText(spacedText).width;
		if (!width || x + w <= width){
			textxy.push(spacedText, x, y+size);
			x += w;
			return;
		}
		var idx = 0, endidx = 0, oldblock = "";
		util.iterSplit(text, " ", function(word){
			var nextendidx = endidx + word.length + 1;
			var newblock = text.slice(idx, nextendidx-1).replace(/\|/g, " / ");
			if (width && x + ctx.measureText(newblock).width >= width){
				textxy.push(oldblock, x, y+size);
				newblock = word;
				idx = endidx;
				x = 0;
				y += h;
			}
			oldblock = newblock;
			endidx = nextendidx;
		});
		if (idx != text.length){
			textxy.push(oldblock, x, y+size);
			x += ctx.measureText(oldblock).width;
			if (width && x >= width){
				x = 0;
				y += h;
			}
		}
	}
	var sep = /\d\d?:\d\d?|\n/g, reres, lastindex = 0;
	while (reres = sep.exec(text)){
		var piece = reres[0];
		if (reres.index != lastindex){
			pushText(text.slice(lastindex, reres.index));
		}
		if (piece == "\n"){
			w = Math.max(w, x);
			x = 0;
			y += h;
		}else{
			var parse = piece.split(":");
			var num = parseInt(parse[0]);
			var icon = exports.e[parseInt(parse[1])];
			if (num == 0) {
				pushText("0");
			} else if (num < 4) {
				pushIcon(icon, num);
			}else{
				setMode(1);
				mode = 0;
				pushText(num.toString());
				mode = 1;
				pushIcon(icon);
			}
		}
		lastindex = reres.index + piece.length;
	}
	if (lastindex != text.length) pushText(text.slice(lastindex));
	canvas.width = width || Math.max(w, x);
	canvas.height = y+h;
	if (bgcolor){
		ctx.fillStyle = bgcolor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	ctx.font = font;
	ctx.fillStyle = color || "#000";
	for(var i=0; i<textxy.length; i+=3){
		ctx.fillText(textxy[i], textxy[i+1], textxy[i+2]);
	}
	if (iconxy.length){
		var rend = require("./px").mkRenderTexture(canvas.width, canvas.height);
		var spr = new PIXI.Sprite(new PIXI.Texture(new PIXI.BaseTexture(canvas)));
		for (var i=0; i<iconxy.length; i+=3){
			var ico = new PIXI.Sprite(iconxy[i]);
			ico.position.set(iconxy[i+1], iconxy[i+2]);
			ico.scale.set(size/32, size/32);
			spr.addChild(ico);
		}
		rend.render(spr);
		return tximgcache[key] = rend;
	}else{
		return tximgcache[key] = new PIXI.Texture(new PIXI.BaseTexture(canvas));
	}
}
exports.refreshCaches = function() {
	caimgcache.forEach(function(img){
		img.destroy(true);
	});
	caimgcache.length = 0;
}
if (typeof PIXI !== "undefined"){
	exports.nopic = PIXI.Texture.emptyTexture;
	exports.load = load;
	exports.getHandImage = exports.getPermanentImage = exports.getCreatureImage = getInstImage(.5);
	exports.getWeaponShieldImage = getInstImage(5/8);
	exports.getCardImage = getCardImage;
	exports.Text = Text;
}