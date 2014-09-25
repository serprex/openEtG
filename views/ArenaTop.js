"use strict";
var px = require("./px");
var chat = require("./chat");
var Cards = require("./Cards");
function mkSpan(x, y, text){
	var ele = document.createElement("span");
	ele.style.left = x + "px";
	ele.style.top = y + "px";
	ele.style.position = "absolute";
	ele.appendChild(document.createTextNode(text));
	return ele;
}
module.exports = function(info) {
	info = info.top;
	if (!info) {
		chat("??");
		return;
	}
	var stage = document.createElement("div");
	for (var i = 0;i < info.length; i++) {
		var data = info[i], y = 50 + i * 24;
		stage.appendChild(mkSpan(120, y, (i+1) + "  " + data[0]));
		stage.appendChild(mkSpan(350, y, data[1]));
		stage.appendChild(mkSpan(410, y, data[2] + "-" + data[3]));
		stage.appendChild(mkSpan(500, y, data[4]));
		if (data[5] in Cards.Codes){
			stage.appendChild(mkSpan(600, y, Cards.Codes[data[5]].name));
		}
	}
	var bret = document.createElement("input");
	bret.type = "button";
	bret.style.left = "8px";
	bret.style.top = "300px";
	bret.style.position = "absolute";
	bret.value = "Exit";
	bret.addEventListener("click", require("./MainMenu"));
	stage.appendChild(bret);
	px.refreshRenderer(stage);
}