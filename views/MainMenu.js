"use strict";
var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");
var ui = require("./uiutil");
var chat = require("./chat");
var sock = require("./sock");
var mkAi = require("./mkAi");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var options = require("./options");
var userutil = require("./userutil");
module.exports = function(nymph) {
	var mainmenu = document.getElementById("mainmenu");
	var tipjar = [
		"Each card in your booster pack has a 50% chance of being from the chosen element",
		"Your arena deck will earn you $3 per win & $1 per loss",
		"Colosseum lets you compete in a number of daily events for extra prizes. The colosseum challenges reset daily",
		"Be sure to try the Proving Grounds Quests for some good cards",
		"Be sure to keep track of the rarity icons; Grey means Common, Green means Uncommon, Blue means Rare, Orange means Shard, & Pink means Ultra Rare",
		"The Library button allows you to see all of a user's tradeable cards",
		"If you are a new user, be sure to get the free Bronze & Silver packs from the Shop",
		"Starter decks, cards from free packs, & all non-Common Daily Cards are account-bound; they cannot be traded or sold",
		"If you include account-bound cards in an upgrade, the upgrade will also be account-bound",
		"You'll receive a Daily Card upon logging in after midnight GMT0. If you submit an Arena deck, the deck will always contain 5 copies of that card",
		"Unupgraded pillars & pendulums are free",
		"Cards sell for around half as much as they cost to buy from a pack",
		"Quests are free to try, & you always face the same deck. Keep trying until you collect your reward",
		"You may mulligan at the start of the game to shuffle & redraw your hand with one less card",
		"Your account name is case sensitive",
		"Arena Tier 1 is unupgraded, while Tier 2 is upgraded. All decks in a tier have the same number of attribute points",
		"If you type '/who' in chat you will get a list of the users who are online. '/w username message' will send your message only to one user",
		"Chat commands: /who, /mute, /unmute, /clear, /w, /decks",
		"Keyboard shortcuts: space ends turn, backspace cancels, w targets opponent, s targets yourself, 1 through 8 cast cards in hand",
		"The first text bar under the game is the import/export bar & shows your current deck. The bar below it shows game messages & sometimes the opponent's deck",
		"The AI Deck input may be used to fight any deck of your choice, but only in sandbox mode",
		"Remember that you may use the logout button to enter sandbox mode to review the card pool, check rarities & try out new decks",
		"Commoner & Champion have random decks, while Mage & Demigod have premade decks. Commoner & Mage are unupped, Champion has some upped, & Demigod is fully upped",
		"Decks submitted to arena lose hp exponentially per day, down to a minimum of a quarter of their original hp",
		"If you don't get what you want from the packs in the shop, ask to trade in chat or the openEtG forum",
		"Rarity doesn't necessarily relate to card strength. You can go a long ways with commons & uncommons",
		"A ply is half a turn",
		"Mark cards are only obtainable through PvP events. A tournament deck verifier is at tournament.htm",
		"After an AI battle you will win a random common, uncommon, or rare from your opponent's deck",
		"Cards in packs have a (45/packsize)% chance to increment rarity",
		"At Wealth T50 you can see which players has the highest wealth. Your wealth is a combination of your current gold and the value of all your cards."
	];
	var tipNumber = etg.PlayerRng.upto(tipjar.length);

	var menuui = px.mkView(function() {
		tinfo.setText(sock.user ? "Tip: " + tipjar[tipNumber] + "." : "To register, just type desired username & password in the fields to the right, then click 'Login'.");
	});
	menuui.addChild(px.mkBgRect(
		40, 16, 820, 60,
		40, 92, 392, 80,
		40, 192, 392, 80,
		40, 292, 392, 80,
		40, 392, 492, 80,
		40, 492, 492, 80,
		770, 90, 90, 184,
		770, 540, 90, 38
	));
	["AI BATTLE", "ARENA", "CARDS", "OPTIONS", "PvP"].forEach(function(text, i){
		var sectionText = new PIXI.Text(text, {font: "56px Dosis", fill: "#0c4262"});
		sectionText.position.set(236, 108+i*100);
		sectionText.anchor.x = .5;
		if (sectionText.width > 350) sectionText.width = 350;
		menuui.addChild(sectionText);
	});
	for (var i=1; i<=2; i++){
		var tierText = new PIXI.Text("Tier " + i, {font: "24px Dosis", fill: "#0c4262"});
		tierText.position.set(362, 166+i*38);
		menuui.addChild(tierText);
	}

	var buttons = [], utons = [[777, 50, ["Next tip", function() {
		tipNumber = (tipNumber+1) % tipjar.length;
		tinfo.setText("Tip: " + tipjar[tipNumber] + ".");
	}]]];

	var tstats = new px.MenuText(775, 101, (sock.user ? "$" + sock.user.gold + "\nAI w/l\n" + sock.user.aiwins + "/" + sock.user.ailosses + "\n\nPvP w/l\n" + sock.user.pvpwins + "/" + sock.user.pvplosses : "Sandbox"));
	menuui.addChild(tstats);

	var tinfo = new px.MenuText(50, 26, "", 800);
	menuui.addChild(tinfo);

	function wealthTop(){
		sock.emit("wealthtop");
		this.style.display = "none";
	}
	buttons.push(
		[50, 100, ["Commoner", mkAi.mkAi(0), function() {
			tinfo.setText("Commoners have no upgraded cards & mostly common cards.\nCost: $0");
		}]],
		[150, 100, ["Mage", mkAi.mkPremade("mage"), function() {
			tinfo.setText("Mages have preconstructed decks with a couple rares.\nCost: $5");
		}]],
		[250, 100, ["Champion", mkAi.mkAi(2), function() {
			tinfo.setText("Champions have some upgraded cards.\nCost: $10");
		}]],
		[350, 100, ["Demigod", mkAi.mkPremade("demigod"), function() {
			tinfo.setText("Demigods are extremely powerful. Come prepared for anything.\nCost: $20");
		}]],
		[50, 300, ["Editor", require("./Editor"), function() {
			tinfo.setText("Edit your deck, as well as submit an arena deck.");
		}]],
		[250, 300, ["Wealth T50", wealthTop, function() {
			tinfo.setText("See who's collected the most wealth.");
		}]]
	);
	for (var i=0; i<2; i++){
		(function(lvi){
			function arenaAi() {
				if (etgutil.decklength(sock.getDeck()) < 31) {
					require("./Editor")();
					return;
				}
				var cost = userutil.arenaCost(lvi.lv);
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "\u00A4");
					return;
				}
				sock.userEmit("foearena", lvi);
				this.style.display = "none";
			}
			function arenaInfo() {
				sock.userEmit("arenainfo", lvi);
				this.style.display = "none";
			}
			function arenaTop() {
				sock.emit("arenatop", lvi);
				this.style.display = "none";
			}
			var y = 200+i*45;
			utons.push(
				[50, y, ["Arena AI", arenaAi, function() {
					tinfo.setText("In the arena you will face decks from other players.\nCost: $" + userutil.arenaCost(lvi.lv));
				}]],
				[150, y, ["Arena Info", arenaInfo, function() {
					tinfo.setText("Check how your arena deck is doing.");
				}]]
			);
			buttons.push(
				[250, y, ["Arena T20", arenaTop, function() {
					tinfo.setText("See who the top players in arena are right now.");
				}]]
			);
		})({lv:i});
	}

	if ((sock.user && sock.user.oracle) || typeof nymph === "string") {
		var oracle = new PIXI.Sprite(gfx.getArt(nymph || sock.user.oracle));
		oracle.position.set(450, 100);
		menuui.addChild(oracle);
		delete sock.user.oracle;
	}

	function logout(cmd) {
		sock.userEmit(cmd);
		sock.user = undefined;
		document.getElementById("usermenu").style.display = "none";
		tstats.setText("Sandbox");
		if (oracle) {
			menuui.removeChild(oracle);
		}
	}
	menuui.cmds = {
		pvpgive: require("./Match"),
		tradegive: require("./Trade"),
		librarygive: require("./Library"),
		arenainfo: require("./ArenaInfo"),
		arenatop: require("./ArenaTop"),
		wealthtop: require("./WealthTop"),
		codecard:function(data){
			require("./Reward")(data.type, data.num, foename.value);
		},
		codegold:function(data) {
			sock.user.gold += data.g;
			chat(data.g + "\u00A4 added!");
		},
		codecode:function(data) {
			sock.user.pool = etgutil.addcard(sock.user.pool, data);
			chat(Cards.Codes[data].name + " added!");
		},
		challenge:function(data) {
			var span = document.createElement("span");
			span.style.cursor = "pointer";
			span.style.color = "blue";
			span.addEventListener("click", (data.pvp ? challengeClick : tradeClick).bind(null, data.f));
			span.appendChild(document.createTextNode(data.f + (data.pvp ? " challenges you to a duel!" : " wants to trade with you!")));
			chat.addSpan(span);
			sock.emit("challrecv", {f: data.f, pvp: data.pvp});
		},
	};
	function challengeClick(foe) {
		var deck = sock.getDeck();
		if (etgutil.decklength(deck) < (sock.user ? 31 : 11)){
			require("./Editor")();
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
	function maybeChallenge(e) {
		e.cancelBubble = true;
		if (e.keyCode != 13) return;
		if (foename.value) {
			challengeClick();
		}
	}
	function tradeClick(foe) {
		sock.userEmit("tradewant", { f: typeof foe === "string" ? foe : foename.value });
	}
	function rewardClick() {
		sock.userEmit("codesubmit", { code: foename.value });
	}
	function libraryClick() {
		var name = foename.value;
		if (!name && sock.user) name = sock.user.name;
		if (name) sock.emit("librarywant", { f: name });
	}
	function offlineChange(){
		sock.emit("showoffline", {hide: options.offline});
	}
	function wantpvpChange(){
		sock.emit("wantingpvp", {want: options.wantpvp});
	}
	function soundChange(event) {
		ui.changeSound(options.enableSound);
	}
	function musicChange(event) {
		ui.changeMusic(options.enableMusic);
	}
	function makeCheck(text, change, opt, persist){
		var lbl = document.createElement("label"), box = document.createElement("input");
		box.type = "checkbox";
		if (opt) options.register(opt, box, persist);
		if (change) box.addEventListener("change", change);
		lbl.appendChild(box);
		lbl.appendChild(document.createTextNode(text));
		return lbl;
	}
	function makeInput(placeholder, keydown){
		var input = document.createElement("input");
		input.placeholder = placeholder;
		if (keydown) input.addEventListener("keydown", keydown);
		else input.className = "numput";
		return input;
	}
	var foename = makeInput("Challenge", maybeChallenge);
	var pvphp = makeInput("HP"), pvpmark = makeInput("Mark"), pvpdeck = makeInput("Deck"), pvpdraw = makeInput("Draw");
	var printstats = makeCheck("Print stats", null, "stats"), preloadart = makeCheck("Preload Art", null, "preart");
	var enableMusic = makeCheck("Enable music", musicChange, "enableMusic"), enableSound = makeCheck("Enable sound", soundChange, "enableSound");
	var wantpvp = makeCheck("Seeking PvP", wantpvpChange, "wantpvp"), offline = makeCheck("Appear Offline", offlineChange, "offline");
	options.register("foename", foename, true);
	options.register("pvphp", pvphp, true);
	options.register("pvpmark", pvpmark, true);
	options.register("pvpdeck", pvpdeck, true);
	options.register("pvpdraw", pvpdraw, true);
	soundChange();
	musicChange();
	buttons.push(
		[50, 400, makeCheck("Hide Rightpane", function(){document.getElementById('rightpane').style.display=this.checked?'none':'inline'})],
		[175, 400, wantpvp],
		[300, 400, offline],
		[50, 445, enableSound],
		[175, 445, enableMusic],
		[300, 445, printstats],
		[425, 445, preloadart],
		[50, 500, foename],
		[200, 500, pvphp],
		[235, 500, pvpmark],
		[270, 500, pvpdraw],
		[305, 500, pvpdeck],
		[50, 545, ["PvP", challengeClick]],
		[140, 545, ["Trade", tradeClick]],
		[230, 545, ["Reward", rewardClick]],
		[320, 545, ["Library", libraryClick]]
	);
	var stage = {view: menuui, normmenu: buttons};
	if (sock.user){
		utons.push(
			[50, 145, ["Quests", require("./QuestMain"), function() {
				tinfo.setText("Go on an adventure!");
			}]],
			[150, 145, ["Colosseum", require("./Colosseum"), function() {
				tinfo.setText("Try some daily challenges in the Colosseum!");
			}]],
			[150, 300, ["Shop", require("./Shop"), function() {
				tinfo.setText("Buy booster packs which contain cards from the elements you choose.");
			}]],
			[150, 345, ["Sell/Upgrade", require("./Upgrade"), function() {
				tinfo.setText("Upgrade or sell cards.");
			}]],
			[777, 246, ["Logout", logout.bind(null, "logout"), function() {
				tinfo.setText("Click here to log out.")
			}]],
			[777, 550, ["Wipe Account",
				function() {
					if (foename.value == sock.user.name + "yesdelete") {
						logout("delete");
					} else {
						chat("Input '" + sock.user.name + "yesdelete' into Challenge to delete your account");
					}
				},
				function() {
					tinfo.setText("Click here to permanently remove your account.");
				}
			]]
		);
		stage.usermenu = utons;
	}
	px.refreshRenderer(stage);
}