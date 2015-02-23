"use strict";
var lastmove = 0;
document.addEventListener("mousemove", function(e){
	var now = Date.now();
	if (now - this.lastmove < 16){
		e.stopPropagation();
		return;
	}
	this.lastmove = now;
});
var gfx = require("./gfx");
var etg = require("./etg");
var ui = require("./uiutil");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var renderer = new PIXI.autoDetectRenderer(900, 600, {view:document.getElementById("leftpane"), transparent:true});
var noStage = {}, curStage = noStage;
var interman = new (require("./InteractionManager"))(noStage, renderer);
exports.mouse = interman.mouse;
function animate() {
	if (curStage.view){
		renderer.render(curStage.view);
		setTimeout(requestAnimate, 20);
	}
}
function requestAnimate() { requestAnimationFrame(animate); }
exports.mkRenderTexture = function(width, height){
	return new PIXI.RenderTexture(renderer, width, height);
}
var special = /view|endnext|cmds/;
exports.getCmd = function(cmd){
	return curStage.cmds ? curStage.cmds[cmd] : null;
}
exports.domBox = function(w, h){
	var span = document.createElement("span");
	span.style.width = w + "px";
	span.style.height = h + "px";
	span.className = "bgbox";
	return span;
}
exports.domButton = function(text, click, mouseover) {
	var ele = document.createElement("input");
	ele.type = "button";
	Object.defineProperty(ele, "text", {
		get:function(){
			return this.value;
		},
		set:function(text){
			if (text){
				this.value = text;
				this.style.display = "inline";
			}else this.style.display = "none";
		}
	});
	ele.text = text;
	ele.addEventListener("click", function() {
		ui.playSound("buttonClick");
		if (click) click.call(this);
	});
	if (mouseover) ele.addEventListener("mouseover", mouseover);
	return ele;
}
exports.domEButton = function(e, click, ch){
	if (!ch) ch = "E";
	var ele = document.createElement("span");
	ele.className = "imgb "+ch+"icon "+ch+e;
	ele.addEventListener("click", function(){
		ui.playSound("buttonClick");
		if (click) click.call(this);
	});
	return ele;
}
exports.domText = function(text){
	var ele = document.createElement("span");
	Object.defineProperty(ele, "text", {
		get:function(){
			return this.textcache;
		},
		set:function(text){
			text = text.toString();
			if (this.textcache == text) return;
			this.textcache = text;
			while (this.firstChild) this.firstChild.remove();
			text = text.replace(/\|/g, " | ");
			var sep = /\d\d?:\d\d?|\$|\n/g, reres, lastindex = 0;
			while (reres = sep.exec(text)){
				var piece = reres[0];
				if (reres.index != lastindex){
					this.appendChild(document.createTextNode(text.slice(lastindex, reres.index)));
				}
				if (piece == "\n") {
					this.appendChild(document.createElement("br"));
				}else if (piece == "$") {
					var sp = document.createElement("span");
					sp.className = "coin";
					this.appendChild(sp);
				}else if (/^\d\d?:\d\d?$/.test(piece)) {
					var parse = piece.split(":");
					var num = parseInt(parse[0]);
					if (num < 4) {
						for (var j = 0;j < num;j++) {
							var sp = document.createElement("span");
							sp.className = "eicon e"+parse[1];
							this.appendChild(sp);
						}
					}else{
						this.appendChild(document.createTextNode(parse[0]));
						var sp = document.createElement("span");
						sp.className = "eicon e"+parse[1];
						this.appendChild(sp);
					}
				}
				lastindex = reres.index + piece.length;
			}
			if (lastindex != text.length){
				this.appendChild(document.createTextNode(text.slice(lastindex)));
			}
		}
	});
	ele.text = text;
	return ele;
}
function parseDom(info){
	var ele;
	if (typeof info[2] === "string"){
		ele = exports.domText(info[2]);
	}else if (info[2] instanceof Array){
		ele = exports.domButton.apply(null, info[2]);
	}else ele = info[2];
	ele.style.left = info[0] + "px";
	ele.style.top = info[1] + "px";
	ele.style.position = "absolute";
	return ele;
}
exports.setDomVis = function(id, vis){
	document.getElementById(id).style.display = vis ? "inline" : "none";
}
exports.view = function(stage) {
	if (curStage.endnext){
		curStage.endnext();
	}
	for (var key in stage){
		if (!key.match(special)){
			var dom = stage[key], div;
			if (dom[0] instanceof Array){
				div = document.createElement("div");
				stage[key].forEach(function(info){
					div.appendChild(parseDom(info));
				});
			}else div = parseDom(dom);
			div.id = key;
			stage[key] = div;
			document.body.appendChild(div);
		}
	}
	for(var key in curStage){
		if (!key.match(special)){
			document.body.removeChild(curStage[key]);
		}
	}
	if (stage.view){
		if (!curStage.view) requestAnimate();
		renderer.render(stage.view);
		renderer.view.style.display = "inline";
		interman.stage = stage.view;
	} else {
		interman.stage = noStage;
		renderer.view.style.display = "none";
	}
	curStage = stage;
}
exports.setClick = function(obj, click, sound) {
	if (sound === undefined) sound = "buttonClick";
	obj.click = function() {
		if (typeof sound === "string") ui.playSound(sound);
		click.apply(this, arguments);
	}
}
exports.hitTest = interman.hitTest.bind(interman);
exports.setInteractive = function() {
	for (var i = 0;i < arguments.length;i++) {
		arguments[i].interactive = true;
	}
}
exports.mkView = function(mouseover){
	var view = new PIXI.Container();
	view.interactive = true;
	if (mouseover){
		view.hitArea = new PIXI.math.Rectangle(0, 0, 900, 600);
		view.mouseover = mouseover;
	}
	return view;
}
exports.mkBgRect = function(){
	var g = new PIXI.Graphics();
	g.beginFill(0x0d2e4a);
	for(var i=0; i<arguments.length; i+=4){
		g.drawRect(arguments[i], arguments[i+1], arguments[i+2], arguments[i+3], 6);
	}
	g.endFill();
	g.lineStyle(2, 0x121212);
	for(var i=0; i<arguments.length; i+=4){
		g.moveTo(arguments[i], arguments[i+1]);
		g.lineTo(arguments[i], arguments[i+1]+arguments[i+3]);
		g.lineTo(arguments[i]+arguments[i+2], arguments[i+1]+arguments[i+3]);
	}
	g.lineStyle(2, 0x969696);
	for(var i=0; i<arguments.length; i+=4){
		g.moveTo(arguments[i], arguments[i+1]);
		g.lineTo(arguments[i]+arguments[i+2], arguments[i+1]);
		g.lineTo(arguments[i]+arguments[i+2], arguments[i+1]+arguments[i+3]);
	}
	return g;
}
exports.adjust = function adjust(cardminus, code, x) {
	if (code in cardminus) {
		cardminus[code] += x;
	} else cardminus[code] = x;
	delete cardminus.rendered;
}
function DeckDisplay(decksize, cardmouseover, cardclick, deck){
	PIXI.Container.call(this);
	this.deck = deck || [];
	this.decksize = decksize;
	this.cardmouseover = cardmouseover;
	this.cardclick = cardclick;
	this.hitArea = new PIXI.math.Rectangle(100, 32, Math.floor(decksize/10)*99, 200);
	this.interactive = true;
	for (var i = 0;i < decksize;i++) {
		var sprite = new PIXI.Sprite(gfx.nopic);
		sprite.position.set(100 + Math.floor(i / 10) * 99, 32 + (i % 10) * 19);
		this.addChild(sprite);
	}
}
DeckDisplay.prototype = Object.create(PIXI.Container.prototype);
DeckDisplay.prototype.pos2idx = function(){
	return Math.floor((exports.mouse.x-100-this.position.x)/99)*10+(Math.floor((exports.mouse.y-32-this.position.y)/19)%10);
}
DeckDisplay.prototype.click = function(){
	var index = this.pos2idx();
	if (index >= 0 && index < this.deck.length){
		ui.playSound("cardClick");
		if (this.cardclick) this.cardclick(index);
	}
}
DeckDisplay.prototype.renderDeck = function(i){
	for (;i < this.deck.length;i++) {
		this.children[i].texture = gfx.getCardImage(this.deck[i]);
		this.children[i].visible = true;
	}
	for (;i < this.decksize;i++) {
		this.children[i].visible = false;
	}
}
DeckDisplay.prototype.addCard = function(code, i){
	if (i === undefined) i = 0;
	for (;i < this.deck.length;i++) {
		if (etg.cardCmp(this.deck[i], code) >= 0) break;
	}
	this.deck.splice(i, 0, code);
	this.renderDeck(i);
}
DeckDisplay.prototype.rmCard = function(index){
	this.deck.splice(index, 1);
	this.renderDeck(index);
}
DeckDisplay.prototype.mousemove = function(){
	if (this.cardmouseover){
		var index = this.pos2idx();
		if (index >= 0 && index < this.deck.length){
			this.cardmouseover(this.deck[index]);
		}
	}
}
function CardSelector(dom, cardmouseover, cardclick, maxedIndicator, filterboth){
	var self = this;
	PIXI.Container.call(this);
	this._cardpool = this.cardpool = undefined;
	this._cardminus = this.cardminus = undefined;
	this.showall = false;
	this.showshiny = undefined;
	this.interactive = true;
	this.cardmouseover = cardmouseover;
	this.cardclick = cardclick;
	this.filterboth = filterboth;
	this.hitArea = new PIXI.math.Rectangle(100, 272, 800, 328);
	this.maxedIndicator = maxedIndicator;
	var bshiny = exports.domButton("Toggle Shiny", function() {
		self.showshiny ^= true;
		self.makeColumns();
	});
	var bshowall = exports.domButton("Show All", function() {
		this.value = (self.showall ^= true) ? "Auto Hide" : "Show All";
		self.makeColumns();
	});
	dom.push([5, 578, bshiny], [5, 530, bshowall]);
	this.elefilter = this.rarefilter = 0;
	this.columns = [[],[],[],[],[],[]];
	this.columnspr = [[],[],[],[],[],[]];
	for (var i = 0;i < 13;i++) {
		(function(_i){
			dom.push([(!i || i&1?4:40), 316 + Math.floor((i-1)/2) * 32,
				exports.domEButton(i, function() {
					self.elefilter = _i;
					self.makeColumns();
				})]
			);
		})(i);
	}
	for (var i = 0;i < 5; i++){
		(function(_i) {
			dom.push([74, 338 + i * 32, exports.domEButton(i, function() {
				self.rarefilter = _i;
				self.makeColumns();
			}, "r")]);
		})(i);
	}
	for (var i = 0;i < 6;i++) {
		for (var j = 0;j < 15;j++) {
			var sprite = new PIXI.Sprite(gfx.nopic);
			sprite.position.set(100 + i * 133, 272 + j * 19);
			var sprcount = exports.domText("");
			dom.push([sprite.position.x + 100, sprite.position.y, sprcount]);
			sprite.countText = sprcount;
			this.addChild(sprite);
			this.columnspr[i].push(sprite);
		}
	}
}
CardSelector.prototype = Object.create(PIXI.Container.prototype);
CardSelector.prototype.click = function(){
	if (!this.cardclick) return;
	var col = this.columns[Math.floor((exports.mouse.x-100)/133)], card;
	if (col && (card = col[Math.floor((exports.mouse.y-272)/19)])){
		ui.playSound("cardClick");
		var code = card.code;
		if (this.filterboth && !this.showshiny){
			var scode = card.asShiny(true).code;
			if (scode in this.cardpool && this.cardpool[scode] > ((this.cardminus && this.cardminus[scode]) || 0)){
				code = scode;
			}
		}
		this.cardclick(code);
	}
}
CardSelector.prototype.mousemove = function(){
	if (this.cardmouseover){
		var col = this.columns[Math.floor((exports.mouse.x-100)/133)], card;
		if (col && (card = col[Math.floor((exports.mouse.y-272)/19)])){
			this.cardmouseover(card.code);
		}
	}
}
CardSelector.prototype._renderWebGL = function() {
	if (this.cardpool !== this._cardpool || this.cardminus !== this._cardminus) {
		this._cardminus = this.cardminus;
		this._cardpool = this.cardpool;
		this.makeColumns();
	}else if (this.cardminus && !this.cardminus.rendered){
		this.renderColumns();
	}
}
CardSelector.prototype.renderCanvas = function() {
	this._renderWebGL();
	PIXI.Container.prototype.renderCanvas.apply(this, arguments);
}
CardSelector.prototype.makeColumns = function(){
	var self = this;
	for (var i = 0;i < 6;i++) {
		this.columns[i] = etg.filtercards(i > 2,
			function(x) { return (x.element == self.elefilter || self.rarefilter == 4) &&
				((i % 3 == 0 && x.type == etg.CreatureEnum) || (i % 3 == 1 && x.type <= etg.PermanentEnum) || (i % 3 == 2 && x.type == etg.SpellEnum)) &&
				(!self.cardpool || x.code in self.cardpool || (self.filterboth && x.asShiny(true).code in self.cardpool) || self.showall || x.isFree()) && (!self.rarefilter || self.rarefilter == Math.min(x.rarity, 4));
			}, etg.cardCmp, this.showshiny && !this.filterboth);
	}
	this.renderColumns();
}
CardSelector.prototype.renderColumns = function(){
	if (this.cardminus) this.cardminus.rendered = true;
	for (var i = 0;i < 6; i++){
		for (var j = 0;j < this.columns[i].length;j++) {
			var spr = this.columnspr[i][j], code = this.columns[i][j].code;
			spr.texture = gfx.getCardImage(code);
			spr.visible = true;
			if (this.cardpool) {
				var card = Cards.Codes[code], scode = etgutil.asShiny(code, true);
				var cardAmount = card.isFree() ? "-" : code in this.cardpool ? this.cardpool[code] - ((this.cardminus && this.cardminus[code]) || 0) : 0, shinyAmount = 0;
				if (this.filterboth && !this.showshiny) {
					var scode = etgutil.asShiny(code, true);
					shinyAmount = scode in this.cardpool ? this.cardpool[scode] - ((this.cardminus && this.cardminus[scode]) || 0) : 0;
				}
				spr.countText.text = cardAmount + (shinyAmount ? "/"+shinyAmount:"");
				spr.countText.className = "selectortext"+(this.maxedIndicator && card.type != etg.PillarEnum && cardAmount >= 6 ?" "+(cardAmount >= 12 ? "beigeback" : "lightback"):"");
				spr.countText.style.display = "inline";
			}
		}
		for (;j < 15;j++) {
			this.columnspr[i][j].visible = false;
			this.columnspr[i][j].countText.style.display = "none";
		}
	}
}
exports.DeckDisplay = DeckDisplay;
exports.CardSelector = CardSelector;