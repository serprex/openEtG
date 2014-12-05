"use strict";
PIXI.AUTO_PREVENT_DEFAULT = false;
window.aideck = document.getElementById("aideck");
(function(){
	var guestname, muteset = {}, muteall;
	var px = require("./px");
	var etg = require("./etg");
	var gfx = require("./gfx");
	var ui = require("./uiutil");
	var chat = require("./chat");
	var Cards = require("./Cards");
	var etgutil = require("./etgutil");
	var options = require("./options");
	var userutil = require("./userutil");
	var startMenu = require("./views/MainMenu");
	var lastError = 0;
	window.onerror = function(){
		var now = Date.now();
		if (lastError+999<now){
			chat(Array.apply(null, arguments).join(", "));
			lastError = now;
		}
	}
	options.register("username", document.getElementById("username"));
	options.register("remember", document.getElementById("remember"));
	var sockEvents = {
		userdump:function(data) {
			delete data.x;
			sock.user = data;
			sock.prepuser();
			startMenu();
		},
		passchange:function(data) {
			sock.user.auth = data.auth;
			chat("Password updated");
		},
		chat:function(data) {
			if (muteall || data.u in muteset) return;
			if (typeof Notification !== "undefined" && sock.user && ~data.msg.indexOf(sock.user.name) && !document.hasFocus()){
				Notification.requestPermission();
				new Notification(data.u, {body: data.msg});
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
				if (reres.index != lastindex) span.appendChild(document.createTextNode(data.msg.slice(lastindex, reres.index)));
				var notlink = false;
				for(var i=2; i<reres[0].length; i+=5){
					var code = reres[0].substr(i, 3);
					if (!(code in Cards.Codes) && etg.fromTrueMark(code) == -1){
						notlink = true;
						break;
					}
				}
				if (notlink){
					lastindex = reres.index;
					continue;
				}
				var link = document.createElement("a");
				link.href = "deck/" + reres[0];
				link.target = "_blank";
				link.appendChild(document.createTextNode(reres[0]));
				span.appendChild(link);
				lastindex = reres.index + reres[0].length;
			}
			if (lastindex != data.msg.length) span.appendChild(document.createTextNode(data.msg.slice(lastindex)));
			chat.addSpan(span);
		},
		cardart:function(data) {
			gfx.preloadCardArt(data.art);
		},
		foearena:function(data) {
			aideck.value = data.deck;
			var game = require("./views/Match")({ deck: data.deck, urdeck: sock.getDeck(), seed: data.seed,
				p2hp: data.hp, foename: data.name, p2drawpower: data.draw, p2markpower: data.mark, arena: data.name, level: 4+data.lv }, true);
			game.cost = userutil.arenaCost(data.lv);
			sock.user.gold -= game.cost;
		},
	};
	var sock = require("./sock");
	sock.et.on("message", function(data){
		data = JSON.parse(data);
		var func = sockEvents[data.x] || (px.realStage.children.length > 1 && px.realStage.children[1].cmds && (func = px.realStage.children[1].cmds[data.x]));
		if (func){
			func.call(sock.et, data);
		}
	});
	require("./httpcards")(function(){
		if (options.preart) sock.emit("cardart");
	});
	px.load();
	if (options.remember && typeof localStorage !== "undefined"){
		loginClick(localStorage.auth);
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
			var chatinput = document.getElementById("chatinput"), msg = chatinput.value.trim();
			chatinput.value = "";
			if (msg == "/clear"){
				var chatBox = document.getElementById("chatBox");
				while (chatBox.firstChild) chatBox.firstChild.remove();
			}else if (msg == "/who"){
				sock.emit("who");
			}else if (msg.match(/^\/roll( |$)\d*d?\d*$/)){
				var data = {u:sock.user ? sock.user.name : ""}
				var ndn = msg.slice(6).split("d");
				if (!ndn[1]){
					data.X = parseInt(ndn[0] || etgutil.MAX_INT);
				}else{
					data.A = parseInt(ndn[0]);
					data.X = parseInt(ndn[1]);
				}
				sock.emit("roll", data);
			}else if (msg.match(/^\/decks/) && sock.user){
				var prefix = msg.length > 6 && msg.slice(6).replace(/ {2,}/g, " ").trim().split(" ");
				var names = Object.keys(sock.user.decknames);
				if (prefix) names = names.filter(function(name){return prefix.some(function(x){return name.indexOf(x)==0;})});
				names.sort();
				names.forEach(function(name){
					var deck = sock.user.decknames[name];
					var span = document.createElement("span");
					var link = document.createElement("a");
					link.href = "deck/" + deck;
					link.target = "_blank";
					link.className = "eicon e"+etg.fromTrueMark(deck.slice(-3));
					span.appendChild(link);
					span.appendChild(document.createTextNode(name+" "));
					span.addEventListener("click", function(e){
						if (e.target != this) return;
						var deckname = document.getElementById("deckname"), deckimport = document.getElementById("deckimport");
						if (deckname && deckimport){
							deckname.value = name;
							deckimport.value = deck;
							deckname.dispatchEvent(new Event("change"));
							deckimport.dispatchEvent(new Event("change"));
							var e = new Event("keydown");
							e.keyCode = 13;
							deckname.dispatchEvent(e);
							deckimport.dispatchEvent(e);
						}
					});
					chat.addSpan(span);
				});
			}else if (msg == "/mute"){
				muteall = true;
				chatmute();
			}else if (msg == "/unmute"){
				muteall = false;
				chatmute();
			}else if (msg.match(/^\/mute /)){
				muteset[msg.slice(6)] = true;
				chatmute();
			}else if (msg.match(/^\/unmute /)){
				delete muteset[msg.slice(8)];
				chatmute();
			}else if (!msg.match(/^\/[^/]/) || (sock.user && msg.match(/^\/w( |")/))) {
				msg = msg.replace(/^\/\//, "/");
				if (sock.user){
					var data = {msg: msg};
					if (msg.match(/^\/w( |")/)) {
						var match = msg.match(/^\/w"([^"]*)"/);
						var to = (match && match[1]) || msg.slice(3, msg.indexOf(" ", 4));
						if (!to) return;
						chatinput.value = msg.slice(0, 4+to.length);
						data.msg = msg.slice(4+to.length);
						data.to = to;
					}
					if (!data.msg.match(/^\s*$/)) sock.userEmit("chat", data);
				}else{
					var name = options.username || guestname || (guestname = (10000 + etg.PlayerRng.upto(89999) + ""));
					if (!msg.match(/^\s*$/)) sock.emit("guestchat", { msg: msg, u: name });
				}
			}else chat("Not a command: " + msg);
		}
	}
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
				var password = document.getElementById("password").value;
				auth = password.length ? "&p=" + encodeURIComponent(password) : "";
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
								require("./views/ElementSelect")();
							} else {
								sock.prepuser();
								sock.userEmit("usernop");
								if (gfx.loaded) startMenu();
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
	function changeClick() {
		sock.userEmit("passchange", { p: password.value });
	}
	function aiClick() {
		this.blur();
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
	(function(callbacks){
		for(var id in callbacks){
			for(var event in callbacks[id]){
				document.getElementById(id).addEventListener(event, callbacks[id][event]);
			}
		}
	})({
		leftpane: {click: function(){this.blur()}},
		aideck: {click: function(){this.setSelectionRange(0, 999)}},
		change: {click: changeClick},
		login: {click: loginClick},
		username: {keydown: maybeLogin},
		password: {keydown: maybeLogin},
		chatinput: {keydown: maybeSendChat},
		aivs: {click: aiClick},
		remember: {change: function(){
			if (typeof localStorage !== "undefined"){
				if (!this.checked) delete localStorage.auth;
				else if (sock.user) localStorage.auth = sock.user.auth;
			}
		}}
	});
})();