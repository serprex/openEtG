#!/bin/node
var fs = require("fs");
var out = fs.createWriteStream("assets/atlas.css");
out.write(".ico{display:inline-block;background:url('atlas.png')}\n");
var assets = require("./assets/atlas.js");
for(var asset in assets){
	var data = assets[asset];
	out.write("."+asset+"{width:"+data[2]+"px;height:"+data[3]+"px;background-position:-"+data[0]+"px -"+data[1]+"px}\n");
	if (asset.match(/e\d+/)){
		out.write(".c"+asset+"{background-size:208.5px 160px;width:"+data[2]/2+"px;height:"+data[3]/2+"px;background-position:-"+data[0]/2+"px -"+data[1]/2+"px}\n");
	}
}
out.end();