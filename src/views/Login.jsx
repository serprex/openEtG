import { createSignal, onMount, Show } from 'solid-js';

import { emit, setCmds } from '../sock.jsx';
import * as store from '../store.jsx';
const MainMenu = import('./MainMenu.jsx');

export default function Login() {
	const rx = store.useRx();
	const [commit, setCommit] = createSignal(null);
	let password;

	const loginClick = auth => {
		const username = rx.opts.username && rx.opts.username.trim();
		if (username) {
			store.setOpt('username', username);
			const data = { x: 'login', u: username };
			if (auth) data.a = auth;
			else data.p = password.value;
			emit(data);
		}
	};

	const maybeLogin = e => {
		if (e.key === 'Enter') loginClick();
	};

	onMount(() => {
		setCmds({
			login: data => {
				if (!data.err) {
					store.setUser(data.name, data.auth, data.data);
					if (rx.opts.remember && typeof localStorage !== 'undefined') {
						localStorage.auth = data.auth;
					}
					if (!data.data['']) {
						store.doNav(import('./ElementSelect.jsx'));
					} else {
						store.setOptTemp('deck', store.getDeck());
						store.doNav(MainMenu);
					}
				} else {
					store.chatMsg(data.err);
				}
			},
		});

		if (
			rx.opts.remember &&
			typeof localStorage !== 'undefined' &&
			localStorage.auth
		) {
			loginClick(localStorage.auth);
		} else {
			fetch('https://api.github.com/repos/serprex/openEtG/commits?per_page=1')
				.then(res => res.json())
				.then(([data]) => setCommit(data));
		}
	});

	return (
		<div style="background-image:url(assets/bg_login.webp);width:900px;height:600px">
			<input
				placeholder="Username"
				autoFocus
				tabIndex="1"
				onKeyDown={maybeLogin}
				value={rx.opts.username ?? ''}
				onInput={e => store.setOpt('username', e.target.value)}
				style="position:absolute;left:270px;top:350px"
			/>
			<input
				ref={password}
				type="password"
				placeholder="Password"
				tabIndex="2"
				onKeyDown={maybeLogin}
				style="position:absolute;left:270px;top:380px"
			/>
			<label style="position:absolute;left:270px;top:410px">
				<input
					type="checkbox"
					checked={!!rx.opts.remember}
					onChange={e => {
						if (typeof localStorage !== 'undefined' && !e.target.checked) {
							delete localStorage.auth;
						}
						store.setOpt('remember', e.target.checked);
					}}
				/>
				Remember me
			</label>
			<input
				type="button"
				value="Login"
				onClick={() => loginClick()}
				style="position:absolute;left:430px;top:350px;width:100px"
			/>
			<input
				type="button"
				value="New Account"
				onClick={() => store.doNav(import('./ElementSelect.jsx'))}
				style="position:absolute;left:430px;top:380px;width:100px"
			/>
			<Show when={commit()}>
				{data => (
					<a
						target="_blank"
						rel="noopener"
						href={data().html_url}
						style="max-width:670px;min-width:470px;position:absolute;left:220px;top:460px;height:140px;white-space:pre-wrap;overflow-y:auto">
						{data().commit.message}
					</a>
				)}
			</Show>
		</div>
	);
}
