"use strict";
var px = require("../px");
var dom = require("../dom");
var gfx = require("../gfx");
var chat = require("../chat");
var sock = require("../sock");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var userutil = require("../userutil");
var DeckDisplay = require("../DeckDisplay");
var CardSelector = require("../CardSelector");

function startMenu(){
	// Avoids early recursive requires & blanks arguments
	require("./MainMenu")();
}
module.exports = function() {
	var view = px.mkView(), cardminus = {}, stage = {view: view};
	var btrade = dom.button("Trade", function() {
		if (!cardChosen){
			if (ownDeck.deck.length > 0) {
				sock.emit("cardchosen", {c: etgutil.encoderaw(ownDeck.deck)});
				console.log("Offered", ownDeck.deck);
				cardChosen = true;
				btrade.value = "Confirm";
				btrade.style.top = "60px";
			}
			else chat("You have to choose at least a card!", "System");
		}else{ // confirm
			if (foeDeck.deck.length > 0) {
				console.log("Confirmed", ownDeck.deck, foeDeck.deck);
				sock.userEmit("confirmtrade", { cards: etgutil.encoderaw(ownDeck.deck), oppcards: etgutil.encoderaw(foeDeck.deck) });
				btrade.style.display = "none";
				tconfirm.style.display = "";
			}
			else chat("Wait for your friend to choose!", "System");
		}
	});
	var tconfirm = dom.text("Confirmed!");
	tconfirm.style.display = "none";
	var ownVal = dom.text(""), foeVal = dom.text("");
	var cardChosen = false;
	function setCardArt(code){
		cardArt.texture = gfx.getArt(code);
		cardArt.visible = true;
	}
	var ownDeck = new DeckDisplay(30, setCardArt,
		function(i) {
			px.adjust(cardminus, ownDeck.deck[i], -1);
			ownDeck.rmCard(i);
			ownVal.text = userutil.calcWealth(cardminus);
		}
	);
	var foeDeck = new DeckDisplay(30, setCardArt);
	foeDeck.position.x = 450;
	view.addChild(ownDeck);
	view.addChild(foeDeck);
	stage.dom = dom.div([10, 10, ["Cancel", function() {
		sock.userEmit("canceltrade");
		startMenu();
	}]],
		[100, 235, ownVal], [350, 235, foeVal],
		[10, 40, btrade], [10, 60, tconfirm]);

	var cardpool = etgutil.deck2pool(sock.user.pool);
	var cardsel = new CardSelector(stage, setCardArt,
		function(code){
			var card = Cards.Codes[code];
			if (ownDeck.deck.length < 30 && !card.isFree() && code in cardpool && !(code in cardminus && cardminus[code] >= cardpool[code])) {
				px.adjust(cardminus, code, 1);
				ownDeck.addCard(code);
				ownVal.text = userutil.calcWealth(cardminus);
			}
		}
	);
	cardsel.cardpool = cardpool;
	cardsel.cardminus = cardminus;
	view.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	view.addChild(cardArt);
	stage.cmds = {
		cardchosen: function(data){
			foeDeck.deck = etgutil.decodedeck(data.c);
			foeDeck.renderDeck(0);
			foeVal.text = userutil.calcWealth(data.c);
		},
		tradedone: function(data) {
			sock.user.pool = etgutil.mergedecks(sock.user.pool, data.newcards);
			sock.user.pool = etgutil.removedecks(sock.user.pool, data.oldcards);
			startMenu();
		},
		tradecanceled: startMenu,
	};
	px.view(stage);
}