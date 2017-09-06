const px = require("../px"),
	dom = require("../dom"),
	sock = require("../sock"),
	util = require("../util"),
	etgutil = require("../etgutil"),
	options = require("../options"),
	Components = require('../Components'),
	h = preact.h;

function sendChallenge(foe) {
	var deck = sock.getDeck();
	if (etgutil.decklength(deck) < (sock.user ? 31 : 9)) {
		require("./Editor")();
		return;
	}
	var gameData = {};
	options.parsepvpstats(gameData);
	if (sock.user) {
		gameData.f = foe;
		sock.userEmit("foewant", gameData);
	} else {
		gameData.deck = deck;
		gameData.room = foe;
		sock.emit("pvpwant", gameData);
	}
	sock.pvp = foe;
}

module.exports = function(pvp) {
	function makeChallenge(foe) {
		if (!foe) return;
		pvpInputs.forEach(function(x) { x.attributes.style.visibility = "hidden" });
		cancelButton.attributes.style.visibility = "visible";
		challengeLabel.attributes.children = ["You have challenged " + foe];
		sendChallenge(options.foename);
		px.render(view);
	}
	function maybeCustomAi(e) {
		if (e.keyCode == 13) aiClick.call(this);
	}
	function aiClick() {
		if (!options.aideck) return;
		var deck = sock.getDeck();
		if (etgutil.decklength(deck) < 9 || etgutil.decklength(options.aideck) < 9) {
			require("./Editor")();
			return;
		}
		var gameData = { deck: options.aideck, urdeck: deck, seed: util.randint(), foename: "Custom", cardreward: "" };
		options.parsepvpstats(gameData);
		options.parseaistats(gameData);
		require("./Match")(gameData, true);
	}
	function maybeChallenge(e) {
		e.cancelBubble = true;
		if (e.keyCode == 13) makeChallenge(options.foename);
	}
	function exitClick() {
		if (sock.pvp) {
			if (sock.user) sock.userEmit("foecancel");
			else sock.emit("roomcancel", { room: sock.pvp });
			delete sock.pvp;
		}
		require("./MainMenu")();
	}
	function cancelClick() {
		pvpInputs.forEach(function(x) { x.attributes.style.visibility = "visible" });
		challengeLabel.attributes.children = [];
		cancelButton.attributes.style.visibility = "hidden";
		if (sock.pvp) {
			if (sock.user) sock.userEmit("foecancel");
			else sock.emit("roomcancel", { room: sock.pvp });
			delete sock.pvp;
		}
		delete sock.spectate;
		px.render(view);
	}
	function labelText(x, y, text) {
		return h('span', { style: { fontSize: '18px', color: '#fff', pointerEvents: 'none', position: 'absolute', left: x+'px', top: y+'px' }});
	}
	var deck = etgutil.decodedeck(sock.getDeck()), mark = etgutil.fromTrueMark(deck.pop());
	var children = [h(Components.DeckDisplay, {deck:deck})];
	var foename = h(Components.Input, {
		placeholder:"Challenge",
		opt:"foename",
		onKeyPress: maybeChallenge,
		x: 190, y: 375,
	});
	var pvphp = h(Components.Input, { placeholder: "HP", opt: "pvphp", num: true, x: 190, y: 425 }),
		pvpmark = h(Components.Input, { placeholder: "Mark", opt: "pvpmark", num: true, x: 190, y: 450 }),
		pvpdraw = h(Components.Input, { placeholder: "Draw", opt: "pvpdraw", num: true, x: 190, y: 475 }),
		pvpdeck = h(Components.Input, { placeholder: "Deck", opt: "pvpdeck", num: true, x: 190, y: 500 }),
		pvpButton = h('input', {
			type: 'button',
			value: 'PvP',
			onClick: function() { makeChallenge(options.foename) },
			style: {
				position: 'absolute',
				left: '110px',
				top: '375px',
			},
		}),
		spectateButton = h('input', {
			type: 'button',
			value: 'Spectate',
			onClick: function() {
				sock.spectate = options.foename;
				sock.userEmit("spectate", {f: sock.spectate});
			},
			style: {
				position: 'absolute',
				left: '110px',
				top: '450px',
			},
		}),
		cancelButton = h('input', {
			type: 'button',
			value: 'Cancel',
			onClick: cancelClick,
			style: {
				visibility: 'hidden',
				position: 'absolute',
				left: '110px',
				top: '400px',
			}
		});
	var pvpInputs = [pvpButton, foename, pvphp, pvpmark, pvpdraw, pvpdeck, spectateButton];
	var aideck = h(Components.Input, {
			placeholder: 'AI Deck',
			opt: 'aideck',
			onKeyPress: maybeCustomAi,
			x: 440, y: 375,
		}),
		aihp = h(Components.Input, {
			placeholder: 'HP',
			opt: 'aihp',
			num: true,
			x: 440, y: 425,
		}),
		aimark = h(Components.Input, { placeholder: "Mark", opt: "aimark", num: true, x: 440, y: 450 }),
		aidraw = h(Components.Input, { placeholder: "Draw", opt: "aidraw", num: true, x: 440, y: 475 }),
		aideckpower = h(Components.Input, { placeholder: "Deck", opt: "aideckpower", num: true, x: 440, y: 500}),
		challengeLabel = h('div', { style: { position: 'absolute', left: '190px', top: '375px' } }),
		markSprite = h('span', { className: 'ico e'+mark, style: { position: 'absolute', left: '66px', top: '200px' }});
	// aideck.addEventListener("click", function() { this.setSelectionRange(0, 999) });
	children.push(markSprite,
		h(Components.ExitBtn, { x: 190, y: 300, onClick: exitClick }),
		labelText(190, 400, "Own stats:"),
		pvphp, pvpmark, pvpdraw, pvpdeck);
	if (pvp){
		children.push(pvpButton, spectateButton, cancelButton, foename, challengeLabel);
	}else{
		children.push(
			h('input', {
				type: 'button',
				value: 'Custom AI',
				onClick: aiClick,
				style: {
					position: 'absolute',
					left: '360px',
					top: '375px',
				}
			}), aideck, labelText(440, 400, "AI's stats:"),
			aihp, aimark, aidraw, aideckpower
		);
	}
	px.view({endnext:px.hideapp});
	var view = h(Components.App, { children: children });
	px.render(view);
}
module.exports.sendChallenge = sendChallenge;