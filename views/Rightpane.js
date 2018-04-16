const chat = require('../chat'),
	Chat = require('./Chat'),
	etgutil = require('../etgutil'),
	RngMock = require('../RngMock'),
	sock = require('../sock'),
	store = require('../store'),
	{connect} = require('react-redux'),
	React = require('react');
function chatmute() {
	const state = store.store.getState();
	chat(
		(state.opts.muteall ? 'You have chat muted. ' : '') +
			'Muted: ' +
			Array.from(state.muted).join(', '),
		'System',
	);
}
function maybeSendChat(e) {
	e.cancelBubble = true;
	const kc = e.which || e.keyCode;
	if (kc == 13) {
		e.preventDefault();
		let chatinput = e.target,
			msg = chatinput.value.trim();
		chatinput.value = '';
		if (msg == '/help') {
			const cmds = {
				clear: 'Clear chat. Accepts a regex filter',
				who: 'List users online',
				roll: 'Server rolls XdY publicly',
				decks: 'List all decks. Accepts a regex filter',
				mod: 'List mods',
				mute: 'If no user specified, mute chat entirely',
				unmute: 'If no user specified, unmute chat entirely',
				w: 'Whisper',
			};
			for (const cmd in cmds) {
				chat(cmd + ' ' + cmds[cmd]);
			}
		} else if (msg == '/clear') {
			store.store.dispatch(store.clearChat(store.store.getState().opts.channel));
		} else if (msg.match(/^\/clear /)) {
			const rx = new RegExp(msg.slice(7));
			const chatBox = document.getElementById('chatBox');
			for (let i = chatBox.children.length - 1; i >= 0; i--) {
				if (chatBox.children[i].textContent.match(rx))
					chatBox.removeChild(chatBox.children[i]);
			}
		} else if (msg == '/who') {
			sock.emit('who');
		} else if (msg.match(/^\/roll( |$)\d*d?\d*$/)) {
			const data = { u: sock.user ? sock.user.name : '' };
			const ndn = msg.slice(6).split('d');
			if (!ndn[1]) {
				data.X = parseInt(ndn[0] || 0x100000000);
			} else {
				data.A = parseInt(ndn[0]);
				data.X = parseInt(ndn[1]);
			}
			sock.emit('roll', data);
		} else if (msg.match(/^\/decks/) && sock.user) {
			const rx = msg.length > 7 && new RegExp(msg.slice(7));
			let names = Object.keys(sock.user.decks);
			if (rx) names = names.filter(name => name.match(rx));
			names.sort();
			names.forEach(name => {
				const deck = sock.user.decks[name];
				chat.addSpan(<div onClick={function(e) {
					if (e.target != this) return;
					store.store.dispatch(store.setOptTemp('selectedDeck', name));
					store.store.dispatch(store.setOptTemp('deckname', name));
					store.store.dispatch(store.setOpt('deck', deck));
				}}>
					<a href={`deck/${deck}`} target='_blank' className={'ico ce' + etgutil.fromTrueMark(parseInt(deck.slice(-3), 32))} />
					{name}
				</div>);
			});
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
		} else if (msg == '/mod') {
			sock.emit('mod');
		} else if (sock.user && msg == '/modclear') {
			sock.userEmit('modclear');
		} else if (sock.user && msg.match(/^\/mod(guest|mute|add|rm) /)) {
			const sp = msg.indexOf(' ');
			sock.userEmit(msg.slice(1, sp), { m: msg.slice(sp + 1) });
		} else if (msg.match(/^\/code /)) {
			sock.userEmit('codecreate', { t: msg.slice(6) });
		} else if (!msg.match(/^\/[^/]/) || (sock.user && msg.match(/^\/w( |")/))) {
			msg = msg.replace(/^\/\//, '/');
			if (sock.user) {
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
				if (!msg.match(/^\s*$/)) sock.emit('guestchat', { msg: msg, u: name });
			}
		} else chat('Not a command: ' + msg);
	}
}

module.exports = connect(state => ({
	wantpvp: state.opts.wantpvp,
	offline: state.opts.offline,
	afk: state.opts.afk,
	showRightpane: !state.opts.hideRightpane,
	channel: state.opts.channel,
}))(function Rightpane(props) {
	return props.showRightpane && <>
		<div style={{ marginBottom: '8px' }}>
			<a href="artcredit.htm" target="_blank">Art credits</a>&emsp;&emsp;<a href="forum" target="_blank">Forum</a>&emsp;&emsp;<a href="https://discordapp.com/invite/Ja4wrFm" target="_blank">Discord</a>
		</div>
		<label><input id="offline" type="checkbox" checked={props.offline}
			onChange={e => {
				sock.emit('chatus', { hide: e.target.checked });
				props.dispatch(store.setOpt('offline', e.target.checked))
			}} />
			Appear Offline</label>{' '}
		<label><input id="afk" type="checkbox" checked={props.afk}
			onChange={e => {
				sock.emit('chatus', { afk: e.target.checked });
				props.dispatch(store.setOptTemp('afk', e.target.checked))
			}} />
			Afk</label>{' '}
		<label><input id="wantpvp" type="checkbox" checked={props.wantpvp}
			onChange={e => {
				sock.emit('chatus', { want: e.target.checked });
				props.dispatch(store.setOpt('wantpvp', e.target.checked))
			}} />
			Seeking PvP</label>
		<div>
			<span className='tab' onClick={e => props.dispatch(store.setOptTemp('channel', 'Main'))}>Main </span>
			<span className='tab' onClick={e => props.dispatch(store.setOptTemp('channel', 'System'))}>System </span>
			<span className='tab' onClick={e => props.dispatch(store.setOptTemp('channel', 'Stats'))}>Stats </span>
			<span className='tab' onClick={e => props.dispatch(store.setOptTemp('channel', 'Packs'))}>Packs</span>
		</div>
		<Chat channel={props.channel} />
		<div id="chatBox" />
		<textarea id="chatinput" placeholder="Chat" onKeyPress={maybeSendChat} />
	</>;
});