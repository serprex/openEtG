"use strict";
var ui = require("./ui");
var options = require("./options");

exports.style = function(){
	var style = arguments[arguments.length-1]
	for(var key in style){
		for(var i=0; i<arguments.length-1; i++){
			arguments[i].style[key] = style[key];
		}
	}
	return arguments[0];
}
function parseDom(info){
	if (info instanceof HTMLElement) return info;
	var ele, base = typeof info[0] === "number" ? 2 : 0;
	if (typeof info[base] === "string"){
		ele = exports.text(info[base]);
	}else if (info[base] instanceof Array){
		ele = exports.button.apply(null, info[base]);
	}else ele = info[base];
	if (info[base+1]){
		info[base+1].forEach(function(info){
			ele.appendChild(parseDom(info));
		});
	}
	if (base){
		ele.style.position = "absolute";
		ele.style.left = info[0] + "px";
		ele.style.top = info[1] + "px";
	}
	return ele;
}
function _add(ele, args, i){
	while(i < args.length){
		ele.appendChild(parseDom(args[i++]));
	}
	return ele;
}
exports._add = _add;
exports.add = function(div){
	return _add(div, arguments, 1);
}
exports.div = function(){
	return _add(document.createElement("div"), arguments, 0);
}
exports.divwh = function(w, h){
	var ele = document.createElement("div");
	ele.style.width = w + "px";
	ele.style.height = h + "px";
	return ele;
}
exports.box = function(w, h){
	var ele = exports.divwh(w, h);
	ele.className = "bgbox";
	return ele;
}
exports.button = function(text, click, mouseover) {
	var ele = document.createElement("input");
	ele.type = "button";
	Object.defineProperty(ele, "text", {
		get:function(){
			return this.value;
		},
		set:function(text){
			if (text){
				this.value = text;
				this.style.display = "";
			}else this.style.display = "none";
		}
	});
	ele.text = text;
	ele.addEventListener("click", function() {
		ui.playSound("buttonClick");
		if (click) click.call(this);
	});
	if (mouseover) ele.addEventListener("mouseover", mouseover);
	return ele;
}
exports.check = function(text, change, opt, nopersist){
	var lbl = document.createElement("label"), box = document.createElement("input");
	box.type = "checkbox";
	if (opt) options.register(opt, box, nopersist);
	if (change) box.addEventListener("change", change);
	lbl.appendChild(box);
	lbl.appendChild(document.createTextNode(text));
	return lbl;
}
exports.input = function(placeholder, opt, nopersist, keydown){
	var ele = document.createElement("input");
	ele.placeholder = placeholder;
	if (opt) options.register(opt, ele, nopersist);
	if (keydown){
		if (keydown !== true) ele.addEventListener("keydown", keydown);
	}else ele.className = "numput";
	return ele;
}
exports.icob = function(e, click, ch){
	if (!ch) ch = "e";
	var ele = document.createElement("span");
	ele.className = "imgb ico "+ch+e;
	ele.addEventListener("click", function(){
		ui.playSound("buttonClick");
		if (click) click.call(this);
	});
	return ele;
}
exports.text = function(text){
	var ele = document.createElement("div");
	Object.defineProperty(ele, "text", {
		get:function(){
			return this.textcache;
		},
		set:function(text){
			text = text.toString();
			if (this.textcache == text) return;
			this.textcache = text;
			while (this.firstChild) this.firstChild.remove();
			text = text.replace(/\|/g, " | ");
			var sep = /\d\d?:\d\d?|\$|\n/g, reres, lastindex = 0;
			while (reres = sep.exec(text)){
				var piece = reres[0];
				if (reres.index != lastindex){
					this.appendChild(document.createTextNode(text.slice(lastindex, reres.index)));
				}
				if (piece == "\n") {
					this.appendChild(document.createElement("br"));
				}else if (piece == "$") {
					var sp = document.createElement("span");
					sp.className = "ico gold";
					this.appendChild(sp);
				}else if (/^\d\d?:\d\d?$/.test(piece)) {
					var parse = piece.split(":");
					var num = parseInt(parse[0]);
					if (num == 0) {
						this.appendChild(document.createTextNode("0"));
					} else if (num < 4) {
						for (var j = 0;j < num;j++) {
							var sp = document.createElement("span");
							sp.className = "ico ce"+parse[1];
							this.appendChild(sp);
						}
					}else{
						this.appendChild(document.createTextNode(parse[0]));
						var sp = document.createElement("span");
						sp.className = "ico ce"+parse[1];
						this.appendChild(sp);
					}
				}
				lastindex = reres.index + piece.length;
			}
			if (lastindex != text.length){
				this.appendChild(document.createTextNode(text.slice(lastindex)));
			}
		}
	});
	ele.text = text;
	return ele;
}
exports.svg = function(){
	return document.createElementNS("http://www.w3.org/2000/svg", "svg");
}
exports.svgToSvg = function(svg, text){
	if (!svg) svg = exports.svg();
	svg.innerHTML = text.slice(text.indexOf(">")+1,-6);
	return svg;
}