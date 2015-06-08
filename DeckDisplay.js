module.exports = DeckDisplay;
var ui = require("./ui");
var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");

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
	return Math.floor((px.mouse.x-100-this.position.x)/99)*10+(Math.floor((px.mouse.y-32-this.position.y)/19)%10);
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