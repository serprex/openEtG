import { Show } from 'solid-js';

import Chat from '../Components/Chat.jsx';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import parseChat from '../parseChat.js';

function ChannelTab(props) {
	const opts = store.useRx(state => state.opts);

	return (
		<span
			class={opts.channel === props.channel ? 'tab selected' : 'tab'}
			onClick={_e => store.setOptTemp('channel', props.channel)}>
			{props.channel}
		</span>
	);
}

export default function Rightpane() {
	const opts = store.useRx(state => state.opts);

	return (
		<Show when={!opts.hideRightpane}>
			<div style="display:flex;margin-bottom:4px;justify-content:space-evenly">
				<a href="artcredit.htm" target="_blank">
					Art credits
				</a>
				&emsp;&emsp;
				<a href="forum" target="_blank">
					Forum
				</a>
				&emsp;&emsp;
				<a
					href="https://discordapp.com/invite/qAmfB8T"
					target="_blank"
					rel="noopener">
					Discord
				</a>
			</div>
			<div style="display:flex;margin-bottom:4px;justify-content:space-evenly">
				<label>
					<input
						type="checkbox"
						checked={opts.offline}
						onChange={e => {
							sock.emit({ x: 'chatus', hide: e.target.checked });
							store.setOpt('offline', e.target.checked);
						}}
					/>
					Appear Offline
				</label>
				<label>
					<input
						type="checkbox"
						checked={opts.afk}
						onChange={e => {
							sock.emit({ x: 'chatus', afk: e.target.checked });
							store.setOptTemp('afk', e.target.checked);
						}}
					/>
					Afk
				</label>
			</div>
			<div style="display:flex;justify-content:space-evenly">
				<ChannelTab channel="Main" />
				<ChannelTab channel="System" />
				<ChannelTab channel="Stats" />
				<ChannelTab channel="Replay" />
			</div>
			<Chat channel={opts.channel} />
			<textarea class="chatinput" placeholder="Chat" onKeyDown={parseChat} />
		</Show>
	);
}
