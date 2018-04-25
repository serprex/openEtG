'using strict';
module.exports = chat;
const store = require('./store'),
	React = require('react');
function addSpan(span, name) {
	store.store.dispatch(store.chat(span, name));
}
function chat(msg, fontcolor, name) {
	if (name === undefined) {
		name = fontcolor;
		fontcolor = undefined;
	}
	addSpan(<div style={fontcolor && { color: fontcolor }}>{msg}</div>, name);
}
chat.addSpan = addSpan;
