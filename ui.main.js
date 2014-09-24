"use strict";
(function() {
var htmlElements = ["leftpane", "chatinput", "deckimport", "aideck", "foename", "change", "login", "password", "challenge", "chatBox", "trade", "bottompane", "demigodmode", "username", "stats","enableSound", "hideright", "lblhideright", "wantpvp", "lblwantpvp", "offline", "lbloffline", "packmulti"];
htmlElements.forEach(function(name){
	window[name] = document.getElementById(name);
});
if (localStorage){
	[username, stats, enableSound, enableMusic, hideright, wantpvp, offline].forEach(function(storei){
		var field = storei.type == "checkbox" ? "checked" : "value";
		if (localStorage[storei.id] !== undefined){
			storei[field] = localStorage[storei.id];
		}
		storei.addEventListener("change", function() {
			localStorage[this.id] = field == "checked" && !this[field] ? "" : this[field];
		});
	});
}
})();
(function(){
require("./etg.client").loadcards();
PIXI.AUTO_PREVENT_DEFAULT = false;
var user, guestname, muteset = {}, muteall;
var etgutil = require("./etgutil");
var userutil = require("./userutil");
var etg = require("./etg");
var Actives = require("./Actives");
var Effect = require("./Effect");
var Quest = require("./Quest");
var ui = require("./uiutil");
var aiDecks = require("./Decks");
var Cards = require("./Cards");
var px = require("./px");
px.getCardImage = getCardImage;
px.isFreeCard = isFreeCard;
var sock = require("./Sock");
var caimgcache = {}, crimgcache = {}, wsimgcache = {}, artcache = {}, artimagecache = {};
var shinyFilter = new PIXI.ColorMatrixFilter();
shinyFilter.matrix = [
	0,1,0,0,
	0,0,1,0,
	1,0,0,0,
	0,0,0,1,
];
function makeArt(card, art, oldrend) {
	var rend = oldrend || new PIXI.RenderTexture(132, 256);
	var template = new PIXI.DisplayObjectContainer();
	template.addChild(new PIXI.Sprite(gfx.cardBacks[card.element+(card.upped?13:0)]));
	var rarity = new PIXI.Sprite(gfx.ricons[card.rarity]);
	rarity.anchor.set(0, 1);
	rarity.position.set(5, 252);
	template.addChild(rarity);
	if (art) {
		var artspr = new PIXI.Sprite(art);
		artspr.position.set(2, 20);
		if (card.shiny) artspr.filters = [shinyFilter];
		template.addChild(artspr);
	}
	var typemark = new PIXI.Sprite(gfx.ticons[card.type]);
	typemark.anchor.set(1, 1);
	typemark.position.set(128, 252);
	template.addChild(typemark);
	var nametag = new PIXI.Text(card.name, { font: "12px Dosis", fill: card.upped ? "black" : "white" });
	nametag.position.set(2, 4);
	template.addChild(nametag);
	if (card.cost) {
		var text = new PIXI.Text(card.cost, { font: "12px Dosis", fill: card.upped ? "black" : "white" });
		text.anchor.x = 1;
		text.position.set(rend.width - 20, 4);
		template.addChild(text);
		if (card.costele) {
			var eleicon = new PIXI.Sprite(gfx.eicons[card.costele]);
			eleicon.position.set(rend.width - 1, 10);
			eleicon.anchor.set(1, .5);
			eleicon.scale.set(.5, .5);
			template.addChild(eleicon);
		}
	}
	var infospr = new PIXI.Sprite(ui.getTextImage(card.info(), ui.mkFont(11, card.upped ? "black" : "white"), "", rend.width-4));
	infospr.position.set(2, 150);
	template.addChild(infospr);
	rend.render(template, null, true);
	return rend;
}
function getArtImage(code, cb){
	if (!(code in artimagecache)){
		var loader = new PIXI.ImageLoader("Cards/" + code + ".png");
		loader.addEventListener("loaded", function() {
			return cb(artimagecache[code] = PIXI.Texture.fromFrame("Cards/" + code + ".png"));
		});
		loader.load();
	}
	return cb(artimagecache[code]);
}
function getArt(code) {
	if (artcache[code]) return artcache[code];
	else {
		return getArtImage(code, function(art){
			return artcache[code] = makeArt(Cards.Codes[code], art, artcache[code]);
		});
	}
}
function getCardImage(code) {
	if (caimgcache[code]) return caimgcache[code];
	else {
		var card = Cards.Codes[code];
		var rend = new PIXI.RenderTexture(100, 20);
		var graphics = new PIXI.Graphics();
		graphics.lineStyle(1, card && card.shiny ? 0xdaa520 : 0x222222);
		graphics.beginFill(card ? ui.maybeLighten(card) : code == "0" ? 0x887766 : 0x111111);
		graphics.drawRect(0, 0, 99, 19);
		graphics.endFill();
		if (card) {
			var clipwidth = 2;
			if (card.cost) {
				var text = new PIXI.Text(card.cost, { font: "11px Dosis", fill: card.upped ? "black" : "white" });
				text.anchor.x = 1;
				text.position.set(rend.width - 20, 5);
				graphics.addChild(text);
				clipwidth += text.width + 22;
				if (card.costele) {
					var eleicon = new PIXI.Sprite(gfx.eicons[card.costele]);
					eleicon.position.set(rend.width - 1, 10);
					eleicon.anchor.set(1, .5);
					eleicon.scale.set(.5, .5);
					graphics.addChild(eleicon);
				}
			}
			var text, loopi = 0;
			do text = new PIXI.Text(card.name.substring(0, card.name.length - (loopi++)), { font: "11px Dosis", fill: card.upped ? "black" : "white" }); while (text.width > rend.width - clipwidth);
			text.position.set(2, 5);
			graphics.addChild(text);
		}
		rend.render(graphics);
		return caimgcache[code] = rend;
	}
}
function getCreatureImage(code) {
	if (crimgcache[code]) return crimgcache[code];
	else {
		return getArtImage(code, function(art){
			var card = Cards.Codes[code];
			var rend = new PIXI.RenderTexture(64, 82);
			var graphics = new PIXI.Graphics();
			var border = new PIXI.Sprite(gfx.cardBorders[card.element + (card.upped ? 13 : 0)]);
			border.scale.set(0.5, 0.5);
			graphics.addChild(border);
			graphics.beginFill(card ? ui.maybeLighten(card) : ui.elecols[0]);
			graphics.drawRect(0, 9, 64, 64);
			graphics.endFill();
			if (art) {
				var artspr = new PIXI.Sprite(art);
				artspr.scale.set(0.5, 0.5);
				artspr.position.set(0, 9);
				if (card.shiny) artspr.filters = [shinyFilter];
				graphics.addChild(artspr);
			}
			if (card) {
				var text = new PIXI.Text(card.name, { font: "8px Dosis", fill: card.upped ? "black" : "white" });
				text.anchor.x = 0.5;
				text.position.set(33, 72);
				graphics.addChild(text);
			}
			rend.render(graphics);
			return crimgcache[code] = rend;
		});
	}
}
var getPermanentImage = getCreatureImage; // Different name in case a makeover happens
function getWeaponShieldImage(code) {
	if (wsimgcache[code]) return wsimgcache[code];
	else {
		return getArtImage(code, function(art){
			var card = Cards.Codes[code];
			var rend = new PIXI.RenderTexture(80, 102);
			var graphics = new PIXI.Graphics();
			var border = (new PIXI.Sprite(gfx.cardBorders[card.element + (card.upped ? 13 : 0)]));
			border.scale.set(5/8, 5/8);
			graphics.addChild(border);
			graphics.beginFill(card ? ui.maybeLighten(card) : ui.elecols[0]);
			graphics.drawRect(0, 11, 80, 80);
			graphics.endFill();
			if (art) {
				var artspr = new PIXI.Sprite(art);
				artspr.scale.set(5/8, 5/8);
				artspr.position.set(0, 11);
				if (card.shiny) artspr.filters = [shinyFilter];
				graphics.addChild(artspr);
			}
			if (card) {
				var text = new PIXI.Text(card.name, { font: "10px Dosis", fill: card.upped ? "black" : "white" });
				text.anchor.x = 0.5;
				text.position.set(40, 91);
				graphics.addChild(text);
			}
			rend.render(graphics);
			return wsimgcache[code] = rend;
		});
	}
}
function initTrade() {
	var stage = px.mkView();
	var cardminus = {};
	var btrade = px.mkButton(10, 40, "Trade");
	var bconfirm = px.mkButton(10, 70, "Confirm");
	var bconfirmed = new PIXI.Text("Confirmed!", { font: "16px Dosis" });
	var bcancel = px.mkButton(10, 10, "Cancel");
	var cardChosen = false;
	function setCardArt(code){
		cardArt.setTexture(getArt(code));
		cardArt.visible = true;
	}
	var ownDeck = new px.DeckDisplay(30, setCardArt,
		function(i) {
			adjust(cardminus, ownDeck.deck[i], -1);
			ownDeck.rmCard(i);
		}
	);
	var foeDeck = new px.DeckDisplay(30, setCardArt);
	foeDeck.position.x = 350;
	stage.addChild(ownDeck);
	stage.addChild(foeDeck);
	px.setClick(bcancel, function() {
		sock.userEmit("canceltrade");
		startMenu();
	});
	px.setClick(btrade, function() {
		if (ownDeck.deck.length > 0) {
			sock.emit("cardchosen", {c: etgutil.encodedeck(ownDeck.deck)});
			console.log("Trade sent", ownDeck.deck);
			cardChosen = true;
			stage.removeChild(btrade);
			stage.addChild(bconfirm);
		}
		else chat("You have to choose at least a card!");
	});
	px.setClick(bconfirm, function() {
		if (foeDeck.deck.length > 0) {
			console.log("Confirmed!", ownDeck.deck, foeDeck.deck);
			sock.userEmit("confirmtrade", { cards: etgutil.encodedeck(ownDeck.deck), oppcards: etgutil.encodedeck(foeDeck.deck) });
			stage.removeChild(bconfirm);
			stage.addChild(bconfirmed);
		}
		else chat("Wait for your friend to choose!");
	});
	bconfirmed.position.set(10, 110);
	px.setInteractive(btrade);
	stage.addChild(btrade);
	stage.addChild(bcancel);

	var cardpool = etgutil.deck2pool(sock.user.pool);
	var cardsel = new px.CardSelector(setCardArt,
		function(code){
			var card = Cards.Codes[code];
			if (ownDeck.deck.length < 30 && !isFreeCard(card) && code in cardpool && !(code in cardminus && cardminus[code] >= cardpool[code])) {
				adjust(cardminus, code, 1);
				ownDeck.addCard(code);
			}
		}
	);
	stage.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	stage.addChild(cardArt);
	stage.cmds = {
		cardchosen: function(data){
			foeDeck.deck = etgutil.decodedeck(data.c);
			foeDeck.renderDeck(0);
		},
		tradedone: function(data) {
			sock.user.pool = etgutil.mergedecks(sock.user.pool, data.newcards);
			sock.user.pool = etgutil.removedecks(sock.user.pool, data.oldcards);
			startMenu();
		},
		tradecanceled: startMenu,
	};
	px.refreshRenderer(stage, function() {
		var mpos = px.getMousePosition();
		cardArt.visible = false;
		cardsel.next(cardpool, cardminus, mpos);
		foeDeck.next(mpos);
		ownDeck.next(mpos);
	});
}
function initLibrary(data){
	var stage = px.mkView();
	var bexit = px.mkButton(10, 10, "Exit");
	px.setClick(bexit, startMenu);
	stage.addChild(bexit);
	var cardpool = etgutil.deck2pool(data.pool);
	var cardsel = new px.CardSelector(function(code){
		cardArt.setTexture(getArt(code));
	});
	stage.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	stage.addChild(cardArt);
	var wealth = data.gold || 0;
	for(var code in cardpool){
		var card = Cards.Codes[code], num = cardpool[code];
		if (card){
			if (card.rarity == 0){
				if (card.upped && card.shiny) wealth += 300 * num;
				else if (card.upped || card.shiny) wealth += 50 * num;
			}else if (card.rarity > 0){
				var worth = [1.66, 6.66, 33.33, 40, 250][card.rarity-1];
				if (card.upped) worth *= 6;
				if (card.shiny) worth *= 6;
				wealth += worth * num;
			}
		}
	}
	stage.addChild(new px.MenuText(100, 16, "Cumulative wealth: " + Math.round(wealth)));
	px.refreshRenderer(stage, function(){
		cardsel.next(cardpool);
	});
}
function initGame(data, ai) {
	var game = new etg.Game(data.seed, data.flip);
	addToGame(game, data);
	game.player1.maxhp = game.player1.hp;
	game.player2.maxhp = game.player2.hp;
	var deckpower = [data.p1deckpower, data.p2deckpower];
	var decks = [data.urdeck, data.deck];
	for (var j = 0;j < 2;j++) {
		var pl = game.players(j);
		etgutil.iterdeck(decks[j], function(code){
			var idx;
			if (code in Cards.Codes) {
				pl.deck.push(Cards.Codes[code]);
			} else if (~(idx = etg.fromTrueMark(code))) {
				pl.mark = idx;
			}
		});
		if (deckpower[j]) {
			pl.deck = deckPower(pl.deck, deckpower[j]);
		}
		else if (pl.drawpower > 1){
			pl.deck = deckPower(pl.deck, 2);
		}
	}
	var foeDeck = game.player2.deck.slice();
	game.turn.drawhand(7);
	game.turn.foe.drawhand(7);
	if (data.foename) game.foename = data.foename;
	if (ai) game.ai = true;
	startMatch(game, foeDeck);
	return game;
}
function deckPower(deck, amount) {
	if (amount > 1){
		var res = deck.slice();
		for (var i = 1;i < amount;i++) {
			Array.prototype.push.apply(res, deck);
		}
		return res;
	}else return deck;
}
function getDeck() {
	if (sock.user) return sock.user.decks[sock.user.selectedDeck];
	var deck = deckimport.value.trim();
	return ~deck.indexOf(" ") ? etgutil.encodedeck(deck.split(" ")) : deck;
}
function listify(maybeArray) {
	if (maybeArray instanceof Array) return maybeArray;
	else return maybeArray.split();
}
function count(haystack, needle){
	var c = 0, i=-1;
	for(;;){
		i = haystack.indexOf(needle, i+1);
		if (~i) c++;
		else return c;
	}
}
function victoryScreen(game) {
	var victoryui = px.mkView();
	var winner = game.winner == game.player1;

	victoryui.addChild(new px.MenuText(10, 290, "Plies: " + game.ply + "\nTime: " + (game.time/1000).toFixed(1) + " seconds"));
	if (winner){
		var victoryText = game.quest ? game.wintext : "You won!";
		var tinfo = new px.MenuText(450, game.cardreward ? 130 : 250, victoryText, 500);
		tinfo.anchor.x = 0.5;
		tinfo.anchor.y = 1;
		victoryui.addChild(tinfo);
	}

	var bexit = px.mkButton(412, 430, "Exit");
	px.setClick(bexit, function() {
		if (game.quest) {
			if (winner && game.choicerewards)
				startRewardWindow(game.choicerewards, game.rewardamount, true);
			else
				startQuestArea(game.area);
		}
		else if (game.daily !== undefined){
			startColosseum();
		}else startMenu();
	});
	victoryui.addChild(bexit);
	if (winner && sock.user){
		sock.userExec("addwin", { pvp: !game.ai });
		if (game.goldreward) {
			var goldshown = game.goldreward - (game.cost || 0);
			var tgold = new px.MenuText(340, 550, "Won $" + goldshown);
			victoryui.addChild(tgold);
			sock.userExec("addgold", { g: game.goldreward });
		}
		if (game.cardreward) {
			var x0 = 470-etgutil.decklength(game.cardreward)*20;
			etgutil.iterdeck(game.cardreward, function(code, i){
				var cardArt = new PIXI.Sprite(getArt(code));
				cardArt.anchor.x = .5;
				cardArt.position.set(x0+i*40, 170);
				victoryui.addChild(cardArt);
			});
			sock.userExec(game.quest?"addbound":"addcards", { c: game.cardreward });
		}
	}

	if (stats.checked){
		chat([game.level || 0, (game.foename || "?").replace(/,/g, " "), winner ? "W" : "L", game.ply, game.time, game.player1.hp, game.player1.maxhp, (game.goldreward || 0) - (game.cost || 0), game.cardreward || "-"].join());
	}

	function onkeydown(e){
		if (e.keyCode == 32) bexit.click();
		else if (e.keyCode == 87 && !game.quest && game.daily === undefined){
			switch(game.level){
			case 0:mkAi(0)();break;
			case 1:mkPremade("mage")();break;
			case 2:mkAi(2)();break;
			case 3:mkPremade("demigod")();break;
			case 4:sock.userEmit("foearena", {lv:0});break;
			case 5:sock.userEmit("foearena", {lv:1});break;
			}
		}
	}
	document.addEventListener("keydown", onkeydown);
	victoryui.endnext = function() {
		document.removeEventListener("keydown", onkeydown);
	}

	px.refreshRenderer(victoryui);
}

function mkPremade(name, daily) {
	return function() {
		var urdeck = getDeck();
		if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
			startEditor();
			return;
		}
		var cost = daily !== undefined ? 0 : name == "mage" ? 5 : 20, foedata;
		if (sock.user) {
			if (daily === undefined){
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "\u00A4");
					return;
				}
			}else{
				foedata = aiDecks[name][sock.user[name == "mage" ? "dailymage" : "dailydg"]];
			}
		}
		if (!foedata) foedata = aiDecks.giveRandom(name);
		var foename = name[0].toUpperCase() + name.slice(1) + "\n" + foedata[0];
		var gameData = { deck: foedata[1], urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, foename: foename };
		if (name == "mage"){
			gameData.p2hp = 125;
		}else{
			gameData.p2hp = 200;
			gameData.p2markpower = 3;
			gameData.p2drawpower = 2;
		}
		if (!sock.user) parsepvpstats(gameData);
		else{
			gameData.cost = cost;
		}
		gameData.level = name == "mage" ? 1 : 3;
		if (daily !== undefined) gameData.daily = daily;
		return initGame(gameData, true);
	}
}
function mkQuestAi(questname, stage, area) {
	var quest = Quest[questname][stage];
	if (!quest)
		return "Quest " + questname + ":" + stage + " does not exist.";
	var markpower = quest.markpower || 1;
	var drawpower = quest.drawpower || 1;
	var hp = quest.hp || 100;
	var playerHPstart = quest.urhp || 100;
	var urdeck = getDeck();
	if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
		return "ERROR: Your deck is invalid or missing! Please exit & create a valid deck in the deck editor.";
	}
	var game = initGame({ deck: quest.deck, urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, p2hp: hp, p2markpower: markpower, foename: quest.name, p1hp: playerHPstart, p2drawpower: drawpower }, true);
	if (quest.morph) {
		game.player1.deck = game.player1.deck.map(quest.morph.bind(quest));
	}
	game.quest = [questname, stage];
	game.wintext = quest.wintext || "";
	game.autonext = quest.autonext;
	game.noheal = quest.noheal;
	game.area = area;
	if ((sock.user.quest[questname] <= stage || !(questname in sock.user.quest))) {
		game.cardreward = quest.cardreward;
		game.goldreward = quest.goldreward;
		game.choicerewards = quest.choicerewards;
		game.rewardamount = quest.rewardamount;
	}
	return game;
}
function mkAi(level, daily) {
	return function() {
		if (Cards.loaded){
			var urdeck = getDeck();
			if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
				startEditor();
				return;
			}
			var cost = daily !== undefined || level == 0 ? 0 : level == 1 ? 5 : 10;
			if (sock.user && cost) {
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "\u00A4");
					return;
				}
			}
			var deck = require("./ai/deck")(level);
			aideck.value = deck;

			var randomNames = [
				"Adrienne", "Audrie",
				"Billie", "Brendon",
				"Charles", "Caddy",
				"Dane", "Digna",
				"Emory", "Evan",
				"Fern",
				"Garland", "Gord",
				"Margie", "Mariah", "Martina", "Monroe", "Murray",
				"Page", "Pariah",
				"Rocky", "Ronald", "Ren",
				"Seth", "Sherman", "Stormy",
				"Tammi",
				"Yuriko"
			];
			var typeName = ["Commoner", "Mage", "Champion"];

			var foename = typeName[level] + "\n" + randomNames[etg.PlayerRng.upto(randomNames.length)];
			var gameData = { deck: deck, urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, p2hp: level == 0 ? 100 : level == 1 ? 125 : 150, p2markpower: level == 2 ? 2 : 1, foename: foename, p2drawpower: level == 2 ? 2 : 1 };
			if (!sock.user) parsepvpstats(gameData);
			else gameData.cost = cost;
			gameData.level = level;
			if (daily !== undefined) gameData.daily = daily;
			return initGame(gameData, true);
		}
	}
}
soundChange();
musicChange();
var gfx = require("./gfx");
gfx.load(function(loadingScreen){
	px.realStage.addChild(loadingScreen);
	requestAnimate();
}, function(){
	ui.playMusic("openingMusic");
	px.realStage.removeChildren();
	px.realStage.addChild(new PIXI.Sprite(gfx.bg_default));
	startMenu();
});
function startMenu(nymph){
	require("./MainMenu").start(nymph, mkAi(0), mkAi(2), mkPremade("mage"), mkPremade("demigod"), startQuestWindow, startColosseum, startEditor, startStore, initGame, initTrade, initLibrary, startArenaInfo, startArenaTop, upgradestore, getDeck);
}

