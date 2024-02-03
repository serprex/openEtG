import * as sock from './sock.jsx';
import * as store from './store.jsx';

const guestname = `${(Math.random() * 89999 + 10000) | 0}`;
function chatmute(state) {
	store.chatMsg(
		`${
			state.opts.muteall ? 'You have chat muted. '
			: state.opts.muteguest ? 'You have guests muted. '
			: ''
		}Muted: ${Array.from(state.muted).join(', ')}`,
		'System',
	);
}
export default function parseChat(e) {
	e.cancelBubble = true;
	if (e.key === 'Enter') {
		e.preventDefault();
		const chatinput = e.target,
			msg = chatinput.value.trim(),
			storeState = store.state,
			{ user } = storeState;
		chatinput.value = '';
		if (msg === '/help') {
			const cmds = {
				clear: 'Clear chat',
				who: 'List users online',
				roll: 'Server rolls XdY publicly',
				mod: 'List mods',
				mute: 'If no user specified, mute chat entirely',
				unmute: 'If no user specified, unmute chat entirely',
				muteguest: 'Mute all guests',
				unmuteguest: 'Unmute all guests',
				importdeck: 'Save deckcode under deckname: /importdeck "deckname" deckcode',
				deleteme: 'Delete account',
				w: 'Whisper',
			};
			for (const cmd in cmds) {
				store.chatMsg(`${cmd} ${cmds[cmd]}`);
			}
		} else if (msg === '/clear') {
			store.clearChat(storeState.opts.channel);
		} else if (msg === '/who') {
			sock.emit({ x: 'who' });
		} else if (msg === '/deleteme') {
			if (storeState.opts.foename === storeState.username + 'yesdelete') {
				sock.userEmit('delete');
				store.logout();
				store.setOpt('remember', false);
				store.doNav(store.Login);
			} else {
				store.chatMsg(
					`Input '${storeState.username}yesdelete' into Player's Name to delete your account`,
					'System',
				);
			}
		} else if (user && msg.match(/^\/roll( |$)\d*d?\d*$/)) {
			const data = {};
			const ndn = msg.slice(6).split('d');
			if (!ndn[1]) {
				data.A = 1;
				data.X = ndn[0] >>> 0 || 0xffffffff;
			} else {
				data.A = ndn[0] >>> 0;
				data.X = ndn[1] >>> 0;
			}
			sock.userEmit('roll', data);
		} else if (msg === '/mute') {
			store.setOptTemp('muteall', true);
			chatmute(storeState);
		} else if (msg === '/unmute') {
			store.setOptTemp('muteall', false);
			chatmute(storeState);
		} else if (msg === '/muteguest') {
			store.setOptTemp('muteguest', true);
			chatmute(storeState);
		} else if (msg === '/unmuteguest') {
			store.setOptTemp('muteguest', false);
			chatmute(storeState);
		} else if (msg.match(/^\/mute /)) {
			store.mute(msg.slice(6));
			chatmute(storeState);
		} else if (msg.match(/^\/unmute /)) {
			store.unmute(msg.slice(8));
			chatmute(storeState);
		} else if (msg.match(/^\/(motd|mod|codesmith)$/)) {
			sock.emit({ x: msg.slice(1) });
		} else if (user && msg === '/modclear') {
			sock.userEmit('modclear');
		} else if (
			user &&
			msg.match(/^\/(mod(guest|mute|add|rm|motd|resetpass)|codesmith(add|rm)) /)
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
			store.setOptTemp('runcount', msg.slice(10) | 0);
			store.setOptTemp('runcountcur', 1);
			store.chatMsg(msg.slice(1), 'System');
		} else if (!msg.match(/^\/[^/]/) || (user && msg.match(/^\/w( |")/))) {
			if (!msg.match(/^\s*$/)) {
				const escapedmsg = msg.replace(/^\/\//, '/');
				if (user) {
					const data = { msg: escapedmsg };
					if (msg.match(/^\/w( |")/)) {
						const match = msg.match(/^\/w"([^"]*)"/);
						const to = (match && match[1]) || msg.slice(3, msg.indexOf(' ', 4));
						if (!to) return;
						chatinput.value = msg.slice(0, 4 + to.length);
						data.msg = msg.slice(4 + to.length);
						data.to = to;
					}
					sock.userEmit('chat', data);
				} else {
					sock.emit({
						x: 'guestchat',
						msg: escapedmsg,
						u: storeState.opts.username || guestname,
					});
				}
			}
		} else if (msg.match(/^\/importdeck "([^"]+)" ([a-zA-Z0-9]+)$/)) {
			const [deckname, deckcode] = msg.slice(13).split('" ');
			if (deckname === user.decks[deckname]) {
				store.chatMsg('Deck ' + deckname + ' already exists!', 'System');
				return
			}
			sock.userExec('setdeck', { d: deckcode, name: deckname });
			store.chatMsg('Saved ' + deckname + ': ' + deckcode, 'System');
		} else store.chatMsg('Not a command: ' + msg);
	}
}
