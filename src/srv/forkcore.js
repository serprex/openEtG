import { randint } from '../util.js';
import * as cache from './cache.js';
import file from './file.js';
import card from './card.js';
import deck from './deck.js';
import speed from './speed.js';
import collection from './collection.js';
const lut = {
	card,
	deck,
	speed,
	collection,
};
export default function forkcore(req, res) {
	try {
		res.on('error', () => {});
		const qidx = req.url.indexOf('?'),
			url = ~qidx ? req.url.slice(1, qidx) : req.url.slice(1);
		const ifmod = new Date(req.headers['if-modified-since'] || '').getTime();
		if (cache._try(res, url, ifmod)) return;
		const idx = url.indexOf('/'),
			func = ~idx && lut[url.slice(0, idx)];
		if (func) {
			cache.add(res, url, ifmod, url.slice(idx + 1), func);
			if (func === lut.collection) cache.rm(url);
		} else if (
			!~url.indexOf('..') &&
			url.match(/^$|\.(js(on|\.map)?|html?|css|csv|png|ogg)$/)
		) {
			cache.add(res, url, ifmod, url || 'index.html', file);
		} else if (url == 'speed') {
			res.writeHead(302, { Location: `/speed/${randint()}` });
			res.end();
		} else {
			res.writeHead(404, { Connection: 'close' });
			res.end('Unknown url: ' + url);
		}
	} catch (ex) {
		console.log('Forkcore', ex);
	}
}
