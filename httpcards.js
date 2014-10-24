"use strict";
module.exports = function(cb){
	var Cards = require("./Cards");
	if (Cards.loaded) cb(Cards);
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	var count = 0;
	function maybeLoaded(){
		if (++count == names.length+1){
			Cards.loaded = true;
			console.log("Cards loaded");
			if (cb) cb();
		}
	}
	names.forEach(function(name, i){
		var xhr = new XMLHttpRequest();
		xhr.open("GET", name + ".csv", true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200){
				Cards.parseCsv(i, this.responseText);
				maybeLoaded();
			}
		}
		xhr.send();
	});
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "active.csv", true);
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200){
			Cards.parseTargeting(this.responseText);
			maybeLoaded();
		}
	}
	xhr.send();
}