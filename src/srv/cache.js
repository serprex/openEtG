import { constants, gzip, inflate, brotliCompress } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const inflateAsync = promisify(inflate);
const brotliCompressAsync = promisify(brotliCompress);

const cache = new Map(),
	stime = new Date();
stime.setMilliseconds(0);

const identityOnlyEncodings = new Set([
	'application/ogg',
	'image/png',
	undefined,
]);
const encode = {
	br: buf =>
		brotliCompressAsync(buf, {
			params: {
				[constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
				[constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
			},
		}),
	gzip: buf => gzipAsync(buf, { level: 9 }),
	deflate: buf => inflateAsync(buf, { level: 9 }),
};
class CacheEntry {
	constructor(datathunk) {
		this.identity = datathunk;
		this.br = null;
		this.gzip = null;
		this.deflate = null;
	}

	async get(acceptedEncodings) {
		const data = await this.identity;
		if (
			identityOnlyEncodings.has(data.head['Content-Type']) ||
			data.head['Cache-Control'] === 'no-store'
		) {
			return data;
		} else {
			for (const encoding of acceptedEncodings) {
				if (this[encoding]) {
					return this[encoding];
				}
				return (this[encoding] = {
					head: {
						...data.head,
						'Content-Encoding': encoding,
					},
					date: data.date,
					buf: await encode[encoding](data.buf),
				});
			}
		}
	}
}
async function respond(url, res, datathunk, ifmod) {
	try {
		const data = await datathunk,
			cacheControl = data.head['Cache-Control'];
		if (cacheControl === 'no-store') {
			cache.delete(url);
		}
		if (data.date.getTime() <= ifmod) {
			res.writeHead(304);
		} else {
			data.head['Last-Modified'] = data.date.toUTCString();
			data.head['Date'] = new Date().toUTCString();
			if (cacheControl === undefined) {
				data.head['Cache-Control'] = 'no-cache';
			}
			res.writeHead(data.status ?? '200', data.head);
			res.write(data.buf);
		}
		res.end();
	} catch (err) {
		cache.delete(url);
		try {
			res.writeHead('404');
			res.end(err?.message ?? '');
		} catch (ex) {
			console.error('404', err, ex);
		}
	}
}
export function rm(url) {
	return cache.delete(url);
}
export async function _try(acceptedEncodings, res, url, ifmod) {
	const entry = cache.get(url);
	if (entry === undefined) return false;
	await respond(url, res, entry.get(acceptedEncodings), ifmod);
	return true;
}
export function add(res, url, ifmod, path, acceptedEncodings, func) {
	const entry = new CacheEntry(func(path, stime));
	cache.set(url, entry);
	return respond(url, res, entry.get(acceptedEncodings), ifmod);
}
