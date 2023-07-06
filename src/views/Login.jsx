import { createSignal, onMount, Show } from 'solid-js';
import { For } from 'solid-js/web';

import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
const MainMenu = import('./MainMenu.jsx');

let View;
if (typeof kongregateAPI === 'undefined') {
	View = function Login(props) {
		const rx = store.useRx();
		const [commit, setCommit] = createSignal(null);
		let password;

		const loginClick = auth => {
			if (rx.opts.username) {
				const data = { x: 'login', u: rx.opts.username };
				if (auth) data.a = auth;
				else data.p = password.value;
				sock.emit(data);
			}
		};

		const maybeLogin = e => {
			if (e.which === 13) loginClick();
		};

		onMount(() => {
			sock.setCmds({
				login: data => {
					if (!data.err) {
						delete data.x;
						store.setUser(data);
						if (rx.opts.remember && typeof localStorage !== 'undefined') {
							localStorage.auth = data.auth;
						}
						if (!data.accountbound && !data.pool) {
							store.doNav(import('./ElementSelect.jsx'));
						} else {
							store.setOptTemp('deck', sock.getDeck());
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
			<div
				style={{
					'background-image': 'url(assets/bg_login.webp)',
					width: '900px',
					height: '600px',
				}}>
				<input
					placeholder="Username"
					autoFocus
					tabIndex="1"
					onKeyPress={maybeLogin}
					value={rx.opts.username ?? ''}
					onInput={e => store.setOpt('username', e.target.value)}
					style={{
						position: 'absolute',
						left: '270px',
						top: '350px',
					}}
				/>
				<input
					ref={password}
					type="password"
					placeholder="Password"
					tabIndex="2"
					onKeyPress={maybeLogin}
					style={{
						position: 'absolute',
						left: '270px',
						top: '380px',
					}}
				/>
				<label
					style={{
						position: 'absolute',
						left: '270px',
						top: '410px',
					}}>
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
					style={{
						position: 'absolute',
						left: '430px',
						top: '350px',
						width: '100px',
					}}
				/>
				<input
					type="button"
					value="New Account"
					onClick={e => store.doNav(import('./ElementSelect.jsx'))}
					style={{
						position: 'absolute',
						left: '430px',
						top: '380px',
						width: '100px',
					}}
				/>
				<Show when={commit()}>
					{data => (
						<a
							target="_blank"
							rel="noopener"
							href={data().html_url}
							style={{
								'max-width': '670px',
								position: 'absolute',
								left: '220px',
								top: '460px',
							}}>
							<For each={data().commit.message.split('\n')}>
								{text => <div style="margin-bottom:6px">{text}</div>}
							</For>
						</a>
					)}
				</Show>
			</div>
		);
	};
} else {
	View = function Login() {
		const [guest, setGuest] = createSignal(false);

		onMount(() => {
			kongregateAPI.loadAPI(() => {
				const kong = kongregateAPI.getAPI();
				if (kong.services.isGuest()) {
					setGuest(true);
				} else {
					sock.setCmds({
						login: data => {
							if (!data.err) {
								delete data.x;
								store.setUser(data);
								if (!data.accountbound && !data.pool) {
									store.doNav(import('./ElementSelect.jsx'));
								} else {
									store.doNav(MainMenu);
								}
							} else {
								store.chatMsg(data.err);
								alert(data.err);
							}
						},
					});
					sock.emit({
						x: 'konglogin',
						u: kong.services.getUserId(),
						g: kong.services.getGameAuthToken(),
					});
				}
			});
		});

		return (
			<Show when={guest()} fallback={'Logging in..'}>
				Log in to use Kongregate, or play at{' '}
				<a href="https://etg.dek.im">etg.dek.im</a>
			</Show>
		);
	};
}
export default View;
