var px = require("../px");
var ui = require("../ui");
var gfx = require("../gfx");
var chat = require("../chat");
var sock = require("../sock");
var options = require("../options");
var bg_login = new Image();
bg_login.src = "assets/bg_login.png";
bg_login.className = "bgimg";
module.exports = function(){
	function maybeLogin(e) {
		e.cancelBubble = true;
		if (e.keyCode == 13) {
			this.blur();
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
	var loadingBar, sandbox;
	if (gfx.load){
		loadingBar = document.createElement("span");
		loadingBar.style.backgroundColor = "#FFFFFF";
		loadingBar.style.height = "32px";
		gfx.load(function(progress){
			if (progress == 1) loadingBar.style.backgroundColor = "#336699";
			loadingBar.style.width = (progress*900) + "px";
		}, function(){
			ui.playMusic("openingMusic");
			if (sock.user || sandbox) require("./MainMenu")();
		});
		require("./MainMenu"); // Queue loading bg_main
	}
	var login = px.dom.button("Login", loginClick);
	var username = document.createElement("input");
	var password = document.createElement("input");
	var rememberCheck = document.createElement("input");
	var remember = document.createElement("label");
	password.type = "password";
	rememberCheck.type = "checkbox";
	remember.appendChild(rememberCheck);
	remember.appendChild(document.createTextNode("Remember me"));
	username.placeholder = "Username";
	password.placeholder = "Insecure Password";
	username.tabIndex = "1";
	password.tabIndex = "2";
	[username, password].forEach(function(ele){
		ele.addEventListener("keydown", maybeLogin);
	});
	options.register("username", username);
	options.register("remember", rememberCheck);
	rememberCheck.addEventListener("change", function() {
		if (typeof localStorage !== "undefined"){
			if (!this.checked) delete localStorage.auth;
			else if (sock.user) localStorage.auth = sock.user.auth;
		}
	});
	if (options.remember && typeof localStorage !== "undefined"){
		loginClick(localStorage.auth);
	}
	var tutlink = document.createElement("a");
	tutlink.href = "forum/?topic=267"
	tutlink.target = "_blank";
	tutlink.appendChild(document.createTextNode("Tutorial"));
	var div = px.dom.div(
		[0, 0, bg_login],
		[270, 350, username],
		[270, 380, password],
		[430, 380, remember],
		[430, 350, login],
		[270, 424, tutlink],
		[530, 350, ["Sandbox", function(){
			if (gfx.loaded) require("./MainMenu")();
			else sandbox = true;
		}]]);
	if (loadingBar) px.dom.add(div, [0, 568, loadingBar]);
	var xhr = new XMLHttpRequest();
	xhr.addEventListener("load", function(){
		var data = JSON.parse(this.responseText)[0];
		var a = document.createElement("a");
		a.target = "_blank";
		a.href = data.html_url;
		a.appendChild(document.createTextNode(data.author.login + ": " + data.commit.message));
		a.style.maxWidth = "380px";
		px.dom.add(div, [260, 460, a]);
	});
	xhr.open("GET", "https://api.github.com/repos/serprex/openEtG/commits?per_page=1", true);
	xhr.send();
	px.view({
		dom:div,
		cmds:{
			login:function(data){
				if (!data.err){
					delete data.x;
					sock.user = data;
					if (!sock.user.accountbound && !sock.user.pool) {
						require("./ElementSelect")();
					} else {
						sock.prepuser();
						if (gfx.loaded) require("./MainMenu")();
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
	username.focus();
}