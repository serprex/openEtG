var chat = require("./chat");
var etgutil = require("./etgutil");
var options = require("./options");
var userutil = require("./userutil");
var socket = eio({hostname: location.hostname, port: 13602});
socket.on("close", function(){
	require("./chat")("Reconnecting in 99ms");
	setTimeout(socket.open.bind(socket), 99);
});
socket.on("open", function(){
	chat("Connected");
	if (options.offline) exports.emit("showoffline", {hide: options.offline});
	if (options.wantpvp) exports.emit("wantingpvp", {want: options.wantpvp});
});
exports.et = socket;
exports.user = undefined;
exports.userEmit = function(x, data) {
	if (!data) data = {};
	data.x = x;
	data.u = exports.user.name;
	data.a = exports.user.auth;
	socket.send(JSON.stringify(data));
}
exports.emit = function(x, data){
	if (!data) data = {};
	data.x = x;
	socket.send(JSON.stringify(data));
}
exports.userExec = function(x, data){
	if (!data) data = {};
	exports.userEmit(x, data);
	userutil[x](data, exports.user);
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
		user.freepacks = user.freepacks.split(",").map(function unaryParseInt(x) {return parseInt(x, 10)});
	}
	if (!user.ailosses) user.ailosses = 0;
	if (!user.aiwins) user.aiwins = 0;
	if (!user.pvplosses) user.pvplosses = 0;
	if (!user.pvpwins) user.pvpwins = 0;
}