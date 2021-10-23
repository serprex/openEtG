import config from '../wsconfig.json';

import Cards from './Cards.js';
import * as etgutil from './etgutil.js';
import Game from './Game.js';
import * as store from './store.jsx';
import * as userutil from './userutil.js';
import { shuffle } from './util.js';
import OrigCards from './vanilla/Cards.js';

const endpoint = `${location.protocol === 'http:' ? 'ws://' : 'wss://'}
	${location.hostname}:${
	location.protocol === 'http:' ? config.wsport : config.wssport
}/ws`;
const buffer = [];
let socket = new WebSocket(endpoint),
	attempts = 0,
	attemptTimeout = 0,
	pvp = null;
const guestStyle = {
	overflow: 'auto',
	fontStyle: 'italic',
	color: '#ccc',
};
const mode2Style = {
	overflow: 'auto',
	color: '#69f',
};
const chatStyle = {
	overflow: 'auto',
	color: '#ddd',
};
const defaultStyle = {
	overflow: 'auto',
};
const sockEvents = {
	clear() {
		store.store.dispatch(store.clearChat('Main'));
	},
	passchange(data) {
		store.store.dispatch(store.updateUser({ auth: data.auth }));
		store.store.dispatch(store.chatMsg('Password updated', 'System'));
	},
	mute(data) {
		store.store.dispatch(store.mute(data.m));
		store.store.dispatch(store.chatMsg(data.m + ' has been muted', 'System'));
	},
	roll(data) {
		store.store.dispatch(
			store.chat(
				<div style={{ color: '#090' }}>
					{data.u && <b>{data.u} </b>}
					{data.A || 1}d{data.X}{' '}
					<a href={`speed/${data.sum}`} target="_blank">
						{data.sum}
					</a>
				</div>,
				'Main',
			),
		);
	},
	chat(data) {
		const state = store.store.getState();
		if (state.opts.muteall) {
			if (!data.mode) return;
		} else if (state.opts.muteguests && data.guest) {
			return;
		} else if (
			typeof Notification !== 'undefined' &&
			Notification.permission !== 'denied' &&
			state.user &&
			~data.msg.indexOf(state.user.name) &&
			!document.hasFocus()
		) {
			Notification.requestPermission().then(result => {
				if (result === 'granted') new Notification(data.u, { body: data.msg });
			});
		}
		const now = new Date(),
			h = now.getHours(),
			m = now.getMinutes(),
			hs = h < 10 ? '0' + h : h.toString(),
			ms = m < 10 ? '0' + m : m.toString(),
			text = [];
		let decklink = /\b(([01][0-9a-v]{4})+)\b/g,
			reres,
			lastindex = 0;
		while ((reres = decklink.exec(data.msg))) {
			if (reres.index !== lastindex)
				text.push(data.msg.slice(lastindex, reres.index));
			let notlink = false;
			for (let i = 2; i < reres[0].length; i += 5) {
				const code = parseInt(reres[0].substr(i, 3), 32);
				if (
					!Cards.Codes[code] &&
					!OrigCards.Codes[code] &&
					etgutil.fromTrueMark(code) === -1
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
		store.store.dispatch(
			store.chat(
				<div
					style={
						data.guest
							? guestStyle
							: data.mode === 2
							? mode2Style
							: data.mode !== 1
							? chatStyle
							: defaultStyle
					}>
					{`${hs}${ms} `}
					{data.u && <b>{data.u} </b>}
					{text}
				</div>,
				data.mode === 1 ? null : 'Main',
			),
		);
	},
	foearena(data) {
		const { user } = store.store.getState();
		const game = new Game({
			players: shuffle([
				{
					idx: 1,
					name: user.name,
					user: user.name,
					deck: getDeck(),
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
			cost: userutil.arenaCost(data.lv),
			rematch: () => {
				const { user } = store.store.getState();
				if (!Cards.isDeckLegal(etgutil.decodedeck(getDeck()), user)) {
					store.store.dispatch(store.chatMsg(`Invalid deck`, 'System'));
					return;
				}
				const cost = userutil.arenaCost(data.lv);
				if (user.gold < cost) {
					store.store.dispatch(store.chatMsg(`Requires ${cost}$`, 'System'));
					return;
				}
				userEmit('foearena', { lv: data.lv });
			},
		});
		store.store.dispatch(store.doNav(import('./views/Match.jsx'), { game }));
	},
	pvpgive(data) {
		if (pvp) {
			pvp = null;
			const game = new Game(data.data);
			store.store.dispatch(
				store.doNav(import('./views/Match.jsx'), {
					gameid: data.id,
					game,
				}),
			);
		}
	},
	challenge(data) {
		store.store.dispatch(
			store.chat(
				<div
					style={{ cursor: 'pointer', color: '#69f' }}
					onClick={() => {
						sendChallenge(data.f, data.set, data.deckcheck);
					}}>
					{`${data.f} offers to duel you!`}
					{data.set && <i> (in Legacy mode)</i>}
					{!data.deckcheck && <i> (without deck checks)</i>}
				</div>,
			),
		);
		userEmit('challrecv', { f: data.f });
	},
	offertrade(data) {
		store.store.dispatch(
			store.chat(
				<div
					style={{ cursor: 'pointer', color: '#69f' }}
					onClick={() =>
						store.store.dispatch(
							store.doNav(import('./views/Trade.jsx'), { foe: data.f }),
						)
					}>
					{`${data.f} offers to trade with you!`}
				</div>,
			),
		);
		userEmit('challrecv', { f: data.f, trade: true });
	},
	bzgive(data) {
		store.store.dispatch(store.userCmd(data.g ? 'addgold' : 'addcards', data));
		store.store.dispatch(store.chatMsg(data.msg, 'System'));
	},
	addpools(data) {
		store.store.dispatch(store.userCmd('addcards', { c: data.c }));
		store.store.dispatch(store.userCmd('addboundcards', { c: data.b }));
		store.store.dispatch(store.chatMsg(data.msg, 'System'));
	},
};
socket.onmessage = function (msg) {
	const data = JSON.parse(msg.data),
		state = store.store.getState();
	if (data.u && state.muted.has(data.u)) return;
	const func = state.cmds[data.x] ?? sockEvents[data.x];
	if (func) func.call(this, data);
};
socket.onopen = function () {
	attempts = 0;
	if (attemptTimeout) {
		clearTimeout(attemptTimeout);
		attemptTimeout = 0;
	}
	const { opts } = store.store.getState();
	if (opts.offline || opts.afk) {
		emit({
			x: 'chatus',
			hide: !!opts.offline,
			afk: !!opts.afk,
		});
	}
	buffer.forEach(this.send, this);
	buffer.length = 0;
	store.store.dispatch(store.chatMsg('Connected', 'System'));
};
socket.onclose = function () {
	if (attemptTimeout) return;
	if (attempts < 8) attempts++;
	const timeout = 99 + Math.floor(99 * Math.random()) * attempts;
	attemptTimeout = setTimeout(() => {
		attemptTimeout = 0;
		const oldsock = socket;
		socket = new WebSocket(endpoint);
		socket.onopen = oldsock.onopen;
		socket.onclose = oldsock.onclose;
		socket.onmessage = oldsock.onmessage;
	}, timeout);
	store.store.dispatch(store.chatMsg(`Reconnecting in ${timeout}ms`, 'System'));
};
export function emit(data) {
	const msg = JSON.stringify(data);
	if (socket?.readyState === 1) {
		socket.send(msg);
	} else {
		buffer.push(msg);
	}
}
export function userEmit(x, data = {}) {
	const { user } = store.store.getState();
	data.x = x;
	data.u = user.name;
	data.a = user.auth;
	emit(data);
}
export function userExec(x, data = {}) {
	userEmit(x, data);
	store.store.dispatch(store.userCmd(x, data));
}
export function getDeck() {
	const state = store.store.getState();
	return state.user.decks[state.user.selectedDeck] ?? '';
}
export function getOrigDeck() {
	const state = store.store.getState();
	return state.orig.deck;
}
export function sendChallenge(foe, orig = false, deckcheck = true) {
	const deck = orig ? getOrigDeck() : getDeck(),
		state = store.store.getState();
	if (
		deckcheck &&
		!(orig ? OrigCards : Cards).isDeckLegal(
			etgutil.decodedeck(deck),
			orig ? state.orig : state.user,
		)
	) {
		store.store.dispatch(store.chatMsg(`Invalid deck`, 'System'));
		return;
	}
	const msg = {
		f: foe,
		deck: orig ? deck : undefined,
		set: orig ? 'Original' : undefined,
		deckcheck,
	};
	userEmit(orig ? 'foewant' : 'foewant', msg);
	pvp = foe;
}
