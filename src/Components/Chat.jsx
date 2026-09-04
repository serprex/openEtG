import { For, createEffect, createRenderEffect } from 'solid-js';
import { useRx } from '../store.jsx';

export default function Chat(props) {
	const rx = useRx();
	let chat = null,
		scrollTop = null,
		prevChannel = props.channel;

	createRenderEffect(
		() => [rx.chat, props.channel],
		() => {
			scrollTop =
				(
					chat &&
					props.channel === prevChannel &&
					Math.abs(chat.scrollTop - chat.scrollHeight + chat.offsetHeight) >= 8
				) ?
					chat.scrollTop
				:	-1;
			prevChannel = props.channel;
		},
	);
	createEffect(
		() => [rx.chat, props.channel],
		() => {
			chat.scrollTop = ~scrollTop ? scrollTop : chat.scrollHeight;
		},
	);

	return (
		<div class="chatBox" style={props.style} ref={chat}>
			<For each={rx.chat.get(props.channel)}>{span => span()}</For>
		</div>
	);
}
