"use strict";
const lut = {};
function lutrequire(x){
	return lut[x] = require("./"+x);
}
const util = require("../util"),
	cache = require("./cache"),
	file = require("./file"),
	Cards = require("../Cards"),
	card = lutrequire("card"),
	deck = lutrequire("deck"),
	speed = lutrequire("speed");
Cards.loadcards();
process.on("message", function(msg, res){
	if(!res) return;
	try{
		res.on("error",()=>{});
		const lines = msg.split("\n"),
			url = lines[0].replace(/\?.*$/,''),
			ifmod = new Date(lines[1]).getTime();
		if (cache.try(res, url, ifmod)) return;
		const idx = url.indexOf("/"),
			func = ~idx && lut[url.slice(0,idx)];
		if (func){
			cache.add(res, url, ifmod, url.slice(idx+1), func);
		}else if (url.indexOf("..")==-1 && url.match(/^(vanilla\/|cia\/)?$|\.(js(on)?|html?|css|csv|png|ogg)$/)){
			cache.add(res, url, ifmod, (url.match(/^(vanilla\/|cia\/)?$/) ? url + "index.html" : url), file);
		}else if (url == "vanilla" || url == "cia"){
			res.write("HTTP/1.1 302 Found\r\nLocation:/"+url+"/\r\n\r\n");
			res.end();
		}else if (url == "speed"){
			res.write("HTTP/1.1 302 Found\r\nLocation:/speed/" + util.randint() + "\r\n\r\n");
			res.end();
		}else{
			res.write("HTTP/1.1 404 Not Found\r\nConnection:close\r\n\r\nUnknown msg: " + msg);
			res.end();
		}
	}catch (ex){
		console.log("Forkcore", ex);
	}
});