var chat = require("./chat");
var etgutil = require("./etgutil");
var options = require("./options");
var usercmd = require("./usercmd");
var socket = new WebSocket("ws://"+location.hostname+":13602");
var buffer = [];
var attempts = 0, attemptTimeout = 0;
socket.onopen = function(){
	attempts = 0;
	if (attemptTimeout){
		clearTimeout(attemptTimeout);
		attemptTimeout = 0;
	}
	if (options.offline || options.wantpvp || options.afk) exports.emit("chatus", {hide: !!options.offline, wantpvp: !!options.wantpvp, afk: !!options.afk});
	buffer.forEach(this.send, this);
	buffer.length = 0;
	chat("Connected");
}
socket.onclose = function reconnect(){
	if (attemptTimeout) return;
	if (attempts < 8) attempts++;
	var timeout = 99+Math.floor(99*Math.random())*attempts;
	attemptTimeout = setTimeout(function(){
		attemptTimeout = 0;
		var oldsock = socket;
		exports.et = socket = new WebSocket("ws://"+location.hostname+":13602");
		socket.onopen = oldsock.onopen;
		socket.onclose = oldsock.onclose;
		socket.onmessage = oldsock.onmessage;
	}, timeout);
	chat("Reconnecting in "+ timeout +"ms");
}
exports.et = socket;
exports.user = undefined;
exports.userEmit = function(x, data) {
	if (!data) data = {};
	data.u = exports.user.name;
	data.a = exports.user.auth;
	exports.emit(x, data);
}
exports.emit = function(x, data){
	if (!data) data = {};
	data.x = x;
	var msg = JSON.stringify(data);
	if (socket && socket.readyState == 1){
		socket.send(msg);
	}else{
		buffer.push(msg);
	}
}
exports.userExec = function(x, data){
	if (!data) data = {};
	exports.userEmit(x, data);
	usercmd[x](data, exports.user);
}
exports.getDeck = function() {
	if (exports.user) return exports.user.decknames[exports.user.selectedDeck] || "";
	var deck = (options.deck || "").trim();
	return ~deck.indexOf(" ") ? etgutil.encodedeck(deck.split(" ")) : deck;
}
exports.prepuser = function(){
	var user = exports.user;
	user.pool = user.pool || "";
	user.accountbound = user.accountbound || "";
	if (!user.quest) {
		user.quest = {};
	}
	if (!user.decknames) {
		user.decknames = {};
	}
	if (user.freepacks) {
		user.freepacks = user.freepacks.split(",").map(function(x){return parseInt(x, 10)});
	}
	if (!user.ailosses) user.ailosses = 0;
	if (!user.aiwins) user.aiwins = 0;
	if (!user.pvplosses) user.pvplosses = 0;
	if (!user.pvpwins) user.pvpwins = 0;
}