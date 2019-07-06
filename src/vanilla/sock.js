import React from 'react';

import chat from './chat.js';
import * as etgutil from '../etgutil.js';
import mkGame from './mkGame.js';
import * as store from './store.js';

const endpoint = `${location.protocol === 'http:' ? 'ws://' : 'wss://'}${
	location.hostname
}:13602`;
let socket = new WebSocket(endpoint);
export let et = socket;
const buffer = [];
let attempts = 0,
	attemptTimeout = 0;
const sockEvents = {
	pvpgive: data => {
		store.store.dispatch(store.doNav(import('./views/Match'), mkGame(data)));
	},
	roll: function(data) {
		var span = document.createElement('div');
		span.style.color = '#090';
		if (data.u) {
			var b = document.createElement('b');
			b.appendChild(document.createTextNode(data.u + ' '));
			span.appendChild(b);
		}
		span.appendChild(
			document.createTextNode((data.A || 1) + 'd' + data.X + ' '),
		);
		var a = document.createElement('a');
		a.target = '_blank';
		a.href = '../speed/' + data.sum;
		a.appendChild(document.createTextNode(data.sum));
		span.appendChild(a);
		chat.addSpan(span);
	},
	chat: function(data) {
		const state = store.store.getState();
		if (state.opts.muteall && !data.mode) return;
		const now = new Date(),
			h = now.getHours(),
			m = now.getMinutes(),
			hs = h < 10 ? '0' + h : h.toString(),
			ms = m < 10 ? '0' + m : m.toString(),
			style = {},
			text = [];
		if (data.mode != 1) style.color = data.mode == 2 ? '#69f' : '#ddd';
		if (data.guest) style.fontStyle = 'italic';
		let decklink = /\b(([01][0-9a-v]{4})+)\b/g,
			reres,
			lastindex = 0;
		while ((reres = decklink.exec(data.msg))) {
			if (reres.index != lastindex)
				text.push(data.msg.slice(lastindex, reres.index));
			let notlink = false;
			for (let i = 2; i < reres[0].length; i += 5) {
				const code = parseInt(reres[0].substr(i, 3), 32);
				if (!(code in Cards.Codes) && etgutil.fromTrueMark(code) == -1) {
					notlink = true;
					break;
				}
			}
			if (notlink) {
				lastindex = reres.index;
				continue;
			}
			text.push(
				<a href={`../deck/${reres[0]}`} target="_blank">
					{reres[0]}
				</a>,
			);
			lastindex = reres.index + reres[0].length;
		}
		if (lastindex != data.msg.length) text.push(data.msg.slice(lastindex));
		store.store.dispatch(
			store.chat(
				<div style={style}>
					{hs}
					{ms} {data.u && <b>{data.u} </b>}
					{text}
				</div>,
				data.mode == 1 ? null : 'Main',
			),
		);
	},
};
socket.onmessage = function(msg) {
	const state = store.store.getState();
	const data = JSON.parse(msg.data);
	const func = sockEvents[data.x] || state.cmds[data.x];
	if (func) func.call(this, data);
};
socket.onopen = function() {
	attempts = 0;
	if (attemptTimeout) {
		clearTimeout(attemptTimeout);
		attemptTimeout = 0;
	}
	buffer.forEach(this.send, this);
	buffer.length = 0;
	chat('Connected');
};
socket.onclose = function reconnect() {
	if (attemptTimeout) return;
	if (attempts < 8) attempts++;
	const timeout = 99 + Math.floor(99 * Math.random()) * attempts;
	attemptTimeout = setTimeout(function() {
		attemptTimeout = 0;
		const oldsock = socket;
		et = socket = new WebSocket(endpoint);
		socket.onopen = oldsock.onopen;
		socket.onclose = oldsock.onclose;
		socket.onmessage = oldsock.onmessage;
	}, timeout);
	chat('Reconnecting in ' + timeout + 'ms');
};
export function emit(x, data) {
	if (!data) data = {};
	data.x = x;
	const msg = JSON.stringify(data);
	if (socket && socket.readyState == 1) {
		socket.send(msg);
	} else {
		buffer.push(msg);
	}
}
export function getDeck(limit) {
	const state = store.store.getState();
	const deck = state.opts.deck.split(' ').map(x => parseInt(x, 32));
	if (limit && deck.length > 61) {
		deck.length = 61;
	}
	return deck;
}
