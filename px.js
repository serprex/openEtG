"use strict";
var lastmove = 0;
document.addEventListener("mousemove", function(e){
	if (e.timeStamp - lastmove < 16){
		e.stopPropagation();
	}else{
		lastmove = e.timeStamp;
	}
});
const noStage = {};
var curStage = noStage;
exports.getCmd = function(cmd){
	return curStage.cmds ? curStage.cmds[cmd] : null;
}
exports.view = function(stage) {
	curStage = stage;
}