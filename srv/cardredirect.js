"use strict";
var fs = require("fs");
var etg = require("../etg");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
function eleChar(card){
	return String.fromCharCode(97+card.element+(card.upped?13:0));
}
function cardRedirect(req, res, next){
	res.writeHead(200, {"Content-Type": "image/svg+xml"});
	var code = req.url.slice(1, 4).replace(/\.svg$/, ""), intCode = parseInt(code, 32);
	if (!(intCode in Cards.Codes)) return next();
	var readStream = fs.createReadStream("deckcache/" + code);
	readStream.on("open", function(){
		this.pipe(res);
	});
	readStream.on("error", function(err, data){
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
		var elecols = [
			"#a99683", "#aa5999", "#636069", "#996633", "#5f4930", "#50a005", "#cc6611", "#205080", "#999990", "#337ddd", "#bfa622", "#333333", "#55aacc",
			"#d4cac1", "#d4accc", "#b1afb3", "#ccb299", "#afa497", "#a7cf82", "#e5b288", "#8fa7bf", "#ccccc6", "#99beee", "#dfd28f", "#999999", "#aad4e4"];
		var ret="", x=16, y=0, classes = {};
		var card = Cards.Codes[intCode];
		var elech = eleChar(card), elecls = (card.shiny?"A":"B") + " " + elech;
		if (card.shiny) addClass("A", "stroke:#daa520;stroke-width:.5");
		else addClass("B", "stroke:black;stroke-width:.5");
		addClass(elech, "fill:"+elecols[card.element+(card.upped?13:0)]);
		var textColor = card.upped ? "" : " fill='white'";
		ret += "<rect class='"+elecls+"' width='128px' height='256px'/><text y='15px'" + textColor + ">" + card.name + "</text>";
		ret += "<image xlink:href='../Cards/"+etgutil.asShiny(etgutil.asUpped(intCode, false), false).toString(32)+".png' y='20px' width='128px' height='128px'/>";
		ret += "<text y='156px'" + textColor + ">" + card.info() + "</text>";
		ret = "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' height='256' width='128'><style type='text/css'><![CDATA[text{font-size:12px}"+classString()+"]]></style>" + ret + "</svg>";
		res.end(ret);
		fs.writeFile("deckcache/" + code, ret, function(){});
	});
}
module.exports = function(){
	return cardRedirect;
}