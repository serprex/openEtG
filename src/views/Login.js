const Components = require('../Components'),
	sock = require('../sock'),
	store = require('../store'),
	{ connect } = require('react-redux'),
	React = require('react');

if (typeof kongregateAPI === 'undefined') {
	module.exports = connect(({opts}) => ({ remember: opts.remember, username: opts.username }))(class Login extends React.Component {
		constructor(props) {
			super(props);
			this.state = { commit: null, password: '' };
		}

		componentDidMount() {
			this.props.dispatch(store.setCmds({
				login: data => {
					if (!data.err) {
						delete data.x;
						this.props.dispatch(store.setUser(data));
						if (this.props.remember && typeof localStorage !== 'undefined') {
							localStorage.auth = data.auth;
						}
						if (!data.accountbound && !data.pool) {
							this.props.dispatch(store.doNav(require('./ElementSelect'), { user: data }));
						} else {
							this.props.dispatch(store.setOptTemp('deck', sock.getDeck()));
							this.props.dispatch(store.doNav(require('./MainMenu')));
						}
					} else {
						this.props.dispatch(store.chatMsg(data.err));
					}
				},
			}));

			if (
				this.props.remember &&
				typeof localStorage !== 'undefined' &&
				localStorage.auth
			) {
				this.loginClick(localStorage.auth);
			} else {
				fetch('https://api.github.com/repos/serprex/openEtG/commits?per_page=1')
					.then(res => res.json())
					.then(([data]) => {
						this.setState({
							commit: (
								<a target="_blank"
								href={data.html_url}
								style={{
									maxWidth: '380px',
									position: 'absolute',
									left: '260px',
									top: '460px',
								}}>
									{data.author.login}: {data.commit.message}
								</a>
							),
						});
					});
			}
		}

		loginClick(auth) {
			if (this.props.username) {
				const data = { u: this.props.username };
				if (auth) data.a = auth;
				else data.p = this.state.password;
				sock.emit('login', data);
			}
		}

		maybeLogin(e) {
			if (e.which == 13) {
				this.loginClick();
			}
		}

		render() {
			return (
				<div style={{
					backgroundImage: 'url(assets/bg_login.png)',
					width: '900px',
					height: '600px',
				}}>
					<input
						placeholder="Username"
						autoFocus
						tabIndex="1"
						onKeyPress={e => this.maybeLogin(e)}
						value={this.props.username}
						onChange={e => this.props.dispatch(store.setOpt('username', e.target.value))}
						style={{ position: 'absolute', left: '270px', top: '350px' }}
					/>
					<input
						onInput={e => this.setState({ password: e.target.value })}
						value={this.state.password}
						type="password"
						placeholder="Password"
						tabIndex="2"
						onKeyPress={e => this.maybeLogin(e)}
						style={{ position: 'absolute', left: '270px', top: '380px' }}
					/>
					<label style={{ position: 'absolute', left: '430px', top: '380px' }}>
						<input
							type="checkbox"
							checked={this.props.remember}
							onChange={e => {
								if (typeof localStorage !== 'undefined' && !e.target.checked) {
									delete localStorage.auth;
								}
								this.props.dispatch(store.setOpt('remember', e.target.checked));
							}}
						/>
						Remember me
					</label>
					<input
						type="button"
						value="Login"
						onClick={e => this.loginClick()}
						style={{ position: 'absolute', left: '430px', top: '350px' }}
					/>
					<a target="_blank"
						href="forum/?topic=267"
						style={{ position: 'absolute', left: '270px', top: '424px' }}>
						Tutorial
					</a>
					<input
						type="button"
						value="Sandbox"
						onClick={() => this.props.dispatch(store.doNav(require('./MainMenu')))}
						style={{ position: 'absolute', left: '530px', top: '350px' }}
					/>
					{this.state.commit}
				</div>
			);
		}
	});
} else {
	module.exports = connect()(class Login extends React.Component {
		componentDidMount() {
			kongregateAPI.loadAPI(() => {
				const kong = kongregateAPI.getAPI();
				if (kong.services.isGuest()) {
					this.props.dispatch(store.doNav(require('./MainMenu')));
				} else {
					sock.emit('konglogin', {
						u: kong.services.getUserId(),
						g: kong.services.getGameAuthToken(),
					});
					this.props.dispatch(store.setCmds({
						login: data => {
							if (!data.err) {
								delete data.x;
								this.props.dispatch(store.setUser(data));
								if (!data.accountbound && !data.pool) {
									this.props.dispatch(store.doNav(require('./ElementSelect'), { user: data }));
								} else {
									this.props.dispatch(store.doNav(require('./MainMenu')));
								}
							} else {
								alert(data.err);
							}
						},
					}));
				}
			});
		}

		render() {
			return 'Logging in..';
		}
	});
}
