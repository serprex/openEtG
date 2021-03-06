import { Component } from 'react';
import { connect } from 'react-redux';

import * as sock from '../sock.js';
import * as store from '../store.js';
const MainMenu = import('./MainMenu.js');

let View;
if (typeof kongregateAPI === 'undefined') {
	View = connect(({ opts }) => ({
		remember: opts.remember,
		username: opts.username,
	}))(
		class Login extends Component {
			constructor(props) {
				super(props);
				this.state = { commit: null, password: '' };
			}

			componentDidMount() {
				this.props.dispatch(
					store.setCmds({
						login: data => {
							if (!data.err) {
								delete data.x;
								this.props.dispatch(store.setUser(data));
								if (
									this.props.remember &&
									typeof localStorage !== 'undefined'
								) {
									localStorage.auth = data.auth;
								}
								if (!data.accountbound && !data.pool) {
									this.props.dispatch(
										store.doNav(import('./ElementSelect.js')),
									);
								} else {
									this.props.dispatch(store.setOptTemp('deck', sock.getDeck()));
									this.props.dispatch(store.doNav(MainMenu));
								}
							} else {
								this.props.dispatch(store.chatMsg(data.err));
							}
						},
					}),
				);

				if (
					this.props.remember &&
					typeof localStorage !== 'undefined' &&
					localStorage.auth
				) {
					this.loginClick(localStorage.auth);
				} else {
					fetch(
						'https://api.github.com/repos/serprex/openEtG/commits?per_page=1',
					)
						.then(res => res.json())
						.then(([data]) => {
							this.setState({
								commit: (
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
									</a>
								),
							});
						});
				}
			}

			registerClick() {
				this.props.dispatch(store.doNav(import('./ElementSelect.js')));
			}

			loginClick(auth) {
				if (this.props.username) {
					const data = { x: 'login', u: this.props.username };
					if (auth) data.a = auth;
					else data.p = this.state.password;
					sock.emit(data);
				}
			}

			maybeLogin(e) {
				if (e.which === 13) {
					this.loginClick();
				}
			}

			render() {
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
							onKeyPress={e => this.maybeLogin(e)}
							value={this.props.username ?? ''}
							onChange={e =>
								this.props.dispatch(store.setOpt('username', e.target.value))
							}
							style={{
								position: 'absolute',
								left: '270px',
								top: '350px',
							}}
						/>
						<input
							onChange={e => this.setState({ password: e.target.value })}
							value={this.state.password}
							type="password"
							placeholder="Password"
							tabIndex="2"
							onKeyPress={e => this.maybeLogin(e)}
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
								checked={!!this.props.remember}
								onChange={e => {
									if (
										typeof localStorage !== 'undefined' &&
										!e.target.checked
									) {
										delete localStorage.auth;
									}
									this.props.dispatch(
										store.setOpt('remember', e.target.checked),
									);
								}}
							/>
							Remember me
						</label>
						<input
							type="button"
							value="Login"
							onClick={e => this.loginClick()}
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
							onClick={e => this.registerClick()}
							style={{
								position: 'absolute',
								left: '430px',
								top: '380px',
								width: '100px',
							}}
						/>
						{this.state.commit}
					</div>
				);
			}
		},
	);
} else {
	View = connect()(
		class Login extends Component {
			state = { guest: false };

			componentDidMount() {
				kongregateAPI.loadAPI(() => {
					const kong = kongregateAPI.getAPI();
					if (kong.services.isGuest()) {
						this.setState({ guest: true });
					} else {
						this.props.dispatch(
							store.setCmds({
								login: data => {
									if (!data.err) {
										delete data.x;
										this.props.dispatch(store.setUser(data));
										if (!data.accountbound && !data.pool) {
											this.props.dispatch(
												store.doNav(import('./ElementSelect.js')),
											);
										} else {
											this.props.dispatch(store.doNav(MainMenu));
										}
									} else {
										this.props.dispatch(store.chatMsg(data.err));
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
			}

			render() {
				if (this.state.guest) {
					return (
						<>
							Log in to use Kongregate, or play at{' '}
							<a href="https://etg.dek.im">etg.dek.im</a>
						</>
					);
				}
				return 'Logging in..';
			}
		},
	);
}
export default View;
