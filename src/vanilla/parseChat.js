import * as sock from './sock.js';
import * as store from './store.js';

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
	const kc = e.which || e.keyCode;
	if (kc == 13) {
		e.preventDefault();
		let chatinput = e.target,
			msg = chatinput.value.trim();
		chatinput.value = '';
		if (msg == '/help') {
			const cmds = {
				clear: 'Clear chat',
				roll: 'Server rolls XdY publicly',
				mute: 'If no user specified, mute chat entirely',
				unmute: 'If no user specified, unmute chat entirely',
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
			sock.emit('who');
		} else if (msg.match(/^\/roll( |$)\d*d?\d*$/)) {
			const data = { u: '' };
			const ndn = msg.slice(6).split('d');
			if (!ndn[1]) {
				data.X = +ndn[0] || 0x100000000;
			} else {
				data.A = +ndn[0];
				data.X = +ndn[1];
			}
			sock.emit('roll', data);
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
			sock.emit(msg.slice(1));
		} else if (!msg.match(/^\/[^/]/)) {
			msg = msg.replace(/^\/\//, '/');
			const name =
				store.store.getState().opts.username ||
				guestname ||
				(guestname = 10000 + ((Math.random() * 89999) | 0) + '');
			if (!msg.match(/^\s*$/)) sock.emit('guestchat', { msg: msg, u: name });
		} else store.store.dispatch(store.chatMsg('Not a command: ' + msg));
	}
}
