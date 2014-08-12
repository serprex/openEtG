#!/usr/bin/node
var args = ["--detect-globals=false"];
for(var i=2; i<process.argv.length-1; i++){
	args.push("-r", "./" + process.argv[i].substr(0, process.argv[i].length-3));
}
args.push("-o", process.argv[process.argv.length-1]);
require("child_process").execFile("browserify", args, function(err){
	if (err){
		console.log(err.message);
	}
});