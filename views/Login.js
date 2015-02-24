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
			var data = {u:options.username}
			if (typeof auth !== "string"){
				if (password.value) data.p = password.value;
			}else data.a = auth;
			sock.emit("login", data);
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
	var login = px.domButton("Login", loginClick);
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
		sock.et.addEventListener("open", function handler(){
			loginClick(localStorage.auth);
			this.removeEventListener("open", handler);
		});
	}
	var tutlink = document.createElement("a");
	tutlink.href = "forum/?topic=267"
	tutlink.target = "_blank";
	tutlink.appendChild(document.createTextNode("Tutorial"));
	var dom = [
		[96, 196, px.domBox(400, 124)],
		[100, 200, username],
		[100, 230, password],
		[260, 230, remember],
		[300, 200, login],
		[100, 300, tutlink],
		[400, 200, ["Sandbox", require("./MainMenu")]],
	];
	if (loadingBar) dom.push([0, 568, loadingBar]);
	px.view({
		logdom:dom,
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