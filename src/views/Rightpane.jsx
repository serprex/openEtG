import { useSelector } from 'react-redux';

import Chat from '../Components/Chat.jsx';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import parseChat from '../parseChat.js';

function ChannelTab(props) {
	const channel = useSelector(({ opts }) => opts.channel);
	const className = channel === props.channel ? 'tabsel' : 'tab';

	return (
		<span
			className={className}
			onClick={e =>
				store.store.dispatch(store.setOptTemp('channel', props.channel))
			}>
			{props.channel}
		</span>
	);
}
const channelTabs = (
	<div>
		<ChannelTab channel="Main" />
		<ChannelTab channel="System" />
		<ChannelTab channel="Stats" />
		<ChannelTab channel="Packs" />
		<ChannelTab channel="Replay" />
	</div>
);

export default function Rightpane(props) {
	const offline = useSelector(({ opts }) => opts.offline);
	const afk = useSelector(({ opts }) => opts.afk);
	const showRightpane = !useSelector(({ opts }) => opts.hideRightpane);
	const channel = useSelector(({ opts }) => opts.channel);

	return (
		showRightpane && (
			<>
				<div style={{ marginBottom: '8px' }}>
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
				<label>
					<input
						type="checkbox"
						checked={offline}
						onChange={e => {
							sock.emit({ x: 'chatus', hide: e.target.checked });
							store.store.dispatch(store.setOpt('offline', e.target.checked));
						}}
					/>
					Appear Offline
				</label>{' '}
				<label>
					<input
						type="checkbox"
						checked={afk}
						onChange={e => {
							sock.emit({ x: 'chatus', afk: e.target.checked });
							store.store.dispatch(store.setOptTemp('afk', e.target.checked));
						}}
					/>
					Afk
				</label>
				{channelTabs}
				<Chat channel={channel} />
				<textarea
					className="chatinput"
					placeholder="Chat"
					onKeyPress={parseChat}
				/>
			</>
		)
	);
}