import { doNav } from '../store.jsx';

export default function ExitBtn(props) {
	return (
		<input
			type="button"
			value="Exit"
			onClick={() => doNav(import('../views/MainMenu.jsx'))}
			style={`position:absolute;left:${props.x}px;top:${props.y}px`}
		/>
	);
}
