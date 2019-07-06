import React from 'react';
import { connect } from 'react-redux';

import Chat from '../../Components/Chat.js';
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

function parseInput(data, key, val) {
	if (!Number.isNaN(val)) {
		data[key] = val;
	}
}

export default connect(state => ({
	channel: state.opts.channel,
	username: state.opts.username,
	room: state.opts.room,
	pvphp: state.opts.pvphp,
	pvpmark: state.opts.pvpmark,
	pvpdeck: state.opts.pvpdeck,
	pvpdraw: state.opts.pvpdraw,
}))(function Rightpane(props) {
	function challengeClick() {
		var deck = sock.getDeck();
		if (deck.length < 31) {
			return;
		}
		var gameData = {};
		parseInput(gameData, 'p1hp', +props.pvphp);
		parseInput(gameData, 'p1draw', +props.pvpdraw);
		parseInput(gameData, 'p1mark', +props.pvpmark);
		parseInput(gameData, 'p1deck', +props.pvpdeck);
		gameData.deck = deck;
		gameData.room = props.room;
		sock.emit('pvpwant', gameData);
	}

	return (
		<>
			<div style={{ marginBottom: '8px' }}>
				<a href="../artcredit.htm" target="_blank">
					Art credits
				</a>
				&emsp;&emsp;
				<a href="../forum/?board=2" target="_blank">
					Forum
				</a>
				&emsp;&emsp;
				<a href="https://discordapp.com/invite/qAmfB8T" target="_blank">
					Discord
				</a>
			</div>
			<div>
				<input
					type="text"
					placeholder="Challenge"
					value={props.room}
					onChange={e =>
						props.dispatch(store.setOptTemp('room', e.target.value))
					}
				/>
				<input
					className="numput"
					type="text"
					placeholder="HP"
					value={props.pvphp}
					onChange={e => store.setOptTemp('pvphp', e.target.value)}
				/>
				<input
					className="numput"
					type="text"
					placeholder="Mark"
					value={props.pvpmark}
					onChange={e =>
						props.dispatch(store.setOptTemp('pvpmark', e.target.value))
					}
				/>
				<input
					className="numput"
					type="text"
					placeholder="Deck"
					value={props.pvpdeck}
					onChange={e =>
						props.dispatch(store.setOptTemp('pvpdeck', e.target.value))
					}
				/>
				<input
					className="numput"
					type="text"
					placeholder="Draw"
					value={props.pvpdraw}
					onChange={e => props.dispatch('pvpdraw', e.target.value)}
				/>
			</div>
			<div>
				<input
					type="button"
					style={{ width: '40px' }}
					value="PvP"
					onClick={challengeClick}
				/>
				<input
					type="text"
					placeholder="Name"
					onChange={e =>
						props.dispatch(store.setOptTemp('username', e.target.value))
					}
					value={props.username}
				/>
			</div>
			<div>
				<ChannelTab channel="Main" />
				<ChannelTab channel="System" />
				<ChannelTab channel="Stats" />
			</div>
			<Chat channel={props.channel} />
			<textarea
				className="chatinput"
				placeholder="Chat"
				onKeyPress={parseChat}
			/>
		</>
	);
});
