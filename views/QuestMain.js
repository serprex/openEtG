"use strict";
var px = require("../px");
var dom = require("../dom");
var gfx = require("../gfx");
var sock = require("../sock");
var Quest = require("../Quest");
var options = require("../options");
module.exports = function(){
	var questui = px.mkView(function() {
		tinfo.text = "Welcome to Potatotal Island. The perfect island for adventuring!";
	});
	var questmap = new PIXI.Sprite(gfx.bg_questmap);
	questmap.position.set(124, 162);
	questui.addChild(questmap);
	var tinfo = dom.text("");
	tinfo.style.maxWidth = "850px";
	var div = dom.div([9, 9, dom.box(880, 111)], [26, 26, tinfo], [750, 246, ["Exit", require("./MainMenu")]]);
	var areainfo = {
		forest: ["Spooky Forest", new PIXI.math.Polygon(555, 221, 456, 307, 519, 436, 520, 472, 631, 440, 652, 390, 653, 351, 666, 321, 619, 246)],
		city: ["Capital City", new PIXI.math.Polygon(456, 307, 519, 436, 520, 472, 328, 496, 258, 477, 259, 401)],
		provinggrounds: ["Proving Grounds", new PIXI.math.Polygon(245, 262, 258, 477, 205, 448, 179, 397, 180, 350, 161, 313)],
		ice: ["Icy Caves", new PIXI.math.Polygon(161, 313, 245, 262, 283, 190, 236, 167, 184, 186, 168, 213, 138, 223, 131, 263)],
		desert: ["Lonely Desert", new PIXI.math.Polygon(245, 262, 283, 190, 326, 202, 466, 196, 511, 219, 555, 221, 456, 307, 259, 401)],
	};
	for (var key in areainfo) {
		if (!(key in Quest.areas))continue;
		var graphics = new PIXI.Graphics();
		graphics.interactive = true;
		(function (ainfo, k) {
			var points = ainfo[1].points;
			graphics.hitArea = ainfo[1];
			if (options.aideck == "quest"){
				graphics.lineStyle(4, 255);
				graphics.moveTo(points[0], points[1]);
				for(var i=2; i<points.length; i++) graphics.lineTo(points[i], points[i+1]);
				graphics.lineTo(points[0], points[1]);
			}
			px.setClick(graphics, function () {
				require("./QuestArea")(k);
			});
			graphics.mouseover = function() {
				tinfo.text = ainfo[0];
			}
			if (Quest.areas[k].some(function(quest) {
				return (Quest[quest][0].dependency === undefined || Quest[quest][0].dependency(sock.user)) && ((sock.user.quest[quest] || 0) < Quest[quest].length);
			})) {
				var xtot = 0, ytot = 0;
				for (var i = 0;i < points.length; i+=2) {
					xtot += points[i];
					ytot += points[i+1];
				}
				var icon = document.createElement("div");
				icon.className = "ico e13";
				div.appendChild(dom.style(icon, {
					transform: "translate(-50%,-50%)",
					pointerEvents: "none",
					position: "absolute",
					left: (xtot*2/points.length)+"px",
					top: (ytot*2/points.length)+"px",
				}));
			}
		})(areainfo[key], key);
		questui.addChild(graphics);
	}
	px.view({view:questui, dom:div});
}