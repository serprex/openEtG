"use strict";
var fs = require("fs");
var zlib = require("zlib");
var sutil = require("./sutil");
var cache = require("./cache");
var mime = {
	css:"text/css",
	htm:"text/html",
	html:"text/html",
	js:"application/javascript",
	json:"application/json",
	ogg:"application/ogg",
	png:"image/png",
};
module.exports = function(url, resolve, reject){
	var contentType = mime[url.slice(url.lastIndexOf(".")+1)];
	if (!contentType) return reject("Unknown MIME");
	console.log(url);
	var task = sutil.mkTask((res) => {
		if (res.err) reject("ENOENT");
		else{
			fs.watch(url, {persistent:false}, function(event){
				cache(url);
				this.close();
			});
			res.stat.mtime.setMilliseconds(0);
			resolve({
				head: "Content-Encoding:gzip\r\nContent-Type:"+contentType+"\r\n",
				date: res.stat.mtime,
				buf: res.gzip,
			});
		}
	})
	fs.stat(url, task("stat"));
	fs.readFile(url, (err, buf) => {
		if (err) return reject(err.message);
		zlib.gzip(buf, {level:9}, task("gzip"));
		task();
	});
}
