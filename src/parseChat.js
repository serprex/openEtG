import * as etgutil from './etgutil.js';
import * as sock from './sock.js';
import * as store from './store.js';

let guestname;
function chatmute() {
	const state = store.store.getState();
	store.store.dispatch(
		store.chatMsg(
			`${
				state.opts.muteall
					? 'You have chat muted. '
					: state.opts.muteguest
					? 'You have guests muted. '
					: ''
			}Muted: ${Array.from(state.muted).join(', ')}`,
			'System',
		),
	);
}
export default function parseChat(e) {
	e.cancelBubble = true;
	const kc = e.which || e.keyCode,
		{ user } = store.store.getState();
	if (kc === 13) {
		e.preventDefault();
		let chatinput = e.target,
			msg = chatinput.value.trim();
		chatinput.value = '';
		if (msg === '/help') {
			const cmds = {
				clear: 'Clear chat',
				who: 'List users online',
				roll: 'Server rolls XdY publicly',
				decks: 'List all decks. Accepts a regex filter',
				mod: 'List mods',
				mute: 'If no user specified, mute chat entirely',
				unmute: 'If no user specified, unmute chat entirely',
				muteguest: 'Mute all guests',
				unmuteguest: 'Unmute all guests',
				deleteme: 'Delete account',
				w: 'Whisper',
			};
			for (const cmd in cmds) {
				store.store.dispatch(store.chatMsg(`${cmd} ${cmds[cmd]}`));
			}
		} else if (msg === '/clear') {
			store.store.dispatch(
				store.clearChat(store.store.getState().opts.channel),
			);
		} else if (msg === '/who') {
			sock.emit({ x: 'who' });
		} else if (msg === '/deleteme') {
			const { opts, user } = store.store.getState();
			if (opts.foename === user.name + 'yesdelete') {
				sock.userEmit('delete');
				store.store.dispatch(store.setUser(null));
				store.store.dispatch(store.setOpt('remember', false));
				store.store.dispatch(store.doNav(import('./views/Login.js')));
			} else {
				store.store.dispatch(
					store.chatMsg(
						`Input '${user.name}yesdelete' into Player's Name to delete your account`,
						'System',
					),
				);
			}
		} else if (msg === '/vanilla') {
			store.store.dispatch(store.doNav(import('./vanilla/views/Editor.js')));
		} else if (msg.match(/^\/roll( |$)\d*d?\d*$/)) {
			const data = { u: user ? user.name : '' };
			const ndn = msg.slice(6).split('d');
			if (!ndn[1]) {
				data.A = 1;
				data.X = ndn[0] >>> 0 || 0xffffffff;
			} else {
				data.A = ndn[0] >>> 0;
				data.X = ndn[1] >>> 0;
			}
			sock.userEmit('roll', data);
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
									}}>
									{name}
								</span>
							</div>
						);
					}),
				),
			);
		} else if (msg === '/mute') {
			store.store.dispatch(store.setOptTemp('muteall', true));
			chatmute();
		} else if (msg === '/unmute') {
			store.store.dispatch(store.setOptTemp('muteall', false));
			chatmute();
		} else if (msg === '/muteguest') {
			store.store.dispatch(store.setOptTemp('muteguest', true));
			chatmute();
		} else if (msg === '/unmuteguest') {
			store.store.dispatch(store.setOptTemp('muteguest', false));
			chatmute();
		} else if (msg.match(/^\/mute /)) {
			store.store.dispatch(store.mute(msg.slice(6)));
			chatmute();
		} else if (msg.match(/^\/unmute /)) {
			store.store.dispatch(store.unmute(msg.slice(8)));
			chatmute();
		} else if (msg.match(/^\/(motd|mod|codesmith)$/)) {
			sock.emit({ x: msg.slice(1) });
		} else if (user && msg === '/modclear') {
			sock.userEmit('modclear');
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
		} else if (msg.match(/^\/addbound /)) {
			const [t, pool] = msg.slice(10).split(' ');
			sock.userEmit('addpool', { t, pool, bound: true });
		} else if (msg.match(/^\/addpool /)) {
			const [t, pool] = msg.slice(9).split(' ');
			sock.userEmit('addpool', { t, pool, bound: false });
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
					(guestname = `${(Math.random() * 89999 + 10000) | 0}`);
				if (!msg.match(/^\s*$/))
					sock.emit({ x: 'guestchat', msg: msg, u: name });
			}
		} else store.store.dispatch(store.chatMsg('Not a command: ' + msg));
	}
}
