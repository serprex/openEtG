import { createSignal, onMount } from 'solid-js';
import { For } from 'solid-js/web';

import * as ui from '../ui.js';
import { run } from '../mkAi.js';
import * as sock from '../sock.jsx';
import { Card, ExitBtn } from '../Components/index.jsx';
import * as store from '../store.jsx';
import { mkQuestAi, quarks } from '../Quest.js';
import Cards from '../Cards.js';

const descriptions = [
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5116]} />
			<Card x={332} y={48} card={Cards.Codes[5106]} />
			<Card x={168} y={324} card={Cards.Codes[5123]} />
			<Card x={332} y={324} card={Cards.Codes[5122]} />
			<Card x={496} y={324} card={Cards.Codes[5109]} />
			<Card x={660} y={324} card={Cards.Codes[5111]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5208]} />
			<Card x={332} y={48} card={Cards.Codes[5209]} />
			<Card x={168} y={324} card={Cards.Codes[5217]} />
			<Card x={332} y={324} card={Cards.Codes[5211]} />
			<Card x={496} y={324} card={Cards.Codes[5204]} />
			<Card x={660} y={324} card={Cards.Codes[5210]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5302]} />
			<Card x={332} y={48} card={Cards.Codes[5313]} />
			<Card x={168} y={324} card={Cards.Codes[5306]} />
			<Card x={332} y={324} card={Cards.Codes[5314]} />
			<Card x={496} y={324} card={Cards.Codes[5327]} />
			<Card x={660} y={324} card={Cards.Codes[5307]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5428]} />
			<Card x={332} y={48} card={Cards.Codes[5410]} />
			<Card x={168} y={324} card={Cards.Codes[5404]} />
			<Card x={332} y={324} card={Cards.Codes[5407]} />
			<Card x={496} y={324} card={Cards.Codes[5412]} />
			<Card x={660} y={324} card={Cards.Codes[5413]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5531]} />
			<Card x={332} y={48} card={Cards.Codes[5510]} />
			<Card x={168} y={324} card={Cards.Codes[5513]} />
			<Card x={332} y={324} card={Cards.Codes[5507]} />
			<Card x={496} y={324} card={Cards.Codes[5511]} />
			<Card x={660} y={324} card={Cards.Codes[5512]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5612]} />
			<Card x={332} y={48} card={Cards.Codes[5604]} />
			<Card x={168} y={324} card={Cards.Codes[5606]} />
			<Card x={332} y={324} card={Cards.Codes[5607]} />
			<Card x={496} y={324} card={Cards.Codes[5608]} />
			<Card x={660} y={324} card={Cards.Codes[5601]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5707]} />
			<Card x={332} y={48} card={Cards.Codes[5705]} />
			<Card x={168} y={324} card={Cards.Codes[5706]} />
			<Card x={332} y={324} card={Cards.Codes[5710]} />
			<Card x={496} y={324} card={Cards.Codes[5708]} />
			<Card x={660} y={324} card={Cards.Codes[5701]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5810]} />
			<Card x={332} y={48} card={Cards.Codes[5827]} />
			<Card x={168} y={324} card={Cards.Codes[5811]} />
			<Card x={332} y={324} card={Cards.Codes[5812]} />
			<Card x={496} y={324} card={Cards.Codes[5803]} />
			<Card x={660} y={324} card={Cards.Codes[5807]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[5907]} />
			<Card x={332} y={48} card={Cards.Codes[5908]} />
			<Card x={168} y={324} card={Cards.Codes[5912]} />
			<Card x={332} y={324} card={Cards.Codes[5913]} />
			<Card x={496} y={324} card={Cards.Codes[5916]} />
			<Card x={660} y={324} card={Cards.Codes[5906]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[6012]} />
			<Card x={332} y={48} card={Cards.Codes[6010]} />
			<Card x={168} y={324} card={Cards.Codes[6005]} />
			<Card x={332} y={324} card={Cards.Codes[6017]} />
			<Card x={496} y={324} card={Cards.Codes[6008]} />
			<Card x={660} y={324} card={Cards.Codes[6023]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[6109]} />
			<Card x={332} y={48} card={Cards.Codes[6102]} />
			<Card x={168} y={324} card={Cards.Codes[6106]} />
			<Card x={332} y={324} card={Cards.Codes[6105]} />
			<Card x={496} y={324} card={Cards.Codes[6108]} />
			<Card x={660} y={324} card={Cards.Codes[6126]} />
		</>
	),
	() => (
		<>
			<Card x={168} y={48} card={Cards.Codes[6213]} />
			<Card x={332} y={48} card={Cards.Codes[6210]} />
			<Card x={168} y={324} card={Cards.Codes[6205]} />
			<Card x={332} y={324} card={Cards.Codes[6202]} />
			<Card x={496} y={324} card={Cards.Codes[6211]} />
			<Card x={660} y={324} card={Cards.Codes[6206]} />
		</>
	),
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
	let username, password, confirmpass;
	const [eledesc, setEledesc] = createSignal(-1),
		[skiptut, setSkiptut] = createSignal(false),
		[err, setErr] = createSignal('');

	onMount(() => {
		sock.setCmds({
			login: data => {
				if (data.err) {
					setErr(
						`Failed to register. Try a different username. Server response: ${data.err}`,
					);
				} else if (!data.accountbound && !data.pool) {
					delete data.x;
					store.setUser(data);
				} else if (rx.user) {
					delete data.x;
					store.setUser(data);
					if (skiptut()) {
						store.doNav(import('./MainMenu.jsx'));
					} else {
						store.setOptTemp('quest', [0]);
						run(mkQuestAi(quarks.basic_damage));
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
						onClick={e => {
							let errmsg = '';
							if (!username.value) {
								errmsg = 'Please enter a username';
							} else if (password.value !== confirmpass.value) {
								errmsg = 'Passwords do not match';
							} else {
								errmsg = 'Registering..';
								sock.emit({
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
			<ExitBtn
				x={800}
				y={200}
				onClick={() => {
					if (rx.user) {
						sock.userEmit('delete');
						store.setUser(null);
					}
					store.setOpt('remember', false);
					store.doNav(import('./Login.jsx'));
				}}
			/>
			<label style="position:absolute;top:30px;left:500px;width:396px">
				<i style="display:block;margin-bottom:24px;white-space:pre-line">
					You will be taken to the tutorial after creating your account. You can
					exit the tutorial at any time. You can access the tutorial through
					Quests at any time.
				</i>
				<input
					type="checkbox"
					checked={skiptut()}
					onChange={e => setSkiptut(e.target.checked)}
				/>{' '}
				Skip Tutorial
			</label>
			{rx.user && (
				<For each={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]}>
					{i => (
						<span
							class={`imgb ico e${i === 14 ? 13 : i === 13 ? 14 : i}`}
							style={{
								position: 'absolute',
								left: '12px',
								top: `${24 + (i - 1) * 40}px`,
							}}
							onClick={() => {
								sock.userEmit('inituser', {
									e: i === 14 ? (Math.random() * 12 + 1) | 0 : i,
								});
							}}
							onMouseOver={() => setEledesc(i - 1)}>
							<span style="position:absolute;left:48px;top:6px;width:144px">
								{ui.eleNames[i]}
							</span>
						</span>
					)}
				</For>
			)}
		</>
	);
}