"use strict";
var lut = {};
function lutrequire(x){
	return lut[x] = require("./"+x);
}
var cache = require("./cache");
var file = require("./file");
var Cards = require("../Cards");
var card = lutrequire("card");
var deck = lutrequire("deck");
var speed = lutrequire("speed");
Cards.loadcards();
process.on("message", function(msg, res){
	if(!res)return;
	try{
		res.on("error",()=>{});
		var d = "cache-control:no-cache\r\nDate:"+new Date().toUTCString()+"\r\n";
		var lines = msg.split("\n"), url = lines[0].replace(/\?.*$/,''), ifmod = new Date(lines[1]).getTime();
		var idx = url.indexOf("/"), func = ~idx && lut[url.slice(0,idx)];
		if (func){
			cache(url, ifmod, url.slice(idx+1), res, func);
		}else if (url.indexOf("..")==-1 && url.match(/^(vanilla\/|cia\/)?$|\.(js(on)?|html?|css|csv|png|ogg)$/)){
			if (url.match(/^(vanilla\/|cia\/)?$/)){
				url += "index.html";
			}
			cache(url, ifmod, url, res, file);
		}else if (url == "vanilla" || url == "cia"){
			res.write("HTTP/1.1 302 Found\r\nLocation:/"+url+"/\r\n\r\n");
			res.end();
		}else if (url == "speed"){
			res.write("HTTP/1.1 302 Found\r\nLocation:/speed/" + Math.random()*0xFFFFFFFF+"\r\n\r\n");
			res.end();
		}else{
			res.write("HTTP/1.1 404 Not Found\r\nConnection:close\r\n\r\nUnknown msg: " + msg);
			res.end();
		}
	}catch(ex){
		console.log("Forkcore",ex);
	}
});