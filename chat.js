'using strict';
module.exports = chat;
const store = require('./store'),
	React = require('react');
function addSpan(span, name) {
	store.store.dispatch(store.chat(span, name));
}
function chat(msg, fontcolor, name) {
	const span = document.createElement('div');
	if (name === undefined) {
		name = fontcolor;
		fontcolor = undefined;
	}
	span.appendChild(document.createTextNode(msg));
	addSpan(<div style={fontcolor && { color: fontcolor }}>{msg}</div>, name);
}
chat.addSpan = addSpan;
