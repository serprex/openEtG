import { createSignal, onMount } from 'solid-js';

import { eleNames } from '../ui.js';
import { emit, userEmit, setCmds } from '../sock.jsx';
import Card from '../Components/Card.jsx';
import * as store from '../store.jsx';
import { mkQuestAi, quarks } from '../Quest.js';
import Cards from '../Cards.js';

function Preview(props) {
	return (
		<>
			<Card x={168} y={48} card={Cards.Codes[props.codes[0]]} />
			<Card x={332} y={48} card={Cards.Codes[props.codes[1]]} />
			<Card x={168} y={324} card={Cards.Codes[props.codes[2]]} />
			<Card x={332} y={324} card={Cards.Codes[props.codes[3]]} />
			<Card x={496} y={324} card={Cards.Codes[props.codes[4]]} />
			<Card x={660} y={324} card={Cards.Codes[props.codes[5]]} />
		</>
	);
}

const descriptions = [
	() => <Preview codes={[5116, 5106, 5123, 5122, 5109, 5111]} />,
	() => <Preview codes={[5208, 5209, 5217, 5211, 5204, 5210]} />,
	() => <Preview codes={[5302, 5313, 5306, 5314, 5327, 5307]} />,
	() => <Preview codes={[5428, 5410, 5404, 5407, 5412, 5413]} />,
	() => <Preview codes={[5531, 5510, 5513, 5507, 5511, 5512]} />,
	() => <Preview codes={[5612, 5604, 5606, 5607, 5608, 5601]} />,
	() => <Preview codes={[5707, 5705, 6706, 5710, 5708, 5701]} />,
	() => <Preview codes={[5810, 5827, 5811, 5812, 5803, 5807]} />,
	() => <Preview codes={[5907, 5908, 5912, 5913, 5916, 5906]} />,
	() => <Preview codes={[6012, 6010, 6005, 6017, 6008, 6023]} />,
	() => <Preview codes={[6109, 6102, 6106, 6105, 6108, 6126]} />,
	() => <Preview codes={[6213, 6210, 6205, 6202, 6211, 6206]} />,
	() => (
		<span style="position:absolute;left:200px;top:508px">
			Start without any cards, but gain several extra boosters instead!
		</span>
	),
	() => (
		<span style="position:absolute;left:200px;top:548px">
			This option picks one of the twelve elements randomly
		</span>
	),
];

export default function ElementSelect() {
	const rx = store.useRx();
	let username, password, confirmpass, skiptut;
	const [eledesc, setEledesc] = createSignal(-1),
		[err, setErr] = createSignal('');

	onMount(() => {
		setCmds({
			login: data => {
				if (data.err) {
					setErr(
						`Failed to register. Try a different username. Server response: ${data.err}`,
					);
				} else if (!data.data['']) {
					store.setUser(data.name, data.auth, data.data);
				} else if (rx.user) {
					store.setUser(data.name, data.auth, data.data);
					if (skiptut.checked) {
						store.doNav(import('./MainMenu.jsx'));
					} else {
						store.setOptTemp('quest', [0]);
						store.navGame(mkQuestAi(quarks.basic_damage));
					}
				} else {
					setErr(
						`${data.name} already exists with that password. Click Exit to return to the login screen`,
					);
				}
			},
		});
	});

	return (
		<>
			{rx.user && (
				<>
					<span style="position:absolute;left:200px;top:8px">
						Select your starter element
					</span>
					{eledesc() !== -1 && descriptions[eledesc()]()}
				</>
			)}
			{!rx.user && (
				<div style="position:absolute;left:30px;top:30px;width:200px">
					<input ref={username} placeholder="Username" style="display:block" />
					<input
						ref={password}
						type="password"
						placeholder="Password"
						style="display:block"
					/>
					<input
						ref={confirmpass}
						type="password"
						placeholder="Confirm"
						style="display:block"
					/>
					<input
						type="button"
						value="Register"
						style="display:block"
						onClick={() => {
							let errmsg = '';
							username.value = username.value.trim();
							if (!username.value) {
								errmsg = 'Please enter a username';
							} else if (password.value !== confirmpass.value) {
								errmsg = 'Passwords do not match';
							} else {
								errmsg = 'Registering..';
								emit({
									x: 'login',
									u: username.value,
									p: password.value,
								});
							}
							setErr(errmsg);
						}}
					/>
					{err}
				</div>
			)}
			<input
				type="button"
				value="Exit"
				onClick={() => {
					if (rx.user) {
						userEmit('delete');
						store.logout();
					}
					store.setOpt('remember', false);
					store.doNav(store.Login);
				}}
				style="position:absolute;left:800px;top:200px"
			/>
			<label style="position:absolute;top:30px;left:500px;width:396px">
				<i style="display:block;margin-bottom:24px;white-space:pre-line">
					You will be taken to the tutorial after creating your account. You can
					exit the tutorial at any time. You can access the tutorial through
					Quests at any time.
				</i>
				<input type="checkbox" ref={skiptut} /> Skip Tutorial
			</label>
			{rx.user &&
				[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => (
					<span
						class={`imgb ico e${
							i === 14 ? 13
							: i === 13 ? 14
							: i
						}`}
						style={`position:absolute;left:12px;top:${24 + (i - 1) * 40}px`}
						onClick={() => {
							userEmit('inituser', {
								e: i === 14 ? (Math.random() * 12 + 1) | 0 : i,
							});
						}}
						onMouseOver={() => setEledesc(i - 1)}>
						<span style="position:absolute;left:48px;top:6px;width:144px">
							{eleNames[i]}
						</span>
					</span>
				))}
		</>
	);
}
