import gzip from './gzip.js';
import * as svg from '../svg.js';

const deckhtml = gzip(
		`<!DOCTYPE html>
<title>openEtG deck</title>
<meta charset="UTF-8">
<link href="/forum/Smileys/default/time.png" rel="shortcut icon">
<link href="/ui.css" rel="stylesheet">
<link href="/assets/atlas.css" rel="stylesheet">
<div id="deck"></div>
<script src="/bundle/deck.js"></script>`,
		{ level: 9 },
	),
	start = new Date();
export default async function(url, stime) {
	const deck = url.replace(/\.svg$/, '');
	if (url.endsWith('.svg')) {
		if (deck.length % 5) {
			throw 'Unaligned deck';
		}
		return {
			buf: await gzip(svg.deck(deck), { level: 9 }),
			head: {
				'Content-Encoding': 'gzip',
				'Content-Type': 'image/svg+xml',
			},
			date: stime,
		};
	} else {
		return {
			buf: await deckhtml,
			head: { 'Content-Encoding': 'gzip', 'Content-Type': 'text/html' },
			date: start,
		};
	}
}
