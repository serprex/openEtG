'use strict';
const cache = {},
	stime = new Date();
stime.setMilliseconds(0);
function respond(url, res, data, ifmod) {
	data
		.then(data => {
			if (data.date.getTime() <= ifmod) {
				res.writeHead(304);
			} else {
				data.head['Last-Modified'] = data.date.toUTCString();
				data.head['Date'] = new Date().toUTCString();
				data.head['Cache-Control'] = 'no-cache';
				res.writeHead(data.status || '200', data.head);
				res.write(data.buf);
			}
			return res.end();
		})
		.catch(err => {
			try {
				res.writeHead('404');
				res.end(err);
			} catch (e) {}
			delete cache[url];
		});
}
exports.rm = function(url) {
	delete cache[url];
};
exports.try = function(res, url, ifmod) {
	const data = cache[url];
	if (!data) return false;
	respond(url, res, data, ifmod);
	return true;
};
exports.add = function(res, url, ifmod, path, func) {
	respond(
		url,
		res,
		(cache[url] = new Promise((resolve, reject) =>
			func(path, resolve, reject, stime),
		)),
		ifmod,
	);
};
