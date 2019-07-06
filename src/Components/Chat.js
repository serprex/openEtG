import React from 'react';
import { connect } from 'react-redux';

export default connect(state => ({
	chat: state.chat,
}))(
	class Chat extends React.PureComponent {
		constructor(props) {
			super(props);
			this.chatRef = React.createRef();
		}

		getSnapshotBeforeUpdate(prevProps, prevState) {
			const chat = this.chatRef.current;
			if (
				prevProps.channel !== this.props.channel ||
				Math.abs(chat.scrollTop - chat.scrollHeight + chat.offsetHeight) < 8
			) {
				return -1;
			}
			return chat.scrollTop;
		}

		componentDidUpdate(prevProps, prevState, snapshot) {
			const chat = this.chatRef.current;
			chat.scrollTop = ~snapshot ? snapshot : chat.scrollHeight;
		}

		componentDidMount() {
			const chat = this.chatRef.current;
			chat.scrollTop = chat.scrollHeight;
		}

		render() {
			return (
				<div className="chatBox" style={this.props.style} ref={this.chatRef}>
					{this.props.chat.get(this.props.channel)}
				</div>
			);
		}
	},
);
