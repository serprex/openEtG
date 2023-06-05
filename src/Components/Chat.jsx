import { useRef, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';

export default function Chat(props) {
	const chatRef = useRef(),
		chat = chatRef.current;
	const channelRef = useRef();

	const scrollTop =
		chat &&
		props.channel === channelRef.current &&
		Math.abs(chat.scrollTop - chat.scrollHeight + chat.offsetHeight) >= 8
			? chat.scrollTop
			: -1;
	channelRef.current = props.channel;

	useLayoutEffect(() => {
		chatRef.current.scrollTop = ~scrollTop
			? scrollTop
			: chatRef.current.scrollHeight;
	});

	return (
		<div className="chatBox" style={props.style} ref={chatRef}>
			{useSelector(({ chat }) => chat.get(props.channel))}
		</div>
	);
}