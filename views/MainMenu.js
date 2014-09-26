"use strict";
var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");
var chat = require("./chat");
var sock = require("./sock");
var mkAi = require("./mkAi");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
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
		"You may store 10 decks in the editor",
		"If you type '/who' in chat you will get a list of the users who are online. '/w username message' will send your message only to one user",
		"Chat commands: /who, /mute, /unmute, /clear, /w",
		"Keyboard shortcuts: space ends turn, backspace cancels, w targets opponent, s targets yourself, 1 through 8 cast cards in hand",
		"The first text bar under the game is the import/export bar & shows your current deck. The bar below it shows game messages & sometimes the opponent's deck",
		"The AI Deck input may be used to fight any deck of your choice, but only in sandbox mode",
		"Remember that you may use the logout button to enter sandbox mode to review the card pool, check rarities & try out new decks",
		"Commoner & Champion have random decks, while Mage & Demigod have premade decks. Commoner & Mage are unupped, Champion has some upped, & Demigod is fully upped",
		"Decks submitted to arena gain a point per win, & lose a point per loss. Rankings are shown in Arena T20",
		"Decks submitted to arena lose hp exponentially per day, down to a minimum of a quarter of their original hp",
		"If you don't get what you want from the packs in the shop, ask to trade in chat or the openEtG forum",
		"Rarity doesn't necessarily relate to card strength. You can go a long ways with commons & uncommons",
		"A ply is half a turn",
		"Mark cards are only obtainable through PvP events. A tournament deck verifier is at tournament.htm",
		"After an AI battle you will win a random common, uncommon, or rare from your opponent's deck",
		"Cards in packs have a (45/packsize)% chance to increment rarity",
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
	["AI BATTLE", "ARENA", "DECK MANAGEMENT", "OPTIONS", "PvP"].forEach(function(text, i){
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
		}]]
	);
	for (var i=0; i<2; i++){
		(function(lvi){
			function arenaAi() {
				if (Cards.loaded) {
					if (etgutil.decklength(sock.getDeck()) < 31) {
						startEditor();
						return;
					}
					var cost = userutil.arenaCost(lvi.i);
					if (sock.user.gold < cost) {
						chat("Requires " + cost + "\u00A4");
						return;
					}
					sock.userEmit("foearena", lvi);
					menuui.removeChild(this);
				}
			}
			function arenaInfo() {
				if (Cards.loaded) {
					sock.userEmit("arenainfo", lvi);
					menuui.removeChild(this);
				}
			}
			function arenaTop() {
				if (Cards.loaded) {
					sock.emit("arenatop", lvi);
					menuui.removeChild(this);
				}
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
		lbloffline.style.display = lblwantpvp.style.display = "none";
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
		foearena:function(data) {
			aideck.value = data.deck;
			var game = require("./Match")({ deck: data.deck, urdeck: sock.getDeck(), seed: data.seed,
				p2hp: data.hp, foename: data.name, p2drawpower: data.draw, p2markpower: data.mark, arena: data.name, level: 4+data.lv }, true);
			game.cost = userutil.arenaCost(data.lv);
			sock.user.gold -= game.cost;
		},
		arenainfo: require("./ArenaInfo"),
		arenatop: require("./ArenaTop"),
	};
	var div = {normmenu: buttons};
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
			[250, 300, ["Sell/Upgrade", require("./Upgrade"), function() {
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
		div.usermenu = utons;
	}
	px.refreshRenderer({view: menuui, div: div, dom: mainmenu});
}