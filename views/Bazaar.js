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
	var view = px.mkView(), stage = {view: view};
	var bbuy = dom.button("Buy", function() {
		if (ownDeck.deck.length == 0) return chat("You haven't chosen a card");
		console.log(ownVal.text, ownVal.textContent);
		if (sock.user.gold < parseInt(ownVal.text)) return chat("You cannot afford these");
		sock.userExec("bazaar", {cards:etgutil.encodedeck(ownDeck.deck)});
		startMenu();
	});
	var ownVal = dom.text("");
	function setCardArt(code){
		cardArt.texture = gfx.getArt(code);
		cardArt.visible = true;
	}
	var ownDeck = new DeckDisplay(60, setCardArt,
		function(i) {
			ownDeck.rmCard(i);
			ownVal.text = Math.ceil(userutil.calcWealth(ownDeck.deck, true)*3);
		}
	);
	view.addChild(ownDeck);
	stage.dom = dom.div([8, 100, ["Exit", startMenu]],
		[100, 235, ownVal], [8, 160, bbuy], [8, 240, sock.user.gold + "$"]);

	var cardsel = new CardSelector(stage, setCardArt,
		function(code){
			var card = Cards.Codes[code];
			if (ownDeck.deck.length < 60 && card.rarity > 0 && card.rarity < 4 && !card.isFree()) {
				ownDeck.addCard(code);
				ownVal.text = Math.ceil(userutil.calcWealth(ownDeck.deck, true)*3);
			}
		}
	);
	view.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	view.addChild(cardArt);
	px.view(stage);
}