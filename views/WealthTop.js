"use strict";
var px = require("../px");
var chat = require("../chat");
module.exports = function(info) {
	info = info.top;
	if (!info) {
		chat("??");
		return;
	}
	var tbl = document.createElement("table");
	for (var i = 0;i < 50; i+=2) {
		if (i+1 >= info.length) break;
		var tr = document.createElement("tr");
		tbl.appendChild(tr);
		var td = new Array(5);
		for (var j=0; j<6; j++){
			tr.appendChild(td[j] = document.createElement("td"));
		}
		td[0].style.width = "24px";
		td[1].style.width = "200px";
		td[2].style.width = "166px";
		td[3].style.width = "24px";
		td[4].style.width = "200px";
		td[5].style.width = "166px";
		var data = info[i];
		td[0].appendChild(document.createTextNode(((i/2)+1).toString()));
		td[1].appendChild(document.createTextNode(info[i]));
		td[2].appendChild(document.createTextNode(Math.round(info[i + 1]).toString()));
		if (i+51 >= info.length) continue;
		td[3].appendChild(document.createTextNode(((i/2)+26).toString()));
		td[4].appendChild(document.createTextNode(info[i+50]));
		td[5].appendChild(document.createTextNode(Math.round(info[i + 51]).toString()));
	}
	px.view({dom:px.dom.div([8, 300, ["Exit", require("./MainMenu")]], [120, 10, tbl])});
}