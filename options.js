"use strict";
if (typeof localStorage !== "undefined"){
	for(var key in localStorage){
		if (localStorage.hasOwnProperty(key) && key != "debug") exports[key] = localStorage[key];
	}
}
exports.register = function(opt, ele, nopersist){
	var field = ele.type == "checkbox" ? "checked" : "value";
	if (exports[opt]) ele[field] = exports[opt];
	if (!nopersist && typeof localStorage !== "undefined"){
		ele.addEventListener("change", function() {
			if (this[field]){
				exports[opt] = localStorage[opt] = this[field];
			}else{
				delete localStorage[opt];
				delete exports[opt];
			}
		});
	}else{
		if (typeof localStorage !== "undefined") delete localStorage[opt];
		ele.addEventListener("change", function() {
			exports[opt] = field == "checked" && !this[field] ? "" : this[field];
		});
	}
}