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
		} catch {
			console.error(err);
		}
	}
}
export function rm(url) {
	return cache.delete(url);
}
export function _try(res, url, ifmod) {
	const data = cache.get(url);
	if (!data) return false;
	respond(url, res, data, ifmod);
	return true;
}

export function add(res, url, ifmod, path, func) {
	const datathunk = func(path, stime);
	cache.set(url, datathunk);
	respond(url, res, datathunk, ifmod);
}
