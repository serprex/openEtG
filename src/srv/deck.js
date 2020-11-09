import * as svg from '../svg.js';

export default async function (url, stime) {
	const deck = url.replace(/\.svg$/, '');
	if (url.endsWith('.svg')) {
		if (deck.length % 5) {
			throw new Error('Unaligned deck');
		}
		return {
			head: { 'Content-Type': 'image/svg+xml' },
			date: stime,
			buf: svg.deck(deck),
		};
	} else {
		return {
			status: '302',
			head: { Location: `/deck.htm#${deck}` },
			date: stime,
			buf: '',
		};
	}
}
