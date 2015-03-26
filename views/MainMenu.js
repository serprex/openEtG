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
	"Rarity hierarchy: Grey commons, green uncommons, blue rares, orange shard, & pink ultra rares",
	"The Library button allows you to see all of a user's tradeable cards",
	"If you are a new user, be sure to get the free Bronze & Silver packs from the Shop",
	"Starter decks, cards from free packs, & all non-Common Daily Cards are account-bound; they cannot be traded or sold",
	"If you include account-bound cards in an upgrade, the upgrade will also be account-bound",
	"You'll receive a Daily Card upon logging in after midnight GMT0. If you submit an Arena deck, it contain 5 copies of that card",
	"Unupgraded pillars & pendulums are free",
	"Cards sell for around half as much as they cost to buy from a pack",
	"Quests are free to try, & you always face the same deck. Keep trying until you collect your reward",
	"You may mulligan at the start of the game to shuffle & redraw your hand with one less card",
	"Your account name is case sensitive",
	"Arena Tier 1 is unupgraded, while Tier 2 is upgraded. All decks in a tier have the same number of attribute points",
	"If you type '/who' in chat you will get a list of the users who are online. '/w username message' will send your message only to one user",
	"Chat commands: /who, /mute, /unmute, /clear, /w, /decks",
	"Keyboard shortcuts: space ends turn, backspace cancels, w targets opponent, s targets yourself, 1 through 8 cast cards in hand",
	"The AI Deck input may be used to fight any deck of your choice, but only in sandbox mode",
	"Remember that you may use the logout button to enter sandbox mode to review the card pool, check rarities & try out new decks",
	"Commoner & Mage are unupped, Champion has some upped, & Demigod is fully upped",
	"Decks submitted to arena lose hp exponentially per day, down to a minimum of a quarter of their original hp",
	"If you don't get what you want from the packs in the shop, ask to trade in chat or the openEtG forum",
	"Rarity doesn't necessarily relate to card strength. You can go a long ways with commons & uncommons",
	"A ply is half a turn",
	"Mark cards are only obtainable through PvP events. A tournament deck verifier is at tournament.htm",
	"After an AI battle you will win a random common, uncommon, or rare from your opponent's deck",
	"Cards in packs have a (45/packsize)% chance to increment rarity",
	"At Wealth T50 you can see which players have the highest wealth. Wealth is a combination of current gold & one's cardpool"
];
function mkBox(w, h){
	var d = document.createElement("div");
	d.style.width = w + "px";
	d.style.height = h + "px";
	return d;
}
var bg_main = new Image();
bg_main.src = "assets/bg_main.png";
bg_main.style.zIndex = "-1";
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
		return px.style(px.domText(text), {
			fontSize: "20px",
			textAlign: "center",
		});
	}
	function labelText(text) {
		return px.style(px.domText(text), {
			fontSize: "14px",
			pointerEvents: "none",
		});
	}
	function costText(lv, n){
		return labelText((n ? "Base reward: " : "Cost: ") + aicostpay[lv*2+n] + "$");
	}
	var deckbox = mkBox(196, 176),
		statbox = mkBox(196, 120),
		leadbox = mkBox(196, 120),
		aibox = mkBox(292, 240),
		arenabox = mkBox(292, 130),
		playbox = mkBox(196, 200),
		tipbox = mkBox(504, 48);
	deckbox.appendChild(titleText("Cards & Decks"));
	var bwealth = px.domButton("Wealth T50", wealthTop, mkSetTip("See who's collected the most wealth."));
	bwealth.style.position = "absolute";
	bwealth.style.left = "52px";
	arenabox.appendChild(titleText("Arena"));
	playbox.appendChild(titleText("Players"));
	var nextTip = px.domButton("Next tip", function() {
		tipNumber = (tipNumber+1) % tipjar.length;
		tinfo.text = tipjar[tipNumber] + ".";
	});
	nextTip.style.position = "absolute";
	nextTip.style.right = "2px";
	nextTip.style.bottom = "2px";
	tipbox.appendChild(nextTip);
	var dom = stage.menudom = px.domDiv(bg_main,
		[196, 4, tipbox, [[tinfo]]],
		[86, 248, leadbox, [[titleText("Leaderboards")], [bwealth], [document.createElement("br")]]],
		[304, 120, aibox, [[titleText("AI Battle")]]],
		[620, 92, deckbox, [
			[64, 108, ["Editor", require("./Editor"), mkSetTip("Edit & manage your decks.")]],
		]],
		[620, 300, playbox]);
	[px.domButton("Commoner", mkAi.mkAi(0), mkSetTip("Commoners have no upgraded cards & mostly common cards.")),
		px.domButton("Mage", mkAi.mkPremade("mage"), mkSetTip("Mages have preconstructed decks with a couple rares.")),
		px.domButton("Champion", mkAi.mkAi(2), mkSetTip("Champions have some upgraded cards.")),
		px.domButton("Demigod", mkAi.mkPremade("demigod"), mkSetTip("Demigods are extremely powerful. Come prepared for anything.")),
	].forEach(function(b,i){
		var clab = costText(i, 0), rlab = costText(i, 1);
		px.style(clab, rlab, {
			position: "absolute",
			top: 24+i*24+"px",
		});
		clab.style.right = "114px";
		rlab.style.right = "4px";
		px.domAdd(aibox, [4, 24+i*24, b], clab, rlab);
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
			function arenaTop() {
				sock.emit("arenatop", lvi);
				this.style.display = "none";
			}
			if (sock.user){
				var y = 24+i*24, b = px.domButton("Arena AI", arenaAi, mkSetTip("In the arena you will face decks from other players.")),
					clab = costText(4+lvi.lv, 0), rlab = costText(4+lvi.lv, 1),
					tx = px.domText("Tier " + (lvi.lv+1));
				px.style(clab, rlab, {
					position: "absolute",
					top: y+"px",
				});
				clab.style.right = "114px";
				rlab.style.right = "4px";
				px.domAdd(arenabox, [4, y, tx], [40, y, b], clab, rlab);
			}
			var atop = px.domButton("Arena" + (i+1) + " T20", arenaTop, mkSetTip("See who the top players in arena are right now."));
			px.style(atop, {
				position: "absolute",
				left: i?"100px":"10px",
			});
			leadbox.appendChild(atop);
		})({lv:i});
	}
	function arenaInfo() {
		sock.userEmit("arenainfo");
		this.style.display = "none";
	}
	if (sock.user){
		px.domAdd(arenabox, [20, 100, ["Arena Info", arenaInfo, mkSetTip("Check how your arena decks are doing.")]]);
		if (nymph || sock.user.oracle) {
			var oracle = new PIXI.Sprite(gfx.getArt(nymph || sock.user.oracle));
			oracle.position.set(92, 340);
			stage.view = oracle;
			delete sock.user.oracle;
		}
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
	foename.style.marginLeft = "24px";
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
	px.domAdd(dom, [744, 558, ["Logout", logout.bind(null, "logout"), mkSetTip("Click here to log out.")]]);
	px.domAdd(playbox,
		[10, 100, ["PvP", require("./Challenge").bind(null, true)]],
		[120, 75, ["Library", libraryClick,mkSetTip("See exactly what cards you or others own")]]);
	if (sock.user) {
		var deckLabel = labelText("Deck: " + sock.user.selectedDeck);
		deckLabel.style.whiteSpace = "nowrap";
		deckLabel.style.marginLeft = "16px";
		var quickslotsdiv = document.createElement("div");
		quickslotsdiv.style.textAlign = "center";
		for (var i = 0;i < 10;i++) {
			var b = px.domButton(i + 1, loadQuickdeck(i));
			b.style.width = "20px";
			if (sock.user.selectedDeck == sock.user.quickdecks[i]) b.classList.add("selectedbutton");
			buttons[i] = b;
			quickslotsdiv.appendChild(b);
			if (i == 4) quickslotsdiv.appendChild(document.createElement("br"));
		}
		px.domAdd(deckbox, deckLabel, quickslotsdiv);
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
			px.domAdd(div, [8, 8, changePass], [162, 8, changeBtn],
				[8, 53, enableSound], [135, 53, enableMusic], [260, 53, preloadart],
				[8, 88, hideRightpane], [135, 88, printstats], [260, 88, hideCostIcon],
				[8, 123, disableTut],
				[309, 123, wipe]);
			div.id = "settingspane";
			setDom(div);
		});
		px.domAdd(dom, [620, 558, bsettings]);
		var colocol = document.createElement("div"), questcol = document.createElement("div"),
			bquest = px.domButton("Quests", require("./QuestMain"), mkSetTip("Go on an adventure!")),
			bcolo = px.domButton("Colosseum", require("./Colosseum"), mkSetTip("Try some daily challenges in the Colosseum!"));
		px.style(colocol, questcol, {
			marginTop: "108px",
			width: "45%",
		});
		colocol.style.float = "left";
		colocol.style.textAlign = "right";
		questcol.style.float = "right";
		px.domAdd(colocol, bcolo, labelText("Daily Challenges!"));
		px.domAdd(questcol, bquest, labelText("Go on an adventure!"));
		px.domAdd(aibox, colocol, questcol);
		px.domAdd(deckbox,
			[14, 128, ["Shop", require("./Shop"), mkSetTip("Buy booster packs which contain cards from the elements you choose.")]],
			[114, 128, ["Upgrade", require("./Upgrade"), mkSetTip("Upgrade or sell cards.")]]);
		px.domAdd(playbox,
			[10, 75, ["Trade", tradeClick, mkSetTip("Initiate trading cards with another player.")]],
			[120, 100, ["Reward", rewardClick, mkSetTip("Redeem a reward code.")]]);
		px.domAdd(dom,
			[86, 92, statbox, [
				[titleText("Stats")],
				[sock.user.gold + "$ " + sock.user.name + "\nPvE " + sock.user.aiwins + " - " + sock.user.ailosses + "\nPvP " + sock.user.pvpwins + " - " + sock.user.pvplosses]
			]],
			[304, 380, arenabox]);
	}
	var customText = labelText("Duel a custom AI!");
	var bcustom = px.domButton("Custom AI", require("./Challenge").bind(null, false), mkSetTip("Fight any deck you want, with custom stats both for you and the opponent."));
	customText.style.textAlign = "center";
	bcustom.style.marginLeft = "110px";
	bcustom.style.marginTop = "4px";
	px.domAdd(aibox, bcustom, customText);
	resetTip({target:{tagName:"HTML"}});
	px.view(stage);
}