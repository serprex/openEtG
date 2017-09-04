var px = require("../px");
var gfx = require("../gfx");
var chat = require("../chat");
var sock = require("../sock");
var audio = require("../audio");
var options = require("../options");

module.exports = function(){
	function maybeLogin(e) {
		e.cancelBubble = true;
		if (e.keyCode == 13) {
			e.target.blur();
			loginClick();
		}
	}
	function loginClick(auth) {
		if (!sock.user && options.username) {
			var data = {u:options.username}
			if (typeof auth !== "string"){
				if (password.value) data.p = password.value;
			}else data.a = auth;
			sock.emit("login", data);
		}
	}
	var h = preact.h, loadingBar, sandbox;
	if (gfx.load){
		loadingBar = h("span", {
			style: {
				backgroundColor: "#fff",
				height: "32px",
			}
		});
		gfx.load(function(progress){
			if (progress == 1) loadingBar.attributes.style.backgroundColor = "#369";
			loadingBar.attributes.style.width = (progress*900) + "px";
			px.render(view);
		}, function(){
			audio.playMusic("openingMusic");
			if (sock.user || sandbox) require("./MainMenu")();
		});
		require("./MainMenu"); // Queue loading bg_main
	}
	var login = h("input", { type: "button", value: "Login", onClick: loginClick});
	var btnsandbox = h("input", {type: "button", value: "Sandbox", onClick: function(){
		if (gfx.loaded) require("./MainMenu")();
		else sandbox = true;
	}});
	var bg_login = h("img", { src: "assets/bg_login.png", className: "bgimg" });
	var username = h("input", { placeholder: 'Username', autofocus: true, tabIndex: '1', onKeyPress: maybeLogin });
	var password = h("input", { type: 'password', placeholder: 'Password', tabIndex: '2', onKeyPress: maybeLogin });
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
	/*
	options.register("username", username);
	options.register("remember", rememberCheck);
	*/
	if (options.remember && typeof localStorage !== "undefined"){
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
	div = div.map(x => {
		x[2].attributes.style = { position: 'absolute', left: x[0]+'px', top: x[1]+'px' };
		return x[2];
	});
	var view = h('div', { id: 'app', style: { display: '' }, children: div });
	var xhr = new XMLHttpRequest();
	xhr.addEventListener("load", function(){
		var data = JSON.parse(this.responseText)[0];
		var a = h('a', {
			target: '_blank',
			href: data.html_url,
			style: { maxWidth: '380px', position: 'absolute', left: '260px', top: '460px' }
		}, data.author.login + ": " + data.commit.message);
		view.children = view.children.concat([a]);
		px.render(view);
	});
	xhr.open("GET", "https://api.github.com/repos/serprex/openEtG/commits?per_page=1", true);
	xhr.send();
	px.view({
		endnext: px.hideapp,
		cmds:{
			login:function(data){
				if (!data.err){
					delete data.x;
					sock.user = data;
					if (!sock.user.accountbound && !sock.user.pool) {
						require("./ElementSelect")();
					} else if (gfx.loaded){
						require("./MainMenu")();
					}
					if (options.remember && typeof localStorage !== "undefined"){
						localStorage.auth = sock.user.auth;
					}
				} else {
					chat(data.err);
				}
			}
		}
	});
	px.render(view);
}