"use strict";
var px = require("./px");
var chat = require("./chat");
module.exports = function(info) {
	info = info.top;
	if (!info) {
		chat("??");
		return;
	}
	var stage = [[8, 300, ["Exit", require("./MainMenu")]]];
	for (var i = 0;i < info.length; i+=2) {
		var y = 50 + i * 12;
		stage.push([120, y, ((i/2)+1) + "  " + info[i]],
			[350, y, Math.round(info[i+1]).toString()]);
	}
	px.refreshRenderer({div: {top20: stage}});
}