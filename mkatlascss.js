#!/bin/node
var fs = require("fs");
var out = fs.createWriteStream("assets/atlas.css");
out.write(".ico{display:inline-block;background:url('atlas.png')}\n");
var assets = require("./assets/atlas.js");
for(var asset in assets){
	var data = assets[asset];
	out.write("."+asset+"{width:"+data.w+"px;height:"+data.h+"px;background-position:-"+data.x+"px -"+data.y+"px}\n");
}
out.end();