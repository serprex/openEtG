"use strict";
var cache = {};
var stime = new Date();
stime.setMilliseconds(0);
module.exports = function(url, ifmod, path, res, func){
	if (arguments.length == 1) return delete cache[url];
	var data = cache[url];
	if (!data) cache[url] = data = new Promise((resolve, reject) => func(path, resolve, reject, stime));
	data.then((data) => {
		if (data.date.getTime() <= ifmod){
			res.write("HTTP/1.1 304 Not Modified\r\n\r\n");
		}else{
			res.write("HTTP/1.1 200 OK\r\n"+data.head+"Last-Modified:"+data.date.toUTCString()+"\r\nDate:"+new Date().toUTCString()+"\r\nConnection:close\r\n\r\n");
			res.write(data.buf);
		}
		return res.end();
	}, (err) => {
		res.write("HTTP/1.1 404 Not Found\r\n\r\n"+err);
	});
}
