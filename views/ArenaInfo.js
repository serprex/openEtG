"use strict";
var px = require("../px");
var etg = require("../etg");
var gfx = require("../gfx");
var sock = require("../sock");
var etgutil = require("../etgutil");

module.exports = function(data) {
	var stage = new PIXI.Container();
	var dom = [
		[96, 576, "You get $3 every time your arena deck wins, & $1 every time it loses."],
		[8, 300, ["Exit", require("./MainMenu")]],
	];
	function renderInfo(info, y){
		if (info){
			if (y) info.card = etgutil.asUpped(info.card, true);
			var mark, i = 0, adeck = "05" + info.card + info.deck;
			etgutil.iterdeck(adeck, function(code){
				var ismark = etg.fromTrueMark(code);
				if (~ismark){
					mark = ismark;
					return;
				}
				var spr = new PIXI.Sprite(gfx.getCardImage(code));
				spr.position.set(100 + Math.floor(i / 10) * 99, y + 32 + (i % 10) * 19);
				stage.addChild(spr);
				i++;
			});
			var marksprite = document.createElement("span");
			marksprite.className = "ico e"+mark;
			dom.push([100, 4+y, (info.win || 0) + " - " + (info.loss || 0) + ": " + (info.rank+1)],
				[200, 4+y, adeck],
				[400, 224+y, "Age: " + info.day],
				[100, 224+y, "HP: " + info.curhp + " / " + info.hp],
				[200, 224+y, "Mark: " + info.mark],
				[300, 224+y, "Draw: " + info.draw],
				[500, 224+y, ["Modify", function(){
					require("./Editor")(data, info, info.card);
				}]], [600, 224+y, ["Test", function(){
					var deck = sock.getDeck();
					if (etgutil.decklength(deck) < 9 || etgutil.decklength(adeck) < 9) {
						require("./Editor")();
						return;
					}
					require("../uiutil").parsepvpstats(gameData);
					var gameData = { deck: adeck, urdeck: deck, seed: Math.random() * etgutil.MAX_INT, foename: "Test", cardreward: "",
						p2hp:info.curhp, p2markpower:info.mark, p2drawpower:info.draw };
					require("./Match")(gameData, true);
				}]], [66, 200+y, marksprite]);
		}
	}
	renderInfo(data.A, 0);
	renderInfo(data.B, 300);
	if (sock.user.ocard){
		for(var i=0; i<2; i++){
			(function(uocard){
				dom.push([734, 268+i*292, ["Create", function(){
					require("./Editor")(data, data[uocard.upped?"B":"A"], uocard, true);
				}]]);
				var ocard = new PIXI.Sprite(gfx.getArt(uocard));
				ocard.position.set(734, 8+i*292);
				stage.addChild(ocard);
			})(etgutil.asUpped(sock.user.ocard, i == 1));
		}
	}
	px.view({view: stage, ainfo: dom});
}