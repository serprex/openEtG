"use strict";
var hasLocalStorage = true;
try {
	for(var key in localStorage)
		if (localStorage.hasOwnProperty(key)) exports[key] = localStorage[key];
} catch(e) { hasLocalStorage = false; }

function parseInput(data, key, value, limit) {
	var value = parseInt(value);
	if (value === 0 || value > 0)
		data[key] = limit ? Math.min(value, limit) : value;
}
exports.parseInput = parseInput;
exports.parsepvpstats = function(data){
	parseInput(data, "p1hp", exports.pvphp);
	parseInput(data, "p1drawpower", exports.pvpdraw, 8);
	parseInput(data, "p1markpower", exports.pvpmark, 1188);
	parseInput(data, "p1deckpower", exports.pvpdeck);
}
exports.parseaistats = function(data){
	parseInput(data, "p2hp", exports.aihp);
	parseInput(data, "p2drawpower", exports.aidraw, 8);
	parseInput(data, "p2markpower", exports.aimark, 1188);
	parseInput(data, "p2deckpower", exports.aideckpower);
}
exports.register = function(opt, ele, nopersist){
	if (ele instanceof HTMLElement) {
		var field = ele.type == "checkbox" ? "checked" : "value";
		if (exports[opt]) ele[field] = exports[opt];
		if (!nopersist && hasLocalStorage){
			ele.addEventListener("change", function() {
				if (this[field]){
					exports[opt] = localStorage[opt] = this[field];
				}else{
					delete localStorage[opt];
					delete exports[opt];
				}
			});
		}else{
			ele.addEventListener("change", function() {
				exports[opt] = field == "checked" && !this.checked ? "" : this[field];
			});
		}
	} else {
		var field = ele.attributes.type == "checkbox" ? "checked" : "value";
		if (exports[opt]) ele.attributes[field] = exports[opt];
		if (!nopersist && hasLocalStorage){
			ele.attributes.onChange = function(e) {
				if (e.target[field]){
					exports[opt] = localStorage[opt] = e.target[field];
				}else{
					delete localStorage[opt];
					delete exports[opt];
				}
			};
		}else{
			ele.attributes.onChange = function(e) {
				exports[opt] = field == "checked" && !e.target.checked ? "" : e.target[field];
			}
		}
	}
}