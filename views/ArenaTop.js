"use strict";
var px = require("../px");
var dom = require("../dom");
var svg = require("../svg");
var chat = require("../chat");
var Cards = require("../Cards");
function mkText(text){
	var div = document.createElement("span");
	div.className = "atoptext";
	div.appendChild(document.createTextNode(text));
	return div;
}
module.exports = function(data) {
	var lv = data.lv, info = data.top;
	if (!info) {
		chat("??", "System");
		return;
	}
	var s = dom.svg();
	s.setAttribute("width", "128");
	s.setAttribute("height", "256");
	s.style.pointerEvents = "none";
	var ol = document.createElement("ol");
	ol.className = "atopol";
	info.forEach(function(data, i){
		var li = document.createElement("li");
		if (i != info.length-1) li.className = "underline";
		li.appendChild(mkText(data[0]));
		for(var i=1; i<=4; i++){
			if (i == 3){
				var dash = document.createElement("span");
				dash.className = "atopdash";
				dash.appendChild(document.createTextNode("-"));
				li.appendChild(dash);
			}
			var col = document.createElement("span");
			col.className = "atop"+i;
			col.appendChild(document.createTextNode(data[i]));
			li.appendChild(col);
		}
		var card = Cards.Codes[data[5]].asUpped(lv);
		var cname = mkText(card.name);
		cname.addEventListener("mouseenter", function(e){
			dom.svgToSvg(s, svg.card(card.code));
			s.style.left = (e.clientX+4)+"px";
			s.style.top = (e.clientY+4)+"px";
			s.style.display = "";
		});
		cname.addEventListener("mouseleave", function(){
			s.style.display = "none";
		});
		li.appendChild(cname);
		ol.appendChild(li);
	});
	px.view({dom:dom.div([8, 300, ["Exit", require("./MainMenu")]], [90, 50, ol], [0, 0, s])});
}