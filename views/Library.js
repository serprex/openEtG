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
	var progress = 0, progressmax = 0;
	for(var code in Cards.Codes){
		var card = Cards.Codes[code];
		if (!card.upped && !card.shiny && card.type){
			progressmax += 42;
			progress += Math.min((cardpool[code] || 0) + (cardpool[etgutil.asUpped(code, true)] || 0)*6, 42);
		}
	}
	var wealth = userutil.calcWealth(data.gold, cardpool);
	var dom = [[100, 16, "Cumulative wealth: " + Math.round(wealth) + "\nZE Progress: " + progress + " / " + progressmax]];
	px.refreshRenderer({view:stage, stext: dom, next:function(){
		cardsel.next(cardpool);
	}});
}