"use strict";
var px = require("../px");
var dom = require("../dom");
var etg = require("../etg");
var gfx = require("../gfx");
var svg = require("../svg");
var chat = require("../chat");
var sock = require("../sock");
var util = require("../util");
var mkAi = require("../mkAi");
var audio = require("../audio");
var Cards = require("../Cards");
var Thing = require("../Thing");
var Status = require("../Status");
var etgutil = require("../etgutil");
var options = require("../options");
var RngMock = require("../RngMock");
var userutil = require("../userutil");
var tipjar = [
	"Each card in your booster pack has a 50% chance of being from the chosen element",
	"Your arena deck will earn you 3$ per win & 1$ per loss",
	"Colosseum lets you compete in a number of daily events for extra prizes. The colosseum challenges reset daily",
	"Be sure to try the Proving Grounds Quests for some good cards",
	"Rarity ratings: Grey commons, green uncommons, blue rares, orange shard, & pink ultra rares",
	"The Library button allows you to see all of a user's cards & progress",
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
	"At Wealth T50 you can see which players have the highest wealth. Wealth is a combination of current gold & one's cardpool",
	"Throttling means that the effect is limited to 2 procs when attacking multiple times with adrenaline",
];
var bg_main = new Image();
bg_main.src = "assets/bg_main.png";
bg_main.className = "bgimg";
function addCostRewardHeaders(div){
	var costText = dom.text("Cost"), rewardText = dom.text("Base Reward");
	dom.style(costText, rewardText, {
		position: "absolute",
		top: "24px",
	});
	costText.style.right = "114px";
	rewardText.style.right = "4px";
	dom.add(div, costText, rewardText);
}
function initEndless(){
	var gameData = { deck: require("../ai/deck")(.5, 2, 5), urdeck: sock.getDeck(), seed: util.randint(), p2hp: 0x100000000, p2markpower: 2, foename: "The Invincible", p2drawpower: 2, level: 7, goldreward: 0, cardreward: "" };
	var game = require("./Match")(gameData, true);
	var endlessRelic = Object.create(Thing.prototype);
	endlessRelic.card = Cards.Despair;
	endlessRelic.status = new Status();
	endlessRelic.status.set("immaterial", 1);
	function endlessAuto(c, t){
		var plies = c.owner.game.ply;
		if (c.rng() < .1){
			c.owner.markpower++;
		}
		if ((plies&15) == 13){
			c.owner.foe.addCrea(new Thing(Cards.Singularity.asUpped(c.rng() < plies/100)));
		}
		if ((plies&1) || c.rng() < .3) c.owner.foe.buffhp(-1);
	}
	function endlessDraw(c, t){
		var card = t.hand[t.hand.length-1].card;
		if (t == c.owner.game.player1 && c.rng() < .3) card = card.asUpped(false);
		t.deck.splice(t.upto(t.deck.length), 0, card);
	}
	endlessRelic.active = {auto:{name: ["@&%"], func: endlessAuto}, draw:{name: ["~~!"], func: endlessDraw}};
	game.player2.addPerm(endlessRelic);
}
module.exports = function(nymph) {
	var popdom, stage = {endnext: function(){
		setPopup(null);
		document.removeEventListener("mousemove", resetTip);
	}};
	function setPopup(ele){
		if (popdom) document.body.removeChild(popdom);
		if (popdom = ele) document.body.appendChild(ele);
	}
	function mkSetTip(text){
		return function(){
			tinfo.text = text + ".";
		}
	}
	var tipNumber = RngMock.upto(tipjar.length);

	function resetTip(event) {
		if (event.target.tagName.match(/^(DIV|CANVAS|HTML)$/)) tinfo.text = sock.user ? tipjar[tipNumber] + "." : "To register, just type desired username & password in the fields to the right, then click 'Login'.";
	}
	var tinfo = dom.text("");
	function wealthTop(){
		sock.emit("wealthtop");
		this.style.display = "none";
	}
	function titleText(text){
		return dom.style(dom.text(text), {
			fontSize: "20px",
			textAlign: "center",
		});
	}
	function labelText(text) {
		return dom.style(dom.text(text), {
			fontSize: "14px",
			pointerEvents: "none",
		});
	}
	function costText(lv, n){
		return labelText(userutil.pveCostReward[lv*2+n] + "$");
	}
	var deckbox = dom.divwh(196, 176),
		statbox = dom.divwh(196, 120),
		leadbox = dom.divwh(196, 120),
		aibox = dom.divwh(292, 240),
		arenabox = dom.divwh(292, 130),
		playbox = dom.divwh(196, 200),
		tipbox = dom.divwh(504, 48);
	deckbox.appendChild(titleText("Cards & Decks"));
	var bwealth = dom.button("Wealth T50", wealthTop, mkSetTip("See who's collected the most wealth"));
	bwealth.style.position = "absolute";
	bwealth.style.left = "52px";
	arenabox.appendChild(titleText("Arena"));
	playbox.appendChild(titleText("Players"));
	var nextTip = dom.style(dom.button("Next tip", function() {
		tipNumber = (tipNumber+1) % tipjar.length;
		tinfo.text = tipjar[tipNumber] + ".";
	}),{
		position: "absolute",
		right: "2px",
		bottom: "2px",
	});
	var div = stage.dom = dom.div(bg_main,
		[196, 4, tipbox, tinfo, nextTip],
		[86, 248, leadbox, titleText("Leaderboards"), bwealth, document.createElement("br")],
		[304, 120, aibox, titleText("AI Battle")],
		[620, 92, deckbox,
			[14, 108, ["Editor", require("./Editor"), mkSetTip("Edit & manage your decks")]],
		],
		[620, 300, playbox]);
	addCostRewardHeaders(aibox);
	addCostRewardHeaders(arenabox);
	[dom.button("Commoner", mkAi.mkAi(0), mkSetTip("Commoners have no upgraded cards & mostly common cards")),
		dom.button("Mage", mkAi.mkPremade(1), mkSetTip("Mages have preconstructed decks with a couple rares")),
		dom.button("Champion", mkAi.mkAi(2), mkSetTip("Champions have some upgraded cards")),
		dom.button("Demigod", mkAi.mkPremade(3), mkSetTip("Demigods are extremely powerful. Come prepared for anything")),
	].forEach(function(b,i){
		var y = 46+i*22, clab = costText(i, 0), rlab = costText(i, 1);
		dom.style(clab, rlab, {
			position: "absolute",
			top: y+"px",
		});
		clab.style.right = "114px";
		rlab.style.right = "4px";
		dom.add(aibox, [4, y, b], clab, rlab);
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
					chat("Requires " + cost + "$", "System");
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
				var y = 46+i*22, b = dom.button("Arena" + (lvi.lv+1) + " AI", arenaAi, mkSetTip("In the arena you will face decks from other players")),
					clab = costText(4+lvi.lv, 0), rlab = costText(4+lvi.lv, 1);
				dom.style(clab, rlab, {
					position: "absolute",
					top: y+"px",
				});
				clab.style.right = "114px";
				rlab.style.right = "4px";
				dom.add(arenabox, [4, y, b], clab, rlab);
			}
			var atop = dom.button("Arena" + (i+1) + " T20", arenaTop, mkSetTip("See who the top players in arena are right now"));
			dom.style(atop, {
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
		dom.add(arenabox, [20, 100, ["Arena Info", arenaInfo, mkSetTip("Check how your arena decks are doing")]]);
		var showcard = nymph || (!sock.user.daily && sock.user.ocard);
		if (showcard) {
			var oracle = dom.svg();
			oracle.setAttribute("width", "128");
			oracle.setAttribute("height", "256");
			oracle.style.pointerEvents = "none";
			dom.add(div, [92, 340, oracle]);
			dom.svgToSvg(oracle, svg.card(showcard));
			if (sock.user.daily == 0) sock.user.daily = 128;
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
			chat.addSpan(dom.text(data.g + "$ added!\n"));
		},
		codecode:function(data) {
			sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
			chat(Cards.Codes[data.card].name + " added!", "System");
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
		audio.changeSound(options.enableSound);
	}
	function musicChange() {
		audio.changeMusic(options.enableMusic);
	}
	function hideRightpaneChange(){
		document.getElementById("rightpane").style.display = options.hideRightpane ? "none" : "";
		sock.emit("chatus", {hide: !!options.offline || !!options.hideRightpane});
	}
	var foename = dom.input("Trade/Library", "foename", true, true);
	foename.style.marginLeft = "24px";
	playbox.appendChild(foename);
	soundChange();
	musicChange();
	function fixQuickButtons() {
		for (var i = 0;i < 10;i++) {
			quickslotsdiv.children[i].classList[sock.user.selectedDeck == sock.user.qecks[i] ? "add" : "remove"]("selectedbutton");
		}
	}
	function loadQuickdeck(x) {
		return function() {
			sock.userExec("setdeck", { name: sock.user.qecks[x] || "" });
			deckLabel.text = "Deck: " + sock.user.selectedDeck;
			fixQuickButtons();
		}
	}
	dom.add(div, [744, 558, ["Logout", logout.bind(null, "logout"), mkSetTip("Click here to log out")]]);
	dom.add(playbox,
		[10, 100, ["PvP", require("./Challenge").bind(null, true)]],
		[120, 75, ["Library", libraryClick,mkSetTip("See exactly what cards you or others own")]]);
	if (sock.user) {
		var deckLabel = labelText("Deck: " + sock.user.selectedDeck);
		deckLabel.style.whiteSpace = "nowrap";
		deckLabel.style.marginLeft = "16px";
		var quickslotsdiv = document.createElement("div");
		quickslotsdiv.style.textAlign = "center";
		for (var i = 0;i < 10;i++) {
			var b = dom.button(i + 1, loadQuickdeck(i));
			b.className = "editbtn";
			if (sock.user.selectedDeck == sock.user.qecks[i]) b.classList.add("selectedbutton");
			quickslotsdiv.appendChild(b);
		}
		dom.add(deckbox, deckLabel, quickslotsdiv);
		var bsettings = dom.button("Settings", function() {
			if (popdom && popdom.id == "settingspane"){
				setPopup(null);
				return;
			}
			var div = dom.box(267, 156);
			dom.style(div, {
				position: "absolute",
				left: "585px",
				top: "380px",
			});
			var wipe = dom.button("Wipe Account",
				function() {
					if (foename.value == sock.user.name + "yesdelete") {
						logout("delete");
					} else {
						chat("Input '" + sock.user.name + "yesdelete' into Trade/Library to delete your account", "System");
					}
				},
				mkSetTip("Click here to permanently remove your account")
			);
			function changeFunc(){
				if (this.value == "Change Pass") this.value = "Confirm";
				else {
					this.value = "Change Pass";
					sock.userEmit("passchange", { p: changePass.value });
				}
			}
			var changePass = document.createElement("input"), changeBtn = dom.button("Change Pass", changeFunc),
				enableSound = dom.check("Enable sound", soundChange, "enableSound"),
				enableMusic = dom.check("Enable music", musicChange, "enableMusic"),
				hideRightpane = dom.check("Hide rightpane", hideRightpaneChange, "hideRightpane"),
				showCostIcon = dom.check("Show cost icon", gfx.refreshCaches, "showCostIcon"),
				disableTut = dom.check("Disable tutorial", null, "disableTut");
			changePass.type = "password";
			changePass.addEventListener("keypress", function(e){
				if (e.keyCode == 13) changeFunc();
			});
			dom.add(div, [8, 8, changePass], [184, 8, changeBtn],
				[8, 53, enableSound], [135, 53, enableMusic],
				[8, 88, hideRightpane], [135, 88, showCostIcon],
				[8, 123, disableTut],
				[184, 123, wipe]);
			div.id = "settingspane";
			setPopup(div);
		});
		dom.add(div, [620, 558, bsettings]);
		var colocol = document.createElement("div"), questcol = document.createElement("div"),
			bquest = dom.button("Quests", require("./QuestMain"), mkSetTip("Go on an adventure")),
			bcolo = dom.button("Colosseum", require("./Colosseum"), mkSetTip("Try some daily challenges in the Colosseum")),
			bendless = dom.button("Endless", initEndless, mkSetTip("See how long you last against The Invincible"));
		dom.style(colocol, questcol, {
			marginTop: "132px",
			width: "45%",
		});
		colocol.style.float = "left";
		colocol.style.textAlign = "right";
		questcol.style.float = "right";
		dom.add(colocol, bcolo, labelText("Daily Challenges"), bendless, labelText("Fight the invincible"));
		dom.add(questcol, bquest, labelText("Go on an adventure"));
		dom.add(aibox, colocol, questcol);
		dom.add(deckbox,
			[14, 132, ["Shop", require("./Shop"), mkSetTip("Buy booster packs which contain cards from the elements you choose")]],
			[114, 132, ["Bazaar", require("./Bazaar"), mkSetTip("Buy singles at a 300% premium")]],
			[114, 108, ["Upgrade", require("./Upgrade"), mkSetTip("Upgrade or sell cards")]]);
		dom.add(playbox,
			[10, 75, ["Trade", tradeClick, mkSetTip("Initiate trading cards with another player")]],
			[120, 100, ["Reward", rewardClick, mkSetTip("Redeem a reward code")]]);
		dom.add(div,
			[86, 92, statbox,
				titleText("Stats"),
				[sock.user.gold + "$ " + sock.user.name + "\nPvE " + sock.user.aiwins + " - " + sock.user.ailosses + "\nPvP " + sock.user.pvpwins + " - " + sock.user.pvplosses],
			],
			[304, 380, arenabox]);
	}
	var customcol = document.createElement("div");
	var customText = labelText("Duel a custom AI");
	var bcustom = dom.button("Custom AI", require("./Challenge").bind(null, false), mkSetTip("Fight any deck you want, with custom stats both for you and the opponent"));
	dom.style(customcol, {
		width: "45%",
		float: "right",
	});
	if (!sock.user) customcol.style["margin-top"] = "128px";
	dom.add(customcol, bcustom, customText);
	dom.add(aibox, customcol);
	resetTip({target:{tagName:"HTML"}});
	px.view(stage);
}