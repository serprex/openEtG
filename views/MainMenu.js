"use strict";
var px = require("../px");
var etg = require("../etg");
var gfx = require("../gfx");
var ui = require("../uiutil");
var chat = require("../chat");
var sock = require("../sock");
var mkAi = require("../mkAi");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var options = require("../options");
var userutil = require("../userutil");
var aicostpay = [
	0, 15,
	5, 30,
	10, 70,
	20, 200,
	userutil.arenaCost(0), 60,
	userutil.arenaCost(1), 120,
];
var tipjar = [
	"Each card in your booster pack has a 50% chance of being from the chosen element",
	"Your arena deck will earn you 3$ per win & 1$ per loss",
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
	"At Wealth T50 you can see which players have the highest wealth. Wealth is a combination of current gold & one's cardpool"
];
module.exports = function(nymph) {
	var popdom, stage = {endnext: function(){
		setDom(null);
		document.removeEventListener("mousemove", resetTip);
	}};
	function setDom(dom){
		if (popdom) document.body.removeChild(popdom);
		if (popdom = dom) document.body.appendChild(dom);
	}
	function mkSetTip(text){
		return function(){
			tinfo.text = text;
		}
	}
	function costText(lv){
		return !sock.user ? "" : "Cost: " + aicostpay[lv*2] + "$. Base reward: " + aicostpay[lv*2+1] + "$";
	}
	var tipNumber = etg.PlayerRng.upto(tipjar.length);

	function resetTip(event) {
		if (event.target.tagName == "CANVAS" || event.target.tagName == "HTML") tinfo.text = sock.user ? tipjar[tipNumber] + "." : "To register, just type desired username & password in the fields to the right, then click 'Login'.";
	}
	var tinfo = px.domText(""), tstats = px.domText(sock.user ? sock.user.gold + "$ " + sock.user.name + "\nPvE " + sock.user.aiwins + " - " + sock.user.ailosses + "\nPvP " + sock.user.pvpwins + " - " + sock.user.pvplosses : "Sandbox");
	function wealthTop(){
		sock.emit("wealthtop");
		this.style.display = "none";
	}
	function titleText(text){
		var text = px.domText(text);
		text.style.fontSize = "20px";
		text.style.textAlign = "center";
		return text;
	}
	function tierText(tier) {
		var text = px.domText("Tier "+tier);
		text.style.fontSize = "18px";
		text.style.width = "50%";
		text.style.float = tier == 1 ? "left" : "right";
		text.style.textAlign = "center";
		return text;
	}
	function labelText(text) {
		var text = px.domText(text);
		text.style.fontSize = "14px";
		text.style.height = "20px";
		text.style.pointerEvents = "none";
		return text;
	}
	var deckbox = px.domBox(250, 200),
		statbox = px.domBox(250, 120),
		leadbox = px.domBox(250, 120),
		aibox = px.domBox(300, 320),
		arenabox = px.domBox(300, 170),
		playbox = px.domBox(250, 200),
		tipbox = px.domBox(820, 60),
		settingsbox = px.domBox(250, 32);
	deckbox.appendChild(titleText("Cards & Decks"));
	var bwealth = px.domButton("Wealth T50", wealthTop, mkSetTip("See who's collected the most wealth."));
	bwealth.style.position = "absolute";
	bwealth.style.left = "85px";
	arenabox.appendChild(titleText("Arena"));
	arenabox.appendChild(tierText(1));
	arenabox.appendChild(tierText(2));
	playbox.appendChild(titleText("Players"));
	var nextTip = px.domButton("Next tip", function() {
		tipNumber = (tipNumber+1) % tipjar.length;
		tinfo.text = tipjar[tipNumber] + ".";
	});
	nextTip.style.position = "absolute";
	nextTip.style.right = "2px";
	nextTip.style.bottom = "2px";
	tipbox.appendChild(nextTip);
	var dom = stage.menudom = px.domDiv(
		[40, 16, tipbox, [[tinfo]]],
		[40, 220, leadbox, [[titleText("Leaderboards")], [bwealth], [document.createElement("br")]]],
		[300, 92, aibox, [[titleText("AI Battle")]]],
		[610, 92, deckbox, [
			[90, 130, ["Deck", require("./Editor"), mkSetTip("Edit & manage your decks.")]],
		]],
		[610, 300, playbox],
		[610, 558, settingsbox]);
	[px.domButton("Commoner", mkAi.mkAi(0), mkSetTip("Commoners have no upgraded cards & mostly common cards.\n" + costText(0))),
		px.domButton("Mage", mkAi.mkPremade("mage"), mkSetTip("Mages have preconstructed decks with a couple rares.\n" + costText(1))),
		px.domButton("Champion", mkAi.mkAi(2), mkSetTip("Champions have some upgraded cards.\n" + costText(2))),
		px.domButton("Demigod", mkAi.mkPremade("demigod"), mkSetTip("Demigods are extremely powerful. Come prepared for anything.\n" + costText(3))),
	].forEach(function(b,i){
		var lab = labelText(costText(i));
		lab.style.float = "right";
		b.style.marginTop = lab.style.marginTop = "12px";
		px.domAdd(aibox, b, lab);
	});
	for (var i=0; i<2; i++){
		(function(lvi){
			function arenaAi() {
				if (etgutil.decklength(sock.getDeck()) < 31) {
					require("./Editor")();
					return;
				}
				var cost = userutil.arenaCost(lvi.lv);
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "$");
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
			if (sock.user){
				var bdiv = document.createElement("div");
				px.style(bdiv, {
					float: i ? "right" : "left",
					textAlign: "center",
					width: "50%",
				});
				var aai = px.domButton("Arena AI", arenaAi, mkSetTip("In the arena you will face decks from other players.\n" + costText(4+lvi.lv)));
				var ainfo = px.domButton("Arena Info", arenaInfo, mkSetTip("check how your arena deck is doing."));
				ainfo.style.marginTop = "24px";
				px.domAdd(bdiv, aai, document.createElement("br"), ainfo);
				arenabox.appendChild(bdiv);
			}
			var atop = px.domButton("Arena" + (i+1) + " T20", arenaTop, mkSetTip("See who the top players in arena are right now."));
			px.style(atop, {
				position: "absolute",
				left: i?"140px":"30px",
			});
			leadbox.appendChild(atop);
		})({lv:i});
	}

	if ((sock.user && sock.user.oracle) || typeof nymph === "string") {
		var oracle = new PIXI.Sprite(gfx.getArt(nymph || sock.user.oracle));
		oracle.position.set(92, 340);
		stage.view = oracle;
		delete sock.user.oracle;
	}
	document.addEventListener("mousemove", resetTip);

	function logout(cmd) {
		if (sock.user){
			sock.userEmit(cmd);
			sock.user = undefined;
			options.remember = false;
 			if (typeof localStorage !== "undefined") delete localStorage.remember;
		}
		require("./Login")();
	}
	stage.cmds = {
		librarygive: require("./Library"),
		arenainfo: require("./ArenaInfo"),
		arenatop: require("./ArenaTop"),
		wealthtop: require("./WealthTop"),
		codecard:function(data){
			require("./Reward")(data.type, data.num, foename.value);
		},
		codegold:function(data) {
			sock.user.gold += data.g;
			chat.addSpan(px.domText(data.g + "$ added!\n"));
		},
		codecode:function(data) {
			sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
			chat(Cards.Codes[data.card].name + " added!");
		},
	};
	function tradeClick(foe) {
		sock.trade = typeof foe === "string" ? foe : foename.value;
		sock.userEmit("tradewant", { f: sock.trade });
	}
	function rewardClick() {
		sock.userEmit("codesubmit", { code: foename.value });
	}
	function libraryClick() {
		var name = foename.value;
		if (!name && sock.user) name = sock.user.name;
		if (name) sock.emit("librarywant", { f: name });
	}
	function soundChange() {
		ui.changeSound(options.enableSound);
	}
	function musicChange() {
		ui.changeMusic(options.enableMusic);
	}
	function hideRightpaneChange(){
		document.getElementById("rightpane").style.display = options.hideRightpane ? "none" : "";
		sock.emit("chatus", {hide: !!options.offline || !!options.hideRightpane});
	}
	var foename = px.domInput("Trade/Library", "foename", true, true);
	foename.style.marginLeft = "46px";
	playbox.appendChild(foename);
	soundChange();
	musicChange();
	var buttons = new Array(10);;
	function fixQuickButtons() {
		for (var i = 0;i < 10;i++) {
			buttons[i].classList[sock.user.selectedDeck == sock.user.quickdecks[i] ? "add" : "remove"]("selectedbutton");
		}
	}
	function loadQuickdeck(x) {
		return function() {
			var deck = sock.user.quickdecks[x] || "";
			sock.user.selectedDeck = deck;
			sock.userEmit("setdeck", { name: deck });
			deckLabel.text = "Deck: " + sock.user.selectedDeck;
			fixQuickButtons();
		}
	}
	var blogout = px.domButton("Logout", logout.bind(null, "logout"), mkSetTip("Click here to log out."));
	blogout.style.float = "right";
	settingsbox.appendChild(blogout);
	px.domDiv(playbox,
		[30, 100, ["PvP", require("./Challenge").bind(null, true)]],
		[140, 75, ["Library", libraryClick,mkSetTip("See exactly what cards you or others own")]]);
	if (sock.user) {
		var deckLabel = labelText("Deck: " + sock.user.selectedDeck);
		deckLabel.style.whiteSpace = "nowrap";
		deckbox.appendChild(deckLabel);
		var quickslotsdiv = document.createElement("div");
		quickslotsdiv.style.textAlign = "center";
		for (var i = 0;i < 10;i++) {
			var b = px.domButton(i + 1, loadQuickdeck(i));
			b.style.width = "20px";
			if (sock.user.selectedDeck == sock.user.quickdecks[i]) b.classList.add("selectedbutton");
			buttons[i] = b;
			quickslotsdiv.appendChild(b);
		}
		deckbox.appendChild(quickslotsdiv);
		var bsettings = px.domButton("Settings", function() {
			if (popdom && popdom.id == "settingspane"){
				setDom(null);
				return;
			}
			var div = px.domBox(392, 156);
			px.style(div, {
				position: "absolute",
				left: "460px",
				top: "380px",
			});
			var wipe = px.domButton("Wipe Account",
				function() {
					if (foename.value == sock.user.name + "yesdelete") {
						logout("delete");
					} else {
						chat("Input '" + sock.user.name + "yesdelete' into Challenge to delete your account");
					}
				},
				mkSetTip("Click here to permanently remove your account.")
			);
			function changeFunc(){
				if (this.value == "Change Pass") this.value = "Confirm";
				else {
					this.value = "Change Pass";
					sock.userEmit("passchange", { p: changePass.value });
				}
			}
			var changePass = document.createElement("input"), changeBtn = px.domButton("Change Pass", changeFunc),
				enableSound = px.domCheck("Enable sound", soundChange, "enableSound"),
				enableMusic = px.domCheck("Enable music", musicChange, "enableMusic"),
				preloadart = px.domCheck("Preload art", null, "preart"),
				hideRightpane = px.domCheck("Hide rightpane", hideRightpaneChange, "hideRightpane"),
				printstats = px.domCheck("Print stats", null, "stats"),
				hideCostIcon = px.domCheck("Hide cost icon", gfx.refreshCaches, "hideCostIcon"),
				disableTut = px.domCheck("Disable tutorial", null, "disableTut");
			changePass.type = "password";
			changePass.addEventListener("keydown", function(e){
				if (e.keyCode == 13) changeFunc();
			});
			px.domDiv(div, [8, 8, changePass], [162, 8, changeBtn],
				[8, 53, enableSound], [135, 53, enableMusic], [260, 53, preloadart],
				[8, 88, hideRightpane], [135, 88, printstats], [260, 88, hideCostIcon],
				[8, 123, disableTut],
				[309, 123, wipe]);
			div.id = "settingspane";
			setDom(div);
		});
		bsettings.style.float = "left";
		settingsbox.appendChild(bsettings);
		var colocol = document.createElement("div"), questcol = document.createElement("div"),
			bquest = px.domButton("Quests", require("./QuestMain"), mkSetTip("Go on an adventure!")),
			bcolo = px.domButton("Colosseum", require("./Colosseum"), mkSetTip("Try some daily challenges in the Colosseum!"));
		colocol.style.marginTop = questcol.style.marginTop = "24px";
		colocol.style.width = questcol.style.width = "45%";
		colocol.style.float = "left";
		colocol.style.textAlign = "right";
		questcol.style.float = "right";
		px.domAdd(colocol, bcolo, labelText("Daily Challenges!"));
		px.domAdd(questcol, bquest, labelText("Go on an adventure!"));
		px.domAdd(aibox, colocol, questcol);
		px.domDiv(deckbox,
			[30, 170, ["Shop", require("./Shop"), mkSetTip("Buy booster packs which contain cards from the elements you choose.")]],
			[140, 170, ["Upgrade", require("./Upgrade"), mkSetTip("Upgrade or sell cards.")]]);
		px.domDiv(playbox,
			[30, 75, ["Trade", tradeClick, mkSetTip("Initiate trading cards with another player.")]],
			[140, 100, ["Reward", rewardClick, mkSetTip("Redeem a reward code.")]]);
		px.domDiv(dom,
			[40, 92, statbox, [
				[titleText("Stats")],
				[sock.user.gold + "$ " + sock.user.name + "\nPvE " + sock.user.aiwins + " - " + sock.user.ailosses + "\nPvP " + sock.user.pvpwins + " - " + sock.user.pvplosses]
			]],
			[300, 420, arenabox]);
	}
	var customText = labelText("Duel a custom AI!");
	var bcustom = px.domButton("Custom AI", require("./Challenge").bind(null, false), mkSetTip("Fight any deck you want, with custom stats both for you and the opponent."));
	customText.style.textAlign = "center";
	bcustom.style.marginLeft = "110px";
	bcustom.style.marginTop = "16px";
	aibox.appendChild(bcustom);
	aibox.appendChild(customText);
	resetTip({target:{tagName:"HTML"}});
	px.view(stage);
}