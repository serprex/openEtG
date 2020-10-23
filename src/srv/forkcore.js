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
const encodingPref = {
	br: 0,
	gzip: 1,
	deflate: 2,
};
async function forkcorelogic(req, res) {
	res.on('error', () => {});
	const qidx = req.url.indexOf('?'),
		url = ~qidx ? req.url.slice(1, qidx) : req.url.slice(1),
		ifmod = new Date(req.headers['if-modified-since'] ?? '').getTime(),
		acceptedEncodings = (req.headers['accept-encoding'] ?? '')
			.split(',')
			.map(x => x.split(';')[0].trim())
			.sort((x, y) => (encodingPref[x] ?? 3) - (encodingPref[y] ?? 3));
	while (
		acceptedEncodings.length &&
		!encodingPref[acceptedEncodings[acceptedEncodings.length - 1]]
	) {
		acceptedEncodings.pop();
	}
	acceptedEncodings.push('identity');
	if (await cache._try(acceptedEncodings, res, url || 'index.html', ifmod))
		return;
	const idx = url.indexOf('/'),
		func = ~idx && lut[url.slice(0, idx)];
	if (func) {
		await cache.add(
			res,
			url,
			ifmod,
			url.slice(idx + 1),
			acceptedEncodings,
			func,
		);
	} else if (
		!~url.indexOf('..') &&
		url.match(/^$|(?<!config)\.(js(on|\.map)?|html?|css|csv|png|ogg|txt|wasm)$/)
	) {
		await cache.add(
			res,
			url,
			ifmod,
			url || 'index.html',
			acceptedEncodings,
			file,
		);
	} else if (url === 'speed') {
		res.writeHead(302, { Location: `/speed/${randint()}` });
		res.end();
	} else {
		res.writeHead(404, { Connection: 'close' });
		res.end('Unknown url: ' + url);
	}
}

export default function forkcore(req, res) {
	forkcorelogic(req, res).catch(ex => console.log('Forkcore', ex));
}
