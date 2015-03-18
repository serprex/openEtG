var px = require("../px");
var ui = require("../uiutil");
var sock = require("../sock");
var etgutil = require("../etgutil");
var options = require("../options");

function sendChallenge(foe) {
	var deck = sock.getDeck();
	if (etgutil.decklength(deck) < (sock.user ? 31 : 9)){
		require("./Editor")();
		return;
	}
	var gameData = {};
	ui.parsepvpstats(gameData);
	if (sock.user) {
		gameData.f = foe;
		sock.userEmit("foewant", gameData);
	}else{
		gameData.deck = deck;
		gameData.room = foe;
		sock.emit("pvpwant", gameData);
	}
	sock.pvp = foe;
}
module.exports = function(){
	function maybeCustomAi(e){
		if (e.keyCode == 13) aiClick.call(this);
	}
	function aiClick() {
		if (!options.aideck) return;
		var deck = sock.getDeck();
		if (etgutil.decklength(deck) < 9 || etgutil.decklength(options.aideck) < 9) {
			require("./Editor")();
			return;
		}
		var gameData = { deck: options.aideck, urdeck: deck, seed: Math.random() * etgutil.MAX_INT, foename: "Custom", cardreward: "" };
		ui.parsepvpstats(gameData);
		ui.parseaistats(gameData);
		require("./Match")(gameData, true);
	}
	function maybeChallenge(e) {
		e.cancelBubble = true;
		if (e.keyCode == 13) sendChallenge(options.foename);
	}
	function exitClick(){
		if (sock.pvp){
			if (sock.user) sock.userEmit("foecancel");
			else sock.emit("roomcancel", {room:sock.pvp});
			delete sock.pvp;
		}
		require("./MainMenu")();
	}
	var foename = px.domInput("Challenge", "foename", true, maybeChallenge),
		pvphp = px.domInput("HP", "pvphp", true),
		pvpmark = px.domInput("Mark", "pvpmark", true),
		pvpdraw = px.domInput("Draw", "pvpdraw", true),
		pvpdeck = px.domInput("Deck", "pvpdeck", true);
	var aideck = px.domInput("AI Deck", "aideck", true, maybeCustomAi),
		aihp = px.domInput("HP", "aihp", true),
		aimark = px.domInput("Mark", "aimark", true),
		aidraw = px.domInput("Draw", "aidraw", true),
		aideckpower = px.domInput("Deck", "aideckpower", true);
	aideck.addEventListener("click", function(){this.setSelectionRange(0, 999)});
	var dom = [
		[90, 300, ["Exit", exitClick]],
		[10, 375, ["PvP", function(){sendChallenge(options.foename)}]],
		[90, 375, foename],
		[90, 400, pvphp],
		[90, 425, pvpmark],
		[90, 450, pvpdraw],
		[90, 475, pvpdeck],
		[260, 375, ["Custom AI", aiClick]],
		[340, 375, aideck],
		[340, 400, aihp],
		[340, 425, aimark],
		[340, 450, aidraw],
		[340, 475, aideckpower],
	];
	px.view({dom:dom});
}
module.exports.sendChallenge = sendChallenge;