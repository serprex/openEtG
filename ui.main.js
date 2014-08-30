"use strict";
(function() {
var htmlElements = ["leftpane", "chatinput", "deckimport", "aideck", "foename", "change", "login", "password", "challenge", "chatBox", "trade", "bottompane", "demigodmode", "username", "stats","enableSound", "hideright", "lblhideright", "wantpvp", "lblwantpvp", "offline", "lbloffline"];
htmlElements.forEach(function(name){
	window[name] = document.getElementById(name);
});
if (localStorage){
	var store = [username, stats, enableSound, enableMusic, hideright, wantpvp, offline];
	store.forEach(function(storei){
		var field = storei.type == "checkbox" ? "checked" : "value";
		if (localStorage[storei.id] !== undefined){
			storei[field] = localStorage[storei.id];
		}
		storei.addEventListener("change", function(e) {
			localStorage[storei.id] = field == "checked" && !storei[field] ? "" : storei[field];
		});
	});
}
})();
(function(){
require("./etg.client").loadcards();
PIXI.AUTO_PREVENT_DEFAULT = false;
var discarding, user, guestname, muteset = {}, muteall;
var etgutil = require("./etgutil");
var userutil = require("./userutil");
var etg = require("./etg");
var Actives = require("./Actives");
var Effect = require("./Effect");
var Quest = require("./Quest");
var ui = require("./uiutil");
var aiDecks = require("./Decks");
var Cards = require("./Cards");
var socket = io(location.hostname + ":13602");
function maybeSetText(obj, text) {
	if (obj.text != text) obj.setText(text);
}
function maybeSetTexture(obj, text) {
	if (text) {
		obj.visible = true;
		obj.setTexture(text);
	} else obj.visible = false;
}
function setClick(obj, click, sound) {
	sound = sound === undefined ? "buttonClick" : sound;
	obj.click = function() {
		ui.playSound(sound);
		click.apply(null, arguments);
	}
}
function hitTest(obj, pos) {
	var x = obj.position.x - obj.width * obj.anchor.x, y = obj.position.y - obj.height * obj.anchor.y;
	return pos.x > x && pos.y > y && pos.x < x + obj.width && pos.y < y + obj.height;
}
function setInteractive() {
	for (var i = 0;i < arguments.length;i++) {
		arguments[i].interactive = true;
	}
}
function userEmit(x, data) {
	if (!data) data = {};
	data.u = user.name;
	data.a = user.auth;
	socket.emit(x, data);
}
function userExec(x, data){
	if (!data) data = {};
	userEmit(x, data);
	userutil[x](data, user);
}
function refreshRenderer(stage, animCb) {
	if (realStage.children.length > 0){
		var oldstage = realStage.children[0];
		if (oldstage.cmds){
			for (var cmd in oldstage.cmds){
				socket.removeListener(cmd, oldstage.cmds[cmd]);
			}
		}
		if (oldstage.endnext) oldstage.endnext();
		realStage.removeChildren();
	}
	realStage.addChild(stage);
	realStage.next = animCb;
	if (stage.cmds){
		for (var cmd in stage.cmds){
			socket.on(cmd, stage.cmds[cmd]);
		}
	}
}

var renderer = new PIXI.autoDetectRenderer(900, 600);
leftpane.appendChild(renderer.view);
var realStage = new PIXI.Stage(0x336699, true);
realStage.click = renderer.view.blur.bind(renderer.view);
var caimgcache = {}, crimgcache = {}, wsimgcache = {}, artcache = {}, artimagecache = {};
var elecols = [0xa99683, 0xaa5999, 0x777777, 0x996633, 0x5f4930, 0x50a005, 0xcc6611, 0x205080, 0xa9a9a9, 0x337ddd, 0xccaa22, 0x333333, 0x77bbdd];

function lighten(c) {
	return ((c & 255) + 255 >> 1) | (((c >> 8) & 255) + 255 >> 1 << 8) | (((c >> 16) & 255) + 255 >> 1 << 16);
}
function maybeLighten(card){
	return card.upped ? lighten(elecols[card.element]) : elecols[card.element];
}
function getBack(ele, upped) {
	if (upped) ele += 13;
	return gfx.cardBacks[ele];
}
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
	template.addChild(new PIXI.Sprite(getBack(card.element, card.upped)));
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
	var infospr = new PIXI.Sprite(ui.getTextImage(card.info(), ui.mkFont(11, card.upped ? "black" : "white"), "", rend.width-4))
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
		graphics.lineStyle(2, 0x222222, 1);
		graphics.beginFill(card ? maybeLighten(card) : code == "0" ? 0x887766 : 0x111111);
		graphics.drawRect(0, 0, 100, 20);
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
			graphics.beginFill(card ? maybeLighten(card) : elecols[0]);
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
			graphics.beginFill(card ? maybeLighten(card) : elecols[0]);
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
function mkBgRect(){
	var g = new PIXI.Graphics();
	g.lineStyle(2, 0x121212);
	g.beginFill(0x243648);
	for(var i=0; i<arguments.length; i+=4){
		g.drawRect(arguments[i], arguments[i+1], arguments[i+2], arguments[i+3], 6);
	}
	g.endFill();
	return g;
}

function initTrade() {
	var editorui = new PIXI.DisplayObjectContainer();
	editorui.interactive = true;
	editorui.addChild(new PIXI.Sprite(gfx.bg_default));
	var cardminus = {};
	var btrade = makeButton(10, 40, "Trade");
	var bconfirm = makeButton(10, 70, "Confirm");
	var bconfirmed = new PIXI.Text("Confirmed!", { font: "16px Dosis" });
	var bcancel = makeButton(10, 10, "Cancel");
	var cardChosen = false;
	var selectedCards = [], selectedCardsprites = [];
	var player2Cards = [], player2Cardsprites = [];
	setClick(bcancel, function() {
		userEmit("canceltrade");
		startMenu();
	});
	setClick(btrade, function() {
		if (selectedCards.length > 0) {
			userEmit("cardchosen", { cards: etgutil.encodedeck(selectedCards) });
			console.log("Card sent");
			cardChosen = true;
			editorui.removeChild(btrade);
			editorui.addChild(bconfirm);
		}
		else
			chat("You have to choose at least a card!");
	});
	setClick(bconfirm, function() {
		if (player2Cards.length > 0) {
			console.log("Confirmed!");
			userEmit("confirmtrade", { cards: etgutil.encodedeck(selectedCards), oppcards: etgutil.encodedeck(player2Cards) });
			editorui.removeChild(bconfirm);
			editorui.addChild(bconfirmed);
		}
		else chat("Wait for your friend to choose!");
	});
	bconfirmed.position.set(10, 110);
	setInteractive(btrade);
	editorui.addChild(btrade);
	editorui.addChild(bcancel);

	function updateSelectedCards(){
		for (var i = 0;i < selectedCards.length;i++) {
			selectedCardsprites[i].visible = true;
			selectedCardsprites[i].setTexture(getCardImage(selectedCards[i]));
		}
		for (;i<30;i++) {
			selectedCardsprites[i].visible = false;
		}
	}
	var cardpool = etgutil.deck2pool(user.pool);
	var cardsel = makeCardSelector(
		function(code){
			cardArt.setTexture(getArt(code));
		},
		function(code){
			var card = Cards.Codes[code];
			if (selectedCards.length < 30 && !isFreeCard(card) && code in cardpool && !(code in cardminus && cardminus[code] >= cardpool[code])) {
				adjust(cardminus, code, 1);
				for (var i = 0;i < selectedCards.length;i++) {
					var cmp = editorCardCmp(selectedCards[i], code);
					if (cmp >= 0) break;
				}
				selectedCards.splice(i, 0, code);
				updateSelectedCards();
			}
		}
	);
	editorui.addChild(cardsel);
	for (var i = 0;i < 30;i++) {
		var sprite = new PIXI.Sprite(gfx.nopic);
		sprite.position.set(100 + Math.floor(i / 10) * 100, 8 + (i % 10) * 20);
		(function(_i) {
			setClick(sprite, function() {
				var card = Cards.Codes[selectedCards[_i]];
				adjust(cardminus, selectedCards[_i], -1);
				selectedCards.splice(_i, 1);
				updateSelectedCards();
			}, "cardClick");
			sprite.mouseover = function() {
				cardArt.setTexture(getArt(selectedCards[_i]));
			}
		})(i);
		editorui.addChild(sprite);
		selectedCardsprites.push(sprite);
	}
	for (var i = 0;i < 30;i++) {
		var sprite = new PIXI.Sprite(gfx.nopic);
		sprite.position.set(450 + Math.floor(i / 10) * 100, 8 + (i % 10) * 20);
		(function(_i) {
			sprite.mouseover = function() {
				cardArt.setTexture(getArt(player2Cards[_i]));
			}
		})(i);
		editorui.addChild(sprite);
		player2Cardsprites.push(sprite);
	}
	setInteractive.apply(null, selectedCardsprites);
	setInteractive.apply(null, player2Cardsprites);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	editorui.addChild(cardArt);
	editorui.cmds = {
		cardchosen: function(data){
			player2Cards = etgutil.decodedeck(data.cards);
			for (var i = 0;i < player2Cards.length;i++) {
				player2Cardsprites[i].visible = true;
				player2Cardsprites[i].setTexture(getCardImage(player2Cards[i]));
			}
			for (;i<30;i++)	{
				player2Cardsprites[i].visible = false;
			}
		},
		tradedone: function(data) {
			user.pool = etgutil.mergedecks(user.pool, data.newcards);
			user.pool = etgutil.removedecks(user.pool, data.oldcards);
			startMenu();
		},
		tradecanceled: function(data) {
			startMenu();
		},
	};
	refreshRenderer(editorui, function() {
		cardsel.next(cardpool, cardminus);
	});
}
function initLibrary(pool){
	var editorui = new PIXI.DisplayObjectContainer();
	editorui.interactive = true;
	editorui.addChild(new PIXI.Sprite(gfx.bg_default));
	var bexit = makeButton(10, 10, "Exit");
	setClick(bexit, startMenu);
	editorui.addChild(bexit);
	var cardminus = {}, cardpool = etgutil.deck2pool(pool);
	var cardsel = makeCardSelector(
		function(code){
			cardArt.setTexture(getArt(code));
		}, null);
	editorui.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	editorui.addChild(cardArt);
	refreshRenderer(editorui, function(){
		cardsel.next(cardpool, cardminus);
	});
}
function initGame(data, ai) {
	var game = new etg.Game(data.first, data.seed);
	if (data.p1hp) {
		game.player1.maxhp = game.player1.hp = data.p1hp;
	}
	if (data.p2hp) {
		game.player2.maxhp = game.player2.hp = data.p2hp;
	}
	if (data.p1markpower !== undefined) {
		game.player1.markpower = data.p1markpower;
	}
	if (data.p2markpower !== undefined) {
		game.player2.markpower = data.p2markpower;
	}
	if (data.p1drawpower !== undefined) {
		game.player1.drawpower = data.p1drawpower;
	}
	if (data.p2drawpower !== undefined) {
		game.player2.drawpower = data.p2drawpower;
	}
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
function getDeck(limit) {
	var deck = user ? user.decks[user.selectedDeck] :
		~deckimport.value.indexOf(" ") ? etgutil.encodedeck(deckimport.value.split(" ")) :
		deckimport.value;
	return deck;
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
	var victoryui = new PIXI.DisplayObjectContainer();
	victoryui.interactive = true;
	var winner = game.winner == game.player1;
	//lobby background
	var bgvictory = new PIXI.Sprite(gfx.bg_default);
	victoryui.addChild(bgvictory);

	victoryui.addChild(makeText(10, 290, "Plies: " + game.ply + "\nTime: " + (game.time/1000).toFixed(1) + " seconds"));
	if (winner){
		var victoryText = game.quest ? game.wintext : "You won!";
		var tinfo = makeText(450, game.cardreward ? 130 : 250, victoryText,true,500);
		tinfo.anchor.x = 0.5;
		tinfo.anchor.y = 1;
		victoryui.addChild(tinfo);
	}

	var bexit = makeButton(412, 430, "Exit");
	setClick(bexit, function() {
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
	if (winner && user){
		if (game.goldreward) {
			var goldshown = (game.goldreward || 0) - (game.cost || 0);
			var tgold = makeText(340, 550, "Gold won: $" + goldshown);
			victoryui.addChild(tgold);
			userExec("addgold", { g: game.goldreward });
		}
		if (game.cardreward) {
			var cardrewardlength = etgutil.decklength(game.cardreward);
			etgutil.iterdeck(game.cardreward, function(code, i){
				var cardArt = new PIXI.Sprite(getArt(code));
				cardArt.anchor.x = .5;
				cardArt.position.set(470-cardrewardlength*20+i*40, 170);
				victoryui.addChild(cardArt);
			});
			userExec(game.quest?"addbound":"addcards", { c: game.cardreward });
		}
	}

	if (stats.checked){
		chat((game.level || 0) + " " + (game.foename || "?") + " " + (winner?"W":"L") + " " + game.ply + " " + game.time + " " + game.player1.hp + " " + game.player1.maxhp + " " + (game.goldreward || 0) + " " + (game.cardreward || "-"));
	}

	refreshRenderer(victoryui);
}

function mkPremade(name, daily) {
	return function() {
		var urdeck = getDeck();
		if (etgutil.decklength(urdeck) < (user ? 31 : 11)) {
			startEditor();
			return;
		}
		var cost = daily !== undefined ? 0 : name == "mage" ? 5 : 20, foedata;
		if (user) {
			if (daily === undefined){
				if (user.gold < cost) {
					chat("Requires " + cost + "\u00A4");
					return;
				}
				userExec("addgold", { g: -cost });
			}else{
				foedata = aiDecks[name][user[name == "mage" ? "dailymage" : "dailydg"]];
			}
		}
		if (!foedata) foedata = aiDecks.giveRandom(name);
		var foename = name[0].toUpperCase() + name.slice(1) + "\n" + foedata[0];
		var gameData = { first: Math.random() < .5, deck: foedata[1], urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, foename: foename };
		if (name == "mage"){
			gameData.p2hp = 125;
		}else{
			gameData.p2hp = 200;
			gameData.p2markpower = 3;
			gameData.p2drawpower = 2;
		}
		if (!user) parsepvpstats(gameData);
		var game = initGame(gameData, true);
		game.cost = cost;
		game.level = name == "mage" ? 1 : 3;
		if (daily !== undefined) game.daily = daily;
		return game;
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
	if (etgutil.decklength(urdeck) < (user ? 31 : 11)) {
		return "ERROR: Your deck is invalid or missing! Please exit & create a valid deck in the deck editor.";
	}
	var game = initGame({ first: Math.random() < .5, deck: quest.deck, urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, p2hp: hp, p2markpower: markpower, foename: quest.name, p1hp: playerHPstart, p2drawpower: drawpower }, true);
	if (quest.morph) {
		game.player1.deck = game.player1.deck.map(quest.morph.bind(quest));
	}
	game.quest = [questname, stage];
	game.wintext = quest.wintext || "";
	game.autonext = quest.autonext;
	game.noheal = quest.noheal;
	game.area = area;
	if ((user.quest[questname] <= stage || !(questname in user.quest))) {
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
			if (etgutil.decklength(urdeck) < (user ? 31 : 11)) {
				startEditor();
				return;
			}
			var cost = daily !== undefined || level == 0 ? 0 : level == 1 ? 5 : 10;
			if (user && cost) {
				if (user.gold < cost) {
					chat("Requires " + cost + "\u00A4");
					return;
				}
				userExec("addgold", { g: -cost });
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
			var gameData = { first: Math.random() < .5, deck: deck, urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, p2hp: level == 0 ? 100 : level == 1 ? 125 : 150, p2markpower: level == 2 ? 2 : 1, foename: foename, p2drawpower: level == 2 ? 2 : 1 };
			if (!user) parsepvpstats(gameData);
			var game = initGame(gameData, true);
			game.cost = cost;
			game.level = level;
			if (daily !== undefined) game.daily = daily;
			return game;
		}
	}
}
soundChange();
musicChange();
var gfx = require("./gfx");
gfx.load(function(loadingScreen){
	refreshRenderer(loadingScreen);
	requestAnimate();
}, function(){
	ui.playMusic("openingMusic");
	startMenu();
});
function makeButton(x, y, img, mouseoverfunc) {
	var b;
	if (typeof img == "string"){
		b = new PIXI.Sprite(gfx.button);
		var txt = new PIXI.Text(img, {font: "14px Dosis"});
		txt.anchor.set(.5, .5);
		txt.position.set(b.width/2, b.height/2);
		if (txt.width>b.width-6) txt.width=b.width-6;
		b.addChild(txt);
		b.setText = function(x){
			if (x){
				maybeSetText(txt, x.toString());
				this.visible = true;
			}else this.visible = false;
		}
	}else if (img instanceof PIXI.Texture){
		b = new PIXI.Sprite(img);
	}else b = img;
	b.interactive = true;
	b.buttonMode = true;
	b.position.set(x, y);
	b.mousedown = function() {
		b.tint = 0x666666;
	}
	b.mouseover = b.mouseup = function() {
		if (mouseoverfunc) mouseoverfunc();
		b.tint = 0xAAAAAA;
	}
	b.mouseout = function() {
		b.tint = 0xFFFFFF;
	}
	return b;
}

function makeText(x, y, txt, vis, width) {
	var t = new PIXI.Sprite(gfx.nopic);
	t.position.set(x, y);
	t.setText = function(x, width){
		if (x){
			t.setTexture(ui.getTextImage(x.toString(), { font: "14px Verdana", fill: "white", stroke: "black", strokeThickness: 2 }, "", width));
			t.visible = true;
		}else{
			t.visible = false;
		}
	}
	t.setText(txt, width);
	t.visible = vis === undefined || vis;
	return t;
}

function toggleB() {
	for (var i = 0;i < arguments.length;i++) {
		arguments[i].visible = !arguments[i].visible;
		arguments[i].interactive = !arguments[i].interactive;
		arguments[i].buttonMode = !arguments[i].buttonMode;
	}
}
function isFreeCard(card) {
	return card.type == etg.PillarEnum && !card.upped && !card.rarity && !card.shiny;
}
function editorCardCmp(x, y) {
	var cx = Cards.Codes[x], cy = Cards.Codes[y];
	return cx.upped - cy.upped || cx.element - cy.element || cx.cost - cy.cost || cx.type - cy.type || (x > y) - (x < y);
}
function adjust(cardminus, code, x) {
	if (code in cardminus) {
		cardminus[code] += x;
	} else cardminus[code] = x;
	delete cardminus.rendered;
}
function makeCardSelector(cardmouseover, cardclick, maxedIndicator){
	var cardpool, cardminus, showall, showshiny;
	var cardsel = new PIXI.DisplayObjectContainer();
	cardsel.interactive = true;
	if (maxedIndicator) {
		var graphics = new PIXI.Graphics();
		cardsel.addChild(graphics);
	}
	var elefilter = 0, rarefilter = 0;
	var columns = [[],[],[],[],[],[]], columnspr = [[],[],[],[],[],[]];
	for (var i = 0;i < 13;i++) {
		var sprite = makeButton((!i || i&1?4:40), 316 + Math.floor((i-1)/2) * 32, gfx.eicons[i]);
		sprite.interactive = true;
		(function(_i) {
			setClick(sprite, function() {
				elefilter = _i;
				makeColumns();
			});
		})(i);
		cardsel.addChild(sprite);
	}
	for (var i = 0;i < 5; i++){
		var sprite = makeButton(74, 338 + i * 32, gfx.ricons[i]);
		sprite.interactive = true;
		(function(_i) {
			setClick(sprite, function() {
				rarefilter = _i;
				makeColumns();
			});
		})(i);
		cardsel.addChild(sprite);
	}
	for (var i = 0;i < 6;i++) {
		for (var j = 0;j < 15;j++) {
			var sprite = new PIXI.Sprite(gfx.nopic);
			sprite.position.set(100 + i * 130, 272 + j * 20);
			var sprcount = new PIXI.Text("", { font: "12px Dosis" });
			sprcount.position.set(102, 4);
			sprite.addChild(sprcount);
			(function(_i, _j) {
				if (cardclick){
					setClick(sprite, function() {
						cardclick(columns[_i][_j]);
					}, "cardClick");
				}
				if (cardmouseover){
					sprite.mouseover = function(){
						cardmouseover(columns[_i][_j]);
					}
				}
			})(i, j);
			sprite.interactive = true;
			cardsel.addChild(sprite);
			columnspr[i].push(sprite);
		}
	}
	function makeColumns(){
		for (var i = 0;i < 6;i++) {
			columns[i] = etg.filtercards(i > 2,
				function(x) { return x.element == elefilter &&
					((i % 3 == 0 && x.type == etg.CreatureEnum) || (i % 3 == 1 && x.type <= etg.PermanentEnum) || (i % 3 == 2 && x.type == etg.SpellEnum)) &&
					(!cardpool || x in cardpool || showall || isFreeCard(x)) && (!rarefilter || rarefilter == Math.min(x.rarity, 4));
				}, editorCardCmp, showshiny);
		}
		renderColumns();
	}
	function renderColumns(){
		if (cardminus) cardminus.rendered = true;
		if (maxedIndicator) graphics.clear();
		for (var i = 0;i < 6; i++){
			for (var j = 0;j < columns[i].length;j++) {
				var spr = columnspr[i][j], code = columns[i][j], card = Cards.Codes[code];
				spr.setTexture(getCardImage(code));
				spr.visible = true;
				if (cardpool) {
					var txt = spr.getChildAt(0), card = Cards.Codes[code], inf = isFreeCard(card);
					if ((txt.visible = inf || code in cardpool || showall)) {
						var cardAmount = inf ? "-" : !(code in cardpool) ? 0 : (cardpool[code] - (cardminus && code in cardminus ? cardminus[code] : 0))
						maybeSetText(txt, cardAmount.toString());
						if (maxedIndicator && card.type != etg.PillarEnum && cardAmount >= 6) {
							graphics.beginFill(elecols[etg.Light]);
							graphics.drawRect(spr.position.x + 100, spr.position.y, 20, 20);
							graphics.endFill();
						}
					}
				}
			}
			for (;j < 15;j++) {
				columnspr[i][j].visible = false;
			}
		}
	}
	cardsel.next = function(newcardpool, newcardminus, newshowall, newshowshiny) {
		if (newcardpool != cardpool || newcardminus != cardminus || newshowall != showall || newshowshiny != showshiny) {
			showall = newshowall;
			showshiny = newshowshiny;
			cardminus = newcardminus;
			cardpool = newcardpool;
			makeColumns();
		}else if (cardminus && !cardminus.rendered){
			renderColumns();
		}
	};
	return cardsel;
}
function startMenu(nymph) {
	var tipjar = [
		"Each card in your booster pack has a 50% chance of being from the chosen element",
		"Your arena deck will earn you 3 gold per win & 1 gold per loss",
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

	var menuui = new PIXI.DisplayObjectContainer();
	menuui.interactive = true;
	var buttonList = [];
	var mouseroverButton;
	var clickedButton;
	var bglobby = new PIXI.Sprite(gfx.bg_default);
	bglobby.interactive = true;
	bglobby.mouseover = function() {
		tinfo.setText(user ? "Tip: " + tipjar[tipNumber] + "." : "To register, just type desired username & password in the fields to the right, then click 'Login'.", 750);
	}
	menuui.addChild(bglobby);
	var menusquares = new PIXI.Sprite(gfx.bg_lobby);
	menusquares.position.set(40, 16);
	menuui.addChild(menusquares);

	var bnextTip = makeButton(750, 50, "Next tip");
	setClick(bnextTip, function() {
		tipNumber = (tipNumber+1) % tipjar.length;
		tinfo.setText("Tip: " + tipjar[tipNumber] + ".", 750);
	});
	menuui.addChild(bnextTip);

	var tgold = makeText(750, 101, (user ? "$" + user.gold : "Sandbox"));
	menuui.addChild(tgold);

	var taiwinloss = makeText(750, 125, (user ? "AI w/l\n" + user.aiwins + "/" + user.ailosses + "\n\nPvP w/l\n" + user.pvpwins + "/" + user.pvplosses : ""));
	menuui.addChild(taiwinloss);

	var tinfo = makeText(50, 26, "")
	menuui.addChild(tinfo);

	var bai0 = makeButton(50, 100, "Commoner", function() {
		tinfo.setText("Commoners have no upgraded cards & mostly common cards.\nCost: $0");
	});
	setClick(bai0, mkAi(0));
	menuui.addChild(bai0);

	var bai1 = makeButton(150, 100, "Mage", function() {
		tinfo.setText("Mages have preconstructed decks with a couple rares.\nCost: $5");
	});
	setClick(bai1, mkPremade("mage"));
	menuui.addChild(bai1);

	var bai2 = makeButton(250, 100, "Champion", function() {
		tinfo.setText("Champions have some upgraded cards.\nCost: $10");
	});
	setClick(bai2, mkAi(2));
	menuui.addChild(bai2);

	var bai3 = makeButton(350, 100, "Demigod", function() {
		tinfo.setText("Demigods are extremely powerful. Come prepared for anything.\nCost: $20");
	});
	setClick(bai3, mkPremade("demigod"));
	menuui.addChild(bai3);

	var bquest = makeButton(50, 145, "Quests", function() {
		tinfo.setText("Go on an adventure!");
	});
	setClick(bquest, startQuestWindow);
	menuui.addChild(bquest);

	var bcolosseum = makeButton(150, 145, "Colosseum", function() {
		tinfo.setText("Try some daily challenges in the Colosseum!");
	});
	setClick(bcolosseum, startColosseum);
	menuui.addChild(bcolosseum);

	var bedit = makeButton(50, 300, "Editor", function() {
		tinfo.setText("Edit your deck, as well as submit an arena deck.");
	});
	setClick(bedit, startEditor);
	menuui.addChild(bedit);

	var bshop = makeButton(150, 300, "Shop", function() {
		tinfo.setText("Buy booster packs which contain cards from the elements you choose.");
	});
	setClick(bshop, startStore);
	menuui.addChild(bshop);

	var bupgrade = makeButton(250, 300, "Sell/Upgrade", function() {
		tinfo.setText("Upgrade or sell cards.");
	});
	setClick(bupgrade, upgradestore);
	menuui.addChild(bupgrade);

	var blogout = makeButton(750, 246, "Logout", function() {
		tinfo.setText("Click here to log out.")
	});
	setClick(blogout, function() {
		userEmit("logout");
		logout();
	});
	menuui.addChild(blogout);

	//delete account button
	var bdelete = makeButton(750, 550, "Wipe Account", function() {
		tinfo.setText("Click here to permanently remove your account.")
	});
	setClick(bdelete, function() {
		if (foename.value == user.name + "yesdelete") {
			userEmit("delete");
			logout();
		} else {
			chat("Input '" + user.name + "yesdelete' into Challenge to delete your account");
		}
	});
	menuui.addChild(bdelete);

	var usertoggle = [bquest, bcolosseum, bshop, bupgrade, blogout, bdelete, taiwinloss, bnextTip];
	for (var i=0; i<2; i++){
		var baia = makeButton(50, 200+i*50, "Arena AI", (function(cost){return function() {
			tinfo.setText("In the arena you will face decks from other players.\nCost: $" + cost);
		}})(i?20:10));
		menuui.addChild(baia);
		var binfoa = makeButton(150, 200+i*50, "Arena Info", function() {
			tinfo.setText("Check how your arena deck is doing.");
		});
		menuui.addChild(binfoa);
		var btopa = makeButton(250, 200+i*50, "Arena T20", function() {
			tinfo.setText("See who the top players in arena are right now.");
		});
		menuui.addChild(btopa);
		usertoggle.push(baia, binfoa, btopa);
		(function(lvi){
			setClick(baia, function() {
				if (Cards.loaded) {
					if (etgutil.decklength(getDeck()) < 31) {
						startEditor();
						return;
					}
					userEmit("foearena", lvi);
				}
			});
			setClick(binfoa, function() {
				if (Cards.loaded) {
					userEmit("arenainfo", lvi);
				}
			});
			setClick(btopa, function() {
				if (Cards.loaded) {
					userEmit("arenatop", lvi);
				}
			});
		})({lv:i});
	}

	if (!user) toggleB.apply(null, usertoggle);
	else if (user.oracle || typeof nymph === "string") {
		var oracle = new PIXI.Sprite(getArt(nymph || user.oracle));
		oracle.position.set(450, 100);
		menuui.addChild(oracle);
		delete user.oracle;
	}

	function logout() {
		user = undefined;

		toggleB.apply(null, usertoggle);

		tgold.setText("Sandbox");
		tgold.position.set(755, 101);

		if (oracle) {
			menuui.removeChild(oracle);
		}
	}
	menuui.cmds = {
		pvpgive: initGame,
		tradegive: initTrade,
	};
	menuui.endnext = function(){
		lbloffline.style.display = lblwantpvp.style.display = lblhideright.style.display = "none";
	}

	refreshRenderer(menuui);
	lbloffline.style.display = lblwantpvp.style.display = lblhideright.style.display = "inline";
}
function startRewardWindow(reward, numberofcopies, nocode) {
	if (!numberofcopies) numberofcopies = 1;
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
	var rewardui = new PIXI.DisplayObjectContainer();
	rewardui.interactive = true;
	rewardui.addChild(new PIXI.Sprite(gfx.bg_default));

	if (numberofcopies > 1) {
		var infotext = makeText(20, 100, "You will get " + numberofcopies + " copies of the card you choose")
		rewardui.addChild(infotext);
	}

	if (!nocode){
		var exitButton = makeButton(10, 10, "Exit");
		setClick(exitButton, startMenu);
		rewardui.addChild(exitButton);
	}

	var confirmButton = makeButton(10, 40, "Done");
	setClick(confirmButton, function() {
		if (chosenReward) {
			if (nocode) {
				userExec("addbound", { c: etgutil.encodeCount(numberofcopies) + chosenReward });
				startMenu();
			}
			else {
				userEmit("codesubmit2", { code: foename.value, card: chosenReward });
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
		setClick(card, function(){
			chosenReward = reward;
			chosenRewardImage.setTexture(getArt(chosenReward));
		}, "cardClick");
		rewardui.addChild(card);
		setInteractive(card);
	});

	refreshRenderer(rewardui);
}

function startQuest(questname) {
	if (!user.quest[questname] && user.quest[questname] != 0) {
		user.quest[questname] = 0;
		userEmit("updatequest", { quest: questname, newstage: 0 });
	}
}
function startQuestWindow(){
	var questui = new PIXI.DisplayObjectContainer();
	questui.interactive = true;
	var bgquest = new PIXI.Sprite(gfx.bg_default);
	bgquest.mouseover = function(){
		tinfo.setText("Welcome to Potatotal Island. The perfect island for adventuring!");
	};
	bgquest.interactive = true;
	questui.addChild(bgquest);
	questui.addChild(mkBgRect(9, 9, 880, 111));
	var questmap = new PIXI.Sprite(gfx.bg_questmap);
	questmap.position.set(124, 162);
	questui.addChild(questmap);
	var tinfo = makeText(32, 32, "");
	questui.addChild(tinfo);
	var bexit = makeButton(750, 246, "Exit");
	setClick(bexit, startMenu);
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
			setClick(graphics, function () {
				startQuestArea(k);
			});
			graphics.mouseover = function() {
				tinfo.setText(ainfo[0]);
			}
			if (Quest.areas[k].some(function(quest) {
				return (Quest[quest][0].dependency === undefined || Quest[quest][0].dependency(user)) && ((user.quest[quest] || 0) < Quest[quest].length);
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
	refreshRenderer(questui);
}
function startQuestArea(area) {
	var questui = new PIXI.DisplayObjectContainer();
	questui.interactive = true;
	var bgquest = new PIXI.Sprite(gfx.bg_default);
	bgquest.mouseover = function(){
		tinfo.setText("");
	};
	bgquest.interactive = true;
	questui.addChild(bgquest);
	questui.addChild(mkBgRect(9, 9, 880, 111));
	var questmap = new PIXI.Sprite(gfx.bg_quest);
	questmap.position.set(124, 162);
	questui.addChild(questmap);
	var tinfo = makeText(50, 26, "");
	var errinfo = makeText(50, 125, "");
	function makeQuestButton(quest, stage) {
		var pos = Quest[quest].info.pos[stage];
		var circle = new PIXI.Graphics();
		circle.lineStyle(2, 0x88aa66);
		circle.beginFill(user.quest[quest] > stage ? 0x4cff00 : 1);
		circle.drawCircle(0, 0, 16);
		circle.endFill();
		circle.hitArea = new PIXI.Circle(0, 0, 16);
		var button = makeButton(pos[0], pos[1], circle);
		button.mouseover = function() {
			tinfo.setText(Quest[quest].info.text[stage], 750);
		}
		setClick(button, function() {
			errinfo.setText(mkQuestAi(quest, stage, area) || "");
		});
		return button;
	}
	Quest.areas[area].forEach(function(quest){
		var stage0 = Quest[quest][0];
		if (stage0.dependency === undefined || stage0.dependency(user))
			startQuest(quest);
	});
	Quest.areas[area].forEach(function(quest){
		if ((user.quest[quest] !== undefined) && Quest[quest]) {
			for (var i = 0;i <= user.quest[quest];i++) {
				if (Quest[quest].info.pos[i]) {
					questui.addChild(makeQuestButton(quest, i));
				}
			}
		}
	});
	var bexit = makeButton(750, 246, "Exit");
	setClick(bexit, startQuestWindow);
	questui.addChild(tinfo);
	questui.addChild(errinfo);
	questui.addChild(bexit);
	refreshRenderer(questui);
}

function upgradestore() {
	function upgradeCard(card) {
		if (!isFreeCard(card)) {
			if (card.upped) return "You cannot upgrade upgraded cards.";
			var use = card.rarity != -1 ? 6 : 1;
			if (cardpool[card.code] >= use) {
				userExec("upgrade", { card: card.code });
				adjustdeck();
			}
			else return "You need at least " + use + " copies to be able to upgrade this card!";
		}
		else if (user.gold >= 50) {
			userExec("uppillar", { c: card.code });
			goldcount.setText("$" + user.gold);
			adjustdeck();
		}
		else return "You need 50 gold to afford an upgraded pillar!";
	}
	function polishCard(card) {
		if (!isFreeCard(card)) {
			if (card.shiny) return "You cannot polish shiny cards.";
			if (card.rarity == 5) return "You cannot polish Nymphs.";
			var use = card.rarity != -1 ? 6 : 2;
			if (cardpool[card.code] >= use) {
				userExec("polish", { card: card.code });
				adjustdeck();
			}
			else return "You need at least " + use + " copies to be able to polish this card!";
		}
		else if (user.gold >= 50) {
			userExec("shpillar", { c: card.code });
			goldcount.setText("$" + user.gold);
			adjustdeck();
		}
		else return "You need 50 gold to afford a shiny pillar!";
	}
	var cardValues = [5, 1, 3, 15, 20];
	function sellCard(card) {
		if (!card.rarity && !card.upped) return "You can't sell a pillar or pendulum, silly!";
		if (card.rarity > 4 || card.rarity == -1) return "You really don't want to sell that, trust me.";
		var codecount = etgutil.count(user.pool, card.code);
		if (codecount) {
			userExec("sellcard", { card: card.code });
			adjustdeck();
			goldcount.setText("$" + user.gold);
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
		cardpool = etgutil.deck2pool(user.pool);
		cardpool = etgutil.deck2pool(user.accountbound, cardpool);
	}
	var upgradeui = new PIXI.DisplayObjectContainer();
	upgradeui.interactive = true;
	var bg = new PIXI.Sprite(gfx.bg_default);
	bg.mouseover = function() {
		cardArt.setTexture(getArt(etgutil.asUpped(selectedCard, true)));
	}
	bg.interactive = true;
	upgradeui.addChild(bg);

	var goldcount = makeText(30, 100, "$" + user.gold);
	upgradeui.addChild(goldcount);
	var bupgrade = makeButton(150, 50, "Upgrade");
	setClick(bupgrade, eventWrap(upgradeCard));
	upgradeui.addChild(bupgrade);
	var bpolish = makeButton(150, 95, "Polish", function() {
		cardArt.setTexture(getArt(etgutil.asShiny(selectedCard, true)));
	});
	setClick(bpolish, eventWrap(polishCard));
	upgradeui.addChild(bpolish);
	var bsell = makeButton(150, 140, "Sell");
	setClick(bsell, eventWrap(sellCard));
	upgradeui.addChild(bsell);
	var bshiny = makeButton(5, 578, "Toggle Shiny");
	setClick(bshiny, function() {
		showShiny ^= true;
	});
	upgradeui.addChild(bshiny);
	var bexit = makeButton(5, 50, "Exit");
	setClick(bexit, startMenu);
	upgradeui.addChild(bexit);
	var tinfo = new PIXI.Text("", { font: "bold 16px Dosis" });
	tinfo.position.set(250, 50);
	upgradeui.addChild(tinfo);
	var tinfo2 = new PIXI.Text("", { font: "bold 16px Dosis" });
	tinfo2.position.set(250, 140);
	upgradeui.addChild(tinfo2);
	var tinfo3 = new PIXI.Text("", { font: "bold 16px Dosis" });
	tinfo3.position.set(250, 95);
	upgradeui.addChild(tinfo3);
	var twarning = new PIXI.Text("", { font: "bold 16px Dosis" });
	twarning.position.set(100, 170);
	upgradeui.addChild(twarning);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	upgradeui.addChild(cardArt);
	var selectedCardArt = new PIXI.Sprite(gfx.nopic);
	selectedCardArt.position.set(534, 8);
	upgradeui.addChild(selectedCardArt);

	var cardsel = makeCardSelector(null,
		function(code){
			var card = Cards.Codes[code];
			selectedCardArt.setTexture(getArt(code));
			cardArt.setTexture(getArt(etgutil.asUpped(code, true)));
			selectedCard = code;
			if (card.upped){
				bupgrade.visisble = tinfo.visible = false;
			}else{
				tinfo.setText(isFreeCard(card) ? "Costs 50 gold to upgrade" : card.rarity != -1 ? "Convert 6 into an upgraded version." : "Convert into an upgraded version.");
				bupgrade.visisble = tinfo.visible = true;
			}
			if (card.shiny){
				bpolish.visible = tinfo3.visible = false;
			}else{
				tinfo3.setText(isFreeCard(card) ? "Costs 50 gold to polish" : card.rarity == 5 ? "This card cannot be polished." : card.rarity != -1 ? "Convert 6 into a shiny version." : "Convert 2 into a shiny version.")
				bpolish.visible = tinfo3.visible = true;
			}
			tinfo2.setText((card.rarity > 0 || card.upped) && card.rarity < 5 && card.rarity != -1 ?
				"Sells for " + cardValues[card.rarity] * (card.upped ? 5 : 1) + " gold." : "");
			twarning.setText("");
		}, true
	);
	upgradeui.addChild(cardsel);
	var cardpool, selectedCard, showShiny;
	adjustdeck();
	refreshRenderer(upgradeui, function() {
		cardsel.next(cardpool, undefined, false, showShiny);
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

	var storeui = new PIXI.DisplayObjectContainer();
	storeui.interactive = true;

	//shop background
	storeui.addChild(new PIXI.Sprite(gfx.bg_default));
	storeui.addChild(mkBgRect(
		40, 20, 790, 55,
		40, 92, 492, 168,
		40, 270, 620, 168,
		740, 90, 85, 185
	));
	//gold text
	var tgold = makeText(750, 101, "$" + user.gold);
	storeui.addChild(tgold);

	//info text
	var tinfo = makeText(50, 26, "Select from which element you want.");
	storeui.addChild(tinfo);

	var tinfo2 = makeText(50, 51, "Select which type of booster you want.");
	storeui.addChild(tinfo2);

    //free packs text
	if (user.freepacks){
		var freeinfo = makeText(350, 26, "");
		storeui.addChild(freeinfo);
	}
	function updateFreeInfo(rarity){
		if (freeinfo){
			freeinfo.setText(user.freepacks[rarity] ? "Free " + packdata[rarity].type + " packs left: " + user.freepacks[rarity] : "");
		}
	}

	//get cards button
	var bget = makeButton(750, 156, "Take Cards");
	toggleB(bget);
	setClick(bget, function () {
		toggleB(bbronze, bsilver, bgold, bplatinum, bnymph, bget, bbuy);
		popbooster.visible = false;
	});
	storeui.addChild(bget);

	//exit button
	var bexit = makeButton(750, 246, "Exit");
	setClick(bexit, startMenu);
	storeui.addChild(bexit);

	//buy button
	var bbuy = makeButton(750, 156, "Buy Pack");
	setClick(bbuy, function() {
		if (packrarity == -1) {
			tinfo2.setText("Select a pack first!");
			return;
		}
		if (packele == -1) {
			tinfo.setText("Select an element first!");
			return;
		}
		var pack = packdata[packrarity];
		if (user.gold >= pack.cost || (user.freepacks && user.freepacks[packrarity] > 0)) {
			userEmit("booster", { pack: packrarity, element: packele });
			toggleB(bbuy);
		} else {
			tinfo2.setText("You can't afford that!");
		}
	});
	storeui.addChild(bbuy);

	var boostergfx = packdata.map(function(pack){
		var g = new PIXI.Graphics();
		g.lineStyle(3);
		g.beginFill(pack.color);
		g.drawRoundedRect(0, 0, 100, 150, 6);
		g.endFill();
		var name = new PIXI.Text(pack.type, {font: "18px Verdana"});
		name.anchor.set(.5, .5);
		name.position.set(50, 75);
		g.addChild(name);
		var price = new PIXI.Sprite(ui.getTextImage("$"+pack.cost, {font: "12px Verdana"}));
		price.anchor.set(0, 1);
		price.position.set(4, 146);
		g.addChild(price);
		var rend = new PIXI.RenderTexture(100, 150);
		rend.render(g);
		return rend;
	});
	// The different pack types
	function gradeSelect(n){
		var b = makeButton(50+125*n, 280, boostergfx[n]);
		setClick(b, function(){
			packrarity = n;
			tinfo2.setText(packdata[n].type + " Pack: " + packdata[n].info);
			updateFreeInfo(n);
		});
		storeui.addChild(b);
		return b;
	}
	var bbronze = gradeSelect(0);
	var bsilver = gradeSelect(1);
	var bgold = gradeSelect(2);
	var bplatinum = gradeSelect(3);
	var bnymph = gradeSelect(4);

	for (var i = 0;i < 14;i++) {
		var elementbutton = makeButton(75 + Math.floor(i / 2)*64, 120 + (i % 2)*75, gfx.eicons[i]);
		(function(_i) {
			setClick(elementbutton, function() {
				packele = _i;
				tinfo.setText("Selected Element: " + etg.eleNames[packele]);
			});
		})(i);
		storeui.addChild(elementbutton);
	}

	//booster popup
	var popbooster = mkBgRect(0, 0, 627, 457);
	popbooster.position.set(40, 90);
	popbooster.visible = false;
	storeui.addChild(popbooster);

	storeui.cmds = {
		boostergive: function(data) {
			if (data.accountbound) {
				user.accountbound = etgutil.mergedecks(user.accountbound, data.cards);
				if (user.freepacks){
					user.freepacks[data.packtype]--;
					updateFreeInfo(packrarity);
				}
			}
			else {
				user.pool = etgutil.mergedecks(user.pool, data.cards);
				user.gold -= data.cost;
				tgold.setText("$" + user.gold);
			}
			toggleB(bbronze, bsilver, bgold, bplatinum, bnymph, bget);
			if (popbooster.children.length) popbooster.removeChildren();
			etgutil.iterdeck(data.cards, function(code, i){
				var x = i % 5, y = Math.floor(i/5);
				var cardArt = new PIXI.Sprite(getArt(code));
				cardArt.scale.set(0.85, 0.85);
				cardArt.position.set(7 + (x * 125), 7 + (y * 225));
				popbooster.addChild(cardArt);
			});
			popbooster.visible = true;
		},
	};
	refreshRenderer(storeui);
}
function addToGame(game, data) {
	for (var key in data) {
		var p1or2 = key.match(/^p(1|2)/);
		if (p1or2){
			game["player" + p1or2[1]][key.substr(2)] = data[key];
		}else game[key] = data[key];
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
			userExec("donedaily", { daily: type });
		}
	}
}
function startColosseum(){
		var coloui = new PIXI.DisplayObjectContainer();
		coloui.interactive = true;
		coloui.addChild(new PIXI.Sprite(gfx.bg_default));
		var magename = aiDecks.mage[user.dailymage][0];
		var dgname = aiDecks.demigod[user.dailydg][0];
		var events = [
			{ name: "Novice Endurance", desc: "Fight 3 Commoners in a row without healing in between. May try until you win." },
			{ name: "Expert Endurance", desc: "Fight 3 Champions in a row. May try until you win" },
			{ name: "Novice Duel", desc: "Fight " + magename + ". Only one attempt allowed" },
			{ name: "Expert Duel", desc: "Fight " + dgname + ". Only one attempt allowed" }
		];
		for (var i = 1;i < 5;i++) {
			var active = !(user.daily & (1 << i));
			if (active) {
				var button = makeButton(50, 100 + 30 * i, "Fight!");
				setClick(button, mkDaily(i));
				coloui.addChild(button);
			}
			var text = makeText(130, 100 + 30 * i, active ? (events[i-1].name + ": " + events[i-1].desc) : "Not availible. Try again tomorrow.");
			coloui.addChild(text);
		}
		if (user.daily == 63){
			var button = makeButton(50, 280, "Nymph!");
			setClick(button, function(){
				var nymph = etg.NymphList[etg.PlayerRng.uptoceil(12)];
				userExec("addcards", {c: "01"+nymph});
				userExec("donedaily", {daily: 6});
				startMenu(nymph);
			});
			coloui.addChild(button);
			coloui.addChild(makeText(130, 280, "You successfully completed all tasks."));
		}

		var bexit = makeButton(8, 8, "Exit");
		setClick(bexit, startMenu);
		coloui.addChild(bexit);

		refreshRenderer(coloui);
}
function startEditor(arena, acard, startempty) {
	if (!Cards.loaded) return;
	if (arena && (!user || arena.deck === undefined || acard === undefined)) arena = false;
	function updateField(){
		deckimport.value = etgutil.encodedeck(editordeck) + "01" + etg.toTrueMark(editormark);
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
		if (editordeck.length > 60) editordeck.length = 60;
		for (var i = editordeck.length - 1;i >= 0;i--) {
			if (!(editordeck[i] in Cards.Codes)) {
				var index = etg.fromTrueMark(editordeck[i]);
				if (~index) {
					editormark = index;
				}
				editordeck.splice(i, 1);
			}
		}
		editormarksprite.setTexture(gfx.eicons[editormark]);
		editordeck.sort(editorCardCmp);
		if (user) {
			cardminus = {};
			for (var i = editordeck.length - 1;i >= 0;i--) {
				var code = editordeck[i], card = Cards.Codes[code];
				if (card.type != etg.PillarEnum) {
					if (sumCardMinus(cardminus, code) == 6) {
						editordeck.splice(i, 1);
						continue;
					}
				}
				if (!isFreeCard(card)) {
					if ((cardminus[code] || 0) < (cardpool[code] || 0)) {
						adjust(cardminus, code, 1);
					} else {
						editordeck.splice(i, 1);
					}
				}
			}
			if (arena){
				editordeck.unshift(acard, acard, acard, acard, acard);
			}
		}
		updateField();
	}
	function incrpool(code, count){
		if (code in Cards.Codes && (!arena || (!Cards.Codes[code].isOf(Cards.Codes[acard].asUpped(false))) && (arena.lv || !Cards.Codes[code].upped))){
			if (code in cardpool) {
				cardpool[code] += count;
			} else {
				cardpool[code] = count;
			}
		}
	}
	var cardminus, cardpool;
	if (user){
		cardminus = {};
		cardpool = {};
		etgutil.iterraw(user.pool, incrpool);
		etgutil.iterraw(user.accountbound, incrpool);
	}
	var showAll = false, showShiny = false;
	var editorui = new PIXI.DisplayObjectContainer();
	editorui.interactive = true;
	var bg = new PIXI.Sprite(gfx.bg_default);
	bg.mouseover = function() {
		cardArt.visible = false;
	}
	bg.interactive = true;
	editorui.addChild(bg);
	var bclear = makeButton(8, 32, "Clear");
	var bsave = makeButton(8, 56, "Save & Exit");
	setClick(bclear, function() {
		if (user) {
			cardminus = {};
		}
		editordeck.length = arena?5:0;
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
		var bm = makeButton(50, y, ui.getTextImage("-", ui.mkFont(16, "black"), 0xFFFFFFFF));
		var bv = new PIXI.Text(arattr[name], ui.mkFont(16, "black"));
		bv.position.set(64, y);
		var bp = makeButton(90, y, ui.getTextImage("+", ui.mkFont(16, "black"), 0xFFFFFFFF));
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
		setClick(bm, modattr.bind(null, -(data.incr || 1)));
		setClick(bp, modattr.bind(null, data.incr || 1));
		editorui.addChild(bt);
		editorui.addChild(bm);
		editorui.addChild(bv);
		editorui.addChild(bp);
	}
	function switchDeckCb(x){
		return function() {
			user.decks[user.selectedDeck] = etgutil.encodedeck(editordeck) + "01" + etg.toTrueMark(editormark);
			userEmit("setdeck", { d: user.decks[user.selectedDeck], number: user.selectedDeck });
			user.selectedDeck = x;
			editordeck = etgutil.decodedeck(getDeck());
			processDeck();
		}
	}
	if (arena){
		setClick(bsave, function() {
			if (editordeck.length < 35) {
				chat("35 cards required before submission");
				return;
			}
			var data = { d: etgutil.encodedeck(editordeck.slice(5)) + "01" + etg.toTrueMark(editormark), lv: arena.lv };
			for(var k in arattr){
				data[k] = arattr[k];
			}
			if (!startempty){
				data.mod = true;
			}
			userEmit("setarena", data);
			chat("Arena deck submitted");
			startMenu();
		});
		var bexit = makeButton(8, 80, "Exit");
		setClick(bexit, function() {
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
		curpts.position.set(8, 100);
		editorui.addChild(curpts);
		makeattrui(0, "hp");
		makeattrui(1, "mark");
		makeattrui(2, "draw");
	}else{
		setClick(bsave, function() {
			if (user) {
				user.decks[user.selectedDeck] = etgutil.encodedeck(editordeck) + "01" + etg.toTrueMark(editormark);
				userEmit("setdeck", { d: user.decks[user.selectedDeck], number: user.selectedDeck });
			}
			startMenu();
		});
		var bimport = makeButton(8, 80, "Import");
		setClick(bimport, function() {
			var dvalue = deckimport.value;
			editordeck = ~dvalue.indexOf(" ") ? dvalue.split(" ") : etgutil.decodedeck(dvalue);
			if (editordeck.length > 60){
				editordeck.length = 60;
			}
			processDeck();
		});
		editorui.addChild(bimport);
		if (user){
			for (var i = 0;i < 10;i++) {
				var button = makeButton(80 + i*72, 8, "Deck " + (i + 1));
				setClick(button, switchDeckCb(i));
				editorui.addChild(button);
			}
			var bshowall = makeButton(5, 530, "Show All");
			setClick(bshowall, function() {
				bshowall.setText((showAll ^= true) ? "Auto Hide" : "Show All");
			});
			editorui.addChild(bshowall);
		}
	}
	var bconvert = makeButton(5, 554, "Convert Code");
	setClick(bconvert, function() {
		deckimport.value = editordeck.join(" ") + " " + etg.toTrueMark(editormark);
	});
	editorui.addChild(bconvert);
	var bshiny = makeButton(5, 578, "Toggle Shiny");
	setClick(bshiny, function() {
		showShiny ^= true;
	});
	editorui.addChild(bshiny);
	var editordecksprites = [];
	var editordeck = arena ? (startempty ? [] : etgutil.decodedeck(arena.deck)) : etgutil.decodedeck(getDeck());
	var editormarksprite = new PIXI.Sprite(gfx.nopic);
	editormarksprite.position.set(66, 200);
	editorui.addChild(editormarksprite);
	var editormark = 0;
	processDeck();
	for (var i = 0;i < 13;i++) {
		var sprite = makeButton(100 + i * 32, 234, gfx.eicons[i]);
		sprite.interactive = true;
		(function(_i) {
			setClick(sprite, function() {
				editormark = _i;
				editormarksprite.setTexture(gfx.eicons[_i]);
				updateField();
			});
		})(i);
		editorui.addChild(sprite);
	}
	for (var i = 0;i < 60;i++) {
		var sprite = new PIXI.Sprite(gfx.nopic);
		sprite.position.set(100 + Math.floor(i / 10) * 100, 32 + (i % 10) * 20);
		(function(_i) {
			setClick(sprite, function() {
				var code = editordeck[_i], card = Cards.Codes[code];
				if (!arena || etgutil.asUpped(code, false) != acard){
					if (user && !isFreeCard(card)) {
						adjust(cardminus, code, -1);
					}
					editordeck.splice(_i, 1);
					updateField();
				}
			}, "cardClick");
			sprite.mouseover = function() {
				cardArt.setTexture(getArt(editordeck[_i]));
				cardArt.visible = true;
			}
		})(i);
		sprite.interactive = true;
		editorui.addChild(sprite);
		editordecksprites.push(sprite);
	}
	setInteractive.apply(null, editordecksprites);
	var cardsel = makeCardSelector(
		function(code){
			cardArt.setTexture(getArt(code));
			cardArt.visible = true;
		},
		function(code){
			if (editordeck.length < 60) {
				var card = Cards.Codes[code];
				if (user && !isFreeCard(card)) {
					if (!(code in cardpool) || (code in cardminus && cardminus[code] >= cardpool[code]) ||
						(Cards.Codes[code].type != etg.PillarEnum && sumCardMinus(cardminus, code) >= 6)) {
						return;
					}
					adjust(cardminus, code, 1);
				}
				for (var i = arena?5:0;i < editordeck.length;i++) {
					var cmp = editorCardCmp(editordeck[i], code);
					if (cmp >= 0) break;
				}
				editordeck.splice(i, 0, code);
				deckimport.value = etgutil.encodedeck(editordeck) + "01" + etg.toTrueMark(editormark);
			}
		}, !arena
	);
	editorui.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	editorui.addChild(cardArt);
	editorui.cmds = {
		pvpgive: initGame,
		tradegive: initTrade,
	};
	editorui.endnext = function() {
		deckimport.style.display = "none";
	}
	refreshRenderer(editorui, function() {
		cardsel.next(cardpool, cardminus, showAll, showShiny);
		for (var i = 0;i < editordeck.length;i++) {
			editordecksprites[i].visible = true;
			editordecksprites[i].setTexture(getCardImage(editordeck[i]));
		}
		for (;i < 60;i++) {
			editordecksprites[i].visible = false;
		}
	});
	deckimport.style.display = "inline";
	deckimport.focus();
	deckimport.setSelectionRange(0, 333);
}
function startElementSelect() {
	var stage = new PIXI.DisplayObjectContainer();
	stage.interactive = true;
	stage.addChild(new PIXI.Sprite(gfx.bg_default));
	var eledesc = makeText(100, 250, "Select your starter element");
	stage.addChild(eledesc);
	var elesel = new Array(14);
	etg.eleNames.forEach(function(name, i){
		elesel[i] = new PIXI.Sprite(gfx.eicons[i]);
		elesel[i].position.set(100 + i * 32, 300);
		elesel[i].mouseover = function(){
			this.setText(eledesc, name);
		}
		setClick(elesel[i], function() {
			var msg = { u: user.name, a: user.auth, e: i };
			user = undefined;
			socket.emit("inituser", msg);
			startMenu();
		});
		elesel[i].interactive = true;
		stage.addChild(elesel[i]);
	});
	refreshRenderer(stage);
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
		spr.getChildAt(0).getChildAt(0).visible = obj.status.psion;
		spr.getChildAt(0).getChildAt(1).visible = obj.status.aflatoxin;
		spr.getChildAt(0).getChildAt(2).visible = obj.status.poison > 0;
		spr.getChildAt(0).getChildAt(3).visible = obj.status.airborne || obj.status.ranged;
		spr.getChildAt(0).getChildAt(4).visible = obj.status.momentum;
		spr.getChildAt(0).getChildAt(5).visible = obj.status.adrenaline;
		spr.getChildAt(0).getChildAt(6).visible = obj.status.poison < 0;
		spr.getChildAt(0).getChildAt(7).visible = obj.status.delayed;
		spr.getChildAt(0).getChildAt(8).visible = obj == obj.owner.gpull;
		spr.getChildAt(0).getChildAt(9).visible = obj.status.frozen;
		spr.alpha = obj.isMaterial() ? 1 : .7;
	}
	var aiDelay = 0, aiState, aiCommand;
	if (user) {
		userExec("addloss", { pvp: !game.ai });
	}
	var gameui = new PIXI.DisplayObjectContainer();
	gameui.interactive = true;
	gameui.addChild(new PIXI.Sprite(gfx.bg_default));
	var redlines = new PIXI.Sprite(gfx.bg_game);
	redlines.position.y = 12;
	gameui.addChild(redlines);
	var cloakgfx = new PIXI.Graphics();
	cloakgfx.beginFill(0);
	cloakgfx.drawRect(130, 20, 660, 280);
	cloakgfx.endFill();
	gameui.addChild(cloakgfx);
	var endturn = makeButton(800, 520, "Accept Hand");
	var cancel = makeButton(800, 490, "Mulligan");
	var resign = makeButton(8, 24, "Resign");
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
	setClick(endturn, function(e, discard) {
		if (game.turn == game.player1 && game.phase <= etg.MulliganPhase2){
			if (!game.ai) {
				socket.emit("mulligan", true);
			}
			game.progressMulligan();
		}else if (game.winner) {
			if (user) {
				if (game.arena) {
					userEmit("modarena", { aname: game.arena, won: game.winner == game.player2, lv: game.level == 2?0:1 });
				}
				if (game.winner == game.player1) {
					userExec("addwin", { pvp: !game.ai });
					if (game.quest && (user.quest[game.quest[0]] <= game.quest[1] || !(game.quest[0] in user.quest)) && !game.autonext) {
						userEmit("updatequest", { quest: game.quest[0], newstage: game.quest[1] + 1 });
						user.quest[game.quest[0]] = game.quest[1] + 1;
					}
					if (game.quest && game.autonext) {
						var data = addNoHealData(game);
						var newgame = mkQuestAi(game.quest[0], game.quest[1] + 1, game.area);
						addToGame(newgame, data);
						return;
					}
					else if (game.daily) {
						if (game.endurance) {
							var data = addNoHealData(game);
							data.endurance--;
							var newgame = mkAi(game.level, true)();
							addToGame(newgame, data);
							newgame.dataNext = data;
							return;
						}
						else {
							userExec("donedaily", { daily: game.daily == 4 ? 5 : game.daily == 3 ? 0 : game.daily });
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
					socket.emit("endturn", discard);
				}
				game.player1.endturn(discard);
				delete game.targetingMode;
				if (foeplays.children.length)
					foeplays.removeChildren();
			}
		}
	}, false);
	setClick(cancel, function() {
		if (resigning) {
			resign.setText("Resign");
			resigning = false;
		} else if (game.turn == game.player1) {
			if (game.phase <= etg.MulliganPhase2 && game.player1.hand.length > 0) {
				game.player1.drawhand(game.player1.hand.length - 1);
				socket.emit("mulligan");
			} else if (game.targetingMode) {
				delete game.targetingMode;
			} else if (discarding) {
				discarding = false;
			}
		}
	});
	var resigning;
	setClick(resign, function() {
		if (resigning){
			if (!game.ai) {
				socket.emit("foeleft");
			}
			game.setWinner(game.player2);
			endturn.click();
		}else{
			resign.setText("Confirm");
			resigning = true;
		}
	});
	function setInfo(obj) {
		if (obj.owner != game.player2 || !cloakgfx.visible || !obj.card || obj.card.isOf(Cards.Cloak)) {
			infobox.setTexture(ui.getTextImage(obj.info(), ui.mkFont(10, "white"), 0, (obj instanceof etg.Weapon || obj instanceof etg.Shield ? 92 : 76)));
			var mousePosition = realStage.getMousePosition();
			infobox.position.set(mousePosition.x, mousePosition.y);
			infobox.visible = true;
		}
	}
	var handsprite = [new Array(8), new Array(8)];
	var creasprite = [new Array(23), new Array(23)];
	var permsprite = [new Array(16), new Array(16)];
	var weapsprite = [new PIXI.Sprite(gfx.nopic), new PIXI.Sprite(gfx.nopic)];
	var shiesprite = [new PIXI.Sprite(gfx.nopic), new PIXI.Sprite(gfx.nopic)];
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
					setClick(handsprite[j][i], function() {
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
									socket.emit("cast", game.tgtToBits(cardinst));
									cardinst.useactive();
								} else {
									game.getTarget(cardinst, cardinst.card.active, function(tgt) {
										socket.emit("cast", game.tgtToBits(cardinst) | game.tgtToBits(tgt) << 9);
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
					var statuses = new PIXI.SpriteBatch();
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
				setClick(spr, function() {
					if (game.phase != etg.PlayPhase) return;
					var inst = insts ? insts[i] : game.players(_j)[i];
					if (!inst) return;
					if (game.targetingMode && game.targetingMode(inst)) {
						delete game.targetingMode;
						game.targetingModeCb(inst);
					} else if (_j == 0 && !game.targetingMode && inst.canactive()) {
						game.getTarget(inst, inst.active.cast, function(tgt) {
							delete game.targetingMode;
							socket.emit("cast", game.tgtToBits(inst) | game.tgtToBits(tgt) << 9);
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
			setInteractive.apply(null, handsprite[j]);
			setInteractive.apply(null, creasprite[j]);
			setInteractive.apply(null, permsprite[j]);
			marksprite[j].anchor.set(.5, .5);
			marksprite[j].position.set(740, 470);
			gameui.addChild(weapsprite[j] = makeInst(true, null, "weapon", new PIXI.Point(666, 512), 5/4));
			gameui.addChild(shiesprite[j] = makeInst(false, null, "shield", new PIXI.Point(710, 532), 5/4));
			if (j) {
				ui.reflectPos(weapsprite[j]);
				ui.reflectPos(shiesprite[j]);
				ui.reflectPos(marksprite[j]);
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
			setClick(hptext[j], function() {
				if (game.phase != etg.PlayPhase) return;
				if (game.targetingMode && game.targetingMode(game.players(_j))) {
					delete game.targetingMode;
					game.targetingModeCb(game.players(_j));
				}
			}, false);
		})(j);
		setInteractive.apply(null, weapsprite);
		setInteractive.apply(null, shiesprite);
		setInteractive.apply(null, hptext);
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
	var foeplays = new PIXI.SpriteBatch();
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
			game.player2.endturn(data);
		},
		cast: function(bits) {
			var c = game.bitsToTgt(bits & 511), t = game.bitsToTgt((bits >> 9) & 511);
			console.log("cast", c.toString(), (t || "-").toString(), bits);
			var sprite = new PIXI.Sprite(gfx.nopic);
			sprite.position.set((foeplays.children.length % 9) * 100, Math.floor(foeplays.children.length / 9) * 20);
			sprite.card = c instanceof etg.CardInstance ? c.card : c.active.cast.activename;
			foeplays.addChild(sprite);
			c.useactive(t);
		},
		foeleft: function(){
			if (!game.ai) game.setWinner(game.player1);
		},
		mulligan: function(data){
			if (data === true) {
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
	refreshRenderer(gameui, function() {
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
						gameui.cmds[aiState[0]](aiState[1]);
						aiState = undefined;
						aiCommand = false;
						aiDelay += 300;
					}
				}
			}else if (game.phase <= etg.MulliganPhase2){
				gameui.cmds.mulligan(require("./ai/mulligan")(game.player2));
			}
		}
		var pos = realStage.getMousePosition();
		var cardartcode, cardartx;
		infobox.setTexture(gfx.nopic);
		foeplays.children.forEach(function(foeplay){
			if (foeplay.card instanceof etg.Card && hitTest(foeplay, pos)) {
				cardartcode = foeplay.card.code;
			}
		});
		for (var j = 0;j < 2;j++) {
			var pl = game.players(j);
			if (j == 0 || game.player1.precognition) {
				for (var i = 0;i < pl.hand.length;i++) {
					if (hitTest(handsprite[j][i], pos)) {
						cardartcode = pl.hand[i].card.code;
					}
				}
			}
			if (j == 0 || !(cloakgfx.visible)) {
				for (var i = 0;i < 23;i++) {
					var cr = pl.creatures[i];
					if (cr && hitTest(creasprite[j][i], pos)) {
						cardartcode = cr.card.code;
						cardartx = creasprite[j][i].position.x;
						setInfo(cr);
					}
				}
				for (var i = 0;i < 16;i++) {
					var pr = pl.permanents[i];
					if (pr && hitTest(permsprite[j][i], pos)) {
						cardartcode = pr.card.code;
						cardartx = permsprite[j][i].position.x;
						setInfo(pr);
					}
				}
				if (pl.weapon && hitTest(weapsprite[j], pos)) {
					cardartcode = pl.weapon.card.code;
					cardartx = weapsprite[j].position.x;
					setInfo(pl.weapon);
				}
				if (pl.shield && hitTest(shiesprite[j], pos)) {
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
		if (game.winner == game.player1 && user && !game.quest && game.ai) {
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
					var basereward = [1, 6, 11, 31][game.level];
					var hpfactor = [11, 7, 6, 2][game.level];
					goldwon = Math.floor((basereward + Math.floor(game.player1.hp / hpfactor)) * (game.player1.hp == game.player1.maxhp ? 1.5 : 1));
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
			maybeSetText(turntell, turntext);
			if (game.turn == game.player1){
				endturn.setText(game.phase == etg.PlayPhase ? "End Turn" : "Accept Hand");
				cancel.setText(game.phase != etg.PlayPhase ? "Mulligan" : game.targetingMode || discarding || resigning ? "Cancel" : null);
			}else cancel.visible = endturn.visible = false;
		}else{
			maybeSetText(turntell, (game.turn == game.player1 ? "Your" : "Their") + " Turn\n" + (game.winner == game.player1?"Won":"Lost"));
			endturn.setText("Continue");
			cancel.visible = false;
		}
		foeplays.children.forEach(function(foeplay){
			maybeSetTexture(foeplay, foeplay.card instanceof etg.Card ? getCardImage(foeplay.card.code) : ui.getTextImage(foeplay.card, 12));
		});
		foeplays.visible = !(cloakgfx.visible = game.player2.isCloaked());
		fgfx.clear();
		if (game.turn == game.player1 && !game.targetingMode && game.phase != etg.EndPhase) {
			for (var i = 0;i < game.player1.hand.length;i++) {
				var card = game.player1.hand[i].card;
				if (game.player1.canspend(card.costele, card.cost)) {
					fgfx.beginFill(elecols[etg.Light]);
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
				fgfx.beginFill(elecols[etg.Death], .5);
				fgfx.drawRect(spr.position.x - spr.width / 2, spr.position.y - spr.height / 2, spr.width, spr.height);
				fgfx.endFill();
			}
			var statuses = { flatline: etg.Death, silence: etg.Aether, sanctuary: etg.Light };
			for(var status in statuses){
				if (pl[status]) {
					fgfx.beginFill(elecols[statuses[status]], .3);
					fgfx.drawRect(handsprite[j][0].position.x - 2, handsprite[j][0].position.y - 2, 124, 164);
					fgfx.endFill();
				}
			}
			if (pl.nova >= 3){
				fgfx.beginFill(elecols[etg.Entropy], .3);
				fgfx.drawRect(handsprite[j][0].position.x - 2, handsprite[j][0].position.y - 2, 124, 164);
				fgfx.endFill();
			}
			for (var i = 0;i < 8;i++) {
				maybeSetTexture(handsprite[j][i], getCardImage(pl.hand[i] ? (j == 0 || game.player1.precognition ? pl.hand[i].card.code : "0") : "1"));
			}
			for (var i = 0;i < 23;i++) {
				var cr = pl.creatures[i];
				if (cr && !(j == 1 && cloakgfx.visible)) {
					creasprite[j][i].setTexture(getCreatureImage(cr.card));
					creasprite[j][i].visible = true;
					var child = creasprite[j][i].getChildAt(1);
					child.setTexture(ui.getTextImage(cr.trueatk() + "|" + cr.truehp() + (cr.status.charges ? " x" + cr.status.charges : ""), ui.mkFont(10, cr.card.upped ? "black" : "white"), maybeLighten(cr.card)));
					var child2 = creasprite[j][i].getChildAt(2);
					var activetext = cr.active.cast ? etg.casttext(cr.cast, cr.castele) + cr.active.cast.activename : (cr.active.hit ? cr.active.hit.activename : "");
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
					var child = permsprite[j][i].getChildAt(0);
					if (pr instanceof etg.Pillar) {
						child.setTexture(ui.getTextImage("1:" + (pr.pendstate ? pr.owner.mark : pr.card.element) + " x" + pr.status.charges, ui.mkFont(10, pr.card.upped ? "black" : "white"), maybeLighten(pr.card)));
					}
					else if (pr.active.auto && pr.active.auto.activename == "locket") {
						child.setTexture(ui.getTextImage("1:" + (pr.status.mode === undefined ? pr.owner.mark : pr.status.mode), ui.mkFont(10, pr.card.upped ? "black" : "white"), maybeLighten(pr.card)));
					}
					else child.setTexture(ui.getTextImage(pr.status.charges !== undefined ? " " + pr.status.charges : "", ui.mkFont(10, pr.card.upped ? "black" : "white"), maybeLighten(pr.card)));
					var child2 = permsprite[j][i].getChildAt(1);
					child2.setTexture(pr instanceof etg.Pillar ? gfx.nopic : ui.getTextImage(pr.activetext().replace(" losecharge", ""), ui.mkFont(8, pr.card.upped ? "black" : "white")));
				} else permsprite[j][i].visible = false;
			}
			var wp = pl.weapon;
			if (wp && !(j == 1 && cloakgfx.visible)) {
				weapsprite[j].visible = true;
				var child = weapsprite[j].getChildAt(1);
				child.setTexture(ui.getTextImage(wp.trueatk() + (wp.status.charges ? " x" + wp.status.charges : ""), ui.mkFont(12, wp.card.upped ? "black" : "white"), maybeLighten(wp.card)));
				child.visible = true;
				var child = weapsprite[j].getChildAt(2);
				child.setTexture(ui.getTextImage(wp.activetext(), ui.mkFont(12, wp.card.upped ? "black" : "white")));
				child.visible = true;
				weapsprite[j].setTexture(getWeaponShieldImage(wp.card.code));
				drawStatus(wp, weapsprite[j]);
			} else weapsprite[j].visible = false;
			var sh = pl.shield;
			if (sh && !(j == 1 && cloakgfx.visible)) {
				shiesprite[j].visible = true;
				var child = shiesprite[j].getChildAt(0);
				child.setTexture(ui.getTextImage(sh.status.charges ? "x" + sh.status.charges: "" + sh.truedr() + "", ui.mkFont(12, sh.card.upped ? "black" : "white"), maybeLighten(sh.card)));
				child.visible = true;
				var child = shiesprite[j].getChildAt(1);
				child.setTexture(ui.getTextImage((sh.active.shield ? " " + sh.active.shield.activename : "") + (sh.active.buff ? " " + sh.active.buff.activename : "") + (sh.active.cast ? etg.casttext(sh.cast, sh.castele) + sh.active.cast.activename : ""), ui.mkFont(12, sh.card.upped ? "black" : "white")));
				child.visible = true;
				shiesprite[j].alpha = sh.isMaterial() ? 1 : .7;
				shiesprite[j].setTexture(getWeaponShieldImage(sh.card.code));
			} else shiesprite[j].visible = false;
			marksprite[j].setTexture(gfx.eicons[pl.mark]);
			if (pl.markpower != 1){
				maybeSetText(marktext[j], "x" + pl.markpower);
			}else marktext[j].visible = false;
			for (var i = 1;i < 13;i++) {
				maybeSetText(quantatext[j].getChildAt(i*2-2), pl.quanta[i].toString());
			}
			var yOffset = j == 0 ? 28 : -44;
			fgfx.beginFill(0);
			fgfx.drawRect(hptext[j].x - 41, hptext[j].y + yOffset-1, 82, 16);
			fgfx.endFill();
			if (pl.hp > 0){
				fgfx.beginFill(elecols[etg.Life]);
				fgfx.drawRect(hptext[j].x - 40, hptext[j].y + yOffset, 80 * pl.hp / pl.maxhp, 14);
				fgfx.endFill();
				if (!cloakgfx.visible && game.expectedDamage[j]) {
					fgfx.beginFill(elecols[game.expectedDamage[j] >= pl.hp ? etg.Fire : game.expectedDamage[j] > 0 ? etg.Time : etg.Water]);
					fgfx.drawRect(hptext[j].x - 40 + 80 * pl.hp / pl.maxhp, hptext[j].y + yOffset, -80 * Math.min(game.expectedDamage[j], pl.hp) / pl.maxhp, 14);
					fgfx.endFill();
				}
			}
			maybeSetText(hptext[j], pl.hp + "/" + pl.maxhp);
			if (hitTest(hptext[j], pos)){
				setInfo(pl);
			}
			var poison = pl.status.poison, poisoninfo = !poison ? "" : (poison > 0 ? poison + " 1:2" : -poison + " 1:7") + (pl.neuro ? " 1:10" : "");
			poisontext[j].setTexture(ui.getTextImage(poisoninfo, 16));
			maybeSetText(decktext[j], pl.deck.length + "cards");
			maybeSetText(damagetext[j], !cloakgfx.visible && game.expectedDamage[j] ? "Next HP loss: " + game.expectedDamage[j] : "");
		}
		Effect.next(cloakgfx.visible);
	});
}

function startArenaInfo(info) {
	if (!info) return;
	var stage = new PIXI.DisplayObjectContainer();
	stage.interactive = true;
	stage.addChild(new PIXI.Sprite(gfx.bg_default));
	var winloss = makeText(200, 300, (info.win || 0) + " - " + (info.loss || 0) + ": " + (info.rank+1) + "\nAge: " + info.day + "\nHP: " + info.curhp + " / " + info.hp + "\nMark: " + info.mark + "\nDraw: " + info.draw);
	stage.addChild(winloss);
	var batch = new PIXI.SpriteBatch();
	stage.addChild(batch);
	var infotext = makeText(300, 470, "You get 3 gold every time your arena deck wins,\n& 1 gold every time it loses.");
	stage.addChild(infotext);
	if (user.ocard){
		var uocard = etgutil.asUpped(user.ocard, info.lv == 1);
		var bmake = makeButton(200, 440, "Create");
		setClick(bmake, function(){
			startEditor(info, uocard, true);
		});
		stage.addChild(bmake);
		var ocard = new PIXI.Sprite(getArt(uocard));
		ocard.position.set(734, 300);
		batch.addChild(ocard);
	}
	var bret = makeButton(200, 500, "Exit");
	setClick(bret, startMenu);
	stage.addChild(bret);
	if (info.card){
		if (info.lv){
			info.card = etgutil.asUpped(info.card, true);
		}
		var bmod = makeButton(200, 470, "Modify");
		setClick(bmod, function(){
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
			batch.addChild(spr);
			i++;
		});
		var spr = new PIXI.Sprite(gfx.eicons[mark || 0]);
		spr.position.set(100, 234);
		batch.addChild(spr);
		var acard = new PIXI.Sprite(getArt(info.card));
		acard.position.set(734, 8);
		batch.addChild(acard);
	}
	refreshRenderer(stage);
}

function startArenaTop(info) {
	if (!info) {
		chat("??");
		return;
	}
	var stage = new PIXI.DisplayObjectContainer();
	stage.interactive = true;
	stage.addChild(new PIXI.Sprite(gfx.bg_default));
	for (var i = 0;i < info.length; i++) {
		var data = info[i], y = 50 + i * 24;
		var infotxt = makeText(120, y, (i+1) + "  " + data[0]);
		var scoretxt = makeText(350, y, data[1]);
		var winlosstxt = makeText(400, y, data[2] + "-" + data[3]);
		var agetxt = makeText(460, y, data[4].toString());
		if (data[5] in Cards.Codes){
			var cardtxt = makeText(500, y, Cards.Codes[data[5]].name);
			stage.addChild(cardtxt);
		}
		stage.addChild(infotxt);
		stage.addChild(scoretxt);
		stage.addChild(winlosstxt);
		stage.addChild(agetxt);
	}
	var bret = makeButton(8, 300, "Exit");
	setClick(bret, startMenu);
	stage.addChild(bret);
	refreshRenderer(stage);
}

function chat(message, fontcolor) {
	var scroll = chatBox.scrollTop == (chatBox.scrollHeight - chatBox.offsetHeight);
	message = message.replace(/\b(([01][0-9a-v]{4})+)\b/g, "<a href='deck/$1' target='_blank'>$1</a>");
	chatBox.innerHTML += "<font color=" + (fontcolor || "red") + ">" + message + "</font><br>";
	if (scroll) chatBox.scrollTop = chatBox.scrollHeight;
}
socket.on("challenge", function(data) {
	var message = data.pvp ? " challenges you to a duel!" : " wants to trade with you!";
	var span = document.createElement("span");
	span.addEventListener("click", (data.pvp ? challengeClick : tradeClick).bind(null, data.f));
	span.innerHTML = "<font color=blue>" + data.f + message + "</font><br>";
	chatBox.appendChild(span);
});
socket.on("librarygive", initLibrary);
socket.on("foearena", function(data) {
	aideck.value = data.deck;
	var game = initGame({ first: data.seed < etgutil.MAX_INT/2, deck: data.deck, urdeck: getDeck(), seed: data.seed, p2hp: data.hp, cost: data.cost, foename: data.name, p2drawpower: data.draw, p2markpower: data.mark }, true);
	game.arena = data.name;
	game.level = data.lv?3:2;
	game.cost = data.lv?20:10;
	user.gold -= game.cost;
});
socket.on("arenainfo", startArenaInfo);
socket.on("arenatop", startArenaTop);
socket.on("userdump", function(data) {
	user = data;
	prepuser();
	startMenu();
});
socket.on("passchange", function(data) {
	user.auth = data;
	chat("Password updated");
});
socket.on("chat", function(data) {
	if (muteall || data.u in muteset) return;
	var now = new Date(), h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
	if (h < 10) h = "0"+h;
	if (m < 10) m = "0"+m;
	if (s < 10) s = "0"+s;
	var msg = h + ":" + m + ":" + s + " " + (data.u ? "<b>" + sanitizeHtml(data.u) + ":</b> " : "") + sanitizeHtml(data.msg);
	chat(data.guest ? "<i>" + msg + "</i>" : msg, data.mode || "black");
	if (Notification && user && ~data.msg.indexOf(user.name) && !document.hasFocus()){
		Notification.requestPermission();
		new Notification(data.u, {body: data.msg}).onclick = window.focus;
	}
});
socket.on("codecard", startRewardWindow);
socket.on("codereject", function(data) {
	chat(data);
});
socket.on("codegold", function(data) {
	user.gold += data;
	chat(data + " Gold added!");
});
socket.on("codecode", function(data) {
	user.pool = etgutil.addcard(user.pool, data);
	chat(Cards.Codes[data].name + " added!");
});
socket.on("codedone", function(data) {
	user.pool = etgutil.addcard(user.pool, data);
	chat(Cards.Codes[data].name + " added!");
	startMenu();
});
function soundChange(event) {
	ui.changeSound(enableSound.checked);
}
function musicChange(event) {
	ui.changeMusic(enableMusic.checked);
}
function maybeSendChat(e) {
	e.cancelBubble = true;
	if (e.keyCode == 13 && chatinput.value) {
		var msg = chatinput.value;
		chatinput.value = "";
		if (msg == "/clear"){
			chatBox.innerHTML = "";
		}else if (msg == "/mute"){
			muteall = true;
		}else if (msg == "/unmute"){
			muteall = false;
		}else if (msg.match(/^\/mute /)){
			muteset[msg.substring(6)] = true;
		}else if (msg.match(/^\/unmute /)){
			delete muteset[msg.substring(8)];
		}else if (user){
			var msgdata = {msg: msg};
			if (msg.match(/\/w( |")/)) {
				var match = msg.match(/^\/w"([^"]*)"/);
				var to = (match && match[1]) || msg.substring(3, msg.indexOf(" ", 4));
				if (!to){
					e.preventDefault();
					return;
				}
				chatinput.value = msg.substr(0, 4+to.length);
				msgdata.msg = msg.substr(4+to.length);
				msgdata.to = to;
			}
			if (!msgdata.msg.match(/^\s*$/)) userEmit("chat", msgdata);
		}
		else if (!msg.match(/^\s*$/)) {
			var name = username.value || guestname || (guestname = (10000 + Math.floor(Math.random() * 89999)) + "");
			socket.emit("guestchat", { msg: msg, u: name });
		}
		e.preventDefault();
	}
}
function sanitizeHtml(x) {
	return x.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
	if (realStage.next) {
		realStage.next();
	}
	renderer.render(realStage);
}
function requestAnimate() { requestAnimFrame(animate); }
function prepuser(){
	user.decks = user.decks.split(",");
	deckimport.value = user.decks[user.selectedDeck];
	user.pool = user.pool || "";
	user.accountbound = user.accountbound || "";
	if (!user.quest) {
		user.quest = {};
	}
	if (user.freepacks) {
		user.freepacks = user.freepacks.split(",").map(unaryParseInt);
	}
	if (!user.ailosses) user.ailosses = 0;
	if (!user.aiwins) user.aiwins = 0;
	if (!user.pvplosses) user.pvplosses = 0;
	if (!user.pvpwins) user.pvpwins = 0;
}
function loginClick() {
	if (!user && username.value) {
		var xhr = new XMLHttpRequest();
		xhr.open("POST", "auth?u=" + encodeURIComponent(username.value) + (password.value.length ? "&p=" + encodeURIComponent(password.value) : ""), true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					user = JSON.parse(this.responseText);
					if (!user) {
						chat("No user");
					} else if (!user.accountbound && !user.pool) {
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
	userEmit("passchange", { p: password.value });
}
function parseInput(data, key, value) {
	var value = parseInt(value);
	if (value === 0 || value > 0)
		data[key] = value;
}
function parsepvpstats(data){
	parseInput(data, "hp", pvphp.value);
	parseInput(data, "draw", pvpdraw.value);
	parseInput(data, "mark", pvpmark.value);
	parseInput(data, "deck", pvpdeck.value);
}
function parseaistats(data){
	parseInput(data, "p2hp", aihp.value);
	parseInput(data, "p2drawpower", aidraw.value);
	parseInput(data, "p2markpower", aimark.value);
	parseInput(data, "p2deckpower", aideckpow.value);
}
function challengeClick(foe) {
	if (Cards.loaded) {
		var deck = getDeck();
		if (etgutil.decklength(deck) < (user ? 31 : 11)){
			startEditor();
			return;
		}
		var gameData = {};
		parsepvpstats(gameData);
		if (user) {
			gameData.f = typeof foe === "string" ? foe : foename.value;
			userEmit("foewant", gameData);
		}else{
			gameData.deck = deck;
			gameData.room = foename.value;
			socket.emit("pvpwant", gameData);
		}
	}
}
function tradeClick(foe) {
	if (Cards.loaded)
		userEmit("tradewant", { f: typeof foe === "string" ? foe : foename.value });
}
function rewardClick() {
	if (Cards.loaded)
		userEmit("codesubmit", { code: foename.value });
}
function libraryClick() {
	if (Cards.loaded)
		socket.emit("librarywant", { f: foename.value });
}
function aiClick(){
	var gameData = { first: Math.random() < .5, deck: aideck.value, urdeck: getDeck(), seed: Math.random() * etgutil.MAX_INT, foename: "Custom" };
	parsepvpstats(gameData);
	parseaistats(gameData);
	initGame(gameData, true);
}
function offlineChange(){
	socket.emit("showoffline", offline.checked);
}
function wantpvpChange(){
	socket.emit("wantingpvp", wantpvp.checked);
}
(function(callbacks){
	for(var id in callbacks){
		for(var event in callbacks[id]){
			document.getElementById(id).addEventListener(event, callbacks[id][event]);
		}
	}
})({
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
offlineChange();
wantpvpChange();
})();