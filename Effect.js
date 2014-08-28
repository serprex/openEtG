"use strict";
var etg = require("./etg");
var ui = require("./uiutil");
function maybeTgtPos(pos){
	return pos instanceof etg.Thing ? ui.tgtToPos(pos) : pos;
}
function Death(pos){
	PIXI.Graphics.call(this);
	this.step = 0;
	this.position = maybeTgtPos(pos);
}
function Text(text, pos){
	if (!pos){
		console.log("Blank position " + text);
		pos = new PIXI.Point(-99, -99);
	}
	PIXI.Sprite.call(this, ui.getTextImage(text, 16));
	this.step = 0;
	this.position = maybeTgtPos(pos);
	this.anchor.x = .5;
}
function SpriteFade(texture, pos) {
	PIXI.Sprite.call(this, texture);
	this.anchor.set(0.5, 0.5);
	this.step = 0;
	this.position = maybeTgtPos(pos) || new PIXI.Point(450, 300);
}
function nop(){}
function make(cons){
	return function(){
		if (exports.disable || !anims) return;
		var effect = Object.create(cons.prototype);
		var effectOverride = cons.apply(effect, arguments);
		anims.addChild(effectOverride === undefined ? effect : effectOverride);
	}
}
if (typeof PIXI === "undefined"){
	exports.disable = true;
	exports.register = exports.next = nop;
}else{
	var anims;
	exports.disable = false;
	exports.register = function(doc){
		anims = doc;
	}
	exports.next = function(p2cloaked){
		if (anims){
			for (var i = anims.children.length - 1;i >= 0;i--) {
				var child = anims.children[i];
				if ((p2cloaked && new PIXI.Rectangle(130, 20, 660, 280).contains(child.position.x, child.position.y)) || child.next()){
					anims.removeChild(child);
				}
			}
		}
	}
	Death.prototype = Object.create(PIXI.Graphics.prototype);
	Text.prototype = Object.create(PIXI.Sprite.prototype);
	SpriteFade.prototype = Object.create(PIXI.Sprite.prototype);
	Death.prototype.next = function(){
		if (++this.step==10){
			return true;
		}
		this.clear();
		this.beginFill(0, 1-this.step/10);
		this.drawRect(-30, -30, 60, 60);
		this.endFill();
	}
	Text.prototype.next = function(){
		if (++this.step==15){
			return true;
		}
		this.position.y -= 3;
		this.alpha = 1-((1<<this.step)/225);
	}
	SpriteFade.prototype.next = function() {
		if (++this.step == 80) {
			return true;
		}
		if (this.step > 40) this.alpha = 1 - ((this.step-40) / 40);
	}
}
var makemake = [Death, Text, SpriteFade];
for(var i=0; i<makemake.length; i++){
	var cons = makemake[i];
	if (typeof PIXI === "undefined"){
		exports["mk" + cons.name] = nop;
	}else{
		exports["mk" + cons.name] = make(cons);
	}
}
