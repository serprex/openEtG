"use strict";
var px = require("../px");
var dom = require("../dom");
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
		var mouseover = false, svg;
		cname.addEventListener("mouseenter", function(e){
			mouseover = true;
			dom.loadSvg("/card/"+card.code.toString(32), function(res){
				svg = res;
				if (mouseover){
					svg.style.position = "absolute";
					svg.style.left = e.clientX+"px";
					svg.style.top = e.clientY+"px";
					document.body.appendChild(svg);
				}
			});
		});
		cname.addEventListener("mouseleave", function(){
			mouseover = false;
			if (svg) svg.remove();
		});
		li.appendChild(cname);
		ol.appendChild(li);
	});
	px.view({dom:dom.div([8, 300, ["Exit", require("./MainMenu")]], [90, 50, ol])});
}