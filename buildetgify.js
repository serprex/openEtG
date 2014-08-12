#!/usr/bin/node
var cmd = "browserify --detect-globals=false";
for(var i=2; i<process.argv.length-1; i++){
	var modname = " ./" + process.argv[i].substr(0, process.argv[i].length-3);
	cmd += " -r ./" + process.argv[i].substr(0, process.argv[i].length-3) + " --noparse=" + process.argv[i];
}
require("child_process").exec(cmd + " -out " + process.argv[process.argv.length-1]);