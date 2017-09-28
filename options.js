'use strict';
var hasLocalStorage = true;
try {
	for(let key in localStorage)
		if (localStorage.hasOwnProperty(key)) exports[key] = localStorage[key];
} catch(e) { hasLocalStorage = false; }

function parseInput(data, key, value, limit) {
	const val = parseInt(value);
	if (val === 0 || val > 0)
		data[key] = limit ? Math.min(val, limit) : val;
}
exports.parseInput = parseInput;
exports.parsepvpstats = function(data){
	parseInput(data, 'p1hp', exports.pvphp);
	parseInput(data, 'p1drawpower', exports.pvpdraw, 8);
	parseInput(data, 'p1markpower', exports.pvpmark, 1188);
	parseInput(data, 'p1deckpower', exports.pvpdeck);
}
exports.parseaistats = function(data){
	parseInput(data, 'p2hp', exports.aihp);
	parseInput(data, 'p2drawpower', exports.aidraw, 8);
	parseInput(data, 'p2markpower', exports.aimark, 1188);
	parseInput(data, 'p2deckpower', exports.aideckpower);
}
exports.register = function(opt, ele, nopersist){
	const field = ele.type == 'checkbox' ? 'checked' : 'value',
		ename = ele.type == 'checkbox' ? 'change' : 'input';
	if (exports[opt]) ele[field] = exports[opt];
	if (!nopersist && hasLocalStorage){
		ele.addEventListener(ename, function() {
			if (this[field]){
				exports[opt] = localStorage[opt] = this[field];
			}else{
				delete localStorage[opt];
				delete exports[opt];
			}
		});
	}else{
		ele.addEventListener(ename, function() {
			exports[opt] = field == 'checked' && !this.checked ? '' : this[field];
		});
	}
}