function isFreeCard(card) {
	return card.type == etg.PillarEnum && !card.upped && !card.rarity && !card.shiny;
}
function adjust(cardminus, code, x) {
	if (code in cardminus) {
		cardminus[code] += x;
	} else cardminus[code] = x;
	delete cardminus.rendered;
}
function startRewardWindow(reward, numberofcopies, nocode) {
	if (!numberofcopies) numberofcopies = 1;
	if (reward.type !== undefined) reward = reward.type;
	var rewardList;
	if (typeof reward == "string") {
		var upped = reward.substring(0, 5) == "upped";
		var rarity = userutil.rewardwords[upped ? reward.substring(5) : reward];
		rewardList = etg.filtercards(upped, function(x) { return x.rarity == rarity }).map(function(card){ return card.code });
	}else if (reward instanceof Array){
		rewardList = reward;
	}else{
		console.log("Unknown reward", reward);
		return;
	}
	var rewardui = mkView();

	if (numberofcopies > 1) {
		var infotext = new px.MenuText(20, 100, "You will get " + numberofcopies + " copies of the card you choose")
		rewardui.addChild(infotext);
	}

	if (!nocode){
		var exitButton = px.mkButton(10, 10, "Exit");
		px.setClick(exitButton, startMenu);
		rewardui.addChild(exitButton);
	}

	var confirmButton = px.mkButton(10, 40, "Done");
	px.setClick(confirmButton, function() {
		if (chosenReward) {
			if (nocode) {
				sock.userExec("addbound", { c: etgutil.encodeCount(numberofcopies) + chosenReward });
				startMenu();
			}
			else {
				sock.userEmit("codesubmit2", { code: foename.value, card: chosenReward });
			}
		}
	});
	rewardui.addChild(confirmButton);

	var chosenRewardImage = new PIXI.Sprite(gfx.nopic);
	chosenRewardImage.position.set(450, 20);
	rewardui.addChild(chosenRewardImage);
	var chosenReward = null;
	rewardList.forEach(function(reward, i){
		var card = new PIXI.Sprite(getCardImage(reward));
		card.position.set(100 + Math.floor(i/12) * 130, 272 + (i%12) * 20);
		px.setClick(card, function(){
			chosenReward = reward;
			chosenRewardImage.setTexture(getArt(chosenReward));
		}, "cardClick");
		rewardui.addChild(card);
		px.setInteractive(card);
	});

	px.refreshRenderer(rewardui);
}

