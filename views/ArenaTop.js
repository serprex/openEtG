"use strict";
var px = require("../px");
var chat = require("../chat");
var Cards = require("../Cards");
module.exports = function(data) {
	var lv = data.lv, info = data.top;
	if (!info) {
		chat("??");
		return;
	}
	var tbl = document.createElement("table");
	for (var i = 0;i < info.length; i++) {
		var tr = document.createElement("tr");
		tbl.appendChild(tr);
		var td = new Array(5);
		for (var j=0; j<5; j++){
			tr.appendChild(td[j] = document.createElement("td"));
		}
		td[0].style.width = "230px";
		td[1].style.width = "60px";
		td[2].style.width = "90px";
		td[3].style.width = "100px";
		td[4].style.width = "180px";
		var data = info[i];
		td[0].appendChild(document.createTextNode((i+1) + "  " + data[0]));
		td[1].appendChild(document.createTextNode(data[1].toString()));
		td[2].appendChild(document.createTextNode(data[2] + "-" + data[3]));
		td[3].appendChild(document.createTextNode(data[4].toString()));
		if (data[5] in Cards.Codes){
			td[4].appendChild(document.createTextNode(Cards.Codes[data[5]].asUpped(lv).name));
		}
	}
	px.view({dom:px.dom.div([8, 300, ["Exit", require("./MainMenu")]], [120, 50, tbl])});
}