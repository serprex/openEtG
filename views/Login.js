const px = require("../px"),
	gfx = require("../gfx"),
	chat = require("../chat"),
	sock = require("../sock"),
	audio = require("../audio"),
	options = require("../options"),
	Components = require('../Components'),
	h = preact.h;

module.exports = class Login extends preact.Component {
	constructor(props) {
		super(props);
		this.state = { commit: null, progress: 0 };
	}

	componentDidMount() {
		const self = this;
		if (gfx.load){
			gfx.load(function(progress){
				self.setState(Object.assign({}, self.state, { progress: progress }))
			}, function(){
				audio.playMusic("openingMusic");
				if (sock.user || self.sandbox) {
					if (sock.user && !sock.user.accountbound && !sock.user.pool) {
						self.props.doNav(require("./ElementSelect"));
					} else {
						self.props.doNav(require("./MainMenu"));
					}
				}
			});
		}

		var xhr = new XMLHttpRequest();
		xhr.addEventListener("load", function(){
			var data = JSON.parse(this.responseText)[0];
			self.setState(Object.assign({}, this.state, {
				commit: h('a', {
					target: '_blank',
					href: data.html_url,
					style: { maxWidth: '380px', position: 'absolute', left: '260px', top: '460px' }
				}, data.author.login + ": " + data.commit.message)
			}));
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
					data.p = passwordEle.value;
				}else data.a = auth;
				sock.emit("login", data);
			}
		}
		var loadingBar = h("span", {
			style: {
				backgroundColor: this.state.progress == 1 ? "#369" : "#fff",
				height: "32px",
				width: (this.state.progress*900) + "px",
			}
		});
		var login = h("input", { type: "button", value: "Login", onClick: loginClick});
		var btnsandbox = h("input", {type: "button", value: "Sandbox", onClick: function(){
			if (gfx.loaded) self.props.doNav(require("./MainMenu"));
			else self.sandbox = true;
		}});
		var bg_login = h("img", { src: "assets/bg_login.png", className: "bgimg" });
		var username = h("input", { placeholder: 'Username', autofocus: true, tabIndex: '1', onKeyPress: maybeLogin });
		var passwordEle, password = h("input", { ref: function(input) { passwordEle = input; }, type: 'password', placeholder: 'Password', tabIndex: '2', onKeyPress: maybeLogin });
		var rememberCheck = h("input", {
			type: 'checkbox',
			onChange: function() {
				if (typeof localStorage !== "undefined"){
					if (!this.checked) delete localStorage.auth;
					else if (sock.user) localStorage.auth = sock.user.auth;
				}
			},
		});
		var remember = h("label", {}, rememberCheck, 'Remember me');
		options.register("username", username);
		options.register("remember", rememberCheck);
		if (options.remember && typeof localStorage !== "undefined" && localStorage.auth){
			loginClick(localStorage.auth);
		}
		var tutlink = h("a", { href: "forum/?topic=267", target: "_blank" }, "Tutorial");
		var div = [[0, 0, bg_login],
			[270, 350, username],
			[270, 380, password],
			[430, 380, remember],
			[430, 350, login],
			[270, 424, tutlink],
			[530, 350, btnsandbox]];
		if (loadingBar) div.push([0, 568, loadingBar]);
		div = div.map(function(x){
			x[2].attributes.style = { position: 'absolute', left: x[0]+'px', top: x[1]+'px' };
			return x[2];
		});
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
						if (gfx.loaded) {
							if (!sock.user.accountbound && !sock.user.pool) {
								self.props.doNav(require("./ElementSelect"));
							} else {
								self.props.doNav(require("./MainMenu"));
							}
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