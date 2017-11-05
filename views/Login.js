const px = require('../px'),
	chat = require('../chat'),
	sock = require('../sock'),
	audio = require('../audio'),
	options = require('../options'),
	Components = require('../Components'),
	h = preact.h;

if (typeof kongregateAPI === 'undefined') {
	module.exports = class Login extends preact.Component {
		constructor(props) {
			super(props);
			this.state = { commit: null, password: '' };
		}

		componentDidMount() {
			px.view({
				cmds: {
					login: data => {
						if (!data.err) {
							delete data.x;
							sock.user = data;
							if (options.remember && typeof localStorage !== 'undefined') {
								localStorage.auth = data.auth;
							}
							if (!sock.user.accountbound && !sock.user.pool) {
								this.props.doNav(require('./ElementSelect'));
							} else {
								this.props.doNav(require('./MainMenu'));
							}
						} else {
							chat(data.err);
						}
					},
				},
			});

			const xhr = new XMLHttpRequest();
			xhr.addEventListener('load', () => {
				const data = JSON.parse(xhr.responseText)[0];
				this.setState({
					commit: (
						<a
							target="_blank"
							href={data.html_url}
							style={{
								maxWidth: '380px',
								position: 'absolute',
								left: '260px',
								top: '460px',
							}}>
							{data.author.login + ': ' + data.commit.message}
						</a>
					),
				});
			});
			xhr.open(
				'GET',
				'https://api.github.com/repos/serprex/openEtG/commits?per_page=1',
				true,
			);
			xhr.send();
		}

		render() {
			const self = this;
			function maybeLogin(e) {
				e.cancelBubble = true;
				if (e.keyCode == 13) {
					e.target.blur();
					loginClick();
				}
			}
			function loginClick(auth) {
				if (!sock.user && options.username) {
					const data = { u: options.username };
					if (typeof auth !== 'string') {
						data.p = self.state.password;
					} else data.a = auth;
					sock.emit('login', data);
				}
			}
			const login = (
				<input
					type="button"
					value="Login"
					onClick={loginClick}
					style={{ position: 'absolute', left: '430px', top: '350px' }}
				/>
			);
			const btnsandbox = (
				<input
					type="button"
					value="Sandbox"
					onClick={() => self.props.doNav(require('./MainMenu'))}
					style={{ position: 'absolute', left: '530px', top: '350px' }}
				/>
			);
			const username = (
				<input
					placeholder="Username"
					autofocus={true}
					tabIndex="1"
					onKeyPress={maybeLogin}
					ref={ctrl => ctrl && options.register('username', ctrl)}
					style={{ position: 'absolute', left: '270px', top: '350px' }}
				/>
			);
			const password = (
				<input
					onInput={e => self.setState({ password: e.target.value })}
					value={self.state.password}
					type="password"
					placeholder="Password"
					tabIndex="2"
					onKeyPress={maybeLogin}
					style={{ position: 'absolute', left: '270px', top: '380px' }}
				/>
			);
			const rememberCheck = (
				<input
					type="checkbox"
					ref={ctrl => ctrl && options.register('remember', ctrl)}
					onChange={() => {
						if (typeof localStorage !== 'undefined') {
							if (!this.checked) delete localStorage.auth;
							else if (sock.user) localStorage.auth = sock.user.auth;
						}
					}}
				/>
			);
			const remember = (
				<label style={{ position: 'absolute', left: '430px', top: '380px' }}>
					{rememberCheck}
					{'Remember me'}
				</label>
			);
			if (
				options.remember &&
				typeof localStorage !== 'undefined' &&
				localStorage.auth
			) {
				loginClick(localStorage.auth);
			}
			const tutlink = (
				<a
					href="forum/?topic=267"
					target="_blank"
					style={{ position: 'absolute', left: '270px', top: '424px' }}>
					Tutorial
				</a>
			);
			return (
				<div
					style={{
						backgroundImage: 'url(assets/bg_login.png)',
						width: '900px',
						height: '600px',
					}}>
					{username}
					{password}
					{remember}
					{login}
					{tutlink}
					{btnsandbox}
					{this.state.commit}
				</div>
			);
		}
	};
} else {
	module.exports = ({ doNav }) => {
		kongregateAPI.loadAPI(() => {
			const kong = kongregateAPI.getAPI();
			if (kong.services.isGuest()) {
				doNav(require('./MainMenu'));
			} else {
				sock.emit('konglogin', {
					u: kong.services.getUserId(),
					g: kong.services.getGameAuthToken(),
				});
				px.view({
					cmds: {
						login: function(data) {
							if (!data.err) {
								delete data.x;
								sock.user = data;
								if (!sock.user.accountbound && !sock.user.pool) {
									doNav(require('./ElementSelect'));
								} else {
									doNav(require('./MainMenu'));
								}
							} else {
								alert(data.err);
							}
						},
					},
				});
			}
		});
		return 'Logging in..';
	};
}
