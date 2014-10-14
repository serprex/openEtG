var fs = require("fs");
var etg = require("../etg");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
function deckRedirect(req, res, next){
	var deck = req.url.substr(1).replace(".png", "");
	fs.readFile("deckcache/" + deck, function(err, data){
		if (!err){
			res.writeHead(200, {"Content-Type": "image/png"});
			res.end(data, "binary");
		}else{
			var Canvas = require("canvas"), Image = Canvas.Image;
			var can = new Canvas(616, 160), ctx = can.getContext("2d");
			var elecols = [
				"#a99683", "#aa5999", "#777777", "#996633", "#5f4930", "#50a005", "#cc6611", "#205080", "#a9a9a9", "#337ddd", "#ccaa22", "#333333", "#77bbdd",
				"#d4cac1", "#d4accc", "#bbbbbb", "#ccb299", "#afa497", "#a7cf82", "#e5b288", "#8fa7bf", "#d4d4d4", "#99beee", "#e5d490", "#999999", "#bbddee"];
			ctx.font = "10px Dosis";
			ctx.textBaseline = "top";
			var x=16, y=0;
			etgutil.iterdeck(deck, function(code){
				if (!(code in Cards.Codes)){
					var ismark = etg.fromTrueMark(code);
					if (~ismark){
						ctx.fillStyle = elecols[ismark];
						ctx.fillRect(0, 0, 16, 160);
					}
					return;
				}
				var card = Cards.Codes[code];
				ctx.beginPath();
				ctx.rect(x, y, 100, 16);
				ctx.fillStyle = elecols[card.element+(card.upped?13:0)];
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = "#000000";
				ctx.fillText(card.name, x+2, y);
				y += 16;
				if (y == 160){
					y=0;
					x+=100;
				}
			});
			can.toBuffer(function(err, buf){
				if (err){
					res.writeHead(503);
					res.end();
				}else{
					res.writeHead(200, {"Content-Type": "image/png"});
					res.end(buf, "binary");
					fs.writeFile("deckcache/" + deck, buf, {encoding: "binary"}, function(){});
				}
			});
		}
	});
}
module.exports = function(){
	return deckRedirect;
}