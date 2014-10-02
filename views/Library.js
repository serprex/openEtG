"use strict";
var px = require("./px");
var gfx = require("./gfx");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
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
	var wealth = data.gold || 0;
	for(var code in cardpool){
		var card = Cards.Codes[code], num = cardpool[code];
		if (card){
			if (card.rarity == 0){
				if (card.upped && card.shiny) wealth += 300 * num;
				else if (card.upped || card.shiny) wealth += 50 * num;
			}else if (card.rarity > 0){
				var worth = [1.66, 6.66, 33.33, 40, 250][card.rarity-1];
				if (card.upped) worth *= 6;
				if (card.shiny) worth *= 6;
				wealth += worth * num;
			}
		}
	}
	stage.addChild(new px.MenuText(100, 16, "Cumulative wealth: " + Math.round(wealth)));
	px.refreshRenderer({view:stage, next:function(){
		cardsel.next(cardpool);
	}});
}