function startQuest(questname) {
	if (!sock.user.quest[questname] && sock.user.quest[questname] != 0) {
		sock.user.quest[questname] = 0;
		sock.userEmit("updatequest", { quest: questname, newstage: 0 });
	}
}
function startQuestWindow(){
	var questui = mkView();
	px.addMouseOverBg(questui, function() {
		tinfo.setText("Welcome to Potatotal Island. The perfect island for adventuring!");
	});
	questui.addChild(px.mkBgRect(9, 9, 880, 111));
	var questmap = new PIXI.Sprite(gfx.bg_questmap);
	questmap.position.set(124, 162);
	questui.addChild(questmap);
	var tinfo = new px.MenuText(32, 32, "");
	questui.addChild(tinfo);
	var bexit = px.mkButton(750, 246, "Exit");
	px.setClick(bexit, startMenu);
	questui.addChild(bexit);
	var areainfo = {
		forest: ["Spooky Forest", new PIXI.Polygon(555, 221, 456, 307, 519, 436, 520, 472, 631, 440, 652, 390, 653, 351, 666, 321, 619, 246)],
		city: ["Capital City", new PIXI.Polygon(456, 307, 519, 436, 520, 472, 328, 496, 258, 477, 259, 401)],
		provinggrounds: ["Proving Grounds", new PIXI.Polygon(245, 262, 258, 477, 205, 448, 179, 397, 180, 350, 161, 313)],
		ice: ["Icy Caves", new PIXI.Polygon(161, 313, 245, 262, 283, 190, 236, 167, 184, 186, 168, 213, 138, 223, 131, 263)],
		desert: ["Lonely Desert", new PIXI.Polygon(245, 262, 283, 190, 326, 202, 466, 196, 511, 219, 555, 221, 456, 307, 259, 401)],
	};
	for (var key in areainfo) {
		if (!(key in Quest.areas))continue;
		var graphics = new PIXI.Graphics();
		graphics.interactive = true;
		graphics.buttonMode = true;
		(function (ainfo, k) {
			var points = ainfo[1].points;
			graphics.hitArea = ainfo[1];
			if (foename.value == "quest"){
				graphics.lineStyle(4, 255);
				graphics.moveTo(points[0].x, points[0].y);
				for(var i=1; i<points.length; i++){
					graphics.lineTo(points[i].x, points[i].y);
				}
				graphics.lineTo(points[0].x, points[0].y);
			}
			px.setClick(graphics, function () {
				startQuestArea(k);
			});
			graphics.mouseover = function() {
				tinfo.setText(ainfo[0]);
			}
			if (Quest.areas[k].some(function(quest) {
				return (Quest[quest][0].dependency === undefined || Quest[quest][0].dependency(sock.user)) && ((sock.user.quest[quest] || 0) < Quest[quest].length);
			})) {
				var xtot = 0, ytot = 0;
				for (var i = 0;i < points.length; i++) {
					xtot += points[i].x;
					ytot += points[i].y;
				}
				var icon = new PIXI.Sprite(gfx.eicons[13]);
				icon.anchor.x = 0.5;
				icon.anchor.y = 0.5;
				icon.position.set(xtot / points.length, ytot / points.length);
				graphics.addChild(icon);
			}
		})(areainfo[key], key);
		questui.addChild(graphics);
	}
	px.refreshRenderer(questui);
}
function startQuestArea(area) {
	var questui = px.mkView();
	px.addMouseOverBg(questui, function() {
		tinfo.setText("");
	});
	questui.addChild(px.mkBgRect(9, 9, 880, 111));
	var questmap = new PIXI.Sprite(gfx.bg_quest);
	questmap.position.set(124, 162);
	questui.addChild(questmap);
	var tinfo = new px.MenuText(50, 26, "", 850);
	var errinfo = new px.MenuText(50, 125, "", 850);
	function makeQuestButton(quest, stage) {
		var pos = Quest[quest].info.pos[stage];
		var circle = new PIXI.Graphics();
		circle.lineStyle(2, 0x88aa66);
		circle.beginFill(sock.user.quest[quest] > stage ? 0x4cff00 : 1);
		circle.drawCircle(0, 0, 16);
		circle.endFill();
		circle.hitArea = new PIXI.Circle(0, 0, 16);
		var button = px.mkButton(pos[0], pos[1], circle);
		button.mouseover = function() {
			tinfo.setText(Quest[quest].info.text[stage]);
		}
		px.setClick(button, function() {
			errinfo.setText(mkQuestAi(quest, stage, area) || "");
		});
		return button;
	}
	Quest.areas[area].forEach(function(quest){
		var stage0 = Quest[quest][0];
		if (stage0.dependency === undefined || stage0.dependency(sock.user))
			startQuest(quest);
	});
	Quest.areas[area].forEach(function(quest){
		if ((sock.user.quest[quest] !== undefined) && Quest[quest]) {
			for (var i = 0;i <= sock.user.quest[quest];i++) {
				if (Quest[quest].info.pos[i]) {
					questui.addChild(makeQuestButton(quest, i));
				}
			}
		}
	});
	var bexit = px.mkButton(750, 246, "Exit");
	px.setClick(bexit, startQuestWindow);
	questui.addChild(tinfo);
	questui.addChild(errinfo);
	questui.addChild(bexit);
	px.refreshRenderer(questui);
}

function upgradestore() {
	function upgradeCard(card) {
		if (!isFreeCard(card)) {
			if (card.upped) return "You cannot upgrade upgraded cards.";
			var use = card.rarity != -1 ? 6 : 1;
			if (cardpool[card.code] >= use) {
				sock.userExec("upgrade", { card: card.code });
				adjustdeck();
			}
			else return "You need at least " + use + " copies to be able to upgrade this card!";
		}
		else if (sock.user.gold >= 50) {
			sock.userExec("uppillar", { c: card.code });
			goldcount.setText("$" + sock.user.gold);
			adjustdeck();
		}
		else return "You need $50 to afford an upgraded pillar!";
	}
	function polishCard(card) {
		if (!isFreeCard(card)) {
			if (card.shiny) return "You cannot polish shiny cards.";
			if (card.rarity == 5) return "You cannot polish Nymphs.";
			var use = card.rarity != -1 ? 6 : 2;
			if (cardpool[card.code] >= use) {
				sock.userExec("polish", { card: card.code });
				adjustdeck();
			}
			else return "You need at least " + use + " copies to be able to polish this card!";
		}
		else if (sock.user.gold >= 50) {
			sock.userExec("shpillar", { c: card.code });
			goldcount.setText("$" + sock.user.gold);
			adjustdeck();
		}
		else return "You need $50 to afford a shiny pillar!";
	}
	var cardValues = [5, 1, 3, 15, 20, 125];
	function sellCard(card) {
		if (!card.rarity && !card.upped) return "You can't sell a pillar or pendulum, silly!";
		if (card.rarity == -1) return "You really don't want to sell that, trust me.";
		var codecount = etgutil.count(sock.user.pool, card.code);
		if (codecount) {
			sock.userExec("sellcard", { card: card.code });
			adjustdeck();
			goldcount.setText("$" + sock.user.gold);
		}
		else return "This card is bound to your account; you cannot sell it.";
	}
	function eventWrap(func){
		return function(){
			var error = func(Cards.Codes[selectedCard]);
			if (error) twarning.setText(error);
		}
	}
	function adjustdeck() {
		cardpool = etgutil.deck2pool(sock.user.pool);
		cardpool = etgutil.deck2pool(sock.user.accountbound, cardpool);
	}
	var upgradeui = px.mkView();

	var goldcount = new px.MenuText(30, 100, "$" + sock.user.gold);
	upgradeui.addChild(goldcount);
	var bupgrade = px.mkButton(150, 50, "Upgrade");
	px.setClick(bupgrade, eventWrap(upgradeCard));
	upgradeui.addChild(bupgrade);
	var bpolish = px.mkButton(150, 95, "Polish", function() {
		if (selectedCard) cardArt.setTexture(getArt(etgutil.asShiny(selectedCard, true)));
	},
	function() {
		if (selectedCard) cardArt.setTexture(getArt(etgutil.asUpped(selectedCard, true)));
	});
	px.setClick(bpolish, eventWrap(polishCard));
	upgradeui.addChild(bpolish);
	var bsell = px.mkButton(150, 140, "Sell");
	px.setClick(bsell, eventWrap(sellCard));
	upgradeui.addChild(bsell);
	var bexit = px.mkButton(5, 50, "Exit");
	px.setClick(bexit, startMenu);
	upgradeui.addChild(bexit);
	var tinfo = new px.MenuText(250, 50, "");
	upgradeui.addChild(tinfo);
	var tinfo2 = new px.MenuText(250, 140, "");
	upgradeui.addChild(tinfo2);
	var tinfo3 = new px.MenuText(250, 95, "");
	tinfo3.position.set(250, 95);
	upgradeui.addChild(tinfo3);
	var twarning = new px.MenuText(100, 170, "");
	upgradeui.addChild(twarning);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	upgradeui.addChild(cardArt);
	var selectedCardArt = new PIXI.Sprite(gfx.nopic);
	selectedCardArt.position.set(534, 8);
	upgradeui.addChild(selectedCardArt);

	var cardsel = new px.CardSelector(null,
		function(code){
			var card = Cards.Codes[code];
			selectedCardArt.setTexture(getArt(code));
			cardArt.setTexture(getArt(etgutil.asUpped(code, true)));
			selectedCard = code;
			if (card.upped){
				bupgrade.visisble = tinfo.visible = false;
			}else{
				tinfo.setText(isFreeCard(card) ? "Costs $50 to upgrade" : card.rarity != -1 ? "Convert 6 into an upgraded version." : "Convert into an upgraded version.");
				bupgrade.visisble = tinfo.visible = true;
			}
			if (card.shiny){
				bpolish.visible = tinfo3.visible = false;
			}else{
				tinfo3.setText(isFreeCard(card) ? "Costs $50 to polish" : card.rarity == 5 ? "This card cannot be polished." : card.rarity != -1 ? "Convert 6 into a shiny version." : "Convert 2 into a shiny version.")
				bpolish.visible = tinfo3.visible = true;
			}
			tinfo2.setText((card.rarity > 0 || card.upped) && card.rarity != -1 ?
				"Sells for " + cardValues[card.rarity] * (card.upped ? 5 : 1) * (card.shiny ? 5 : 1) + " gold." : "");
			twarning.setText("");
		}, true
	);
	upgradeui.addChild(cardsel);
	var cardpool, selectedCard;
	adjustdeck();
	px.refreshRenderer(upgradeui, function() {
		cardsel.next(cardpool);
	});
}

