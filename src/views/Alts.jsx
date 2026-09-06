import { Repeat, createMemo, createSignal } from 'solid-js';

import { eleNames, presets } from '../ui.js';
import { userEmit } from '../sock.jsx';
import * as store from '../store.jsx';

const flagNames = [
	'no-oracle',
	'no-quest',
	'no-shop',
	'no-up-pillar',
	'no-up-merge',
	'no-trade',
	'no-battle',
	'hardcore',
];

function Preset(props) {
	const selected = createMemo(() =>
		flagNames.every(key => !!props.checked[key] === props.flags.includes(key)),
	);
	const chked = {};
	for (const key of props.flags) {
		chked[key] = true;
	}
	return (
		<div style="display:flex;align-items:center">
			<input
				type="button"
				value={props.name}
				class={selected() ? 'selected' : ''}
				style="width:192px;margin-right:8px"
				onClick={[props.setChecked, chked]}
			/>
			<div style="width:360px">{props.description}</div>
		</div>
	);
}

function Flags(props) {
	for (const p of presets) {
		if (p[1].length === props.flags.length) {
			if (props.flags.every(f => p[1].includes(f))) {
				return <td>{p[0]}</td>;
			}
		}
	}
	return <td style="color:#ccb">{props.flags.slice().sort().join(' ')}</td>;
}

function AltCreator(props) {
	const [showCustom, setShowCustom] = createSignal(false);
	const [name, setName] = createSignal('');
	const [ele, setEle] = createSignal(0);
	const [checked, setChecked] = createSignal({ 'no-trade': true });

	return (
		<div
			class="bgbox"
			style="z-index:1;position:absolute;width:900px;height:600px">
			<div style="display:flex;flex-direction:column;justify-content:space-between;height:550px">
				{presets.map(preset => (
					<Preset
						name={preset[0]}
						flags={preset[1]}
						description={preset[2]}
						checked={checked()}
						setChecked={setChecked}
					/>
				))}
				<div>
					<input
						type="button"
						value="Custom"
						class={showCustom() ? 'selected' : ''}
						style="width:192px;margin-right:8px"
						onClick={() => setShowCustom(x => !x)}
					/>
					Configure custom restrictions. Trade limited to matching restrictions.
				</div>
			</div>
			{showCustom() && (
				<div style="position:absolute;left:600px;top:320px">
					{flagNames.map(name => (
						<label style="display:block">
							<input
								type="checkbox"
								checked={!!checked()[name]}
								onChange={e => {
									setChecked(checked => ({
										...checked,
										[name]: e.currentTarget.checked,
									}));
								}}
							/>
							{name}
						</label>
					))}
				</div>
			)}
			<Repeat count={14}>
				{idx => {
					const i = idx + 1;
					return (
						<span
							class={[
								'imgb',
								'ico',
								`e${
									i === 14 ? 13
									: i === 13 ? 14
									: i
								}`,
								{ selected: ele() === i },
							]}
							style={`position:absolute;left:${600 + (idx & 1) * 180}px;top:${
								40 + (idx >> 1) * 40
							}px`}
							onClick={[setEle, i]}>
							<span style="position:absolute;left:40px;top:6px;width:144px">
								{eleNames[i]}
							</span>
						</span>
					);
				}}
			</Repeat>
			<div style="position:absolute;left:8px;top:572px">
				<input
					type="input"
					placeholder="Alt Name"
					value={name()}
					onInput={e => setName(e.target.value)}
				/>
				<input
					type="button"
					value="Create"
					style="margin-left:8px;margin-right:8px"
					disabled={!name() || !ele()}
					onClick={() => {
						const uflags = flagNames.filter(key => checked()[key]);
						userEmit('altcreate', {
							name: name(),
							flags: uflags,
							e: ele() === 14 ? (Math.random() * 12 + 1) | 0 : ele(),
						});
						props.hide();
					}}
				/>
				{(!name() || !ele()) && 'Must enter name & select element'}
			</div>
			<input
				type="button"
				value="Cancel"
				style="position:absolute;left:800px;top:576px"
				onClick={props.hide}
			/>
		</div>
	);
}

function chooseAlt(alt) {
	store.setAlt(alt);
	store.doNav(import('./MainMenu.jsx'));
}

export default function Alts() {
	let yesdelete;
	const [viewCreator, setViewCreator] = createSignal(false);
	const [viewDeletor, setViewDeletor] = createSignal(null);
	const [selected, setSelected] = createSignal(store.appState.uname);

	return (
		<>
			<input
				type="button"
				value="Exit"
				onClick={() => store.doNav(import('./MainMenu.jsx'))}
				style="position:absolute;left:800px;top:578px"
			/>
			{selected() !== store.appState.uname && (
				<input
					type="button"
					value="Select"
					style="position:absolute;left:5px;top:578px"
					onClick={[chooseAlt, selected()]}
				/>
			)}
			{selected() && selected() !== store.appState.uname && (
				<input
					type="button"
					value="Delete"
					style="position:absolute;left:300px;top:578px"
					onClick={[setViewDeletor, selected()]}
				/>
			)}
			<input
				type="button"
				value="Create"
				style="position:absolute;left:550px;top:578px"
				onClick={[setViewCreator, true]}
			/>
			{viewCreator() && <AltCreator hide={() => setViewCreator(false)} />}
			<div style="position:absolute;height:574px;width:900px;overflow-y:auto">
				<table style="width:100%">
					<thead>
						<tr>
							<th>Name</th>
							<th>Flags</th>
						</tr>
					</thead>
					<tbody>
						<tr
							class="btnrow"
							style={selected() ? '' : 'background-color:#456'}
							onClick={[setSelected, null]}
							onDblClick={[chooseAlt, null]}>
							<td>{store.appState.username}</td>
							<td style={`color:#${store.appState.uname ? 'ccb' : 'ed8'}`}>
								Main
							</td>
						</tr>
						<For each={Object.keys(store.appState.alts).sort()}>
							{name => {
								if (!name) return null;
								return (
									<tr
										class="btnrow"
										style={selected() === name ? 'background-color:#456' : ''}
										onClick={[setSelected, name]}
										onDblClick={[chooseAlt, name]}>
										<td
											style={`padding-top:4px;color:#${
												name === store.appState.uname ? 'ed8' : 'ccb'
											}`}>
											{name}
										</td>
										<Flags flags={store.appState.alts[name].flags} />
									</tr>
								);
							}}
						</For>
					</tbody>
				</table>
			</div>
			{viewDeletor() && (
				<div
					class="bgbox"
					style="z-index:2;position:absolute;left:200px;width:500px;top:100px;height:400px;display:flex;flex-direction:column;justify-content:space-evenly">
					<label style="align-self:center">
						<input type="checkbox" ref={yesdelete} /> Yes, delete{' '}
						{viewDeletor()}
					</label>
					<input
						type="button"
						value="Cancel"
						style="align-self:center"
						onClick={() => setViewDeletor(null)}
					/>
					<input
						type="button"
						value="Delete"
						style="align-self:center"
						onClick={() => {
							if (yesdelete.checked) {
								store.rmAlt(viewDeletor());
								userEmit('altdelete', { name: viewDeletor() });
								setViewDeletor(null);
							}
						}}
					/>
				</div>
			)}
		</>
	);
}
