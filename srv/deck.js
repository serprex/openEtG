"use strict";
var zlib = require("zlib");
var etg = require("../etg");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var cache = {};
function eleChar(card){
	return String.fromCharCode(97+card.element+(card.upped?13:0));
}
module.exports = function(url, res, date){
	function addClass(cls, style){
		if (!(cls in classes)){
			classes[cls] = style;
		}
	}
	function classString(){
		var ret = "";
		for(var cls in classes){
			ret += "."+cls+"{"+classes[cls]+"}";
		}
		return ret;
	}
	var deck = url.replace(/\.svg$/, "");
	if (deck.length%5){
		res.write("HTTP/1.1 404 Not Found\r\nConnection:close\r\n\r\n");
		return res.end();
	}
	var prefix = "HTTP/1.1 200 OK\r\nContent-Encoding:gzip\r\nContent-Type:image/svg+xml\r\n" + date + "Connection:close\r\n\r\n";
	if (cache[deck]){
		res.write(prefix);
		res.write(cache[deck]);
		return res.end();
	}
	var elecols = [
		"#a99683", "#aa5999", "#636069", "#996633", "#5f4930", "#50a005", "#cc6611", "#205080", "#999990", "#337ddd", "#bfa622", "#333333", "#55aacc",
		"#d4cac1", "#d4accc", "#b1afb3", "#ccb299", "#afa497", "#a7cf82", "#e5b288", "#8fa7bf", "#ccccc6", "#99beee", "#dfd28f", "#999999", "#aad4e4"];
	var ret="", x=16, y=0, classes = {}, mark;
	etgutil.iterdeck(deck, function(code){
		if (!(code in Cards.Codes)){
			var ismark = etg.fromTrueMark(code);
			if (~ismark) mark = ismark;
			return;
		}
		var card = Cards.Codes[code];
		var elech = eleChar(card), elecls = (card.shiny?"A":"B") + " " + elech;
		if (card.shiny) addClass("A", "stroke:#daa520;stroke-width:.5");
		else addClass("B", "stroke:black;stroke-width:.5");
		addClass(elech, "fill:"+elecols[card.element+(card.upped?13:0)]);
		var textColor = card.upped ? "" : " fill='white'";
		ret += "<rect class='"+elecls+"' x='"+x+"' y='"+y+"' width='100' height='16'/><text x='" + (x+2) + "' y='" + (y+13) + "'" + textColor + ">" + card.name + "</text>";
		y += 16;
		if (y == 160){
			y=0;
			x+=100;
		}
	});
	if (mark !== undefined){
		var cls = String.fromCharCode(97+mark);
		ret += "<rect class='"+cls+"' width='16' height='160'/><text x='5' y='-4' transform='rotate(90)'"+(~[0,8,10,12].indexOf(mark)?"":" fill='white'")+">"+etg.eleNames[mark]+"</text>";
		addClass(cls, "fill:"+elecols[mark]);
	}
	ret = "<svg xmlns='http://www.w3.org/2000/svg' height='160'"+" width='"+(y?x+100:x)+"'><style type='text/css'><![CDATA[text{font-size:12px}"+classString()+"]]></style>" + ret + "</svg>";
	zlib.gzip(ret, {level:9}, (err, retbuf) => {
		res.write(prefix);
		res.write(retbuf);
		res.end();
		cache[deck] = retbuf;
	});
}