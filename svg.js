"use strict";
var etg = require("./etg");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var elecols = [
	"#a99683", "#a59", "#636069", "#996633", "#5f4930", "#50a005", "#cc6611", "#205080", "#999990", "#337ddd", "#bfa622", "#333", "#5ac",
	"#d4cac1", "#d4accc", "#b1afb3", "#ccb299", "#afa497", "#a7cf82", "#e5b288", "#8fa7bf", "#ccccc6", "#99beee", "#dfd28f", "#999", "#aad4e4"];
var prefix = "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'",
	cssPrefix = "<style type='text/css'><![CDATA[@import url(http://fonts.googleapis.com/css?family=Dosis);text{font-family:Dosis;font-size:12px}";
function eleChar(card){
	return String.fromCharCode(97+card.element+(card.upped?13:0));
}
exports.card = function(code){
	var ret="", x=16, y=0;
	var card = Cards.Codes[code];
	var textColor = card.upped ? "" : " fill='#fff'";
	ret += "<image xlink:href='../assets/cardBacks.png' x='"+(card.element+card.upped*13)*-128+"' width='3328' height='256'/><text x='2' y='15'"+textColor+">"+card.name+"</text><text x='108' y='15'"+textColor+">"+card.cost+"</text>";
	ret += "<image xlink:href='../Cards/"+etgutil.asShiny(etgutil.asUpped(code, false), false).toString(32)+".png' y='20' width='128' height='128'/>";
	var info = card.info(), i=0, y=160;
	while(~i && i<info.length){
		var ni = info.indexOf("\n", i);
		if (ni == -1) ni = Math.min(i+23, info.length);
		if (ni != info.length){
			var lsp = info.lastIndexOf(" ", ni);
			if (lsp > i) ni = lsp;
		}
		ret += "<text x='2' y='"+y+"'"+textColor+">" + info.slice(i, ni) + "</text>";
		y += 13;
		i = ni + (info[ni] == "\n");
	}
	return prefix+" height='256' width='128'>"+cssPrefix+"]]></style>"+ret+"</svg>";
}
exports.deck = function(deck){
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
		var textColor = card.upped ? "" : " fill='#fff'";
		ret += "<rect class='"+elecls+"' x='"+x+"' y='"+y+"' width='100' height='16'/><text x='" + (x+2) + "' y='" + (y+13) + "'" + textColor + ">" + card.name + "</text>";
		y += 16;
		if (y == 160){
			y=0;
			x+=100;
		}
	});
	if (mark !== undefined){
		var cls = String.fromCharCode(97+mark);
		ret += "<rect class='"+cls+"' width='16' height='160'/><text x='5' y='-4' transform='rotate(90)'"+(~[0,8,10,12].indexOf(mark)?"":" fill='#fff'")+">"+etg.eleNames[mark]+"</text>";
		addClass(cls, "fill:"+elecols[mark]);
	}
	return prefix+" height='160' width='"+(y?x+100:x)+"'>"+cssPrefix+classString()+"]]></style>"+ret+"</svg>";
}
