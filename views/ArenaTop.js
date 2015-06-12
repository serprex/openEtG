"use strict";
var px = require("../px");
var chat = require("../chat");
var Cards = require("../Cards");
function mkText(text){
	var div = document.createElement("div");
	div.className = "atoptext";
	div.appendChild(document.createTextNode(text));
	return div;
}
module.exports = function(data) {
	var lv = data.lv, info = data.top;
	if (!info) {
		chat("??");
		return;
	}
	var ol = document.createElement("ol");
	ol.className = "atopol";
	info.forEach(function(data, i){
		var li = document.createElement("li");
		if (i != info.length-1) li.className = "underline";
		li.appendChild(mkText(data[0]));
		for(var i=1; i<=4; i++){
			if (i == 3){
				var dash = document.createElement("div");
				dash.className = "atopdash";
				dash.appendChild(document.createTextNode("-"));
				li.appendChild(dash);
			}
			var col = document.createElement("div");
			col.className = "atop"+i;
			col.appendChild(document.createTextNode(data[i]));
			li.appendChild(col);
		}
		li.appendChild(mkText(Cards.Codes[data[5]].asUpped(lv).name));
		ol.appendChild(li);
	});
	px.view({dom:px.dom.div([8, 300, ["Exit", require("./MainMenu")]], [90, 50, ol])});
}