function startStore() {
	var packdata = [
		{cost: 15, type: "Bronze", info: "9 Commons", color: 0xcd7d32},
		{cost: 25, type: "Silver", info: "3 Commons, 3 Uncommons", color: 0xc0c0c0},
		{cost: 65, type: "Gold", info: "3 Commons, 4 Uncommons, 1 Rare", color: 0xffd700},
		{cost: 100, type: "Platinum", info: "4 Commons, 3 Uncommons, 1 Rare, 1 Shard", color: 0xe4e4e4},
		{cost: 250, type: "Nymph", info: "1 Nymph", color: 0x6699bb},
	];
	var packele = -1, packrarity = -1;

	var storeui = px.mkView();

	//shop background
	storeui.addChild(px.mkBgRect(
		40, 16, 820, 60,
		40, 92, 530, 168,
		40, 270, 620, 168,
		770, 90, 90, 184
	));
	//gold text
	var tgold = new px.MenuText(775, 101, "$" + sock.user.gold);
	storeui.addChild(tgold);

	//info text
	var tinfo = new px.MenuText(50, 26, "Select from which element you want.");
	storeui.addChild(tinfo);

	var tinfo2 = new px.MenuText(50, 51, "Select which type of booster you want.");
	storeui.addChild(tinfo2);

    //free packs text
	if (sock.user.freepacks){
		var freeinfo = new px.MenuText(350, 26, "");
		storeui.addChild(freeinfo);
	}
	function updateFreeInfo(rarity){
		if (freeinfo){
			freeinfo.setText(sock.user.freepacks[rarity] ? "Free " + packdata[rarity].type + " packs left: " + sock.user.freepacks[rarity] : "");
		}
	}

	//get cards button
	var bget = px.mkButton(775, 156, "Take Cards");
	px.toggleB(bget);
	px.setClick(bget, function () {
		px.toggleB(bget, bbuy);
		px.toggleB.apply(null, buttons);
		popbooster.visible = false;
	});
	storeui.addChild(bget);

	//exit button
	var bexit = px.mkButton(775, 246, "Exit");
	px.setClick(bexit, startMenu);
	storeui.addChild(bexit);

	//buy button
	var bbuy = px.mkButton(775, 156, "Buy Pack");
	px.setClick(bbuy, function() {
		if (packrarity == -1) {
			tinfo2.setText("Select a pack first!");
			return;
		}
		if (packele == -1) {
			tinfo.setText("Select an element first!");
			return;
		}
		var pack = packdata[packrarity];
		var boostdata = { pack: packrarity, element: packele };
		parseInput(boostdata, "bulk", packmulti.value, 99);
		if (sock.user.gold >= pack.cost * (boostdata.bulk || 1) || (sock.user.freepacks && sock.user.freepacks[packrarity] > 0)) {
			sock.userEmit("booster", boostdata);
			px.toggleB(bbuy);
		} else {
			tinfo2.setText("You can't afford that!");
		}
	});
	storeui.addChild(bbuy);

	var buttons = packdata.map(function(pack, n){
		var g = new PIXI.Graphics();
		g.hitArea = new PIXI.Rectangle(0, 0, 100, 150);
		g.lineStyle(3);
		g.beginFill(pack.color);
		g.drawRoundedRect(3, 3, 94, 144, 6);
		g.endFill();
		var name = new PIXI.Text(pack.type, {font: "18px Verdana"});
		name.anchor.set(.5, .5);
		name.position.set(50, 75);
		g.addChild(name);
		var price = new PIXI.Sprite(ui.getTextImage("$"+pack.cost, {font: "12px Verdana"}));
		price.anchor.set(0, 1);
		price.position.set(7, 146);
		g.addChild(price);
		px.setClick(g, function(){
			packrarity = n;
			tinfo2.setText(pack.type + " Pack: " + pack.info);
			updateFreeInfo(n);
		});
		storeui.addChild(g);
		return px.mkButton(50+125*n, 280, g);
	});

	for (var i = 0;i < 15;i++) {
		var elementbutton = px.mkButton(75 + Math.floor(i / 2)*64, 120 + (i == 14 ? 37 : (i % 2)*75), gfx.eicons[i]);
		(function(_i) {
			px.setClick(elementbutton, function() {
				packele = _i;
				tinfo.setText("Selected Element: " + etg.eleNames[packele]);
			});
		})(i);
		storeui.addChild(elementbutton);
	}

	//booster popup
	var popbooster = px.mkBgRect(0, 0, 627, 457);
	popbooster.position.set(40, 90);
	popbooster.visible = false;
	storeui.addChild(popbooster);

	storeui.cmds = {
		boostergive: function(data) {
			if (data.accountbound) {
				sock.user.accountbound = etgutil.mergedecks(sock.user.accountbound, data.cards);
				if (sock.user.freepacks){
					sock.user.freepacks[data.packtype]--;
					updateFreeInfo(packrarity);
				}
			}
			else {
				sock.user.pool = etgutil.mergedecks(sock.user.pool, data.cards);
				var bdata = {};
				parseInput(bdata, "bulk", packmulti.value, 99);
				sock.user.gold -= packdata[data.packtype].cost * (bdata.bulk || 1);
				tgold.setText("$" + sock.user.gold);
			}
			if (etgutil.decklength(data.cards) < 11){
				px.toggleB(bget);
				px.toggleB.apply(null, buttons);
				if (popbooster.children.length) popbooster.removeChildren();
				etgutil.iterdeck(data.cards, function(code, i){
					var x = i % 5, y = Math.floor(i/5);
					var cardArt = new PIXI.Sprite(getArt(code));
					cardArt.scale.set(0.85, 0.85);
					cardArt.position.set(7 + (x * 125), 7 + (y * 225));
					popbooster.addChild(cardArt);
				});
				popbooster.visible = true;
			}else{
				var link = document.createElement("a");
				link.href = "http://etg.dek.im/deck/" + data.cards;
				link.target = "_blank";
				link.appendChild(document.createTextNode(data.cards));
				addChatSpan(link);
				px.toggleB(bbuy);
			}
		},
	};
	storeui.dom = packmulti;
	px.refreshRenderer(storeui);
}
var blacklist = { flip: true, seed: true, p1deckpower: true, p2deckpower: true, deck: true, urdeck: true };
function addToGame(game, data) {
	for (var key in data) {
		if (!blacklist[key]){
			var p1or2 = key.match(/^p(1|2)/);
			if (p1or2){
				game["player" + p1or2[1]][key.substr(2)] = data[key];
			}else game[key] = data[key];
		}
	}
}
function mkDaily(type) {
	if (type < 3) {
		return function() {
			var dataNext = type == 1 ?
				{ goldreward: 75, endurance: 2, cost: 0, daily: 1, cardreward: "", noheal: true} :
				{ goldreward: 200, endurance: 2, cost: 0, daily: 2, cardreward: "" };
			var game = mkAi(type == 1 ? 0 : 2, type)();
			addToGame(game, dataNext);
			game.dataNext = dataNext;
		}
	}
	else {
		return function() {
			var game = mkPremade(type == 3 ? "mage" : "demigod", type)();
			game.addonreward = type == 3 ? 30 : 100;
			sock.userExec("donedaily", { daily: type });
		}
	}
}
function startColosseum(){
	var coloui = px.mkView();
	var magename = aiDecks.mage[sock.user.dailymage][0];
	var dgname = aiDecks.demigod[sock.user.dailydg][0];
	var events = [
		{ name: "Novice Endurance", desc: "Fight 3 Commoners in a row without healing in between. May try until you win." },
		{ name: "Expert Endurance", desc: "Fight 3 Champions in a row. May try until you win." },
		{ name: "Novice Duel", desc: "Fight " + magename + ". Only one attempt allowed." },
		{ name: "Expert Duel", desc: "Fight " + dgname + ". Only one attempt allowed." }
	];
	for (var i = 1;i < 5;i++) {
		var active = !(sock.user.daily & (1 << i));
		if (active) {
			var button = px.mkButton(50, 100 + 30 * i, "Fight!");
			px.setClick(button, mkDaily(i));
			coloui.addChild(button);
		}
		var text = new px.MenuText(130, 100 + 30 * i, active ? (events[i-1].name + ": " + events[i-1].desc) : i > 2 ? (sock.user.daily&(i==3?1:32) ? "You defeated this already today." : "You failed this today. Better luck tomorrow!") : "Completed.");
		coloui.addChild(text);
	}
	if (sock.user.daily == 63){
		var button = px.mkButton(50, 280, "Nymph!");
		px.setClick(button, function(){
			var nymph = etg.NymphList[etg.PlayerRng.uptoceil(12)];
			sock.userExec("addcards", {c: "01"+nymph});
			sock.userExec("donedaily", {daily: 6});
			startMenu(nymph);
		});
		coloui.addChild(button);
		coloui.addChild(new px.MenuText(130, 280, "You successfully completed all tasks."));
	}

	var bexit = px.mkButton(50, 50, "Exit");
	px.setClick(bexit, startMenu);
	coloui.addChild(bexit);

	px.refreshRenderer(coloui);
}
function startEditor(arena, acard, startempty) {
	if (!Cards.loaded) return;
	if (arena && (!sock.user || arena.deck === undefined || acard === undefined)) arena = false;
	function updateField(renderdeck){
		deckimport.value = etgutil.encodedeck(decksprite.deck) + "01" + etg.toTrueMark(editormark);
	}
	function sumCardMinus(cardminus, code){
		var sum = 0;
		for (var i=0; i<2; i++){
			for (var j=0; j<2; j++){
				sum += cardminus[etgutil.asShiny(etgutil.asUpped(code, i==0), j==0)] || 0;
			}
		}
		return sum;
	}
	function processDeck() {
		for (var i = decksprite.deck.length - 1;i >= 0;i--) {
			if (!(decksprite.deck[i] in Cards.Codes)) {
				var index = etg.fromTrueMark(decksprite.deck[i]);
				if (~index) {
					editormark = index;
				}
				decksprite.deck.splice(i, 1);
			}
		}
		editormarksprite.setTexture(gfx.eicons[editormark]);
		if (decksprite.deck.length > 60) decksprite.deck.length = 60;
		decksprite.deck.sort(etg.cardCmp);
		if (sock.user) {
			cardminus = {};
			for (var i = decksprite.deck.length - 1;i >= 0;i--) {
				var code = decksprite.deck[i], card = Cards.Codes[code];
				if (card.type != etg.PillarEnum) {
					if (sumCardMinus(cardminus, code) == 6) {
						decksprite.deck.splice(i, 1);
						continue;
					}
				}
				if (!isFreeCard(card)) {
					if ((cardminus[code] || 0) < (cardpool[code] || 0)) {
						adjust(cardminus, code, 1);
					} else {
						decksprite.deck.splice(i, 1);
					}
				}
			}
			if (arena){
				decksprite.deck.unshift(acard, acard, acard, acard, acard);
			}
		}
		updateField();
		decksprite.renderDeck(0);
	}
	function setCardArt(code){
		cardArt.setTexture(getArt(code));
		cardArt.visible = true;
	}
	function incrpool(code, count){
		if (code in Cards.Codes && (!arena || (!Cards.Codes[code].isOf(Cards.Codes[acard].asUpped(false).asShiny(false))) && (arena.lv || !Cards.Codes[code].upped))){
			if (code in cardpool) {
				cardpool[code] += count;
			} else {
				cardpool[code] = count;
			}
		}
	}
	function saveDeck(force){
		var dcode = etgutil.encodedeck(decksprite.deck) + "01" + etg.toTrueMark(editormark);
		if (sock.user.decks[sock.user.selectedDeck] != dcode){
			sock.user.decks[sock.user.selectedDeck] = dcode;
			sock.userEmit("setdeck", { d: dcode, number: sock.user.selectedDeck });
		}else if (force) sock.userEmit("setdeck", { number: sock.user.selectedDeck });
	}
	var cardminus, cardpool;
	if (sock.user){
		cardminus = {};
		cardpool = {};
		etgutil.iterraw(sock.user.pool, incrpool);
		etgutil.iterraw(sock.user.accountbound, incrpool);
	}
	var editorui = px.mkView();
	var bclear = px.mkButton(8, 32, "Clear");
	var bsave = px.mkButton(8, 64, "Save & Exit");
	px.setClick(bclear, function() {
		if (sock.user) {
			cardminus = {};
		}
		decksprite.deck.length = arena?5:0;
		decksprite.renderDeck(decksprite.deck.length);
	});
	editorui.addChild(bclear);
	editorui.addChild(bsave);
	function sumscore(){
		var sum = 0;
		for(var k in artable){
			sum += arattr[k]*artable[k].cost;
		}
		return sum;
	}
	function makeattrui(y, name){
		y = 128+y*20;
		var data = artable[name];
		var bt = new PIXI.Text(name, ui.mkFont(16, "black"));
		bt.position.set(8, y);
		var bm = px.mkButton(50, y, ui.getTextImage("-", ui.mkFont(16, "black"), 0xFFFFFFFF));
		var bv = new PIXI.Text(arattr[name], ui.mkFont(16, "black"));
		bv.position.set(64, y);
		var bp = px.mkButton(90, y, ui.getTextImage("+", ui.mkFont(16, "black"), 0xFFFFFFFF));
		function modattr(x){
			arattr[name] += x;
			if (arattr[name] >= (data.min || 0) && (!data.max || arattr[name] <= data.max)){
				var sum = sumscore();
				if (sum <= arpts){
					bv.setText(arattr[name]);
					curpts.setText((arpts-sum)/45);
					return;
				}
			}
			arattr[name] -= x;
		}
		px.setClick(bm, modattr.bind(null, -(data.incr || 1)));
		px.setClick(bp, modattr.bind(null, data.incr || 1));
		editorui.addChild(bt);
		editorui.addChild(bm);
		editorui.addChild(bv);
		editorui.addChild(bp);
	}
	function switchDeckCb(x){
		return function() {
			saveDeck();
			sock.user.selectedDeck = x;
			decksprite.deck = etgutil.decodedeck(getDeck());
			processDeck();
		}
	}
	if (arena){
		px.setClick(bsave, function() {
			if (decksprite.deck.length < 35) {
				chat("35 cards required before submission");
				return;
			}
			var data = { d: etgutil.encodedeck(decksprite.deck.slice(5)) + "01" + etg.toTrueMark(editormark), lv: arena.lv };
			for(var k in arattr){
				data[k] = arattr[k];
			}
			if (!startempty){
				data.mod = true;
			}
			sock.userEmit("setarena", data);
			chat("Arena deck submitted");
			startMenu();
		});
		var bexit = px.mkButton(8, 96, "Exit");
		px.setClick(bexit, function() {
			startArenaInfo(arena);
		});
		editorui.addChild(bexit);
		var arpts = arena.lv?515:470, arattr = {hp:parseInt(arena.hp || 200), mark:parseInt(arena.mark || 1), draw:parseInt(arena.draw || 1)};
		var artable = {
			hp: { min: 65, max: 200, incr: 45, cost: 1 },
			mark: { cost: 45 },
			draw: { cost: 135 },
		};
		var curpts = new PIXI.Text((arpts-sumscore())/45, ui.mkFont(16, "black"));
		curpts.position.set(8, 188);
		editorui.addChild(curpts);
		makeattrui(0, "hp");
		makeattrui(1, "mark");
		makeattrui(2, "draw");
	}else{
		px.setClick(bsave, function() {
			if (sock.user) saveDeck(true);
			startMenu();
		});
		var bimport = px.mkButton(8, 96, "Import");
		px.setClick(bimport, function() {
			var dvalue = deckimport.value.trim();
			decksprite.deck = ~dvalue.indexOf(" ") ? dvalue.split(" ") : etgutil.decodedeck(dvalue);
			processDeck();
		});
		editorui.addChild(bimport);
		if (sock.user){
			for (var i = 0;i < 10;i++) {
				var button = px.mkButton(80 + i*72, 8, "Deck " + (i + 1));
				px.setClick(button, switchDeckCb(i));
				editorui.addChild(button);
			}
		}
	}
	var bconvert = px.mkButton(5, 554, "Convert Code");
	px.setClick(bconvert, function() {
		deckimport.value = decksprite.deck.join(" ") + " " + etg.toTrueMark(editormark);
	});
	editorui.addChild(bconvert);
	var editormarksprite = new PIXI.Sprite(gfx.nopic);
	editormarksprite.position.set(66, 200);
	editorui.addChild(editormarksprite);
	var editormark = 0;
	for (var i = 0;i < 13;i++) {
		var sprite = px.mkButton(100 + i * 32, 234, gfx.eicons[i]);
		sprite.interactive = true;
		(function(_i) {
			px.setClick(sprite, function() {
				editormark = _i;
				editormarksprite.setTexture(gfx.eicons[_i]);
				updateField();
			});
		})(i);
		editorui.addChild(sprite);
	}
	var decksprite = new px.DeckDisplay(60, setCardArt,
		function(i){
			var code = decksprite.deck[i], card = Cards.Codes[code];
			if (!arena || code != acard){
				if (sock.user && !isFreeCard(card)) {
					adjust(cardminus, code, -1);
				}
				decksprite.rmCard(i);
				updateField();
			}
		}, arena ? (startempty ? [] : etgutil.decodedeck(arena.deck)) : etgutil.decodedeck(getDeck())
	);
	editorui.addChild(decksprite);
	var cardsel = new px.CardSelector(setCardArt,
		function(code){
			if (decksprite.deck.length < 60) {
				var card = Cards.Codes[code];
				if (sock.user && !isFreeCard(card)) {
					if (!(code in cardpool) || (code in cardminus && cardminus[code] >= cardpool[code]) ||
						(card.type != etg.PillarEnum && sumCardMinus(cardminus, code) >= 6)) {
						return;
					}
					adjust(cardminus, code, 1);
				}
				decksprite.addCard(code, arena?5:0);
				updateField();
			}
		}, !arena
	);
	editorui.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	editorui.addChild(cardArt);
	editorui.dom = deckimport;
	px.refreshRenderer(editorui, function() {
		cardArt.visible = false;
		var mpos = px.getMousePos();
		cardsel.next(cardpool, cardminus, mpos);
		decksprite.next(mpos);
	});
	deckimport.focus();
	deckimport.setSelectionRange(0, 333);
	processDeck();
}
function startElementSelect() {
	var stage = px.mkView();
	var eledesc = new px.MenuText(100, 250, "Select your starter element");
	stage.addChild(eledesc);
	etg.eleNames.forEach(function(name, i){
		if (i > 13) return;
		var ele = new PIXI.Sprite(gfx.eicons[i]);
		ele.position.set(100 + i * 32, 300);
		ele.mouseover = function(){
			eledesc.setText(name);
		}
		px.setClick(ele, function() {
			var msg = { u: sock.user.name, a: sock.user.auth, e: i };
			sock.user = undefined;
			sock.emit("inituser", msg);
			startMenu();
		});
		ele.interactive = true;
		stage.addChild(ele);
	});
	px.refreshRenderer(stage);
}

