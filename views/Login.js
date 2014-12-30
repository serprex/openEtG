var px = require("../px");
var gfx = require("../gfx");
var ui = require("../uiutil");
var chat = require("../chat");
var sock = require("../sock");
var options = require("../options");
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
			if (typeof auth !== "string"){
				var pass = password.value;
				auth = pass.length ? "&p=" + encodeURIComponent(pass) : "";
			}else auth = "&a=" + encodeURIComponent(auth);
			var xhr = new XMLHttpRequest();
			xhr.open("POST", "auth?u=" + encodeURIComponent(options.username) + auth, true);
			xhr.onreadystatechange = function() {
				if (this.readyState == 4) {
					if (this.status == 200) {
						sock.user = JSON.parse(this.responseText);
						if (!sock.user) {
							chat("No user");
						} else {
							if (!sock.user.accountbound && !sock.user.pool) {
								require("./ElementSelect")();
							} else {
								sock.prepuser();
								sock.userEmit("usernop");
								require("./MainMenu")();
							}
							if (options.remember && typeof localStorage !== "undefined"){
								localStorage.auth = sock.user.auth;
							}
						}
					} else if (this.status == 404) {
						chat("Incorrect password");
					} else {
						chat("Error verifying password");
					}
				}
			}
			xhr.send();
		}
	}
	var view;
	if (gfx.load){
		view = px.mkView();
		gfx.load(function(loadingBar){
			view.addChild(loadingBar);
		}, function(){
			ui.playMusic("openingMusic");
		});
	}
	var login = px.domButton("Login", function(){loginClick()});
	var username = document.createElement("input");
	var password = document.createElement("input");
	var remember = document.createElement("input");
	password.type = "password";
	remember.type = "checkbox";
	username.placeholder = "Username";
	password.placeholder = "Insecure Password";
	username.tabIndex = "1";
	password.tabIndex = "2";
	[username, password].forEach(function(ele){
		ele.addEventListener("keydown", maybeLogin);
	});
	options.register("username", username);
	options.register("remember", remember);
	remember.addEventListener("change", function(){
		if (typeof localStorage !== "undefined"){
			if (!this.checked) delete localStorage.auth;
			else if (sock.user) localStorage.auth = sock.user.auth;
		}
	});
	if (options.remember && typeof localStorage !== "undefined"){
		loginClick(localStorage.auth);
	}
	var dom = [
		[100, 200, username],
		[100, 230, password],
		[260, 200, remember],
		[300, 200, login],
		[400, 200, ["Sandbox", require("./MainMenu")]],
	];
	px.refreshRenderer({logdom:dom, view:view});
	username.focus();
}