const {connect} = require('react-redux'),
	React = require('react');

module.exports = connect(state => ({
	chat: state.chat,
}))(function Chat(props) {
	return <div className='chatBox' style={props.style}>
		{props.chat.get(props.channel)}
	</div>;
})
