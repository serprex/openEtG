"use strict";
var px = require("./px");
var chat = require("./chat");
var Cards = require("./Cards");
module.exports = function(info) {
	info = info.top;
	if (!info) {
		chat("??");
		return;
	}
	var stage = px.mkView();
	for (var i = 0;i < info.length; i++) {
		var data = info[i], y = 50 + i * 24;
		var infotxt = new px.MenuText(120, y, (i+1) + "  " + data[0]);
		var scoretxt = new px.MenuText(350, y, data[1]);
		var winlosstxt = new px.MenuText(400, y, data[2] + "-" + data[3]);
		var agetxt = new px.MenuText(460, y, data[4].toString());
		if (data[5] in Cards.Codes){
			var cardtxt = new px.MenuText(500, y, Cards.Codes[data[5]].name);
			stage.addChild(cardtxt);
		}
		stage.addChild(infotxt);
		stage.addChild(scoretxt);
		stage.addChild(winlosstxt);
		stage.addChild(agetxt);
	}
	var bret = px.mkButton(8, 300, "Exit");
	px.setClick(bret, require("./MainMenu"));
	stage.addChild(bret);
	px.refreshRenderer(stage);
}