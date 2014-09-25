"use strict";
PIXI.AUTO_PREVENT_DEFAULT = false;
require("./etg.client").loadcards();
(function(){
var htmlElements = ["leftpane", "chatinput", "deckimport", "aideck", "foename", "change", "login", "password", "challenge", "chatBox", "trade", "bottompane", "demigodmode", "username", "stats","enableSound", "hideright", "lblhideright", "wantpvp", "lblwantpvp", "offline", "lbloffline", "packmulti"];
htmlElements.forEach(function(name){
	window[name] = document.getElementById(name);
});
if (localStorage){
	[username, stats, enableSound, enableMusic, hideright, wantpvp, offline].forEach(function(storei){
		var field = storei.type == "checkbox" ? "checked" : "value";
		if (localStorage[storei.id] !== undefined){
			storei[field] = localStorage[storei.id];
		}
		storei.addEventListener("change", function() {
			localStorage[this.id] = field == "checked" && !this[field] ? "" : this[field];
		});
	});
}
})();
(function(){
var guestname, muteset = {}, muteall;
var px = require("./px");
var gfx = require("./gfx");
var ui = require("./uiutil");
var sock = require("./sock");
var chat = require("./chat");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var startMenu = require("./views/MainMenu");
soundChange();
musicChange();
gfx.load(function(loadingScreen){
	px.realStage.addChild(loadingScreen);
	requestAnimate();
}, function(){
	ui.playMusic("openingMusic");
	px.realStage.removeChildren();
	px.realStage.addChild(new PIXI.Sprite(gfx.bg_default));
	startMenu();
});
sock.et.on("open", function(){
	chat("Connected");
	offlineChange();
	wantpvpChange();
});
sock.et.on("message", function(data){
	data = JSON.parse(data);
	var func = sockEvents[data.x] || (px.realStage.children.length > 1 && px.realStage.children[1].cmds && (func = px.realStage.children[1].cmds[data.x]));
	if (func){
		func.call(sock.et, data);
	}
});
var sockEvents = {
	challenge:function(data) {
		var span = document.createElement("span");
		span.style.cursor = "pointer";
		span.style.color = "blue";
		span.addEventListener("click", (data.pvp ? challengeClick : tradeClick).bind(null, data.f));
		span.appendChild(document.createTextNode(data.f + (data.pvp ? " challenges you to a duel!" : " wants to trade with you!")));
		chat.addSpan(span);
	},
	userdump:function(data) {
		delete data.x;
		sock.user = data;
		prepsock.user();
		startMenu();
	},
	passchange:function(data) {
		sock.user.auth = data.auth;
		chat("Password updated");
	},
	chat:function(data) {
		if (muteall || data.u in muteset || !data.msg) return;
		if (typeof Notification !== "undefined" && sock.user && ~data.msg.indexOf(sock.user.name) && !document.hasFocus()){
			Notification.requestPermission();
			new Notification(data.u, {body: data.msg}).onclick = window.focus;
		}
		var now = new Date(), h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
		if (h < 10) h = "0"+h;
		if (m < 10) m = "0"+m;
		if (s < 10) s = "0"+s;
		var span = document.createElement("span");
		if (data.mode != "red") span.style.color = data.mode || "black";
		if (data.guest) span.style.fontStyle = "italic";
		span.appendChild(document.createTextNode(h + ":" + m + ":" + s + " "));
		if (data.u){
			var belly = document.createElement("b");
			belly.appendChild(document.createTextNode(data.u + ": "));
			span.appendChild(belly);
		}
		var decklink = /\b(([01][0-9a-v]{4})+)\b/g, reres, lastindex = 0;
		while (reres = decklink.exec(data.msg)){
			if (reres.index != lastindex) span.appendChild(document.createTextNode(data.msg.substring(lastindex, reres.index)));
			var link = document.createElement("a");
			link.href = "deck/" + reres[0];
			link.target = "_blank";
			link.appendChild(document.createTextNode(reres[0]));
			span.appendChild(link);
			lastindex = reres.index + reres[0].length;
		}
		if (lastindex != data.msg.length) span.appendChild(document.createTextNode(data.msg.substring(lastindex)));
		chat.addSpan(span);
	},
	codecard: require("./views/Reward"),
	codereject:function(data) {
		chat(data.msg);
	},
	codegold:function(data) {
		sock.user.gold += data.g;
		chat(data.g + "\u00A4 added!");
	},
	codecode:function(data) {
		sock.user.pool = etgutil.addcard(sock.user.pool, data);
		chat(Cards.Codes[data].name + " added!");
	},
	codedone:function(data) {
		sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
		chat(Cards.Codes[data.card].name + " added!");
		startMenu();
	},
}
function soundChange(event) {
	ui.changeSound(enableSound.checked);
}
function musicChange(event) {
	ui.changeMusic(enableMusic.checked);
}
function chatmute(){
	var muted = [];
	for(var name in muteset){
		muted.push(name);
	}
	chat((muteall?"You have chat muted. ":"") + "Muted: " + muted.join(", "));
}
function maybeSendChat(e) {
	e.cancelBubble = true;
	if (e.keyCode == 13) {
		e.preventDefault();
		var msg = chatinput.value;
		chatinput.value = "";
		if (msg == "/clear"){
			while (chatBox.firstChild) chatBox.firstChild.remove();
		}else if (msg == "/mute"){
			muteall = true;
			chatmute();
		}else if (msg == "/unmute"){
			muteall = false;
			chatmute();
		}else if (msg.match(/^\/mute /)){
			muteset[msg.substring(6)] = true;
			chatmute();
		}else if (msg.match(/^\/unmute /)){
			delete muteset[msg.substring(8)];
			chatmute();
		}else if (sock.user){
			var msgdata = {msg: msg};
			if (msg.match(/^\/w( |")/)) {
				var match = msg.match(/^\/w"([^"]*)"/);
				var to = (match && match[1]) || msg.substring(3, msg.indexOf(" ", 4));
				if (!to) return;
				chatinput.value = msg.substr(0, 4+to.length);
				msgdata.msg = msg.substr(4+to.length);
				msgdata.to = to;
			}
			if (!msgdata.msg.match(/^\s*$/)) sock.userEmit("chat", msgdata);
		}
		else if (!msg.match(/^\s*$/)) {
			var name = username.value || guestname || (guestname = (10000 + Math.floor(Math.random() * 89999)) + "");
			sock.emit("guestchat", { msg: msg, u: name });
		}
	}
}
function unaryParseInt(x) {
	return parseInt(x, 10);
}
function maybeLogin(e) {
	e.cancelBubble = true;
	if (e.keyCode == 13) {
		loginClick();
	}
}
function maybeChallenge(e) {
	e.cancelBubble = true;
	if (e.keyCode != 13) return;
	if (foename.value) {
		challengeClick();
	}
}
function animate() {
	setTimeout(requestAnimate, 40);
	px.next();
}
function requestAnimate() { requestAnimFrame(animate); }
function prepuser(){
	sock.user.decks = sock.user.decks.split(",");
	deckimport.value = sock.user.decks[sock.user.selectedDeck];
	sock.user.pool = sock.user.pool || "";
	sock.user.accountbound = sock.user.accountbound || "";
	if (!sock.user.quest) {
		sock.user.quest = {};
	}
	if (sock.user.freepacks) {
		sock.user.freepacks = sock.user.freepacks.split(",").map(unaryParseInt);
	}
	if (!sock.user.ailosses) sock.user.ailosses = 0;
	if (!sock.user.aiwins) sock.user.aiwins = 0;
	if (!sock.user.pvplosses) sock.user.pvplosses = 0;
	if (!sock.user.pvpwins) sock.user.pvpwins = 0;
	lbloffline.style.display = lblwantpvp.style.display = "inline";
}
function loginClick() {
	if (!sock.user && username.value) {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", "auth?u=" + encodeURIComponent(username.value) + (password.value.length ? "&p=" + encodeURIComponent(password.value) : ""), true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					sock.user = JSON.parse(this.responseText);
					if (!sock.user) {
						chat("No user");
					} else if (!sock.user.accountbound && !sock.user.pool) {
						require("./views/ElementSelect")();
					} else {
						prepuser();
						startMenu();
					}
				} else if (this.status == 404) {
					chat("Incorrect password");
				} else if (this.status == 502) {
					chat("Error verifying password");
				}
			}
		}
		xhr.send();
	}
}
function changeClick() {
	sock.userEmit("passchange", { p: password.value });
}
function challengeClick(foe) {
	if (Cards.loaded) {
		var deck = sock.getDeck();
		if (etgutil.decklength(deck) < (sock.user ? 31 : 11)){
			require("./views/Editor")();
			return;
		}
		var gameData = {};
		ui.parsepvpstats(gameData);
		if (sock.user) {
			gameData.f = typeof foe === "string" ? foe : foename.value;
			sock.userEmit("foewant", gameData);
		}else{
			gameData.deck = deck;
			gameData.room = foename.value;
			sock.emit("pvpwant", gameData);
		}
	}
}
function tradeClick(foe) {
	if (Cards.loaded)
		sock.userEmit("tradewant", { f: typeof foe === "string" ? foe : foename.value });
}
function rewardClick() {
	if (Cards.loaded)
		sock.userEmit("codesubmit", { code: foename.value });
}
function libraryClick() {
	if (Cards.loaded)
		sock.emit("librarywant", { f: foename.value });
}
function aiClick() {
	var deck = sock.getDeck(), aideckcode = aideck.value;
	if (etgutil.decklength(deck) < 11 || etgutil.decklength(aideckcode) < 11) {
		require("./views/Editor")();
		return;
	}
	var gameData = { deck: aideckcode, urdeck: deck, seed: Math.random() * etgutil.MAX_INT, foename: "Custom", cardreward: "" };
	ui.parsepvpstats(gameData);
	ui.parseaistats(gameData);
	require("./views/Match")(gameData, true);
}
function offlineChange(){
	sock.emit("showoffline", {hide: offline.checked});
}
function wantpvpChange(){
	sock.emit("wantingpvp", {want: wantpvp.checked});
}
(function(callbacks){
	for(var id in callbacks){
		for(var event in callbacks[id]){
			document.getElementById(id).addEventListener(event, callbacks[id][event]);
		}
	}
})({
	leftpane: {click: leftpane.blur},
	change: {click: changeClick},
	login: {click: loginClick},
	username: {keydown: maybeLogin},
	password: {keydown: maybeLogin},
	foename: {keydown: maybeChallenge},
	challenge: {click: challengeClick},
	trade: {click: tradeClick},
	reward: {click: rewardClick},
	library: {click: libraryClick},
	chatinput: {keydown: maybeSendChat},
	enableSound: {change: soundChange},
	enableMusic: {change: musicChange},
	aivs: {click: aiClick},
	offline: {change: offlineChange},
	wantpvp: {change: wantpvpChange},
});
})();