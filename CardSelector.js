module.exports = CardSelector;
var px = require("./px");
var ui = require("./ui");
var dom = require("./dom");
var etg = require("./etg");
var gfx = require("./gfx");
var Cards = require("./Cards");
var etgutil = require("./etgutil");

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
	var col = this.columns[Math.floor((px.mouse.x-100)/133)], card;
	if (col && (card = col[Math.floor((px.mouse.y-272)/19)])){
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
		var col = this.columns[Math.floor((px.mouse.x-100)/133)], card;
		if (col && (card = col[Math.floor((px.mouse.y-272)/19)])){
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