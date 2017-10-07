"use strict";
const fs = require("fs"),
	zlib = require("zlib"),
	sutil = require("./sutil"),
	etgutil = require("../etgutil"),
	cache = require("./cache"),
	mime = {
		css:"text/css",
		htm:"text/html",
		html:"text/html",
		js:"application/javascript",
		json:"application/json",
		ogg:"application/ogg",
		png:"image/png",
	};
module.exports = function(url, resolve, reject){
	const contentType = mime[url.slice(url.lastIndexOf(".")+1)];
	if (!contentType) return reject("Unknown MIME");
	if (url.startsWith('Cards/') && !fs.existsSync(url)) {
		const code = url.match(/^Cards\/([a-v\d]{3})\.png$/);
		if (code) {
			resolve({
				status: '302',
				head: { Location: "/Cards/" + etgutil.asUpped(parseInt(code[1], 32), false).toString(32) + ".png" },
				date: new Date(),
				buf: '',
			});
		} else {
			reject("ENOENT");
		}
	}
	const task = sutil.mkTask(res => {
		if (res.err) reject("ENOENT");
		else{
			fs.watch(url, {persistent:false}, function(event){
				cache.rm(url);
				this.close();
			});
			res.stat.mtime.setMilliseconds(0);
			resolve({
				head: { "Content-Encoding": "gzip", "Content-Type": contentType },
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
