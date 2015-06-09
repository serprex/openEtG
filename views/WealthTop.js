"use strict";
var px = require("../px");
var chat = require("../chat");
module.exports = function(info) {
	info = info.top;
	if (!info) {
		chat("??");
		return;
	}
	var ol1 = document.createElement("ol"), ol2 = document.createElement("ol");
	ol1.className = ol2.className = "width400";
	ol2.start = "26";
	for (var i = 0; i < info.length; i+=2) {
		var ol = i<50?ol1:ol2;
		var li = document.createElement("li");
		if (i%50 != 48) li.className = "underline";
		li.appendChild(document.createTextNode(info[i]));
		var score = document.createElement("span");
		score.className = "floatRight";
		score.appendChild(document.createTextNode(Math.round(info[i+1])));
		li.appendChild(score);
		ol.appendChild(li);
	}
	px.view({dom:px.dom.div([8, 300, ["Exit", require("./MainMenu")]], [80, 8, ol1], [480, 8, ol2])});
}