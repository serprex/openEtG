const px = require("../px"),
	chat = require("../chat"),
	sock = require("../sock"),
	audio = require("../audio"),
	options = require("../options"),
	Components = require('../Components'),
	h = preact.h;

module.exports = class Login extends preact.Component {
	constructor(props) {
		super(props);
		this.state = { commit: null, password: '' };
	}

	componentDidMount() {
		const self = this, xhr = new XMLHttpRequest();
		xhr.addEventListener("load", function(){
			const data = JSON.parse(this.responseText)[0];
			self.setState({
				commit: h('a', {
					target: '_blank',
					href: data.html_url,
					style: { maxWidth: '380px', position: 'absolute', left: '260px', top: '460px' }
				}, data.author.login + ": " + data.commit.message)
			});
		});
		xhr.open("GET", "https://api.github.com/repos/serprex/openEtG/commits?per_page=1", true);
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
				let data = {u:options.username}
				if (typeof auth !== "string"){
					data.p = self.state.password;
				}else data.a = auth;
				sock.emit("login", data);
			}
		}
		const login = h("input", { type: "button", value: "Login", onClick: loginClick});
		const btnsandbox = h("input", {type: "button", value: "Sandbox", onClick: function(){
			self.props.doNav(require("./MainMenu"));
		}});
		const bg_login = h("img", { src: "assets/bg_login.png", className: "bgimg" });
		const username = h("input", {
			placeholder: 'Username',
			autofocus: true,
			tabIndex: '1',
			onKeyPress: maybeLogin,
			ref: function(ctrl) { ctrl && options.register('username', ctrl); },
		});
		const password = h("input", { onInput: function(e){ self.setState({ password: e.target.value }) }, value: self.state.password, type: 'password', placeholder: 'Password', tabIndex: '2', onKeyPress: maybeLogin });
		const rememberCheck = h("input", {
			type: 'checkbox',
			ref: function(ctrl) { ctrl && options.register('remember', ctrl); },
			onChange: function() {
				if (typeof localStorage !== "undefined"){
					if (!this.checked) delete localStorage.auth;
					else if (sock.user) localStorage.auth = sock.user.auth;
				}
			},
		});
		const remember = h("label", {}, rememberCheck, 'Remember me');
		if (options.remember && typeof localStorage !== "undefined" && localStorage.auth){
			loginClick(localStorage.auth);
		}
		const tutlink = h("a", { href: "forum/?topic=267", target: "_blank" }, "Tutorial");
		const div = [[0, 0, bg_login],
			[270, 350, username],
			[270, 380, password],
			[430, 380, remember],
			[430, 350, login],
			[270, 424, tutlink],
			[530, 350, btnsandbox]];
		for (let i=0; i<div.length; i++) {
			const x = div[i];
			x[2].attributes.style = { position: 'absolute', left: x[0]+'px', top: x[1]+'px' };
			div[i] = x[2];
		};
		div.push(this.state.commit);
		px.view({
			cmds:{
				login:function(data){
					if (!data.err){
						delete data.x;
						sock.user = data;
						if (options.remember && typeof localStorage !== "undefined"){
							localStorage.auth = data.auth;
						}
						if (!sock.user.accountbound && !sock.user.pool) {
							self.props.doNav(require("./ElementSelect"));
						} else {
							self.props.doNav(require("./MainMenu"));
						}
					} else {
						chat(data.err);
					}
				}
			}
		});
		return h('div', { children: div });
	}
}