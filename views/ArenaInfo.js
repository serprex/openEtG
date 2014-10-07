"use strict";
var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");
var sock = require("./sock");
var etgutil = require("./etgutil");
module.exports = function(info) {
	if (!info) return;
	var stage = px.mkView();
	var dom = [[200, 300, (info.win || 0) + " - " + (info.loss || 0) + ": " + (info.rank+1) +
		"\nAge: " + info.day + "\nHP: " + info.curhp + " / " + info.hp +
		"\nMark: " + info.mark +
		"\nDraw: " + info.draw],
		[300, 470, "You get $3 every time your arena deck wins,\n& $1 every time it loses."],
		[200, 500, ["Exit", require("./MainMenu")]],
	];
	if (sock.user.ocard){
		var uocard = etgutil.asUpped(sock.user.ocard, info.lv == 1);
		dom.push([200, 440, ["Create", function(){
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
		dom.push([200, 470, ["Modify", function(){
			require("./Editor")(info, info.card);
		}]], [100, 230, "05" + info.card + info.deck]);
		etgutil.iterdeck(adeck, function(code){
			var ismark = etg.fromTrueMark(code);
			if (~ismark){
				mark = ismark;
				return;
			}
			var spr = new PIXI.Sprite(gfx.getCardImage(code));
			spr.position.set(100 + Math.floor(i / 10) * 100, 32 + (i % 10) * 20);
			stage.addChild(spr);
			i++;
		});
		var spr = new PIXI.Sprite(gfx.eicons[mark || 0]);
		spr.position.set(66, 200);
		stage.addChild(spr);
		var acard = new PIXI.Sprite(gfx.getArt(info.card));
		acard.position.set(734, 8);
		stage.addChild(acard);
	}
	px.refreshRenderer({view: stage, div: {ainfo: dom}});
}