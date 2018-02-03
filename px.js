'use strict';
const store = require('./store');
const noStage = {};
var curStage = noStage;
exports.getCmd = function(cmd) {
	return curStage.cmds ? curStage.cmds[cmd] : null;
};
exports.view = function(stage) {
	curStage = stage;
};
exports.doNav = function(view, viewProps) {
	store.dispatch({
		type: 'NAV',
		nav: view,
		props: viewProps,
	});
}
