import config from '../wsconfig.json' assert { type: 'json' };

import Cards from './Cards.js';
import { decodedeck, fromTrueMark } from './etgutil.js';
import Game from './Game.js';
import * as store from './store.jsx';
import { arenaCost } from './userutil.js';
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
	pvp = null,
	cmds = {};
const sockEvents = {
	clear() {
		store.clearChat('Main');
	},
	passchange(data) {
		store.updateUser({ auth: data.auth });
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
		const state = store.state;
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
					const code = parseInt(reres[0].substr(i, 3), 32);
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
						data.guest
							? 'overflow:auto;font-style:italic;color:#ccc'
							: data.mode === 2
							? 'overflow:auto;color:#69f'
							: data.mode !== 1
							? 'overflow:auto;color:#ddd'
							: 'overflow:auto'
					}>
					{`${h < 10 ? '0' : ''}${h}${m < 10 ? '0' : ''}${m} `}
					{data.u && <b>{data.u + ' '}</b>}
					{text}
				</div>
			),
			data.mode === 1 ? store.state.opts.channel : 'Main',
		);
	},
	foearena(data) {
		const { user } = store.state;
		const game = new Game({
			players: shuffle([
				{
					idx: 1,
					name: user.name,
					user: user.name,
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
				const { user } = store.state;
				if (!Cards.isDeckLegal(decodedeck(store.getDeck()), user)) {
					store.chatMsg('Invalid deck', 'System');
					return;
				}
				const cost = arenaCost(data.lv);
				if (user.gold < cost) {
					store.chatMsg(`Requires ${cost}$`, 'System');
					return;
				}
				userEmit('foearena', { lv: data.lv });
			},
		});
		store.doNav(import('./views/Match.jsx'), { game });
	},
	pvpgive(data) {
		if (pvp) {
			pvp = null;
			const game = new Game(data.data);
			store.doNav(import('./views/Match.jsx'), {
				gameid: data.id,
				game,
			});
		}
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
		store.chat(() => (
			<div
				style="cursor:pointer;color:#69f"
				onClick={() =>
					store.doNav(import('./views/Trade.jsx'), { foe: data.f })
				}>
				{`${data.f} offers to trade with you!`}
			</div>
		));
		userEmit('challrecv', { f: data.f, trade: true });
	},
	bzgive(data) {
		store.userCmd(data.g ? 'addgold' : 'addcards', data);
		store.chatMsg(data.msg, 'System');
	},
	addpools(data) {
		store.userCmd('addcards', { c: data.c });
		store.userCmd('addboundcards', { c: data.b });
		store.chatMsg(data.msg, 'System');
	},
};
socket.onmessage = function (msg) {
	const data = JSON.parse(msg.data),
		state = store.state;
	if (data.u && state.muted.has(data.u)) return;
	const func = cmds[data.x] ?? sockEvents[data.x];
	if (func) func.call(this, data);
};
socket.onopen = function () {
	attempts = 0;
	if (attemptTimeout) {
		clearTimeout(attemptTimeout);
		attemptTimeout = 0;
	}
	const { opts } = store.state;
	if (opts.offline || opts.afk) {
		emit({
			x: 'chatus',
			hide: !!opts.offline,
			afk: !!opts.afk,
		});
	}
	buffer.forEach(this.send, this);
	buffer.length = 0;
	store.chatMsg('Connected', 'System');
};
socket.onclose = function () {
	if (attemptTimeout) return;
	if (attempts < 8) attempts++;
	const timeout = 99 + ((99 * Math.random()) | 0) * attempts;
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
export function emit(data) {
	const msg = JSON.stringify(data);
	if (socket?.readyState === 1) {
		socket.send(msg);
	} else {
		buffer.push(msg);
	}
}
export function userEmit(x, data = {}) {
	const { user } = store.state;
	data.x = 'a';
	data.z = x;
	data.u = user.name;
	data.a = user.auth;
	emit(data);
}
export function userExec(x, data = {}) {
	userEmit(x, data);
	store.userCmd(x, data);
}
export function sendChallenge(foe, orig = false, deckcheck = true) {
	const deck = orig ? store.state.orig.deck : store.getDeck(),
		state = store.state;
	if (
		deckcheck &&
		!(orig ? OrigCards : Cards).isDeckLegal(
			decodedeck(deck),
			orig ? state.orig : state.user,
		)
	) {
		store.chatMsg('Invalid deck', 'System');
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
export function setCmds(c) {
	cmds = c;
}
