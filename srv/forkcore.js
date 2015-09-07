"use strict";
var card = require("./card");
var deck = require("./deck");
var file = require("./file");
var speed = require("./speed");
var Cards = require("../Cards");
Cards.loadcards();
process.on("message", function(msg, res){
	try{
		var d = "Date:"+new Date().toUTCString()+"\r\n";
		var lines = msg.split("\n"), url = lines[0];
		if (url.slice(0,5) == "card/"){
			card(url.slice(5), res, d);
		}else if (url.slice(0,5) == "deck/"){
			deck(url.slice(5), res, d);
		}else if (url.slice(0,5).match(/^speed\/?/)){
			speed(url.slice(6), res, d);
		}else if (url.match(/^(vanilla\/|cia\/)?$|\.(js(on)?|html?|css|csv|png|ogg)$/)){
			if (url.match(/^(vanilla\/|cia\/)?$/)){
				url += "index.html";
			}
			file(url, res, d, lines[1]);
		}else if (url == "vanilla" || url == "cia"){
			res.write("HTTP/1.1 302 Found\r\nLocation:http://etg.dek.im/"+url+"/\r\n\r\n");
			res.end();
		}else{
			res.write("HTTP/1.1 404 Not Found\r\nConnection:close\r\n\r\nUnknown msg: " + msg);
			res.end();
		}
	}catch(ex){
		console.log(ex);
	}
});