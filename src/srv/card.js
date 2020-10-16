import Cards from '../AllCards.js';
import * as svg from '../svg.js';

export default async function card(url, stime) {
	const code = parseInt(url.slice(0, 3), 32);
	if (!(code in Cards.Codes)) {
		throw new Error(`${code} undefined`);
	}
	return {
		head: { 'Content-Type': 'image/svg+xml' },
		date: stime,
		buf: svg.card(code),
	};
}
