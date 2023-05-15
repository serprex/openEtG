import { createRef, Component } from 'react';
import { connect } from 'react-redux';

export default connect((state, props) => ({
	chat: state.chat.get(props.channel),
}))(
	class Chat extends Component {
		chatRef = createRef();

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
					{this.props.chat}
				</div>
			);
		}
	},
);