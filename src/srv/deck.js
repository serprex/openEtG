import * as svg from '../svg.js';

const start = new Date();
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
			head: { 'Content-Type': 'text/html' },
			date: start,
			buf: `<!DOCTYPE html>
<title>openEtG deck</title>
<meta charset="UTF-8">
<link href="/forum/Smileys/default/time.png" rel="shortcut icon">
<link href="/ui.css" rel="stylesheet">
<link href="/assets/atlas.css" rel="stylesheet">
<div id="deck"></div>
<script src="/bundle/deck.js"></script>`,
		};
	}
}
