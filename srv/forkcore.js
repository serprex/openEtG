"use strict";
const util = require("../util"),
	cache = require("./cache"),
	file = require("./file"),
	Cards = require("../Cards");
const lut = {
	card: require("./card"),
	deck: require("./deck"),
	speed: require("./speed"),
};
module.exports = function(req, res){
	try{
		res.on("error",()=>{});
		const url = req.url.slice(1);
		const ifmod = new Date(req.headers["if-modified-since"] || "").getTime();
		if (cache.try(res, url, ifmod)) return;
		const idx = url.indexOf("/"),
			func = ~idx && lut[url.slice(0,idx)];
		if (func){
			cache.add(res, url, ifmod, url.slice(idx+1), func);
		}else if (url.indexOf("..")==-1 && url.match(/^(vanilla\/|cia\/)?$|\.(js(on)?|html?|css|csv|png|ogg)$/)){
			cache.add(res, url, ifmod, (url.match(/^(vanilla\/|cia\/)?$/) ? url + "index.html" : url), file);
		}else if (url == "vanilla" || url == "cia"){
			res.writeHead(302, { Location: "/" + url + "/" });
			res.end();
		}else if (url == "speed"){
			res.writeHead(302, { Location: "/speed/" + util.readint() });
			res.end();
		}else{
			res.writeHead(404, { Connection: "close" });
			res.end("Unknown url: " + url);
		}
	}catch (ex){
		console.log("Forkcore", ex);
	}
}