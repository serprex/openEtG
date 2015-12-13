"use strict";
module.exports = function(name){
	if (name in Skills){
		return Skills[name];
	}else{
		var spidx = name.indexOf(" ");
		if (~spidx){
			Skills[name] = Skills[name.slice(0, spidx)](name.slice(spidx+1));
			Skills[name].activename = [name];
			return Skills[name];
		}
		console.log("Unknown active", name);
	}
}
var Skills = require("./Skills");