function startMatch(game, foeDeck) {
	function drawBorder(obj, spr) {
		if (obj) {
			if (game.targetingMode) {
				if (game.targetingMode(obj)) {
					fgfx.lineStyle(2, 0xff0000);
					fgfx.drawRect(spr.position.x - spr.width / 2, spr.position.y - spr.height / 2, spr.width, spr.height);
					fgfx.lineStyle(2, 0xffffff);
				}
			} else if (obj.canactive() && !(obj.owner == game.player2 && game.player2.isCloaked())) {
				fgfx.lineStyle(2, obj.card.element == 8 ? 0x000000 : 0xffffff);
				fgfx.drawRect(spr.position.x - spr.width / 2, spr.position.y - spr.height / 2, spr.width, (obj instanceof etg.Weapon || obj instanceof etg.Shield ? 12 : 10));
			}
		}
	}
	function drawStatus(obj, spr) {
		var statuses = spr.children[0];
		statuses.children[0].visible = obj.status.psion;
		statuses.children[1].visible = obj.status.aflatoxin;
		statuses.children[2].visible = !obj.status.aflatoxin && obj.status.poison > 0;
		statuses.children[3].visible = obj.status.airborne || obj.status.ranged;
		statuses.children[4].visible = obj.status.momentum;
		statuses.children[5].visible = obj.status.adrenaline;
		statuses.children[6].visible = obj.status.poison < 0;
		statuses.children[7].visible = obj.status.delayed;
		statuses.children[8].visible = obj == obj.owner.gpull;
		statuses.children[9].visible = obj.status.frozen;
		spr.alpha = obj.isMaterial() ? 1 : .7;
	}
	var resigning, discarding, aiDelay = 0, aiState, aiCommand;
	if (sock.user) {
		sock.userExec("addloss", { pvp: !game.ai });
		if (game.cost){
			sock.userExec("addgold", { g: -game.cost });
		}
	}
	var gameui = px.mkView();
	var redlines = new PIXI.Sprite(gfx.bg_game);
	redlines.position.y = 12;
	gameui.addChild(redlines);
	var cloakgfx = new PIXI.Graphics();
	cloakgfx.beginFill(0);
	cloakgfx.drawRect(130, 20, 660, 280);
	cloakgfx.endFill();
	gameui.addChild(cloakgfx);
	var endturn = px.mkButton(800, 520, "Accept Hand");
	var cancel = px.mkButton(800, 490, "Mulligan");
	var resign = px.mkButton(8, 24, "Resign");
	gameui.addChild(endturn);
	gameui.addChild(cancel);
	gameui.addChild(resign);
	var turntell = new PIXI.Text("", { font: "16px Dosis" });
	turntell.position.set(800, 550);
	gameui.addChild(turntell);
	var foename = new PIXI.Text(game.foename || "-", { font: "bold 18px Dosis", align: "center" });
	foename.position.set(5, 75);
	gameui.addChild(foename);
	function addNoHealData(game) {
		var data = game.dataNext || {};
		if (game.noheal){
			data.p1hp = game.player1.hp;
			data.p1maxhp = game.player1.maxhp;
		}
		return data;
	}
	px.setClick(endturn, function(e, discard) {
		if (game.turn == game.player1 && game.phase <= etg.MulliganPhase2){
			if (!game.ai) {
				sock.emit("mulligan", {draw: true});
			}
			game.progressMulligan();
		}else if (game.winner) {
			if (sock.user) {
				if (game.arena) {
					sock.userEmit("modarena", { aname: game.arena, won: game.winner == game.player2, lv: game.level-4 });
				}
				if (game.winner == game.player1) {
					if (game.quest){
						if (game.autonext) {
							var data = addNoHealData(game);
							var newgame = mkQuestAi(game.quest[0], game.quest[1] + 1, game.area);
							addToGame(newgame, data);
							return;
						}else if (sock.user.quest[game.quest[0]] <= game.quest[1] || !(game.quest[0] in sock.user.quest)) {
							sock.userEmit("updatequest", { quest: game.quest[0], newstage: game.quest[1] + 1 });
							sock.user.quest[game.quest[0]] = game.quest[1] + 1;
						}
					}else if (game.daily){
						if (game.endurance) {
							var data = addNoHealData(game);
							data.endurance--;
							var newgame = mkAi(game.level, true)();
							addToGame(newgame, data);
							newgame.dataNext = data;
							return;
						}
						else {
							sock.userExec("donedaily", { daily: game.daily == 4 ? 5 : game.daily == 3 ? 0 : game.daily });
						}
					}
				}
			}
			victoryScreen(game);
		} else if (game.turn == game.player1) {
			if (discard == undefined && game.player1.hand.length == 8) {
				discarding = true;
			} else {
				discarding = false;
				if (!game.ai) {
					sock.emit("endturn", {bits: discard});
				}
				game.player1.endturn(discard);
				delete game.targetingMode;
				if (foeplays.children.length)
					foeplays.removeChildren();
			}
		}
	}, false);
	px.setClick(cancel, function() {
		if (resigning) {
			resign.setText("Resign");
			resigning = false;
		} else if (game.turn == game.player1) {
			if (game.phase <= etg.MulliganPhase2 && game.player1.hand.length > 0) {
				game.player1.drawhand(game.player1.hand.length - 1);
				sock.emit("mulligan");
			} else if (game.targetingMode) {
				delete game.targetingMode;
			} else discarding = false;
		}
	});
	px.setClick(resign, function() {
		if (resigning){
			if (!game.ai) {
				sock.emit("foeleft");
			}
			game.setWinner(game.player2);
			endturn.click();
		}else{
			resign.setText("Confirm");
			resigning = true;
		}
	});
	var activeInfo = {
		firebolt:function(){
			return 3+Math.floor(game.player1.quanta[etg.Fire]/4);
		},
		drainlife:function(){
			return 2+Math.floor(game.player1.quanta[etg.Darkness]/5);
		},
		icebolt:function(){
			var bolts = Math.floor(game.player1.quanta[etg.Water]/5);
			return (2+bolts) + " " + (35+bolts*5) + "%";
		},
		catapult:function(t){
			return Math.ceil(t.truehp()*(t.status.frozen?150:100)/(t.truehp()+100));
		},
		adrenaline:function(t){
			var atks = [], adreback = t.status.adrenaline;
			t.status.adrenaline = 1;
			var attacks = etg.countAdrenaline(t.trueatk());
			while (t.status.adrenaline < attacks) {
				t.status.adrenaline++;
				atks.push(t.trueatk());
			}
			if (!adreback) delete t.status.adrenaline;
			else t.status.adrenaline = adreback;
			return "extra: " + atks.join(", ");
		},
	};
	function setInfo(obj) {
		if (!cloakgfx.visible || obj.owner != game.player2 || obj.status.cloak) {
			var info = obj.info(), actinfo = game.targetingMode && game.targetingMode(obj) && activeInfo[game.targetingText];
			if (actinfo) info += "\nDmg " + actinfo(obj);
			infobox.setTexture(ui.getTextImage(info, ui.mkFont(10, "white"), 0));
			var mousePosition = px.getMousePos();
			infobox.position.set(mousePosition.x, mousePosition.y);
			infobox.visible = true;
		}
	}
	var handsprite = [new Array(8), new Array(8)];
	var creasprite = [new Array(23), new Array(23)];
	var permsprite = [new Array(16), new Array(16)];
	var shiesprite = [new PIXI.Sprite(gfx.nopic), new PIXI.Sprite(gfx.nopic)];
	var weapsprite = [new PIXI.Sprite(gfx.nopic), new PIXI.Sprite(gfx.nopic)];
	var marksprite = [new PIXI.Sprite(gfx.nopic), new PIXI.Sprite(gfx.nopic)];
	var marktext = [new PIXI.Text("", { font: "18px Dosis" }), new PIXI.Text("", { font: "18px Dosis" })];
	var quantatext = [new PIXI.DisplayObjectContainer(), new PIXI.DisplayObjectContainer()];
	var hptext = [new PIXI.Text("", { font: "18px Dosis" }), new PIXI.Text("", { font: "18px Dosis" })];
	var damagetext = [new PIXI.Text("", { font: "14px Dosis" }), new PIXI.Text("", { font: "14px Dosis" })];
	var poisontext = [new PIXI.Sprite(gfx.nopic), new PIXI.Sprite(gfx.nopic)];
	var decktext = [new PIXI.Text("", { font: "16px Dosis" }), new PIXI.Text("", { font: "16px Dosis" })];
	for (var j = 0;j < 2;j++) {
		(function(_j) {
			for (var i = 0;i < 8;i++) {
				handsprite[j][i] = new PIXI.Sprite(gfx.nopic);
				handsprite[j][i].position.set(j ? 20 : 780, (j ? 130 : 310) + 20 * i);
				(function(_i) {
					px.setClick(handsprite[j][i], function() {
						if (game.phase != etg.PlayPhase) return;
						var cardinst = game.players(_j).hand[_i];
						if (cardinst) {
							if (!_j && discarding) {
								endturn.click(null, _i);
							} else if (game.targetingMode) {
								if (game.targetingMode(cardinst)) {
									delete game.targetingMode;
									game.targetingModeCb(cardinst);
								}
							} else if (!_j && cardinst.canactive()) {
								if (cardinst.card.type != etg.SpellEnum) {
									console.log("summoning", _i);
									sock.emit("cast", {bits: game.tgtToBits(cardinst)});
									cardinst.useactive();
								} else {
									game.getTarget(cardinst, cardinst.card.active, function(tgt) {
										sock.emit("cast", {bits: game.tgtToBits(cardinst) | game.tgtToBits(tgt) << 9});
										cardinst.useactive(tgt);
									});
								}
							}
						}
					}, false);
				})(i);
				gameui.addChild(handsprite[j][i]);
			}
			function makeInst(makestatuses, insts, i, pos, scale){
				if (scale === undefined) scale = 1;
				var spr = new PIXI.Sprite(gfx.nopic);
				if (makestatuses){
					var statuses = new PIXI.DisplayObjectContainer();
					for (var k=0; k<7; k++){
						var icon = new PIXI.Sprite(gfx.sicons[k]);
						icon.alpha = .6;
						icon.anchor.y = 1;
						icon.position.set(-34 * scale + [4, 1, 1, 0, 3, 2, 1][k] * 8, 30 * scale);
						statuses.addChild(icon);
					}
					for (var k=0; k<3; k++){
						var icon = new PIXI.Sprite(gfx.sborders[k]);
						icon.position.set(-32 * scale, -40 * scale);
						icon.scale.set(scale, scale);
						statuses.addChild(icon);
					}
					spr.addChild(statuses);
				}
				var stattext = new PIXI.Sprite(gfx.nopic);
				stattext.position.set(-32 * scale, -32 * scale);
				spr.addChild(stattext);
				var activetext = new PIXI.Sprite(gfx.nopic);
				activetext.position.set(-32 * scale, -42 * scale);
				spr.addChild(activetext);
				spr.anchor.set(.5, .5);
				spr.position = pos;
				px.setClick(spr, function() {
					if (game.phase != etg.PlayPhase) return;
					var inst = insts ? insts[i] : game.players(_j)[i];
					if (!inst) return;
					if (game.targetingMode && game.targetingMode(inst)) {
						delete game.targetingMode;
						game.targetingModeCb(inst);
					} else if (_j == 0 && !game.targetingMode && inst.canactive()) {
						game.getTarget(inst, inst.active.cast, function(tgt) {
							delete game.targetingMode;
							sock.emit("cast", {bits: game.tgtToBits(inst) | game.tgtToBits(tgt) << 9});
							inst.useactive(tgt);
						});
					}
				}, false);
				return spr;
			}
			for (var i = 0;i < 23;i++) {
				creasprite[j][i] = makeInst(true, game.players(j).creatures, i, ui.creaturePos(j, i));
			}
			for (var i = 0;i < 23;i++){
				gameui.addChild(creasprite[j][j?22-i:i]);
			}
			for (var i = 0;i < 16;i++) {
				permsprite[j][i] = makeInst(false, game.players(j).permanents, i, ui.permanentPos(j, i));
			}
			for (var i = 0;i < 16;i++){
				gameui.addChild(permsprite[j][j?15-i:i]);
			}
			px.setInteractive.apply(null, handsprite[j]);
			px.setInteractive.apply(null, creasprite[j]);
			px.setInteractive.apply(null, permsprite[j]);
			marksprite[j].anchor.set(.5, .5);
			marksprite[j].position.set(740, 470);
			weapsprite[j] = makeInst(true, null, "weapon", new PIXI.Point(666, 512), 5/4);
			shiesprite[j] = makeInst(false, null, "shield", new PIXI.Point(710, 532), 5/4);
			if (j){
				gameui.addChild(shiesprite[j]);
				gameui.addChild(weapsprite[j]);
				ui.reflectPos(weapsprite[j]);
				ui.reflectPos(shiesprite[j]);
				ui.reflectPos(marksprite[j]);
			}else{
				gameui.addChild(weapsprite[j]);
				gameui.addChild(shiesprite[j]);
			}
			gameui.addChild(marksprite[j]);
			marktext[j].anchor.set(.5, .5);
			hptext[j].anchor.set(.5, .5);
			poisontext[j].anchor.set(.5, .5);
			decktext[j].anchor.set(.5, .5);
			damagetext[j].anchor.set(.5, .5);
			marktext[j].position.set(768,470);
			quantatext[j].position.set(j ? 792 : 0, j ? 100 : 308);
			hptext[j].position.set(50, 550);
			poisontext[j].position.set(50, 570);
			decktext[j].position.set(50, 530);
			damagetext[j].position.set(50, 510);
			if (j) {
				ui.reflectPos(marktext[j]);
				ui.reflectPos(hptext[j]);
				ui.reflectPos(poisontext[j]);
				ui.reflectPos(decktext[j]);
				ui.reflectPos(damagetext[j]);
			}
			var child;
			for (var k = 1;k < 13;k++) {
				quantatext[j].addChild(child = new PIXI.Text("", { font: "16px Dosis" }));
				child.position.set((k & 1) ? 32 : 86, Math.floor((k - 1) / 2) * 32 + 8);
				quantatext[j].addChild(child = new PIXI.Sprite(gfx.eicons[k]));
				child.position.set((k & 1) ? 0 : 54, Math.floor((k - 1) / 2) * 32);
			}
			px.setClick(hptext[j], function() {
				if (game.phase != etg.PlayPhase) return;
				if (game.targetingMode && game.targetingMode(game.players(_j))) {
					delete game.targetingMode;
					game.targetingModeCb(game.players(_j));
				}
			}, false);
		})(j);
		px.setInteractive.apply(null, weapsprite);
		px.setInteractive.apply(null, shiesprite);
		px.setInteractive.apply(null, hptext);
		gameui.addChild(marktext[j]);
		gameui.addChild(quantatext[j]);
		gameui.addChild(hptext[j]);
		gameui.addChild(poisontext[j]);
		gameui.addChild(decktext[j]);
		gameui.addChild(damagetext[j]);
	}
	var fgfx = new PIXI.Graphics();
	gameui.addChild(fgfx);
	var anims = new PIXI.DisplayObjectContainer();
	gameui.addChild(anims);
	Effect.register(anims);
	var foeplays = new PIXI.DisplayObjectContainer();
	gameui.addChild(foeplays);
	var infobox = new PIXI.Sprite(gfx.nopic);
	infobox.alpha = .7;
	infobox.anchor.set(.5, 1);
	gameui.addChild(infobox);
	var cardart = new PIXI.Sprite(gfx.nopic);
	cardart.position.set(654, 300);
	cardart.anchor.set(.5, 0);
	gameui.addChild(cardart);
	function onkeydown(e) {
		if (e.keyCode == 32) { // spc
			endturn.click();
		} else if (e.keyCode == 8) { // bsp
			cancel.click();
		} else if (e.keyCode >= 49 && e.keyCode <= 56) {
			handsprite[0][e.keyCode-49].click();
		} else if (e.keyCode == 83 || e.keyCode == 87) { // s/w
			hptext[e.keyCode == 87?1:0].click();
		}
	}
	gameui.cmds = {
		endturn: function(data) {
			game.player2.endturn(data.bits);
		},
		cast: function(data) {
			var bits = data.bits, c = game.bitsToTgt(bits & 511), t = game.bitsToTgt((bits >> 9) & 511);
			console.log("cast", c.toString(), (t || "-").toString(), bits);
			var sprite = new PIXI.Sprite(gfx.nopic);
			sprite.position.set((foeplays.children.length % 8) * 100, Math.floor(foeplays.children.length / 8) * 20);
			sprite.card = c instanceof etg.CardInstance ? c.card : c.active.cast.activename;
			foeplays.addChild(sprite);
			c.useactive(t);
		},
		foeleft: function(){
			if (!game.ai) game.setWinner(game.player1);
		},
		mulligan: function(data){
			if (data.draw === true) {
				game.progressMulligan();
			} else {
				game.player2.drawhand(game.player2.hand.length - 1);
			}
		},
	};
	document.addEventListener("keydown", onkeydown);
	gameui.endnext = function() {
		document.removeEventListener("keydown", onkeydown);
	}
	px.refreshRenderer(gameui, function() {
		if (game.turn == game.player2 && game.ai) {
			if (game.phase == etg.PlayPhase){
				if (!aiCommand){
					Effect.disable = true;
					aiState = require("./ai/search")(game, aiState);
					Effect.disable = false;
					if (aiState.length <= 2){
						aiCommand = true;
					}
				}
				if (aiCommand){
					if (Date.now() >= aiDelay){
						gameui.cmds[aiState[0]]({bits: aiState[1]});
						aiState = undefined;
						aiCommand = false;
						aiDelay += 300;
					}
				}
			}else if (game.phase <= etg.MulliganPhase2){
				gameui.cmds.mulligan({draw: require("./ai/mulligan")(game.player2)});
			}
		}
		var pos = px.getMousePos();
		var cardartcode, cardartx;
		infobox.setTexture(gfx.nopic);
		if (!cloakgfx.visible){
			foeplays.children.forEach(function(foeplay){
				if (foeplay.card instanceof etg.Card && px.hitTest(foeplay, pos)) {
					cardartcode = foeplay.card.code;
				}
			});
		}
		for (var j = 0;j < 2;j++) {
			var pl = game.players(j);
			if (j == 0 || game.player1.precognition) {
				for (var i = 0;i < pl.hand.length;i++) {
					if (px.hitTest(handsprite[j][i], pos)) {
						cardartcode = pl.hand[i].card.code;
					}
				}
			}
			for (var i = 0;i < 16;i++) {
				var pr = pl.permanents[i];
				if (pr && (j == 0 || !cloakgfx.visible || pr.status.cloak) && px.hitTest(permsprite[j][i], pos)) {
					cardartcode = pr.card.code;
					cardartx = permsprite[j][i].position.x;
					setInfo(pr);
				}
			}
			if (j == 0 || !cloakgfx.visible) {
				for (var i = 0;i < 23;i++) {
					var cr = pl.creatures[i];
					if (cr && px.hitTest(creasprite[j][i], pos)) {
						cardartcode = cr.card.code;
						cardartx = creasprite[j][i].position.x;
						setInfo(cr);
					}
				}
				if (pl.weapon && px.hitTest(weapsprite[j], pos)) {
					cardartcode = pl.weapon.card.code;
					cardartx = weapsprite[j].position.x;
					setInfo(pl.weapon);
				}
				if (pl.shield && px.hitTest(shiesprite[j], pos)) {
					cardartcode = pl.shield.card.code;
					cardartx = shiesprite[j].position.x;
					setInfo(pl.shield);
				}
			}
		}
		if (cardartcode) {
			cardart.setTexture(getArt(cardartcode));
			cardart.visible = true;
			cardart.position.set(cardartx || 654, pos.y > 300 ? 44 : 300);
		} else cardart.visible = false;
		if (game.winner == game.player1 && sock.user && !game.quest && game.ai) {
			if (game.cardreward === undefined) {
				var winnable = foeDeck.filter(function(card){ return card.rarity > 0 && card.rarity < 4; }), cardwon;
				if (winnable.length) {
					cardwon = winnable[etg.PlayerRng.upto(winnable.length)];
					if (cardwon == 3 && Math.random() < .5)
						cardwon = winnable[etg.PlayerRng.upto(winnable.length)];
				} else {
					var elewin = foeDeck[Math.floor(Math.random() * foeDeck.length)];
					cardwon = etg.PlayerRng.randomcard(elewin.upped, function(x) { return x.element == elewin.element && x.type != etg.PillarEnum && x.rarity <= 3; });
				}
				if (game.level !== undefined && game.level < 2) {
					cardwon = cardwon.asUpped(false);
				}
				game.cardreward = "01" + etgutil.asShiny(cardwon.code, false);
			}
			if (!game.goldreward) {
				var goldwon;
				if (game.level !== undefined) {
					var basereward = [1, 8, 15, 44, 15, 44][game.level];
					var hpfactor = [7, 4.5, 4, 1.3, 4, 1.3][game.level];
					goldwon = basereward + Math.floor(game.player1.hp / hpfactor);
				} else goldwon = 0;
				game.goldreward = goldwon + (game.cost || 0) + (game.addonreward || 0);
			}
		}
		if (game.phase != etg.EndPhase) {
			var turntext;
			if (discarding){
				turntext = "Discard";
			}else if (game.targetingMode){
				turntext = game.targetingText;
			}else{
				turntext = game.turn == game.player1 ? "Your Turn" : "Their Turn";
				if (game.phase < 2) turntext += "\n" + (game.phase ? "Second" : "First");
			}
			px.maybeSetText(turntell, turntext);
			if (game.turn == game.player1){
				endturn.setText(game.phase == etg.PlayPhase ? "End Turn" : "Accept Hand");
				cancel.setText(game.phase != etg.PlayPhase ? "Mulligan" : game.targetingMode || discarding || resigning ? "Cancel" : null);
			}else cancel.visible = endturn.visible = false;
		}else{
			px.maybeSetText(turntell, (game.turn == game.player1 ? "Your" : "Their") + " Turn\n" + (game.winner == game.player1?"Won":"Lost"));
			endturn.setText("Continue");
			cancel.visible = false;
		}
		foeplays.children.forEach(function(foeplay){
			foeplay.setTexture(foeplay.card instanceof etg.Card ? getCardImage(foeplay.card.code) : ui.getTextImage(foeplay.card, 12));
		});
		foeplays.visible = !(cloakgfx.visible = game.player2.isCloaked());
		fgfx.clear();
		if (game.turn == game.player1 && !game.targetingMode && game.phase != etg.EndPhase) {
			for (var i = 0;i < game.player1.hand.length;i++) {
				var card = game.player1.hand[i].card;
				if (game.player1.canspend(card.costele, card.cost)) {
					fgfx.beginFill(ui.elecols[etg.Light]);
					fgfx.drawRect(handsprite[0][i].position.x + 100, handsprite[0][i].position.y, 20, 20);
					fgfx.endFill();
				}
			}
		}
		fgfx.beginFill(0, 0);
		fgfx.lineStyle(2, 0xffffff);
		for (var j = 0;j < 2;j++) {
			var pl = game.players(j);
			for (var i = 0;i < 23;i++) {
				drawBorder(pl.creatures[i], creasprite[j][i]);
			}
			for (var i = 0;i < 16;i++) {
				drawBorder(pl.permanents[i], permsprite[j][i]);
			}
			drawBorder(pl.weapon, weapsprite[j]);
			drawBorder(pl.shield, shiesprite[j]);
		}
		if (game.targetingMode) {
			fgfx.lineStyle(2, 0xff0000);
			for (var j = 0;j < 2;j++) {
				if (game.targetingMode(game.players(j))) {
					var spr = hptext[j];
					fgfx.drawRect(spr.position.x - spr.width / 2, spr.position.y - spr.height / 2, spr.width, spr.height);
				}
				for (var i = 0;i < game.players(j).hand.length;i++) {
					if (game.targetingMode(game.players(j).hand[i])) {
						var spr = handsprite[j][i];
						fgfx.drawRect(spr.position.x, spr.position.y, spr.width, spr.height);
					}
				}
			}
		}
		fgfx.lineStyle(0, 0, 0);
		fgfx.endFill();
		for (var j = 0;j < 2;j++) {
			var pl = game.players(j);
			if (pl.sosa) {
				var spr = hptext[j];
				fgfx.beginFill(ui.elecols[etg.Death], .5);
				fgfx.drawRect(spr.position.x - spr.width / 2, spr.position.y - spr.height / 2, spr.width, spr.height);
				fgfx.endFill();
			}
			var statuses = { flatline: etg.Death, silence: etg.Aether, sanctuary: etg.Light };
			for(var status in statuses){
				if (pl[status]) {
					fgfx.beginFill(ui.elecols[statuses[status]], .3);
					fgfx.drawRect(handsprite[j][0].position.x - 2, handsprite[j][0].position.y - 2, 124, 164);
					fgfx.endFill();
				}
			}
			if (pl.nova >= 3){
				fgfx.beginFill(ui.elecols[etg.Entropy], .3);
				fgfx.drawRect(handsprite[j][0].position.x - 2, handsprite[j][0].position.y - 2, 124, 164);
				fgfx.endFill();
			}
			for (var i = 0;i < 8;i++) {
				handsprite[j][i].setTexture(getCardImage(pl.hand[i] ? (j == 0 || game.player1.precognition ? pl.hand[i].card.code : "0") : "1"));
			}
			for (var i = 0;i < 23;i++) {
				var cr = pl.creatures[i];
				if (cr && !(j == 1 && cloakgfx.visible)) {
					creasprite[j][i].setTexture(getCreatureImage(cr.card));
					creasprite[j][i].visible = true;
					var child = creasprite[j][i].children[1];
					child.setTexture(ui.getTextImage(cr.trueatk() + "|" + cr.truehp() + (cr.status.charges ? " x" + cr.status.charges : ""), ui.mkFont(10, cr.card.upped ? "black" : "white"), ui.maybeLighten(cr.card)));
					var child2 = creasprite[j][i].children[2];
					var activetext = cr.activetext1();
					child2.setTexture(ui.getTextImage(activetext, ui.mkFont(8, cr.card.upped ? "black" : "white")));
					drawStatus(cr, creasprite[j][i]);
				} else creasprite[j][i].visible = false;
			}
			for (var i = 0;i < 16;i++) {
				var pr = pl.permanents[i];
				if (pr && !(j == 1 && cloakgfx.visible && !pr.status.cloak)) {
					permsprite[j][i].setTexture(getPermanentImage(pr.card.code));
					permsprite[j][i].visible = true;
					permsprite[j][i].alpha = pr.isMaterial() ? 1 : .7;
					var child = permsprite[j][i].children[0];
					if (pr instanceof etg.Pillar) {
						child.setTexture(ui.getTextImage("1:" + (pr.pendstate ? pr.owner.mark : pr.card.element) + " x" + pr.status.charges, ui.mkFont(10, pr.card.upped ? "black" : "white"), ui.maybeLighten(pr.card)));
					}
					else if (pr.active.auto && pr.active.auto.activename == "locket") {
						child.setTexture(ui.getTextImage("1:" + (pr.status.mode === undefined ? pr.owner.mark : pr.status.mode), ui.mkFont(10, pr.card.upped ? "black" : "white"), ui.maybeLighten(pr.card)));
					}
					else child.setTexture(ui.getTextImage(pr.status.charges !== undefined ? " " + pr.status.charges : "", ui.mkFont(10, pr.card.upped ? "black" : "white"), ui.maybeLighten(pr.card)));
					var child2 = permsprite[j][i].children[1];
					child2.setTexture(pr instanceof etg.Pillar ? gfx.nopic : ui.getTextImage(pr.activetext1(), ui.mkFont(8, pr.card.upped ? "black" : "white")));
				} else permsprite[j][i].visible = false;
			}
			var wp = pl.weapon;
			if (wp && !(j == 1 && cloakgfx.visible)) {
				weapsprite[j].visible = true;
				var child = weapsprite[j].children[1];
				child.setTexture(ui.getTextImage(wp.trueatk() + (wp.status.charges ? " x" + wp.status.charges : ""), ui.mkFont(12, wp.card.upped ? "black" : "white"), ui.maybeLighten(wp.card)));
				child.visible = true;
				var child = weapsprite[j].children[2];
				child.setTexture(ui.getTextImage(wp.activetext1(), ui.mkFont(12, wp.card.upped ? "black" : "white")));
				child.visible = true;
				weapsprite[j].setTexture(getWeaponShieldImage(wp.card.code));
				drawStatus(wp, weapsprite[j]);
			} else weapsprite[j].visible = false;
			var sh = pl.shield;
			if (sh && !(j == 1 && cloakgfx.visible)) {
				shiesprite[j].visible = true;
				var child = shiesprite[j].children[0];
				child.setTexture(ui.getTextImage(sh.status.charges ? "x" + sh.status.charges: "" + sh.truedr() + "", ui.mkFont(12, sh.card.upped ? "black" : "white"), ui.maybeLighten(sh.card)));
				child.visible = true;
				var child = shiesprite[j].children[1];
				child.setTexture(ui.getTextImage(sh.activetext1(), ui.mkFont(12, sh.card.upped ? "black" : "white")));
				child.visible = true;
				shiesprite[j].alpha = sh.isMaterial() ? 1 : .7;
				shiesprite[j].setTexture(getWeaponShieldImage(sh.card.code));
			} else shiesprite[j].visible = false;
			marksprite[j].setTexture(gfx.eicons[pl.mark]);
			if (pl.markpower != 1){
				px.maybeSetText(marktext[j], "x" + pl.markpower);
			}else marktext[j].visible = false;
			for (var i = 1;i < 13;i++) {
				px.maybeSetText(quantatext[j].children[i*2-2], pl.quanta[i].toString());
			}
			var yOffset = j == 0 ? 28 : -44;
			fgfx.beginFill(0);
			fgfx.drawRect(hptext[j].x - 41, hptext[j].y + yOffset-1, 82, 16);
			fgfx.endFill();
			if (pl.hp > 0){
				fgfx.beginFill(ui.elecols[etg.Life]);
				fgfx.drawRect(hptext[j].x - 40, hptext[j].y + yOffset, 80 * pl.hp / pl.maxhp, 14);
				fgfx.endFill();
				if (!cloakgfx.visible && game.expectedDamage[j]) {
					fgfx.beginFill(ui.elecols[game.expectedDamage[j] >= pl.hp ? etg.Fire : game.expectedDamage[j] > 0 ? etg.Time : etg.Water]);
					fgfx.drawRect(hptext[j].x - 40 + 80 * pl.hp / pl.maxhp, hptext[j].y + yOffset, -80 * Math.min(game.expectedDamage[j], pl.hp) / pl.maxhp, 14);
					fgfx.endFill();
				}
			}
			px.maybeSetText(hptext[j], pl.hp + "/" + pl.maxhp);
			if (px.hitTest(hptext[j], pos)){
				setInfo(pl);
			}
			var poison = pl.status.poison, poisoninfo = !poison ? "" : (poison > 0 ? poison + " 1:2" : -poison + " 1:7") + (pl.neuro ? " 1:10" : "");
			poisontext[j].setTexture(ui.getTextImage(poisoninfo, 16));
			px.maybeSetText(decktext[j], pl.deck.length + "cards");
			px.maybeSetText(damagetext[j], !cloakgfx.visible && game.expectedDamage[j] ? "Next HP loss: " + game.expectedDamage[j] : "");
		}
		Effect.next(cloakgfx.visible);
	}, true);
}

