#!/usr/bin/env node
"use strict"
process.chdir(__dirname);
var fs = require("fs");
var pngw = 0, pngh = 0, pngp = 0;
var png = fs.createReadStream("../assets/atlas.png", {start:16, end: 23});
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
	var bgstrx = ["background-size:"+(+(pngw/2).toFixed(2))+"px;", "background-size:"+(+(pngw/3).toFixed(2))+"px;"];
	var out = fs.createWriteStream("../assets/atlas.css");
	out.write(".ico{display:inline-block;background:url('atlas.png')}");
	var assets = require("../assets/atlas.js");
	var rules = {};
	for(var asset in assets){
		var data = assets[asset];
		addRule(rules, asset, "width:"+data[2]+"px;height:"+data[3]+"px", "background-position:-"+data[0]+"px -"+data[1]+"px");
		if (asset.match(/e\d+/)){
			for (var i=0; i<2; i++){
				var dati = data.map(x => +(x/(2+i)).toFixed(2)), name = (i?"t":"c")+asset;
				addRule(rules, name, "margin:4px 2px 0px 2px;"+bgstrx[i]+"width:"+dati[2]+"px;height:"+dati[3]+"px", "background-position:-"+dati[0]+"px -"+dati[1]+"px");
			}
		}
	}
	for (var rule in rules) out.write(rules[rule].map(x=>"."+x).join()+"{"+rule+"}");
	out.end();
});
function addRule(rules, name){
	for(var i=2; i<arguments.length; i++){
		var r = arguments[i];
		if (rules[r]) rules[r].push(name);
		else rules[r] = [name];
	}
}
