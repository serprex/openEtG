"use strict";
var zlib = require("zlib");
var etg = require("../etg");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var cache = [];
var elecols = [
	"#a99683", "#aa5999", "#636069", "#996633", "#5f4930", "#50a005", "#cc6611", "#205080", "#999990", "#337ddd", "#bfa622", "#333333", "#55aacc",
	"#d4cac1", "#d4accc", "#b1afb3", "#ccb299", "#afa497", "#a7cf82", "#e5b288", "#8fa7bf", "#ccccc6", "#99beee", "#dfd28f", "#999999", "#aad4e4"];
module.exports = function(url, res, date){
	var code = url.slice(0, 3).replace(/\.svg$/, ""), intCode = parseInt(code, 32);
	if (!(intCode in Cards.Codes)){
		res.write("HTTP 1.1 404 Not Found\r\nConnection:close\r\n\r\n");
		return res.end();
	}
	var prefix = "HTTP/1.1 200 OK\r\nContent-Encoding:gzip\r\nContent-Type:image/svg+xml\r\n"+date+"Connection:close\r\n\r\n";
	if (cache[intCode]){
		res.write(prefix);
		res.write(cache[intCode]);
		return res.end();
	}
	var ret="", x=16, y=0, classes = {};
	var card = Cards.Codes[intCode];
	var textColor = card.upped ? "" : " fill='white'";
	ret += "<image xlink:href='../assets/cardBacks.png' x='" + (card.element*-128) + "px' width='3328px' height='256px'/><text x='2px' y='15px'" + textColor + ">" + card.name + "</text><text x='108px' y='15px'"+textColor+">" + card.cost + "</text>";
	ret += "<image xlink:href='../Cards/"+etgutil.asShiny(etgutil.asUpped(intCode, false), false).toString(32)+".png' x='2px' y='20px' width='128px' height='128px'/>";
	var info = card.info(), i=0, y=156;
	while(~i && i<info.length){
		var ni = info.indexOf("\n", i);
		if (ni == -1) ni = Math.min(i+23, info.length);
		if (ni != info.length){
			var lsp = info.lastIndexOf(" ", ni);
			if (lsp > i) ni = lsp;
		}
		ret += "<text y='"+y+"'" + textColor + ">" + info.slice(i, ni) + "</text>";
		y += 16;
		i = ni + (info[ni] == "\n");
	}
	ret = "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' height='256' width='128'><style type='text/css'><![CDATA[text{font-size:12px}]]></style>" + ret + "</svg>";
	zlib.gzip(ret, {level:9}, (err, retbuf) => {
		res.write(prefix);
		res.write(retbuf);
		res.end();
		cache[intCode] = retbuf;
	});
}