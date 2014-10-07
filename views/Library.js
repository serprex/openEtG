"use strict";
var px = require("./px");
var gfx = require("./gfx");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var userutil = require("./userutil");
module.exports = function(data){
	var stage = px.mkView();
	var bexit = px.mkButton(10, 10, "Exit");
	px.setClick(bexit, require("./MainMenu"));
	stage.addChild(bexit);
	var cardpool = etgutil.deck2pool(data.pool);
	var cardsel = new px.CardSelector(function(code){
		cardArt.setTexture(gfx.getArt(code));
	});
	stage.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	stage.addChild(cardArt);
	var wealth = userutil.calcWealth(data.gold, cardpool);
	stage.addChild(new px.MenuText(100, 16, "Cumulative wealth: " + Math.round(wealth)));
	px.refreshRenderer({view:stage, next:function(){
		cardsel.next(cardpool);
	}});
}