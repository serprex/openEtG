#!/usr/bin/node
var fs = require("fs");
var browserify = require("browserify");
var b = browserify([], {detectGlobals: false});
for(var i=2; i<process.argv.length-1; i++){
	b.require("./" + process.argv[i].slice(0, -3));
}
b.bundle().pipe(fs.createWriteStream(process.argv[process.argv.length-1]));