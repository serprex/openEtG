import { onSettled } from 'solid-js';

import config from '../wsconfig.json' with { type: 'json' };

import Cards from './Cards.js';
import { decodedeck, fromTrueMark } from './etgutil.js';
import Game from './Game.js';
import * as store from './store.jsx';
import { arenaCost } from './userutil.js';
import { shuffle } from './util.js';
import OrigCards from './vanilla/Cards.js';
import { presets } from './ui.js';

const endpoint = `${location.protocol === 'http:' ? 'ws://' : 'wss://'}
	${location.hostname}:${
		location.protocol === 'http:' ? config.wsport : config.wssport
	}/ws`;
const buffer = [];
const cmdstack = [];
let socket = new WebSocket(endpoint),
	attempts = 0,
	attemptTimeout = 0;

function findCmd(x) {
	for (let i = cmdstack.length - 1; i >= 0; i--) {
		const func = cmdstack[i][x];
		if (func) return func;
	}
	return sockEvents[x];
}
const sockEvents = {
	altadd(data) {
		store.addAlt(data.name, data.data);
	},
	clear() {
		store.clearChat('Main');
	},
	passchange(data) {
		store.setAuth(data.auth);
		store.chatMsg('Password updated', 'System');
	},
	mute(data) {
		store.mute(data.m);
		store.chatMsg(data.m + ' has been muted', 'System');
	},
	roll(data) {
		store.chat(
			() => (
				<div style="color:#090">
					{data.u && <b>{data.u} </b>}
					{data.A || 1}d{data.X}{' '}
					<a href={`speed/${data.sum}`} target="_blank">
						{data.sum}
					</a>
				</div>
			),
			'Main',
		);
	},
	chat(data) {
		if (store.appState.opts.muteall) {
			if (!data.mode) return;
		} else if (store.appState.opts.muteguests && data.guest) {
			return;
		} else if (
			typeof Notification !== 'undefined' &&
			Notification.permission !== 'denied' &&
			store.appState.user &&
			~data.msg.indexOf(store.appState.username) &&
			!document.hasFocus()
		) {
			Notification.requestPermission().then(result => {
				if (result === 'granted') new Notification(data.u, { body: data.msg });
			});
		}
		const now = new Date(),
			h = now.getHours(),
			m = now.getMinutes();
		const text = () => {
			const text = [];
			let decklink = /\b(([01][0-9a-v]{4})+)\b/g,
				reres,
				lastindex = 0;
			while ((reres = decklink.exec(data.msg))) {
				if (reres.index !== lastindex)
					text.push(data.msg.slice(lastindex, reres.index));
				let notlink = false;
				for (let i = 2; i < reres[0].length; i += 5) {
					const code = parseInt(reres[0].substring(i, i + 3), 32);
					if (
						!Cards.Codes[code] &&
						!OrigCards.Codes[code] &&
						fromTrueMark(code) === -1
					) {
						notlink = true;
						break;
					}
				}
				if (notlink) {
					lastindex = reres.index;
					continue;
				}
				text.push(
					<a href={`deck/${reres[0]}`} target="_blank">
						{reres[0]}
					</a>,
				);
				lastindex = reres.index + reres[0].length;
			}
			if (lastindex !== data.msg.length) text.push(data.msg.slice(lastindex));
			return text;
		};
		store.chat(
			() => (
				<div
					style={
						data.guest ? 'overflow:auto;font-style:italic;color:#ccc'
						: data.mode === 2 ?
							'overflow:auto;color:#69f'
						: data.mode !== 1 ?
							'overflow:auto;color:#ddd'
						:	'overflow:auto'
					}>
					{`${h < 10 ? '0' : ''}${h}${m < 10 ? '0' : ''}${m} `}
					{data.u && <b>{data.u + ' '}</b>}
					{text}
				</div>
			),
			data.mode === 1 ? store.appState.opts.channel : 'Main',
		);
	},
	foearena(data) {
		const game = new Game({
			players: shuffle([
				{
					idx: 1,
					name: store.appState.username,
					user: store.appState.username,
					deck: store.getDeck(),
				},
				{
					idx: 2,
					ai: 1,
					name: data.name,
					deck: data.deck,
					hp: data.hp,
					drawpower: data.draw,
					markpower: data.mark,
				},
			]),
			seed: data.seed,
			rank: data.rank,
			arena: data.name,
			level: 4 + data.lv,
			cost: arenaCost(data.lv),
			rematch: () => {
				if (
					!Cards.isDeckLegal(decodedeck(store.getDeck()), store.appState.user)
				) {
					store.chatMsg('Invalid deck', 'System');
					return;
				}
				const cost = arenaCost(data.lv);
				if (store.appState.user.gold < cost) {
					store.requiresGold(cost);
					return;
				}
				userEmit('foearena', { lv: data.lv });
			},
		});
		store.doNav(import('./views/Match.jsx'), { game });
	},
	pvpgive(data) {
		const spectate = !data.data.players.some(
			pl => pl.user === store.appState.username,
		);
		store.doNav(import('./views/Match.jsx'), {
			gameid: data.id,
			game: new Game({ ...data.data, spectate }),
		});
	},
	lobbyinvite(data) {
		store.chat(() => (
			<div
				style="cursor:pointer;color:#69f"
				onClick={() => userEmit('lobbyaccept', { id: data.id })}>
				{`${data.f} invites you to ${data.spectate ? 'spectate' : 'join'} a lobby!`}
			</div>
		));
	},
	challenge(data) {
		store.chat(() => (
			<div
				style="cursor:pointer;color:#69f"
				onClick={() => {
					sendChallenge(data.f, data.set, data.deckcheck);
				}}>
				{`${data.f} offers to duel you!`}
				{data.set && <i> (in Legacy mode)</i>}
				{!data.deckcheck && <i> (without deck checks)</i>}
			</div>
		));
		userEmit('challrecv', { f: data.f });
	},
	offertrade(data) {
		let flagstr;
		if (data.flags && data.flags.length) {
			for (const p of presets) {
				if (p[1].length === data.flags.length) {
					if (data.flags.every(f => p[1].includes(f))) {
						flagstr = p[0];
						break;
					}
				}
			}
			flagstr ??= data.flags.sort().join(' ');
		}
		store.chat(() => (
			<div
				style="cursor:pointer;color:#69f"
				onClick={() => {
					const flags = store.appState.user.flags;
					const matches =
						!data.flags ||
						(!flags && !data.flags.length) ||
						(flags &&
							data.flags.length === flags.length &&
							data.flags.every(f => flags.includes(f)));
					if (matches) {
						store.doNav(import('./views/Trade.jsx'), { foe: data.f });
					} else {
						store.chatMsg('Incorrect alt flags', 'System');
					}
				}}>
				{`${data.f} offers to trade with you${
					data.flags && data.flags.length ? ' using ' + flagstr : ''
				}!`}
			</div>
		));
		userEmit('challrecv', { f: data.f, trade: true });
	},
	bzgive(data) {
		store.userCmd(data.g ? 'addgold' : 'addcards', data);
		store.chatMsg(data.msg, 'System');
	},
	addpools(data) {
		if (data.c) store.userCmd('addcards', { c: data.c });
		if (data.b) store.userCmd('addcards', { c: data.b, bound: true });
		store.chatMsg(data.msg, 'System');
	},
};
socket.onmessage = function (msg) {
	const data = JSON.parse(msg.data);
	if (data.u && store.appState.muted[data.u]) return;
	const func = findCmd(data.x);
	if (func) func.call(this, data);
};
socket.onopen = function () {
	attempts = 0;
	if (attemptTimeout) {
		clearTimeout(attemptTimeout);
		attemptTimeout = 0;
	}
	if (store.appState.opts.offline || store.appState.opts.afk) {
		emit({
			x: 'chatus',
			hide: !!store.appState.opts.offline,
			afk: !!store.appState.opts.afk,
		});
	}
	// flush anything queued while down before asking the server to catch us up
	buffer.forEach(this.send, this);
	buffer.length = 0;
	if (store.appState.username) {
		// server routes to whichever socket last authed, so rebind this one
		userEmit('hello');
		for (const c of cmdstack) c.reconnect?.();
	}
	store.chatMsg('Connected', 'System');
};
socket.onclose = function () {
	if (attemptTimeout) return;
	const timeout = 99 + ((99 * Math.random()) | 0) * attempts;
	if (attempts < 8) attempts++;
	attemptTimeout = setTimeout(() => {
		attemptTimeout = 0;
		const oldsock = socket;
		socket = new WebSocket(endpoint);
		socket.onopen = oldsock.onopen;
		socket.onclose = oldsock.onclose;
		socket.onmessage = oldsock.onmessage;
	}, timeout);
	store.chatMsg(`Reconnecting in ${timeout}ms`, 'System');
};
const emptyBlob = new Blob();
setInterval(function () {
	socket.send(emptyBlob);
}, 50003);
export function emit(data) {
	const msg = JSON.stringify(data);
	if (socket?.readyState === 1) {
		socket.send(msg);
	} else {
		buffer.push(msg);
	}
}
export function userEmit(x, data = {}) {
	data.x = 'a';
	data.z = x;
	data.u = store.appState.username;
	data.a = store.appState.auth;
	if (store.appState.uname) data.uname = store.appState.uname;
	emit(data);
}
export function userExec(x, data = {}) {
	userEmit(x, data);
	store.userCmd(x, data);
}
export function sendChallenge(foe, orig = false, deckcheck = true) {
	const deck = orig ? store.appState.user.deck : store.getDeck();
	if (
		deckcheck &&
		!(orig ? OrigCards : Cards).isDeckLegal(
			decodedeck(deck),
			store.appState.user,
		)
	) {
		store.chatMsg('Invalid deck', 'System');
		return;
	}
	userEmit('foewant', {
		f: foe,
		deck: orig ? deck : undefined,
		set: orig ? 'Original' : undefined,
		deckcheck,
	});
}
export function useCmds(c) {
	onSettled(() => {
		cmdstack.push(c);
		return () => {
			const i = cmdstack.lastIndexOf(c);
			if (~i) cmdstack.splice(i, 1);
		};
	});
}
