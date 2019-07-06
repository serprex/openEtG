import React from 'react';
import * as store from './store.js';

function addSpan(span, name) {
	store.store.dispatch(store.chat(span, name));
}
export default function chat(msg, fontcolor, name) {
	if (name === undefined) {
		name = fontcolor;
		fontcolor = undefined;
	}
	addSpan(<div style={fontcolor && { color: fontcolor }}>{msg}</div>, name);
}
chat.addSpan = addSpan;
