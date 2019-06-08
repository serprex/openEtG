'use strict';
const cache = new Map(),
	stime = new Date();
stime.setMilliseconds(0);
async function respond(url, res, datathunk, ifmod) {
	try {
		const data = await datathunk;
		if (data.date.getTime() <= ifmod) {
			res.writeHead(304);
		} else {
			data.head['Last-Modified'] = data.date.toUTCString();
			data.head['Date'] = new Date().toUTCString();
			data.head['Cache-Control'] = 'no-cache';
			res.writeHead(data.status || '200', data.head);
			res.write(data.buf);
		}
		res.end();
	} catch (err) {
		cache.delete(url);
		try {
			res.writeHead('404');
			res.end(err);
		} catch {}
	}
}
exports.rm = url => cache.delete(url);
exports.try = function(res, url, ifmod) {
	const data = cache.get(url);
	if (!data) return false;
	respond(url, res, data, ifmod);
	return true;
};
exports.add = function(res, url, ifmod, path, func) {
	const datathunk = func(path, stime);
	cache.set(url, datathunk);
	respond(url, res, datathunk, ifmod);
};
