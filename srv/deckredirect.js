var fs = require("fs");
var etg = require("../etg");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
function deckRedirect(req, res, next){
	var deck = req.url.substr(1).replace(".png", "");
	fs.readFile("deckcache/" + deck, function(err, data){
		if (!err){
			res.writeHead(200, {"Content-Type": "image/svg+xml"});
			res.end(data);
		}else{
			var ret = "<svg xmlns='http://www.w3.org/2000/svg' width='616' height='160'>";
			var elecols = [
				"#a99683", "#aa5999", "#777777", "#996633", "#5f4930", "#50a005", "#cc6611", "#205080", "#a9a9a9", "#337ddd", "#ccaa22", "#333333", "#77bbdd",
				"#d4cac1", "#d4accc", "#bbbbbb", "#ccb299", "#afa497", "#a7cf82", "#e5b288", "#8fa7bf", "#d4d4d4", "#99beee", "#e5d490", "#999999", "#bbddee"];
			var x=16, y=0;
			etgutil.iterdeck(deck, function(code){
				if (!(code in Cards.Codes)){
					var ismark = etg.fromTrueMark(code);
					if (~ismark){
						ret += "<rect width='16' height='160' fill='"+elecols[ismark]+"'/>"
					}
					return;
				}
				var card = Cards.Codes[code];
				ret += "<rect x='"+x+"' y='"+y+"' width='100' height='16' fill='"+elecols[card.element+(card.upped?13:0)]+"' stroke-width='.5' stroke='black'/>";
				var textColor = card.upped ? "" : " fill='white'";
				ret += "<text x='" + (x+2) + "' y='" + (y+13) + "'" + textColor + ">" + card.name + "</text>";
				y += 16;
				if (y == 160){
					y=0;
					x+=100;
				}
			});
			ret += "</svg>";
			res.writeHead(200, {"Content-Type": "image/svg+xml"});
			res.end(ret);
			fs.writeFile("deckcache/" + deck, ret, function(){});
		}
	});
}
module.exports = function(){
	return deckRedirect;
}