'use strict';
const store = require('./store');

function parseInput(data, key, value, limit) {
	const val = parseInt(value);
	if (val === 0 || val > 0) data[key] = limit ? Math.min(val, limit) : val;
}
exports.parseInput = parseInput;
exports.parsepvpstats = function(data) {
	const {opts} = store.store.getState();
	parseInput(data, 'p1hp', opts.pvphp);
	parseInput(data, 'p1drawpower', opts.pvpdraw, 8);
	parseInput(data, 'p1markpower', opts.pvpmark, 1188);
	parseInput(data, 'p1deckpower', opts.pvpdeck);
};
exports.parseaistats = function(data) {
	const {opts} = store.store.getState();
	parseInput(data, 'p2hp', opts.aihp);
	parseInput(data, 'p2drawpower', opts.aidraw, 8);
	parseInput(data, 'p2markpower', opts.aimark, 1188);
	parseInput(data, 'p2deckpower', opts.aideckpower);
};
exports.register = function(opt, ele, nopersist) {
	const {opts} = store.store.getState();
	const field = ele.type == 'checkbox' ? 'checked' : 'value',
		ename = ele.type == 'checkbox' ? 'change' : 'input';
	if (opts[opt]) ele[field] = opts[opt];
	const method = nopersist ? store.setOptTemp : store.setOpt;
	ele.addEventListener(ename, () => {
		console.log(store, store.store);
		store.store.dispatch(method(opt, ele[field]));
		console.log(opt, ele[field]);
	});
};
