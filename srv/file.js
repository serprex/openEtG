"use strict";
var fs = require("fs");
var zlib = require("zlib");
var cache = {};
var mime = {
	css:"text/css",
	htm:"text/html",
	html:"text/html",
	js:"application/javascript",
	json:"application/json",
	ogg:"application/ogg",
	png:"image/png",
};
function addModified(prefix, mtime){
	return prefix.replace("\r\n", "\r\nLast-Modified:"+mtime+"\r\n");
}
function m304(res){
	res.write("HTTP/1.1 304 Not Modified\r\n\r\n");
	return res.end();
}
function m404(res){
	res.write("HTTP/1.1 404 Not Found\r\nConnection:close\r\n\r\n");
	return res.end();
}
module.exports = function(url, res, date, lastModified){
	if (~url.indexOf("..")){
		return m404(res);
	}
	var contentType = mime[url.slice(url.lastIndexOf(".")+1)];
	var prefix = "HTTP/1.1 200 OK\r\nContent-Encoding:gzip\r\nContent-Type:"+contentType+"\r\n"+date+"Connection:close\r\n\r\n";
	if (cache[url]){
		if (lastModified && new Date(cache[url].mtime).getTime() <= new Date(lastModified).getTime()){
			return m304(res);
		}
		res.write(addModified(prefix, cache[url].mtime));
		res.write(cache[url].buf);
		return res.end();
	}
	// TODO make this more async
	fs.stat(url, function(err, stat){
		var mtime = stat ? stat.mtime.toUTCString() : "";
		if (lastModified && new Date(mtime).getTime() <= new Date(lastModified).getTime()){
			return m304(res);
		}
		fs.readFile(url, function(err, buf){
			if (err) return m404(res);
			zlib.gzip(buf, {level:9}, function(err, gzbuf){
				res.write(addModified(prefix, mtime));
				res.write(gzbuf);
				res.end();
				cache[url] = {mtime: mtime, buf:gzbuf};
				fs.watch(url, {persistent:false}, function(event){
					cache[url] = null;
					this.close();
				});
			});
		});
	});
}