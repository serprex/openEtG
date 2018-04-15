'using strict';
module.exports = chat;
const store = require('./store');
function addSpan(span, name) {
	store.store.dispatch(store.chat(span, name));
}
function chat(msg, fontcolor, name) {
	const span = document.createElement('div');
	if (name === undefined) name = fontcolor;
	else if (fontcolor) span.style.color = fontcolor;
	span.appendChild(document.createTextNode(msg));
	addSpan(span, name);
}
chat.addSpan = addSpan;
