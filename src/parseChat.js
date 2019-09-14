import React from 'react';

import * as etgutil from './etgutil.js';
import RngMock from './RngMock.js';
import * as sock from './sock.js';
import * as store from './store.js';

let guestname;
function chatmute() {
	const state = store.store.getState();
	store.store.dispatch(
		store.chatMsg(
			`${state.opts.muteall ? 'You have chat muted. ' : ''}Muted: ${Array.from(
				state.muted,
			).join(', ')}`,
			'System',
		),
	);
}
export default function parseChat(e) {
	e.cancelBubble = true;
	const kc = e.which || e.keyCode,
		{ user } = store.store.getState();
	if (kc == 13) {
		e.preventDefault();
		let chatinput = e.target,
			msg = chatinput.value.trim();
		chatinput.value = '';
		if (msg == '/help') {
			const cmds = {
				clear: 'Clear chat',
				who: 'List users online',
				roll: 'Server rolls XdY publicly',
				decks: 'List all decks. Accepts a regex filter',
				mod: 'List mods',
				mute: 'If no user specified, mute chat entirely',
				unmute: 'If no user specified, unmute chat entirely',
				deleteme: 'Delete account',
				w: 'Whisper',
			};
			for (const cmd in cmds) {
				store.store.dispatch(store.chatMsg(`${cmd} ${cmds[cmd]}`));
			}
		} else if (msg == '/clear') {
			store.store.dispatch(
				store.clearChat(store.store.getState().opts.channel),
			);
		} else if (msg == '/who') {
			sock.emit({ x: 'who' });
		} else if (msg == '/deleteme') {
			const { opts, user } = store.store.getState();
			if (opts.foename == user.name + 'yesdelete') {
				sock.userEmit('delete');
				store.store.dispatch(store.setUser(null));
				store.store.dispatch(store.setOpt('remember', false));
				store.store.dispatch(store.doNav(import('./views/Login.js')));
			} else {
				store.store.dispatch(
					store.chatMsg(
						`Input '${user.name}yesdelete' into Trade/Library to delete your account`,
						'System',
					),
				);
			}
		} else if (msg === '/vanilla') {
			store.store.dispatch(store.doNav(import('./vanilla/views/Editor.js')));
		} else if (msg === '/importaccount') {
			store.store.dispatch(store.doNav(import('./views/ImportAccount.js')));
		} else if (msg.match(/^\/roll( |$)\d*d?\d*$/)) {
			const data = { u: user ? user.name : '' };
			const ndn = msg.slice(6).split('d');
			if (!ndn[1]) {
				data.X = +ndn[0] || 0x100000000;
			} else {
				data.A = +ndn[0];
				data.X = +ndn[1];
			}
			sock.emit({ ...data, x: 'roll' });
		} else if (msg.match(/^\/decks/) && user) {
			let names = Object.keys(user.decks);
			try {
				const rx = msg.length > 7 && new RegExp(msg.slice(7));
				if (rx) {
					names = names.filter(name => name.match(rx));
				}
			} catch (_e) {}
			store.store.dispatch(
				store.chat(
					names.sort().map(name => {
						const deck = user.decks[name];
						return (
							<div>
								<a
									href={`deck/${deck}`}
									target="_blank"
									className={
										'ico ce' +
										etgutil.fromTrueMark(parseInt(deck.slice(-3), 32))
									}
								/>
								<span
									onClick={e => {
										sock.userExec('setdeck', { name });
										store.store.dispatch(store.setOptTemp('deck', deck));
									}}>
									{name}
								</span>
							</div>
						);
					}),
				),
			);
		} else if (msg == '/mute') {
			store.store.dispatch(store.setOptTemp('muteall', true));
			chatmute();
		} else if (msg == '/unmute') {
			store.store.dispatch(store.setOptTemp('muteall', false));
			chatmute();
		} else if (msg.match(/^\/mute /)) {
			store.store.dispatch(store.mute(msg.slice(6)));
			chatmute();
		} else if (msg.match(/^\/unmute /)) {
			store.store.dispatch(store.unmute(msg.slice(8)));
			chatmute();
		} else if (msg.match(/^\/(motd|mod|codesmith)$/)) {
			sock.emit({ x: msg.slice(1) });
		} else if (user && msg == '/modclear') {
			sock.userEmit({ x: 'modclear' });
		} else if (
			user &&
			msg.match(/^\/(mod(guest|mute|add|rm|motd)|codesmith(add|rm)) /)
		) {
			const sp = msg.indexOf(' ');
			sock.userEmit(msg.slice(1, sp), { m: msg.slice(sp + 1) });
		} else if (msg.match(/^\/code /)) {
			sock.userEmit('codecreate', { t: msg.slice(6) });
		} else if (msg.match(/^\/setgold /)) {
			const [t, g] = msg.slice(9).split(' ');
			sock.userEmit('setgold', { t, g: g | 0 });
		} else if (msg.match(/^\/runcount /)) {
			store.store.dispatch(store.setOptTemp('runcount', msg.slice(10) | 0));
			store.store.dispatch(store.setOptTemp('runcountcur', 1));
			store.store.dispatch(store.chatMsg(msg.slice(1), 'System'));
		} else if (!msg.match(/^\/[^/]/) || (user && msg.match(/^\/w( |")/))) {
			msg = msg.replace(/^\/\//, '/');
			if (user) {
				const data = { msg: msg };
				if (msg.match(/^\/w( |")/)) {
					const match = msg.match(/^\/w"([^"]*)"/);
					const to = (match && match[1]) || msg.slice(3, msg.indexOf(' ', 4));
					if (!to) return;
					chatinput.value = msg.slice(0, 4 + to.length);
					data.msg = msg.slice(4 + to.length);
					data.to = to;
				}
				if (!data.msg.match(/^\s*$/)) sock.userEmit('chat', data);
			} else {
				const name =
					store.store.getState().opts.username ||
					guestname ||
					(guestname = 10000 + RngMock.upto(89999) + '');
				if (!msg.match(/^\s*$/))
					sock.emit({ x: 'guestchat', msg: msg, u: name });
			}
		} else store.store.dispatch(store.chatMsg('Not a command: ' + msg));
	}
}
