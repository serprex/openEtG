"use strict";
var card = require("./card");
var deck = require("./deck");
var file = require("./file");
var speed = require("./speed");
var Cards = require("../Cards");
Cards.loadcards();
process.on("message", function(msg, rsp){
	function firstLine(str){
		var idx = str.indexOf("\n");
		return ~idx?str.slice(idx):str;
	}
	try{
		var d = new Date().toUTCString();
		if (msg.slice(0,5) == "card/"){
			card(firstLine(msg.slice(5)), rsp, d);
		}else if (msg.slice(0,5) == "deck/"){
			deck(firstLine(msg.slice(5)), rsp, d);
		}else if (msg.slice(0,5) == "speed"){
			speed(firstLine(msg.slice(6)), rsp, d);
		}else if (msg == "" || msg[0] == "\n" || msg.match(/\.(js(on)?|html?|css|csv|png|ogg)/)){
			if (msg[0] == "\n") msg = "index.html" + msg;
			file(msg || "index.html", rsp, d);
		}else{
			rsp.write("HTTP/1.1 404 Not Found\r\nConnection:close\r\n\r\nUnknown msg: " + msg);
			rsp.end();
		}
	}catch(ex){
		console.log(ex);
	}
});