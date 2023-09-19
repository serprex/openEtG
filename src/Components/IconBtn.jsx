import { playSound } from '../audio.js';

export default function IconBtn(props) {
	return (
		<span
			class={'imgb ico ' + props.e}
			style={`position:absolute;left:${props.x}px;top:${props.y}px`}
			onClick={e => {
				playSound('click');
				if (props.click) props.click.call(e.target, e);
			}}
			onMouseOver={props.onMouseOver}
		/>
	);
}
