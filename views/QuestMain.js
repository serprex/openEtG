"use strict";
var px = require("../px");
var gfx = require("../gfx");
var sock = require("../sock");
var Quest = require("../Quest");
module.exports = function(){
	var questui = px.mkView(function() {
		tinfo.setText("Welcome to Potatotal Island. The perfect island for adventuring!");
	});
	questui.addChild(px.mkBgRect(9, 9, 880, 111));
	var questmap = new PIXI.Sprite(gfx.bg_questmap);
	questmap.position.set(124, 162);
	questui.addChild(questmap);
	var tinfo = px.domText("");
	tinfo.style.maxWidth = "850px";
	var areainfo = {
		forest: ["Spooky Forest", new PIXI.Polygon(555, 221, 456, 307, 519, 436, 520, 472, 631, 440, 652, 390, 653, 351, 666, 321, 619, 246)],
		city: ["Capital City", new PIXI.Polygon(456, 307, 519, 436, 520, 472, 328, 496, 258, 477, 259, 401)],
		provinggrounds: ["Proving Grounds", new PIXI.Polygon(245, 262, 258, 477, 205, 448, 179, 397, 180, 350, 161, 313)],
		ice: ["Icy Caves", new PIXI.Polygon(161, 313, 245, 262, 283, 190, 236, 167, 184, 186, 168, 213, 138, 223, 131, 263)],
		desert: ["Lonely Desert", new PIXI.Polygon(245, 262, 283, 190, 326, 202, 466, 196, 511, 219, 555, 221, 456, 307, 259, 401)],
	};
	for (var key in areainfo) {
		if (!(key in Quest.areas))continue;
		var graphics = new PIXI.Graphics();
		graphics.interactive = true;
		graphics.buttonMode = true;
		(function (ainfo, k) {
			var points = ainfo[1].points;
			graphics.hitArea = ainfo[1];
			if (aideck.value == "quest"){
				graphics.lineStyle(4, 255);
				graphics.drawShape(ainfo[1]);
			}
			px.setClick(graphics, function () {
				require("./QuestArea")(k);
			});
			graphics.mouseover = function() {
				tinfo.setText(ainfo[0]);
			}
			if (Quest.areas[k].some(function(quest) {
				return (Quest[quest][0].dependency === undefined || Quest[quest][0].dependency(sock.user)) && ((sock.user.quest[quest] || 0) < Quest[quest].length);
			})) {
				var xtot = 0, ytot = 0;
				for (var i = 0;i < points.length; i+=2) {
					xtot += points[i];
					ytot += points[i+1];
				}
				var icon = new PIXI.Sprite(gfx.eicons[13]);
				icon.anchor.x = 0.5;
				icon.anchor.y = 0.5;
				icon.position.set((xtot*2) / points.length, (ytot*2) / points.length);
				graphics.addChild(icon);
			}
		})(areainfo[key], key);
		questui.addChild(graphics);
	}
	px.refreshRenderer({view:questui, qdom:[[26, 26, tinfo], [750, 246, ["Exit", require("./MainMenu")]]]});
}