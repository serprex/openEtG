import { Repeat, createSignal } from 'solid-js';

import * as sock from '../../sock.jsx';
import * as store from '../../store.jsx';
import { eleNames } from '../../ui.js';

function EleSelect(props) {
	return (
		<>
			<Repeat count={13} from={1}>
				{i => (
					<span
						class={`imgb ico e${i}`}
						style={`position:absolute;left:12px;top:${24 + (i - 1) * 40}px`}
						onClick={() => {
							sock.userEmit('initoriginal', {
								e: i === 13 ? (Math.random() * 12 + 1) | 0 : i,
								name: props.name,
							});
						}}>
						<span style="position:absolute;left:48px;top:6px;width:144px">
							{i === 13 ? 'Random' : eleNames[i]}
						</span>
					</span>
				)}
			</Repeat>
		</>
	);
}

function NameSelect(props) {
	let newname;
	return (
		<>
			<For each={Object.keys(store.appState.legacy).sort()}>
				{name => (
					<div
						style="margin:8px"
						onClick={() => {
							store.setLegacy(name);
							store.doNav(import('./MainMenu.jsx'));
						}}>
						{name}
					</div>
				)}
			</For>
			<div>
				<input placeholder="Name" ref={newname} />
				&emsp;
				<input
					type="button"
					value="Create"
					onClick={() => {
						props.setSelect(newname.value);
					}}
				/>
			</div>
		</>
	);
}

export default function OriginalLogin() {
	const [select, setSelect] = createSignal(null);

	sock.useCmds({
		originaldata: data => {
			store.addLegacy(data.name, data.data);
			store.setLegacy(data.name);
			store.doNav(import('./MainMenu.jsx'));
		},
	});

	return (
		<>
			{select() ?
				<EleSelect name={select()} />
			:	<NameSelect setSelect={setSelect} />}
			<input
				type="button"
				value="Exit"
				onClick={() => {
					store.doNav(import('../../views/MainMenu.jsx'));
				}}
				style="position:absolute;left:8px;top:570px"
			/>
		</>
	);
}
