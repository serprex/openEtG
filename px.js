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
exports.doNav = function(view, props) {
	store.store.dispatch(store.doNav(view, props));
}
