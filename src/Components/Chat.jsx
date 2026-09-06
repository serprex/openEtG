import { For, createEffect, createRenderEffect } from 'solid-js';
import { appState } from '../store.jsx';

export default function Chat(props) {
	let chat = null,
		scrollTop = null,
		prevChannel = props.channel;

	createRenderEffect(
		() => [appState.chat[props.channel]?.length, props.channel],
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
		() => [appState.chat[props.channel]?.length, props.channel],
		() => {
			chat.scrollTop = ~scrollTop ? scrollTop : chat.scrollHeight;
		},
	);

	return (
		<div class="chatBox" style={props.style} ref={chat}>
			<For each={appState.chat[props.channel]}>{span => span()}</For>
		</div>
	);
}
