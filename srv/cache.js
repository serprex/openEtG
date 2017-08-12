"use strict";
const cache = {}, stime = new Date();
stime.setMilliseconds(0);
function respond(res, data, ifmod) {
	data.then(data => {
		if (data.date.getTime() <= ifmod){
			res.writeHead(304);
		}else{
			data.head["Last-Modified"] = data.date.toUTCString();
			data.head["Date"] = new Date().toUTCString();
			data.head["Cache-Control"] = "no-cache";
			res.writeHead(200, data.head);
			res.write(data.buf);
		}
		return res.end();
	}, err => {
		res.writeHead(404)
		res.end(err);
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
