var card = require("./card");
var deck = require("./deck");
var speed = require("./speed");
var Cards = require("../Cards");
Cards.loadcards();
process.on("message", function(msg, rsp){
	console.log(msg);
	try{
		if (msg.slice(0,6) == "/card/"){
			card(msg.slice(6), rsp, new Date().toUTCString());
		}else if (msg.slice(0,6) == "/deck/"){
			deck(msg.slice(6), rsp, new Date().toUTCString());
		}else if (msg.slice(0,6) == "/speed"){
			speed(msg.slice(7), rsp, new Date().toUTCString());
		}
	}catch(ex){
		console.log(ex);
	}
});