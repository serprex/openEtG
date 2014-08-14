"use strict";
var fs = require("fs");
var Cards = require("./Cards");
exports.loadcards = function(){
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	for(var i=0; i<names.length; i++){
		Cards.parseCsv(i, fs.readFileSync(__dirname + "/" + names[i] + ".csv").toString());
	}
	Cards.parseTargeting(fs.readFileSync(__dirname + "/active.csv").toString());
	console.log("Cards loaded");
	Cards.loaded = true;
}