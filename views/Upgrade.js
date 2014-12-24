"use strict";
var px = require("./px");
var gfx = require("./gfx");
var sock = require("./sock");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var userutil = require("./userutil");
module.exports = function() {
	function upgradeCard(card) {
		if (!card.isFree()) {
			if (card.upped) return "You cannot upgrade upgraded cards.";
			var use = card.rarity != -1 ? 6 : 1;
			if (cardpool[card.code] >= use) {
				sock.userExec("upgrade", { card: card.code });
			}
			else return "You need at least " + use + " copies to be able to upgrade this card!";
		}
		else if (sock.user.gold >= 50) {
			sock.userExec("uppillar", { c: card.code });
			goldcount.setText(sock.user.gold + "$");
		}
		else return "You need 50$ to afford an upgraded pillar!";
	}
	function unupgradeCard(card) {
		if (card.rarity || (card.shiny && card.upped)) {
			if (!card.upped) return "You cannot unupgrade unupgraded cards.";
			sock.userExec("unupgrade", { card: card.code });
		}
		else return "You cannot unupgrade pillars; sell it instead."
	}
	function polishCard(card) {
		if (!card.isFree()) {
			if (card.shiny) return "You cannot polish shiny cards.";
			if (card.rarity == 5) return "You cannot polish Nymphs.";
			var use = card.rarity != -1 ? 6 : 2;
			if (cardpool[card.code] >= use) {
				sock.userExec("polish", { card: card.code });
			}
			else return "You need at least " + use + " copies to be able to polish this card!";
		}
		else if (sock.user.gold >= 50) {
			sock.userExec("shpillar", { c: card.code });
			goldcount.setText(sock.user.gold + "$");
		}
		else return "You need 50$ to afford a shiny pillar!";
	}
	function unpolishCard(card) {
		if (card.rarity || (card.shiny && card.upped)) {
			if (!card.shiny) return "You cannot unpolish non-shiny cards.";
			if (!card.rarity == 5) return "You cannot unpolish Nymphs.";
			sock.userExec("unpolish", { card: card.code });
		}
		else return "You cannot unpolish pillars; sell them instead.";
	}
	function sellCard(card) {
		if (card.rarity == -1) return "You really don't want to sell that, trust me.";
		else if (card.isFree()){
			if (sock.user.gold >= 300){
				sock.userExec("upshpillar", {c: card.code});
				goldcount.setText(sock.user.gold + "$");
			}else return "You need 300$ to afford a shiny upgraded pillar!";
		}else{
			var codecount = etgutil.count(sock.user.pool, card.code);
			if (codecount) {
				sock.userExec("sellcard", { card: card.code });
				goldcount.setText(sock.user.gold + "$");
			}
			else return "This card is bound to your account; you cannot sell it.";
		}
	}
	function eventWrap(func){
		return function(){
			var error = selectedCard ? func(Cards.Codes[selectedCard]) : "Pick a card, any card.";
			if (error) twarning.setText(error);
			else adjustdeck();
		}
	}
	function autoCards(){
		sock.userExec("upshall");
		adjustdeck();
	}
	function adjustdeck() {
		cardpool = etgutil.deck2pool(sock.user.pool);
		cardpool = etgutil.deck2pool(sock.user.accountbound, cardpool);
	}
	var upgradeui = px.mkView(function(){
		if (selectedCard) cardArt.setTexture(gfx.getArt(etgutil.asUpped(selectedCard, true)));
	});
	var stage = {view:upgradeui,
		bexit: [5, 50, ["Exit", require("./MainMenu")]],
		bupgrade: [150, 50, ["Upgrade", eventWrap(upgradeCard)]],
		bpolish: [150, 95, ["Polish", eventWrap(polishCard), function() { if (selectedCard) cardArt.setTexture(gfx.getArt(etgutil.asShiny(selectedCard, true))) }]],
		bunupgrade:[150, 50, ["Unupgrade", eventWrap(unupgradeCard)]],
		bunpolish:[150, 95, ["Unpolish", eventWrap(unpolishCard), function() { if (selectedCard) cardArt.setTexture(gfx.getArt(etgutil.asShiny(selectedCard, false))) }]],
		bsell:[150, 140, ["Sell", eventWrap(sellCard)]],
		bauto:[5, 140, ["Autoconvert", autoCards]],
		next:function(){
			cardsel.next(cardpool);
		}
	};

	var goldcount = px.domText(sock.user.gold + "$");
	var tinfo = px.domText("");
	var tinfo2 = px.domText("");
	var tinfo3 = px.domText("");
	var twarning = px.domText("");
	stage.domtext = [
		[5, 240, goldcount],
		[250, 50, tinfo],
		[250, 140, tinfo2],
		[250, 95, tinfo3],
		[100, 170, twarning],
	];

	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	upgradeui.addChild(cardArt);
	var selectedCardArt = new PIXI.Sprite(gfx.nopic);
	selectedCardArt.position.set(534, 8);
	upgradeui.addChild(selectedCardArt);

	var cardsel = new px.CardSelector(null,
		function(code){
			var card = Cards.Codes[code];
			selectedCardArt.setTexture(gfx.getArt(code));
			cardArt.setTexture(gfx.getArt(etgutil.asUpped(code, true)));
			selectedCard = code;
			if (card.upped) {
				px.setDomVis("bupgrade", false);
				px.setDomVis("bunupgrade", true);
				tinfo.setText(card.isFree() ? "" : card.rarity != -1 ? "Convert into an 6 unupgraded copies." : "Convert into an unupgraded version.");
			}else{
				tinfo.setText(card.isFree() ? "50$ to upgrade" : card.rarity != -1 ? "Convert 6 into an upgraded version." : "Convert into an upgraded version.");
				px.setDomVis("bupgrade", true);
				px.setDomVis("bunupgrade", false);
			}
			if (card.rarity == 5) {
				px.setDomVis("bpolish", false);
				px.setDomVis("bunpolish", false);
				tinfo3.setText("This card cannot be " + (card.shiny ? "un" : "") + "polished.")
			}
			else if (card.shiny){
				px.setDomVis("bpolish", false);
				px.setDomVis("bunpolish", true);
				tinfo3.setText(card.isFree() ? "" : card.rarity != -1 ? "Convert into 6 non-shiny copies." : "Convert into 2 non-shiny copies.")
			}else{
				tinfo3.setText(card.isFree() ? "50$ to polish" : card.rarity == 5 ? "This card cannot be polished." : card.rarity != -1 ? "Convert 6 into a shiny version." : "Convert 2 into a shiny version.")
				px.setDomVis("bpolish", true);
				px.setDomVis("bunpolish", false);
			}
			px.setDomVis("bsell", ~card.rarity);
			document.getElementById("bsell").value = card.isFree() ? "Polgrade" : "Sell";
			tinfo2.setText(card.rarity == -1 ? "" : card.isFree() ? "300$ to shine & polish" :
				"Sell for " + userutil.sellValues[card.rarity] * (card.upped ? 6 : 1) * (card.shiny ? 6 : 1) + "$");
			twarning.setText("");
		}, true
	);
	upgradeui.addChild(cardsel);
	var cardpool, selectedCard;
	adjustdeck();
	px.refreshRenderer(stage);
	px.setDomVis("bupgrade", false);
	px.setDomVis("bpolish", false);
	px.setDomVis("bsell", false);
	px.setDomVis("bunupgrade", false);
	px.setDomVis("bunpolish", false);
}