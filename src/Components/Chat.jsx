import { createComputed, createEffect } from 'solid-js';
import { For } from 'solid-js/web';
import { useRx } from '../store.jsx';

export default function Chat(props) {
	const rx = useRx();
	let chat = null,
		scrollTop = null;

	createComputed(channel => {
		rx.chat;
		scrollTop =
			(
				chat &&
				props.channel === channel &&
				Math.abs(chat.scrollTop - chat.scrollHeight + chat.offsetHeight) >= 8
			) ?
				chat.scrollTop
			:	-1;
		return props.channel;
	}, props.channel);
	createEffect(() => {
		rx.chat;
		props.channel;
		chat.scrollTop = ~scrollTop ? scrollTop : chat.scrollHeight;
	});

	return (
		<div class="chatBox" style={props.style} ref={chat}>
			<For each={rx.chat.get(props.channel)}>{span => span()}</For>
		</div>
	);
}
