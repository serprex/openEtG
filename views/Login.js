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
								if (gfx.loaded) require("./MainMenu")();
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
	var loadingBar;
	if (gfx.load){
		loadingBar = document.createElement("span");
		loadingBar.style.backgroundColor = "#FFFFFF";
		loadingBar.style.height = "32px";
		gfx.load(function(progress){
			if (progress == 1) loadingBar.style.backgroundColor = "#336699";
			loadingBar.style.width = (progress*900) + "px";
		}, function(){
			ui.playMusic("openingMusic");
			if (sock.user) require("./MainMenu")();
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
	var tutlink = document.createElement("a");
	tutlink.href = "forum/?topic=267"
	tutlink.target = "_blank";
	tutlink.appendChild(document.createTextNode("Tutorial"));
	var dom = [
		[100, 200, username],
		[100, 230, password],
		[260, 200, remember],
		[300, 200, login],
		[100, 300, tutlink],
		[400, 200, ["Sandbox", require("./MainMenu")]],
	];
	if (loadingBar) dom.push([0, 568, loadingBar]);
	px.refreshRenderer({logdom:dom});
	username.focus();
}