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
	var stage = [];
	for (var i = 0;i < info.length; i++) {
		var data = info[i], y = 50 + i * 24;
		stage.push([120, y, (i+1) + "  " + data[0]]);
		stage.push([120, y, (i+1) + "  " + data[0]]);
		stage.push([350, y, data[1]]);
		stage.push([410, y, data[2] + "-" + data[3]]);
		stage.push([500, y, data[4].toString()]);
		if (data[5] in Cards.Codes){
			stage.push([600, y, Cards.Codes[data[5]].name]);
		}
	}
	var bret = document.createElement("input");
	bret.type = "button";
	bret.value = "Exit";
	bret.addEventListener("click", require("./MainMenu"));
	stage.push([8, 300, bret]);
	px.refreshRenderer({div: stage});
}