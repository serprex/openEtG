import gzip from './gzip.js';
import Cards from '../Cards.js';
import * as svg from '../svg.js';

export default async function card(url, stime) {
	const code = parseInt(url.slice(0, 3), 32);
	if (!(code in Cards.Codes)) {
		throw `${code} undefined`;
	}
	return {
		buf: await gzip(svg.card(code), { level: 9 }),
		head: { 'Content-Encoding': 'gzip', 'Content-Type': 'image/svg+xml' },
		date: stime,
	};
}
