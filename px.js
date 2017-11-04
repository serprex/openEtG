"use strict";
const noStage = {};
var curStage = noStage;
exports.getCmd = function(cmd){
	return curStage.cmds ? curStage.cmds[cmd] : null;
}
exports.view = function(stage) {
	curStage = stage;
}