function startArenaInfo(info) {
	if (!info) return;
	var stage = px.mkView();
	var winloss = new px.MenuText(200, 300, (info.win || 0) + " - " + (info.loss || 0) + ": " + (info.rank+1) + "\nAge: " + info.day + "\nHP: " + info.curhp + " / " + info.hp + "\nMark: " + info.mark + "\nDraw: " + info.draw);
	stage.addChild(winloss);
	var infotext = new px.MenuText(300, 470, "You get $3 every time your arena deck wins,\n& $1 every time it loses.");
	stage.addChild(infotext);
	if (sock.user.ocard){
		var uocard = etgutil.asUpped(sock.user.ocard, info.lv == 1);
		var bmake = px.mkButton(200, 440, "Create");
		px.setClick(bmake, function(){
			startEditor(info, uocard, true);
		});
		stage.addChild(bmake);
		var ocard = new PIXI.Sprite(getArt(uocard));
		ocard.position.set(734, 300);
		stage.addChild(ocard);
	}
	var bret = px.mkButton(200, 500, "Exit");
	px.setClick(bret, startMenu);
	stage.addChild(bret);
	if (info.card){
		if (info.lv){
			info.card = etgutil.asUpped(info.card, true);
		}
		var bmod = px.mkButton(200, 470, "Modify");
		px.setClick(bmod, function(){
			startEditor(info, info.card);
		});
		stage.addChild(bmod);
		aideck.value = "05" + info.card + info.deck;
		var mark, i = 0;
		etgutil.iterdeck(aideck.value, function(code){
			var ismark = etg.fromTrueMark(code);
			if (~ismark){
				mark = ismark;
				return;
			}
			var spr = new PIXI.Sprite(getCardImage(code));
			spr.position.set(100 + Math.floor(i / 10) * 100, 32 + (i % 10) * 20);
			stage.addChild(spr);
			i++;
		});
		var spr = new PIXI.Sprite(gfx.eicons[mark || 0]);
		spr.position.set(66, 200);
		stage.addChild(spr);
		var acard = new PIXI.Sprite(getArt(info.card));
		acard.position.set(734, 8);
		stage.addChild(acard);
	}
	px.refreshRenderer(stage);
}

