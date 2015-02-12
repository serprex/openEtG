"use strict";
var px = require("../px");
var etg = require("../etg");
var gfx = require("../gfx");
var sock = require("../sock");
var etgutil = require("../etgutil");
module.exports = function(info) {
	if (!info) return;
	var stage = new PIXI.Container();
	var dom = [[150, 300, (info.win || 0) + " - " + (info.loss || 0) + ": " + (info.rank+1) +
		"\nAge: " + info.day + "\nHP: " + info.curhp + " / " + info.hp +
		"\nMark: " + info.mark +
		"\nDraw: " + info.draw],
		[150, 470, "You get $3 every time your arena deck wins,\n& $1 every time it loses."],
		[300, 390, ["Exit", require("./MainMenu")]],
	];
	if (sock.user.ocard){
		var uocard = etgutil.asUpped(sock.user.ocard, info.lv == 1);
		dom.push([300, 300, ["Create", function(){
			require("./Editor")(info, uocard, true);
		}]]);
		var ocard = new PIXI.Sprite(gfx.getArt(uocard));
		ocard.position.set(734, 300);
		stage.addChild(ocard);
	}
	if (info.card){
		if (info.lv){
			info.card = etgutil.asUpped(info.card, true);
		}
		var mark, i = 0, adeck = "05" + info.card + info.deck;
		etgutil.iterdeck(adeck, function(code){
			var ismark = etg.fromTrueMark(code);
			if (~ismark){
				mark = ismark;
				return;
			}
			var spr = new PIXI.Sprite(gfx.getCardImage(code));
			spr.position.set(100 + Math.floor(i / 10) * 99, 32 + (i % 10) * 19);
			stage.addChild(spr);
			i++;
		});
		dom.push([300, 330, ["Modify", function(){
				require("./Editor")(info, info.card);
			}]], [300, 360, ["Test", function(){
				var deck = sock.getDeck(), aideckcode = "05" + info.card + info.deck;
				if (etgutil.decklength(deck) < 11 || etgutil.decklength(aideckcode) < 11) {
					require("./Editor")();
					return;
				}
				require("../uiutil").parsepvpstats(gameData);
				var gameData = { deck: aideckcode, urdeck: deck, seed: Math.random() * etgutil.MAX_INT, foename: "Test", cardreward: "",
					p2hp:info.curhp, p2markpower:info.mark, p2drawpower:info.draw };
				require("./Match")(gameData, true);
			}]], [100, 230, "1:" + mark + " " + adeck]);
		var acard = new PIXI.Sprite(gfx.getArt(info.card));
		acard.position.set(734, 8);
		stage.addChild(acard);
	}
	px.view({view: stage, ainfo: dom});
}