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
	var stage = [[8, 300, ["Exit", require("./MainMenu")]]];
	for (var i = 0;i < info.length; i++) {
		var data = info[i], y = 50 + i * 24;
		stage.push([120, y, (i+1) + "  " + data[0]],
			[350, y, data[1].toString()],
			[410, y, data[2] + "-" + data[3]],
			[500, y, data[4].toString()]);
		if (data[5] in Cards.Codes){
			stage.push([600, y, Cards.Codes[data[5]].name]);
		}
	}
	px.refreshRenderer({top20: stage});
}