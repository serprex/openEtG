import React from 'react';
import { connect } from 'react-redux';

import Chat from '../Components/Chat.js';
import * as sock from '../sock.js';
import * as store from '../store.js';
import parseChat from '../parseChat.js';

const ChannelTab = connect(({ opts }) => ({ selected: opts.channel }))(
	function ChannelTab(props) {
		return (
			<span
				className={props.selected == props.channel ? 'tabsel' : 'tab'}
				onClick={e =>
					props.dispatch(store.setOptTemp('channel', props.channel))
				}>
				{props.channel}
			</span>
		);
	},
);

export default connect(state => ({
	wantpvp: state.opts.wantpvp,
	offline: state.opts.offline,
	afk: state.opts.afk,
	showRightpane: !state.opts.hideRightpane,
	channel: state.opts.channel,
}))(function Rightpane(props) {
	return (
		props.showRightpane && (
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
					<a href="https://discordapp.com/invite/qAmfB8T" target="_blank">
						Discord
					</a>
				</div>
				<label>
					<input
						type="checkbox"
						checked={props.offline}
						onChange={e => {
							sock.emit({ x: 'chatus', hide: e.target.checked });
							props.dispatch(store.setOpt('offline', e.target.checked));
						}}
					/>
					Appear Offline
				</label>{' '}
				<label>
					<input
						type="checkbox"
						checked={props.afk}
						onChange={e => {
							sock.emit({ x: 'chatus', afk: e.target.checked });
							props.dispatch(store.setOptTemp('afk', e.target.checked));
						}}
					/>
					Afk
				</label>{' '}
				<label>
					<input
						type="checkbox"
						checked={props.wantpvp}
						onChange={e => {
							sock.emit({ x: 'chatus', want: e.target.checked });
							props.dispatch(store.setOpt('wantpvp', e.target.checked));
						}}
					/>
					Seeking PvP
				</label>
				<div>
					<ChannelTab channel="Main" />
					<ChannelTab channel="System" />
					<ChannelTab channel="Stats" />
					<ChannelTab channel="Packs" />
					<ChannelTab channel="Replay" />
				</div>
				<Chat channel={props.channel} />
				<textarea
					className="chatinput"
					placeholder="Chat"
					onKeyPress={parseChat}
				/>
			</>
		)
	);
});