function startArenaTop(info) {
	info = info.top;
	if (!info) {
		chat("??");
		return;
	}
	var stage = px.mkView();
	for (var i = 0;i < info.length; i++) {
		var data = info[i], y = 50 + i * 24;
		var infotxt = new px.MenuText(120, y, (i+1) + "  " + data[0]);
		var scoretxt = new px.MenuText(350, y, data[1]);
		var winlosstxt = new px.MenuText(400, y, data[2] + "-" + data[3]);
		var agetxt = new px.MenuText(460, y, data[4].toString());
		if (data[5] in Cards.Codes){
			var cardtxt = new px.MenuText(500, y, Cards.Codes[data[5]].name);
			stage.addChild(cardtxt);
		}
		stage.addChild(infotxt);
		stage.addChild(scoretxt);
		stage.addChild(winlosstxt);
		stage.addChild(agetxt);
	}
	var bret = px.mkButton(8, 300, "Exit");
	px.setClick(bret, startMenu);
	stage.addChild(bret);
	px.refreshRenderer(stage);
}

function addChatSpan(span) {
	span.appendChild(document.createElement("br"));
	var scroll = chatBox.scrollTop == (chatBox.scrollHeight - chatBox.offsetHeight);
	chatBox.appendChild(span);
	if (scroll) chatBox.scrollTop = chatBox.scrollHeight;
}
function chat(msg, fontcolor) {
	var span = document.createElement("span");
	if (fontcolor) span.style.color = fontcolor;
	span.appendChild(document.createTextNode(msg));
	addChatSpan(span);
}
sock.et.on("open", function(){
	chat("Connected");
	offlineChange();
	wantpvpChange();
});
sock.et.on("close", function(){
	chat("Reconnecting in 100ms");
	setTimeout(function(){sock.et.open()}, 100);
});
sock.et.on("message", function(data){
	data = JSON.parse(data);
	var func = sockEvents[data.x] || (px.realStage.children.length > 1 && px.realStage.children[1].cmds && (func = px.realStage.children[1].cmds[data.x]));
	if (func){
		func.call(sock.et, data);
	}
});
var sockEvents = {
	challenge:function(data) {
		var span = document.createElement("span");
		span.style.cursor = "pointer";
		span.style.color = "blue";
		span.addEventListener("click", (data.pvp ? challengeClick : tradeClick).bind(null, data.f));
		span.appendChild(document.createTextNode(data.f + (data.pvp ? " challenges you to a duel!" : " wants to trade with you!")));
		addChatSpan(span);
	},
	userdump:function(data) {
		delete data.x;
		sock.user = data;
		prepsock.user();
		startMenu();
	},
	passchange:function(data) {
		sock.user.auth = data.auth;
		chat("Password updated");
	},
	chat:function(data) {
		if (muteall || data.u in muteset || !data.msg) return;
		if (typeof Notification !== "undefined" && sock.user && ~data.msg.indexOf(sock.user.name) && !document.hasFocus()){
			Notification.requestPermission();
			new Notification(data.u, {body: data.msg}).onclick = window.focus;
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
			if (reres.index != lastindex) span.appendChild(document.createTextNode(data.msg.substring(lastindex, reres.index)));
			var link = document.createElement("a");
			link.href = "deck/" + reres[0];
			link.target = "_blank";
			link.appendChild(document.createTextNode(reres[0]));
			span.appendChild(link);
			lastindex = reres.index + reres[0].length;
		}
		if (lastindex != data.msg.length) span.appendChild(document.createTextNode(data.msg.substring(lastindex)));
		addChatSpan(span);
	},
	codecard: startRewardWindow,
	codereject:function(data) {
		chat(data.msg);
	},
	codegold:function(data) {
		sock.user.gold += data.g;
		chat(data.g + "\u00A4 added!");
	},
	codecode:function(data) {
		sock.user.pool = etgutil.addcard(sock.user.pool, data);
		chat(Cards.Codes[data].name + " added!");
	},
	codedone:function(data) {
		sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
		chat(Cards.Codes[data.card].name + " added!");
		startMenu();
	},
}
function soundChange(event) {
	ui.changeSound(enableSound.checked);
}
function musicChange(event) {
	ui.changeMusic(enableMusic.checked);
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
		var msg = chatinput.value;
		chatinput.value = "";
		if (msg == "/clear"){
			while (chatBox.firstChild) chatBox.firstChild.remove();
		}else if (msg == "/mute"){
			muteall = true;
			chatmute();
		}else if (msg == "/unmute"){
			muteall = false;
			chatmute();
		}else if (msg.match(/^\/mute /)){
			muteset[msg.substring(6)] = true;
			chatmute();
		}else if (msg.match(/^\/unmute /)){
			delete muteset[msg.substring(8)];
			chatmute();
		}else if (sock.user){
			var msgdata = {msg: msg};
			if (msg.match(/^\/w( |")/)) {
				var match = msg.match(/^\/w"([^"]*)"/);
				var to = (match && match[1]) || msg.substring(3, msg.indexOf(" ", 4));
				if (!to) return;
				chatinput.value = msg.substr(0, 4+to.length);
				msgdata.msg = msg.substr(4+to.length);
				msgdata.to = to;
			}
			if (!msgdata.msg.match(/^\s*$/)) sock.userEmit("chat", msgdata);
		}
		else if (!msg.match(/^\s*$/)) {
			var name = username.value || guestname || (guestname = (10000 + Math.floor(Math.random() * 89999)) + "");
			sock.emit("guestchat", { msg: msg, u: name });
		}
	}
}
function unaryParseInt(x) {
	return parseInt(x, 10);
}
function maybeLogin(e) {
	e.cancelBubble = true;
	if (e.keyCode == 13) {
		loginClick();
	}
}
function maybeChallenge(e) {
	e.cancelBubble = true;
	if (e.keyCode != 13) return;
	if (foename.value) {
		challengeClick();
	}
}
function animate() {
	setTimeout(requestAnimate, 40);
	px.next();
}
function requestAnimate() { requestAnimFrame(animate); }
function prepuser(){
	sock.user.decks = sock.user.decks.split(",");
	deckimport.value = sock.user.decks[sock.user.selectedDeck];
	sock.user.pool = sock.user.pool || "";
	sock.user.accountbound = sock.user.accountbound || "";
	if (!sock.user.quest) {
		sock.user.quest = {};
	}
	if (sock.user.freepacks) {
		sock.user.freepacks = sock.user.freepacks.split(",").map(unaryParseInt);
	}
	if (!sock.user.ailosses) sock.user.ailosses = 0;
	if (!sock.user.aiwins) sock.user.aiwins = 0;
	if (!sock.user.pvplosses) sock.user.pvplosses = 0;
	if (!sock.user.pvpwins) sock.user.pvpwins = 0;
	lbloffline.style.display = lblwantpvp.style.display = "inline";
}
function loginClick() {
	if (!sock.user && username.value) {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", "auth?u=" + encodeURIComponent(username.value) + (password.value.length ? "&p=" + encodeURIComponent(password.value) : ""), true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					sock.user = JSON.parse(this.responseText);
					if (!sock.user) {
						chat("No user");
					} else if (!sock.user.accountbound && !sock.user.pool) {
						startElementSelect();
					} else {
						prepuser();
						startMenu();
					}
				} else if (this.status == 404) {
					chat("Incorrect password");
				} else if (this.status == 502) {
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
function parseInput(data, key, value, limit) {
	var value = parseInt(value);
	if (value === 0 || value > 0)
		data[key] = Math.min(value, limit || Infinity);
}
function parsepvpstats(data){
	parseInput(data, "p1hp", pvphp.value);
	parseInput(data, "p1drawpower", pvpdraw.value, 8);
	parseInput(data, "p1markpower", pvpmark.value, 1188);
	parseInput(data, "p1deckpower", pvpdeck.value);
}
function parseaistats(data){
	parseInput(data, "p2hp", aihp.value);
	parseInput(data, "p2drawpower", aidraw.value, 8);
	parseInput(data, "p2markpower", aimark.value, 1188);
	parseInput(data, "p2deckpower", aideckpow.value);
}
function challengeClick(foe) {
	if (Cards.loaded) {
		var deck = getDeck();
		if (etgutil.decklength(deck) < (sock.user ? 31 : 11)){
			startEditor();
			return;
		}
		var gameData = {};
		parsepvpstats(gameData);
		if (sock.user) {
			gameData.f = typeof foe === "string" ? foe : foename.value;
			sock.userEmit("foewant", gameData);
		}else{
			gameData.deck = deck;
			gameData.room = foename.value;
			sock.emit("pvpwant", gameData);
		}
	}
}
function tradeClick(foe) {
	if (Cards.loaded)
		sock.userEmit("tradewant", { f: typeof foe === "string" ? foe : foename.value });
}
function rewardClick() {
	if (Cards.loaded)
		sock.userEmit("codesubmit", { code: foename.value });
}
function libraryClick() {
	if (Cards.loaded)
		sock.emit("librarywant", { f: foename.value });
}
function aiClick() {
	var deck = getDeck(), aideckcode = aideck.value;
	if (etgutil.decklength(deck) < 11 || etgutil.decklength(aideckcode) < 11) {
		startEditor();
		return;
	}
	var gameData = { deck: aideckcode, urdeck: deck, seed: Math.random() * etgutil.MAX_INT, foename: "Custom", cardreward: "" };
	parsepvpstats(gameData);
	parseaistats(gameData);
	initGame(gameData, true);
}
function offlineChange(){
	sock.emit("showoffline", {hide: offline.checked});
}
function wantpvpChange(){
	sock.emit("wantingpvp", {want: wantpvp.checked});
}
(function(callbacks){
	for(var id in callbacks){
		for(var event in callbacks[id]){
			document.getElementById(id).addEventListener(event, callbacks[id][event]);
		}
	}
})({
	leftpane: {click: leftpane.blur},
	change: {click: changeClick},
	login: {click: loginClick},
	username: {keydown: maybeLogin},
	password: {keydown: maybeLogin},
	foename: {keydown: maybeChallenge},
	challenge: {click: challengeClick},
	trade: {click: tradeClick},
	reward: {click: rewardClick},
	library: {click: libraryClick},
	chatinput: {keydown: maybeSendChat},
	enableSound: {change: soundChange},
	enableMusic: {change: musicChange},
	aivs: {click: aiClick},
	offline: {change: offlineChange},
	wantpvp: {change: wantpvpChange},
});
})();