"use strict";
var gfx = require("./gfx");
var etg = require("./etg");
var ui = require("./uiutil");
var Cards = require("./Cards");
var renderer = new PIXI.autoDetectRenderer(900, 600, {view:document.getElementById("leftpane"), transparent:true});
var realStage = new PIXI.Stage(), curStage = {};
exports.realStage = realStage;
function animate() {
	setTimeout(requestAnimate, 40);
	if (curStage.next){
		curStage.next();
	}
	if (curStage.view){
		renderer.render(realStage);
	}
}
function requestAnimate() { requestAnimFrame(animate); }
exports.load = function(){
	gfx.load(function(loadingScreen){
		realStage.addChild(loadingScreen);
		curStage = {view: loadingScreen};
		requestAnimate();
	}, function(){
		ui.playMusic("openingMusic");
		realStage.removeChildren();
		realStage.addChild(new PIXI.Sprite(new PIXI.Texture(new PIXI.BaseTexture(document.getElementById("bgimg")))));
		require("./views/MainMenu")();
	});
}
var special = /view|endnext|cmds|next/;
function parseDom(info){
	var ele;
	if (typeof info[2] === "string"){
		ele = document.createElement("span");
		var pieces = info[2].replace(/\|/g, " | ").split(/(\d\d?:\d\d?|\$|\n)/);
		pieces.forEach(function(piece){
			if (piece == "\n") {
				ele.appendChild(document.createElement("br"));
			}else if (piece == "$") {
				var sp = document.createElement("span");
				sp.className = "coin";
				ele.appendChild(sp);
			}else if (/^\d\d?:\d\d?$/.test(piece)) {
				var parse = piece.split(":");
				var num = parseInt(parse[0]);
				if (num < 4) {
					for (var j = 0;j < num;j++) {
						var sp = document.createElement("span");
						sp.className = "eicon e"+parse[1];
						ele.appendChild(sp);
					}
				}else{
					ele.appendChild(document.createTextElement(parse[0]));
					var sp = document.createElement("span");
					sp.className = "eicon e"+parse[1];
					ele.appendChild(sp);
				}
			} else if (piece) {
				ele.appendChild(document.createTextNode(piece));
			}
		});
	}else if (info[2] instanceof Array){
		ele = document.createElement("input");
		ele.type = "button";
		ele.value = info[2][0];
		if (info[2][1]) ele.addEventListener("click", info[2][1]);
		if (info[2][2]) ele.addEventListener("mouseover", info[2][2]);
	}else ele = info[2];
	ele.style.left = info[0] + "px";
	ele.style.top = info[1] + "px";
	ele.style.position = "absolute";
	return ele;
}
exports.setDomVis = function(id, vis){
	document.getElementById(id).style.display = vis ? "inline" : "none";
}
exports.refreshRenderer = function(stage) {
	if (realStage.children.length > 1){
		var oldstage = realStage.children[1];
		if (oldstage.endnext) oldstage.endnext();
		realStage.removeChildAt(1);
	}
	if (stage instanceof PIXI.DisplayObject) stage = {view: stage};
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
		renderer.view.style.display = "inline";
		realStage.addChild(stage.view);
	} else {
		renderer.view.style.display = "none";
	}
	curStage = stage;
}
exports.getMousePos = function(){
	return realStage.getMousePosition();
}
exports.setClick = function(obj, click, sound) {
	if (sound === undefined) sound = "buttonClick";
	obj.click = function() {
		if (typeof sound === "string") ui.playSound(sound);
		click.apply(this, arguments);
	}
}
exports.maybeSetText = function(obj, text) {
	if (obj.text != text) obj.setText(text);
}
exports.hitTest = function(obj, pos) {
	var x = obj.position.x - obj.width * obj.anchor.x, y = obj.position.y - obj.height * obj.anchor.y;
	return pos.x > x && pos.y > y && pos.x < x + obj.width && pos.y < y + obj.height;
}
exports.setInteractive = function() {
	for (var i = 0;i < arguments.length;i++) {
		arguments[i].interactive = true;
	}
}
exports.toggleB = function() {
	for (var i = 0;i < arguments.length;i++) {
		arguments[i].visible ^= true;
		arguments[i].interactive ^= true;
		arguments[i].buttonMode ^= true;
	}
}
exports.mkView = function(mouseover){
	var view = new PIXI.DisplayObjectContainer();
	view.interactive = true;
	if (mouseover){
		var bg = new PIXI.DisplayObjectContainer();
		bg.hitArea = realStage.hitArea;
		bg.mouseover = mouseover;
		bg.interactive = true;
		view.addChild(bg);
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
exports.mkButton = function(x, y, b, mouseoverfunc, mouseoutfunc) {
	if (typeof b == "string") b = new MenuButton(b);
	else if (b instanceof PIXI.Texture) b = new PIXI.Sprite(b);
	b.interactive = true;
	b.buttonMode = true;
	b.position.set(x, y);
	b.mousedown = function() {
		b.tint = 0x666666;
	}
	b.mouseover = b.mouseup = function() {
		if (mouseoverfunc) mouseoverfunc();
		b.tint = 0xAAAAAA;
	}
	b.mouseout = function() {
		if (mouseoutfunc) mouseoutfunc();
		b.tint = 0xFFFFFF;
	}
	return b;
}
exports.adjust = function adjust(cardminus, code, x) {
	if (code in cardminus) {
		cardminus[code] += x;
	} else cardminus[code] = x;
	delete cardminus.rendered;
}
function MenuText(x, y, txt, wrapwidth) {
	this.wrapwidth = wrapwidth;
	PIXI.Sprite.call(this, this.textText(txt));
	this.position.set(x, y);
}
MenuText.prototype = Object.create(PIXI.Sprite.prototype);
MenuText.prototype.textText = function(x){
	return ui.getTextImage(x.toString(), {font: "14px Verdana", fill: "white", stroke: "black", strokeThickness: 2}, "", this.wrapwidth);
}
MenuText.prototype.setText = function(x){
	this.setTexture(this.textText(x));
}
function MenuButton(text){
	PIXI.Sprite.call(this, gfx.button);
	this.txt = new PIXI.Text(text, {font: "14px Dosis"});
	this.txt.anchor.x = .5;
	this.txt.position.set(this.width/2, 3);
	if (this.txt.width > this.width-6) this.txt.width = this.width-6;
	this.addChild(this.txt);
}
MenuButton.prototype = Object.create(PIXI.Sprite.prototype);
MenuButton.prototype.setText = function(x){
	if (x){
		exports.maybeSetText(this.txt, x);
		this.visible = true;
	}else this.visible = false;
}
function DeckDisplay(decksize, cardmouseover, cardclick, deck){
	PIXI.DisplayObjectContainer.call(this);
	this.deck = deck || [];
	this.decksize = decksize;
	this.cardmouseover = cardmouseover;
	this.cardclick = cardclick;
	this.hitArea = new PIXI.Rectangle(100, 32, Math.floor(decksize/10)*100, 200);
	this.interactive = true;
	for (var i = 0;i < decksize;i++) {
		var sprite = new PIXI.Sprite(gfx.nopic);
		sprite.position.set(100 + Math.floor(i / 10) * 100, 32 + (i % 10) * 20);
		this.addChild(sprite);
	}
}
DeckDisplay.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
DeckDisplay.prototype.pos2idx = function(mpos){
	return Math.floor((mpos.x-100-this.position.x)/100)*10+(Math.floor((mpos.y-32-this.position.y)/20)%10);
}
DeckDisplay.prototype.click = function(e){
	var index = this.pos2idx(e.global);
	if (index >= 0 && index < this.deck.length){
		ui.playSound("cardClick");
		if (this.cardclick) this.cardclick(index);
	}
}
DeckDisplay.prototype.renderDeck = function(i){
	for (;i < this.deck.length;i++) {
		this.children[i].setTexture(gfx.getCardImage(this.deck[i]));
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
DeckDisplay.prototype.next = function(mpos){
	if (this.cardmouseover){
		if (mpos === undefined) mpos = this.stage.getMousePosition();
		if (!this.hitArea.contains(mpos.x-this.position.x, mpos.y-this.position.y)) return;
		var index = this.pos2idx(mpos);
		if (index >= 0 && index < this.deck.length){
			this.cardmouseover(this.deck[index]);
		}
	}
}
function CardSelector(cardmouseover, cardclick, maxedIndicator){
	var self = this;
	PIXI.DisplayObjectContainer.call(this);
	this.cardpool = undefined;
	this.cardminus = undefined;
	this.showall = false;
	this.showshiny = undefined;
	this.interactive = true;
	this.cardmouseover = cardmouseover;
	this.cardclick = cardclick;
	this.hitArea = new PIXI.Rectangle(100, 272, 800, 328);
	if (maxedIndicator) this.addChild(this.maxedIndicator = new PIXI.Graphics());
	var bshiny = exports.mkButton(5, 578, "Toggle Shiny");
	exports.setClick(bshiny, function() {
		self.showshiny ^= true;
		self.makeColumns();
	});
	this.addChild(bshiny);
	var bshowall = exports.mkButton(5, 530, "Show All");
	exports.setClick(bshowall, function() {
		bshowall.setText((self.showall ^= true) ? "Auto Hide" : "Show All");
		self.makeColumns();
	});
	this.addChild(bshowall);
	this.elefilter = this.rarefilter = 0;
	this.columns = [[],[],[],[],[],[]];
	this.columnspr = [[],[],[],[],[],[]];
	for (var i = 0;i < 13;i++) {
		var sprite = exports.mkButton((!i || i&1?4:40), 316 + Math.floor((i-1)/2) * 32, gfx.eicons[i]);
		sprite.interactive = true;
		(function(_i) {
			exports.setClick(sprite, function() {
				self.elefilter = _i;
				self.makeColumns();
			});
		})(i);
		this.addChild(sprite);
	}
	for (var i = 0;i < 5; i++){
		var sprite = exports.mkButton(74, 338 + i * 32, gfx.ricons[i]);
		sprite.interactive = true;
		(function(_i) {
			exports.setClick(sprite, function() {
				self.rarefilter = _i;
				self.makeColumns();
			});
		})(i);
		this.addChild(sprite);
	}
	for (var i = 0;i < 6;i++) {
		for (var j = 0;j < 15;j++) {
			var sprite = new PIXI.Sprite(gfx.nopic);
			sprite.position.set(100 + i * 130, 272 + j * 20);
			var sprcount = new PIXI.Text("", { font: "12px Dosis" });
			sprcount.position.set(102, 4);
			sprite.addChild(sprcount);
			this.addChild(sprite);
			this.columnspr[i].push(sprite);
		}
	}
}
CardSelector.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
CardSelector.prototype.click = function(e){
	if (!this.cardclick) return;
	var col = this.columns[Math.floor((e.global.x-100)/130)], card;
	if (col && (card = col[Math.floor((e.global.y-272)/20)])){
		ui.playSound("cardClick");
		this.cardclick(card.code);
	}
}
CardSelector.prototype.next = function(newcardpool, newcardminus, mpos) {
	if (newcardpool != this.cardpool || newcardminus != this.cardminus) {
		this.cardminus = newcardminus;
		this.cardpool = newcardpool;
		this.makeColumns();
	}else if (this.cardminus && !this.cardminus.rendered){
		this.renderColumns();
	}
	if (this.cardmouseover){
		if (mpos === undefined) mpos = this.stage.getMousePosition();
		if (!this.hitArea.contains(mpos.x, mpos.y)) return;
		var col = this.columns[Math.floor((mpos.x-100)/130)], card;
		if (col && (card = col[Math.floor((mpos.y-272)/20)])){
			this.cardmouseover(card.code);
		}
	}
}
CardSelector.prototype.makeColumns = function(){
	var self = this;
	for (var i = 0;i < 6;i++) {
		this.columns[i] = etg.filtercards(i > 2,
			function(x) { return (x.element == self.elefilter || self.rarefilter == 4) &&
				((i % 3 == 0 && x.type == etg.CreatureEnum) || (i % 3 == 1 && x.type <= etg.PermanentEnum) || (i % 3 == 2 && x.type == etg.SpellEnum)) &&
				(!self.cardpool || x in self.cardpool || self.showall || x.isFree()) && (!self.rarefilter || self.rarefilter == Math.min(x.rarity, 4));
			}, etg.cardCmp, this.showshiny);
	}
	this.renderColumns();
}
CardSelector.prototype.renderColumns = function(){
	if (this.cardminus) this.cardminus.rendered = true;
	if (this.maxedIndicator) this.maxedIndicator.clear();
	for (var i = 0;i < 6; i++){
		for (var j = 0;j < this.columns[i].length;j++) {
			var spr = this.columnspr[i][j], code = this.columns[i][j].code;
			spr.setTexture(gfx.getCardImage(code));
			spr.visible = true;
			if (this.cardpool) {
				var txt = spr.children[0], card = Cards.Codes[code], inf = card.isFree();
				if ((txt.visible = inf || code in this.cardpool || this.showall)) {
					var cardAmount = inf ? "-" : !(code in this.cardpool) ? 0 : (this.cardpool[code] - (this.cardminus && code in this.cardminus ? this.cardminus[code] : 0))
					exports.maybeSetText(txt, cardAmount.toString());
					if (this.maxedIndicator && card.type != etg.PillarEnum && cardAmount >= 6) {
						this.maxedIndicator.beginFill(ui.elecols[cardAmount >= 12 ? etg.Chroma : etg.Light]);
						this.maxedIndicator.drawRect(spr.position.x + 100, spr.position.y, 20, 20);
						this.maxedIndicator.endFill();
					}
				}
			}
		}
		for (;j < 15;j++) {
			this.columnspr[i][j].visible = false;
		}
	}
}
exports.MenuText = MenuText;
exports.MenuButton = MenuButton;
exports.DeckDisplay = DeckDisplay;
exports.CardSelector = CardSelector;