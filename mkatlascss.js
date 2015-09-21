#!/usr/bin/env node
var fs = require("fs");
var png = fs.createReadStream("./assets/atlas.png", {start:16, end: 23});
var pngw = 0, pngh = 0, pngp = 0;
png.on("data", function(data){
	for(var i=0; i<data.length; i++){
		var b = data.readUInt8(i);
		if (pngp < 4) pngw += b << (3-pngp<<3);
		else pngh += b << (7-pngp<<3);
		pngp++;
	}
});
png.on("end", function(){
	console.log(pngw, pngh);
	var halfbgstr = "background-size:"+(pngw/2)+"px "+(pngh/2)+"px;";
	var out = fs.createWriteStream("assets/atlas.css");
	out.write(".ico{display:inline-block;background:url('atlas.png')}\n");
	var assets = require("./assets/atlas.js");
	for(var asset in assets){
		var data = assets[asset];
		out.write("."+asset+"{width:"+data[2]+"px;height:"+data[3]+"px;background-position:-"+data[0]+"px -"+data[1]+"px}\n");
		if (asset.match(/e\d+/)){
			out.write(".c"+asset+"{"+halfbgstr+"width:"+data[2]/2+"px;height:"+data[3]/2+"px;background-position:-"+data[0]/2+"px -"+data[1]/2+"px}\n");
		}
	}
	out.end();
});
