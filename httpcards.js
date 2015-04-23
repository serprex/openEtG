"use strict";
module.exports = function(cb){
	require("./Cards").loadcards(cb, function(file, onload){
		var xhr = new XMLHttpRequest();
		xhr.addEventListener("load", function(){
			onload(this.responseText);
		});
		xhr.open("GET", file, true);
		xhr.send();
	});
}