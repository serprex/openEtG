"use strict";
var lastmove = 0;
document.addEventListener("mousemove", function(e){
	if (e.timeStamp - this.lastmove < 16){
		e.stopPropagation();
	}else{
		this.lastmove = e.timeStamp;
	}
});
var gfx = require("./gfx");
var etg = require("./etg");
var ui = require("./uiutil");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var options = require("./options");
var dom = exports.dom = require("./dom");
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
exports.getCmd = function(cmd){
	return curStage.cmds ? curStage.cmds[cmd] : null;
}
exports.view = function(stage) {
	if (curStage.endnext){
		curStage.endnext();
	}
	if (stage.dom){
		document.body.appendChild(stage.dom);
	}
	if (curStage.dom){
		curStage.dom.remove();
	}
	if (stage.view){
		if (!curStage.view) requestAnimate();
		renderer.render(stage.view);
		renderer.view.style.display = "";
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
	this.hitArea = new PIXI.math.Rectangle(100, 32, Math.floor(decksize/10)*99, 190);
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
function CardSelector(stage, cardmouseover, cardclick, maxedIndicator, filterboth){
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
	var bshiny = dom.button("Toggle Shiny", function() {
		self.showshiny ^= true;
		self.makeColumns();
	});
	this.bshowall = dom.button("Show All", function() {
		this.value = (self.showall ^= true) ? "Auto Hide" : "Show All";
		self.makeColumns();
	});
	var div = dom.add(stage.dom, bshiny, this.bshowall);
	dom.add(div, [4, 530, this.bshowall], [4, 578, bshiny])
	this.elefilter = this.rarefilter = 0;
	this.columns = [[],[],[],[],[],[]];
	this.columnspr = [[],[],[],[],[],[]];
	for (var i = 0;i < 13;i++) {
		(function(_i){
			dom.add(div, [(!i || i&1?4:40), 316 + Math.floor((i-1)/2) * 32,
				dom.icob(i, function() {
					self.elefilter = _i;
					self.makeColumns();
				})
			]);
		})(i);
	}
	for (var i = 0;i < 5; i++){
		(function(_i) {
			dom.add(div, [74, 338 + i * 32, dom.icob(i, function() {
				self.rarefilter = _i;
				self.makeColumns();
			}, i?"r":"t")]);
		})(i);
	}
	this.countText = new Array(6);
	for (var i = 0;i < 6;i++) {
		var x = 100 + i * 133;
		var counti = this.countText[i] = document.createElement("div");
		counti.style.textHeight = "0";
		dom.add(div, [x+100, 272, this.countText[i]]);
		for (var j = 0;j < 15;j++) {
			var sprite = new PIXI.Sprite(gfx.nopic);
			sprite.position.set(x, 272 + j * 19);
			this.addChild(sprite);
			this.columnspr[i].push(sprite);
			counti.appendChild(dom.text(""));
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
	this.bshowall.style.display = this.cardpool?"":"none";
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
				var count = this.countText[i].children[j];
				count.text = cardAmount + (shinyAmount ? "/"+shinyAmount:"");
				count.className = "selectortext"+(this.maxedIndicator && card.type != etg.PillarEnum && cardAmount >= 6 ?(cardAmount >= 12 ? " beigeback" : " lightback"):"");
				count.style.display = "";
			}
		}
		for (;j < 15;j++) {
			this.columnspr[i][j].visible = false;
			this.countText[i].children[j].style.display = "none";
		}
	}
}
exports.DeckDisplay = DeckDisplay;
exports.CardSelector = CardSelector;