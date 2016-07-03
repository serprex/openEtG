"use strict";
const cache = {}, stime = new Date();
stime.setMilliseconds(0);
function respond(res, data, ifmod) {
	data.then(data => {
		if (data.date.getTime() <= ifmod){
			res.write("HTTP/1.1 304 Not Modified\r\n\r\n");
		}else{
			res.write("HTTP/1.1 200 OK\r\n"+data.head+"Last-Modified:"+data.date.toUTCString()+"\r\nDate:"+new Date().toUTCString()+"\r\nCache-Control:no-cache\r\nConnection:close\r\n\r\n");
			res.write(data.buf);
		}
		return res.end();
	}, err => {
		res.write("HTTP/1.1 404 Not Found\r\n\r\n"+err);
		res.end();
		delete cache[url];
	}).catch(()=>{});
}
exports.rm = function(url) {
	delete cache[url];
}
exports.try = function(res, url, ifmod) {
	const data = cache[url];
	if (!data) return false;
	respond(res, data, ifmod);
	return true;
}
exports.add = function(res, url, ifmod, path, func){
	respond(res, cache[url] = new Promise((resolve, reject) => func(path, resolve, reject, stime)), ifmod);
}
