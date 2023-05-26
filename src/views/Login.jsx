import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
const MainMenu = import('./MainMenu.jsx');

let View;
if (typeof kongregateAPI === 'undefined') {
	View = function Login(props) {
		const remember = useSelector(({ opts }) => opts.remember);
		const username = useSelector(({ opts }) => opts.username);
		const [commit, setCommit] = useState(null);
		const [password, setPassword] = useState('');

		const loginClick = auth => {
			if (username) {
				const data = { x: 'login', u: username };
				if (auth) data.a = auth;
				else data.p = password;
				sock.emit(data);
			}
		};

		const maybeLogin = e => {
			if (e.which === 13) loginClick();
		};

		useEffect(() => {
			store.store.dispatch(
				store.setCmds({
					login: data => {
						if (!data.err) {
							delete data.x;
							store.store.dispatch(store.setUser(data));
							if (remember && typeof localStorage !== 'undefined') {
								localStorage.auth = data.auth;
							}
							if (!data.accountbound && !data.pool) {
								store.store.dispatch(
									store.doNav(import('./ElementSelect.jsx')),
								);
							} else {
								store.store.dispatch(store.setOptTemp('deck', sock.getDeck()));
								store.store.dispatch(store.doNav(MainMenu));
							}
						} else {
							store.store.dispatch(store.chatMsg(data.err));
						}
					},
				}),
			);

			if (
				remember &&
				typeof localStorage !== 'undefined' &&
				localStorage.auth
			) {
				loginClick(localStorage.auth);
			} else {
				fetch('https://api.github.com/repos/serprex/openEtG/commits?per_page=1')
					.then(res => res.json())
					.then(([data]) => {
						setCommit(
							<a
								target="_blank"
								rel="noopener"
								href={data.html_url}
								style={{
									maxWidth: '670px',
									position: 'absolute',
									left: '220px',
									top: '460px',
								}}>
								{data.commit.message.split('\n').map((text, i) => (
									<div key={i} style={{ marginBottom: '6px' }}>
										{text}
									</div>
								))}
							</a>,
						);
					});
			}
		}, []);

		return (
			<div
				style={{
					backgroundImage: 'url(assets/bg_login.webp)',
					width: '900px',
					height: '600px',
				}}>
				<input
					placeholder="Username"
					autoFocus
					tabIndex="1"
					onKeyPress={maybeLogin}
					value={username ?? ''}
					onChange={e =>
						store.store.dispatch(store.setOpt('username', e.target.value))
					}
					style={{
						position: 'absolute',
						left: '270px',
						top: '350px',
					}}
				/>
				<input
					onChange={e => setPassword(e.target.value)}
					value={password}
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
						checked={!!remember}
						onChange={e => {
							if (typeof localStorage !== 'undefined' && !e.target.checked) {
								delete localStorage.auth;
							}
							store.store.dispatch(store.setOpt('remember', e.target.checked));
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
					onClick={e =>
						store.store.dispatch(store.doNav(import('./ElementSelect.jsx')))
					}
					style={{
						position: 'absolute',
						left: '430px',
						top: '380px',
						width: '100px',
					}}
				/>
				{commit}
			</div>
		);
	};
} else {
	View = function Login() {
		const [guest, setGuest] = useState(false);

		useEffect(() => {
			kongregateAPI.loadAPI(() => {
				const kong = kongregateAPI.getAPI();
				if (kong.services.isGuest()) {
					setGuest(true);
				} else {
					store.store.dispatch(
						store.setCmds({
							login: data => {
								if (!data.err) {
									delete data.x;
									store.store.dispatch(store.setUser(data));
									if (!data.accountbound && !data.pool) {
										store.store.dispatch(
											store.doNav(import('./ElementSelect.jsx')),
										);
									} else {
										store.store.dispatch(store.doNav(MainMenu));
									}
								} else {
									store.store.dispatch(store.chatMsg(data.err));
									alert(data.err);
								}
							},
						}),
					);
					sock.emit({
						x: 'konglogin',
						u: kong.services.getUserId(),
						g: kong.services.getGameAuthToken(),
					});
				}
			});
		}, []);

		return guest ? (
			<>
				Log in to use Kongregate, or play at{' '}
				<a href="https://etg.dek.im">etg.dek.im</a>
			</>
		) : (
			'Logging in..'
		);
	};
}
export default View;