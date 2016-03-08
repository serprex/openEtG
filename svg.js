"use strict";
var ui = require("./ui");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var cssPrefix = "<style type='text/css'><![CDATA[@import url(http://fonts.googleapis.com/css?family=Dosis);text{font-family:Dosis;font-size:12px}";
function eleChar(card){
	return String.fromCharCode(97+card.element+(card.upped?13:0));
}
exports.card = function(code){
	var card = Cards.Codes[code];
	var textColor = card.upped ? "" : " fill='#fff'";
	return "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' height='256' width='128'>"+cssPrefix +
		"]]></style><image xlink:href='../assets/cardBacks.png' x='"+(card.element+card.upped*13)*-128+"' width='3328' height='127'/>" +
		"<image xlink:href='../assets/cardBacks.png' x='"+(card.element+card.upped*13)*-128+"' y='128' width='3328' height='127'/>" +
		"<text x='2' y='15'"+textColor+">"+card.name+"</text>" + (card.cost ? "<text x='108' y='15'"+textColor+">"+card.cost+"</text>" : "") +
		"<image xlink:href='../Cards/"+etgutil.asShiny(etgutil.asUpped(code, false), false).toString(32)+".png' y='20' width='128' height='128'/>" +
		"<foreignObject x='2' y='140' width='124' height='116' requiredExtensions='http://www.w3.org/1999/xhtml'><body xmlns='http://www.w3.org/1999/xhtml'><p style='font-family:Dosis;font-size:10px;white-space:pre-wrap'>" +
		card.info().replace(/\|/g, " | ").replace(/(\d\d?):(\d+)/g, "$1<span class='ico te$2'></span>") +
		(card.rarity ? "<span class='ico r"+card.rarity+"' style='position:absolute;left:68px;top:88px'></span>" : "") +
		"<span class='ico t"+card.type+"' style='position:absolute;left:96px;top:88px'></span></p></body></foreignObject></svg>";
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
			var ismark = etgutil.fromTrueMark(code);
			if (~ismark) mark = ismark;
			return;
		}
		var card = Cards.Codes[code];
		var elech = eleChar(card), elecls = (card.shiny?"A":"B") + " " + elech;
		if (card.shiny) classes.A = "stroke:#da2;stroke-width:.5";
		else classes.B = "stroke:#000;stroke-width:.5";
		classes[elech] = "fill:"+ui.maybeLightenStr(card);
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
		classes[cls] = "fill:"+ui.strcols[mark];
		suffix = "<path class='"+cls+"' d='M0 0h16v160H0'/><text x='5' y='-4' transform='rotate(90)'"+(~[0,8,10,12].indexOf(mark)?"":" fill='#fff'")+">"+ui.eleNames[mark]+"</text></svg>";
	}else suffix = "</svg>"
	return prefix+" height='160' width='"+(y?x+100:x)+"'>"+cssPrefix+classString()+"]]></style>"+pathsvg+texts+suffix;
}
