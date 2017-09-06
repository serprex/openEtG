"use strict";
const px = require("../px"),
	dom = require("../dom"),
	sock = require("../sock"),
	svg = require("../svg"),
	chat = require("../chat"),
	Cards = require("../Cards"),
	Components = require('../Components'),
	h = preact.h;
function mkText(text){
	return h("span", { className: "atoptext" }, text);
}
module.exports = function(lvi) {
	var lv = lvi.lv;
	return function() {
		var s = dom.svg();
		s.setAttribute("width", "128");
		s.setAttribute("height", "256");
		s.style.pointerEvents = "none";
		s.style.position = 'absolute';
		s.style.display = 'none';
		document.body.appendChild(s);
		var ol = h('ol', { className: "atopol", style: { position: 'absolute', left: '90px', top: '50px' } });
		var view = h(Components.App, {}, ol, h(Components.ExitBtn, { x: 8, y: 300, }));
		px.view({
			endnext: function(){
				px.hideapp();
				document.body.removeChild(s);
			},
			cmds: {
				arenatop: function(info){
					info = info.top;
					ol.children = info.map(function(data, i){
						var lic = [mkText(data[0])];
						for(var i=1; i<=4; i++){
							if (i == 3){
								lic.push(h('span', { className: 'atopdash' }, '-'));
							}
							lic.push(h('span', { className: 'atop'+i }, data[i]));
						}
						var card = Cards.Codes[data[5]].asUpped(lv);
						var cname = mkText(card.name);
						cname.attributes.onMouseEnter = function(e){
							dom.svgToSvg(s, svg.card(card.code));
							s.style.left = (e.clientX+4)+"px";
							s.style.top = (e.clientY+4)+"px";
							s.style.display = "";
						};
						cname.attributes.onMouseLeave = function(){
							s.style.display = "none";
						};
						lic.push(cname);
						var li = h("li", { children: lic });
						if (i != info.length-1) li.className = "underline";
						return li;
					});
					px.render(view);
				}
			}
		});
		px.render(view);
		sock.emit("arenatop", lvi);
	}
}