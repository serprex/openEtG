"use strict";
if (typeof localStorage !== "undefined"){
	for(var key in localStorage){
		if (localStorage.hasOwnProperty(key) && key != "debug") exports[key] = localStorage[key];
	}
}
exports.register = function(opt, ele, nopersist){
	var field = ele.type == "checkbox" ? "checked" : "value";
	if (!nopersist || typeof localStorage !== "undefined"){
		if (localStorage[opt] !== undefined){
			ele[field] = exports[opt] = localStorage[opt];
		}
		ele.addEventListener("change", function() {
			exports[opt] = localStorage[opt] = field == "checked" && !this[field] ? "" : this[field];
		});
	}else{
		if (exports[opt]) ele[field] = exports[opt];
		ele.addEventListener("change", function() {
			exports[opt] = field == "checked" && !this[field] ? "" : this[field];
		});
	}
}