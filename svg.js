"use strict";
var etg = require("./etg");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var elecols = [
	"#a98", "#a59", "#767", "#963", "#654", "#5a0", "#c52", "#258", "#887", "#38d", "#ca2", "#333", "#5ac",
	"#dcb", "#dbc", "#bab", "#cb9", "#ba9", "#ac7", "#da8", "#8ac", "#ccb", "#9be", "#ed8", "#999", "#afe"];
var cssPrefix = "<style type='text/css'><![CDATA[@import url(http://fonts.googleapis.com/css?family=Dosis);text{font-family:Dosis;font-size:12px}";
function eleChar(card){
	return String.fromCharCode(97+card.element+(card.upped?13:0));
}
exports.card = function(code){
	var prefix = "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'";
	var ret="", x=16, y=0;
	var card = Cards.Codes[code];
	var textColor = card.upped ? "" : " fill='#fff'";
	ret += "<image xlink:href='../assets/cardBacks.png' x='"+(card.element+card.upped*13)*-128+"' width='3328' height='256'/><text x='2' y='15'"+textColor+">"+card.name+"</text>" + (card.cost ? "<text x='108' y='15'"+textColor+">"+card.cost+"</text>" : "");
	ret += "<image xlink:href='../Cards/"+etgutil.asShiny(etgutil.asUpped(code, false), false).toString(32)+".png' y='20' width='128' height='128'/>";
	var info = card.info();
	ret += "<foreignObject x='2' y='140' width='124' height='116' requiredExtensions='http://www.w3.org/1999/xhtml'><body xmlns='http://www.w3.org/1999/xhtml'><p style='font-family:Dosis;font-size:10px;white-space:pre-wrap'>" + info.replace(/\|/g, " | ").replace(/(\d\d?):(\d+)/g, "$1<span class='ico ce$2'></span>") + "</p></body></foreignObject>";
	return prefix+" height='256' width='128'>"+cssPrefix+"]]></style>"+ret+"</svg>";
}
exports.deck = function(deck){
	function classString(){
		var ret = "";
		for(var cls in classes){
			ret += "."+cls+"{"+classes[cls]+"}";
		}
		return ret;
	}
	var prefix = "<svg xmlns='http://www.w3.org/2000/svg'",
		texts="", x=16, y=0, classes = {}, mark, paths = {}, suffix, pathsvg="";
	etgutil.iterdeck(deck, function(code){
		if (!(code in Cards.Codes)){
			var ismark = etg.fromTrueMark(code);
			if (~ismark) mark = ismark;
			return;
		}
		var card = Cards.Codes[code];
		var elech = eleChar(card), elecls = (card.shiny?"A":"B") + " " + elech;
		if (card.shiny) classes.A = "stroke:#daa520;stroke-width:.5";
		else classes.B = "stroke:black;stroke-width:.5";
		classes[elech] = "fill:"+elecols[card.element+(card.upped?13:0)];
		var textColor = card.upped ? "" : " fill='#fff'";
		if (!paths[elecls]) paths[elecls]="";
		paths[elecls]+="M"+x+" "+y+"h100v16h-100";
		texts += "<text x='" + (x+2) + "' y='" + (y+13) + "'" + textColor + ">" + card.name + "</text>";
		y += 16;
		if (y == 160){
			y=0;
			x+=100;
		}
	});
	for (var elecls in paths){
		pathsvg += "<path class='"+elecls+"' d='"+paths[elecls]+"'/>";
	}
	if (mark !== undefined){
		var cls = String.fromCharCode(97+mark);
		classes[cls] = "fill:"+elecols[mark];
		suffix = "<path class='"+cls+"' d='M0 0h16v160H0'/><text x='5' y='-4' transform='rotate(90)'"+(~[0,8,10,12].indexOf(mark)?"":" fill='#fff'")+">"+etg.eleNames[mark]+"</text></svg>";
	}else suffix = "</svg>"
	return prefix+" height='160' width='"+(y?x+100:x)+"'>"+cssPrefix+classString()+"]]></style>"+pathsvg+texts+suffix;
}
