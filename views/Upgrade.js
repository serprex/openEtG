"use strict";
var px = require("../px");
var dom = require("../dom");
var gfx = require("../gfx");
var sock = require("../sock");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var userutil = require("../userutil");
var CardSelector = require("../CardSelector");
module.exports = function() {
	function upgradeCard(card) {
		if (!card.isFree()) {
			if (card.upped) return "You cannot upgrade upgraded cards.";
			var use = card.rarity != -1 ? 6 : 1;
			if (cardsel.cardpool[card.code] >= use) {
				sock.userExec("upgrade", { card: card.code });
			}
			else return "You need at least " + use + " copies to be able to upgrade this card!";
		}
		else if (sock.user.gold >= 50) {
			sock.userExec("uppillar", { c: card.code });
			goldcount.text = sock.user.gold + "$";
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
			if (cardsel.cardpool[card.code] >= use) {
				sock.userExec("polish", { card: card.code });
			}
			else return "You need at least " + use + " copies to be able to polish this card!";
		}
		else if (sock.user.gold >= 50) {
			sock.userExec("shpillar", { c: card.code });
			goldcount.text = sock.user.gold + "$";
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
				goldcount.text = sock.user.gold + "$";
			}else return "You need 300$ to afford a shiny upgraded pillar!";
		}else{
			var codecount = etgutil.count(sock.user.pool, card.code);
			if (codecount) {
				sock.userExec("sellcard", { card: card.code });
				goldcount.text = sock.user.gold + "$";
			}
			else return "This card is bound to your account; you cannot sell it.";
		}
	}
	function eventWrap(func){
		return function(){
			var error = selectedCard ? func(Cards.Codes[selectedCard]) : "Pick a card, any card.";
			if (error) twarning.text = error;
			else adjustdeck();
		}
	}
	function autoCards(){
		sock.userExec("upshall");
		adjustdeck();
	}
	function adjustdeck() {
		cardsel.cardpool = etgutil.deck2pool(sock.user.accountbound, etgutil.deck2pool(sock.user.pool));
	}
	var selectedCard;
	var upgradeui = px.mkView(function(){
		if (selectedCard) cardArt.texture = gfx.getArt(etgutil.asUpped(selectedCard, true));
	});
	var bupgrade = dom.button("Upgrade", eventWrap(upgradeCard)),
		bpolish = dom.button("Polish", eventWrap(polishCard), function() { if (selectedCard) cardArt.texture = gfx.getArt(etgutil.asShiny(selectedCard, true)) }),
		bunupgrade = dom.button("Unupgrade", eventWrap(unupgradeCard)),
		bunpolish = dom.button("Unpolish", eventWrap(unpolishCard), function() { if (selectedCard) cardArt.texture = gfx.getArt(etgutil.asShiny(selectedCard, false)) }),
		bsell = dom.button("Sell", eventWrap(sellCard)),
		goldcount = dom.text(sock.user.gold + "$"),
		tinfo = dom.text(""),
		tinfo2 = dom.text(""),
		tinfo3 = dom.text(""),
		twarning = dom.text("");
	var stage = {view:upgradeui,
		dom: dom.div([5, 50, ["Exit", require("./MainMenu")]],
		[150, 50, bupgrade],
		[150, 95, bpolish],
		[150, 50, bunupgrade],
		[150, 95, bunpolish],
		[150, 140, bsell],
		[5, 140, ["Autoconvert", autoCards]],
		[5, 240, goldcount],
		[250, 50, tinfo],
		[250, 140, tinfo2],
		[250, 95, tinfo3],
		[100, 170, twarning]),
	};

	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	upgradeui.addChild(cardArt);
	var selectedCardArt = new PIXI.Sprite(gfx.nopic);
	selectedCardArt.position.set(534, 8);
	upgradeui.addChild(selectedCardArt);

	var cardsel = new CardSelector(stage, null,
		function(code){
			var card = Cards.Codes[code];
			selectedCardArt.texture = gfx.getArt(code);
			cardArt.texture = gfx.getArt(etgutil.asUpped(code, true));
			selectedCard = code;
			if (card.upped) {
				bupgrade.style.display = "none";
				bunupgrade.style.display = "";
				tinfo.text = card.isFree() ? "" : card.rarity != -1 ? "Convert into an 6 unupgraded copies." : "Convert into an unupgraded version.";
			}else{
				tinfo.text = card.isFree() ? "50$ to upgrade" : card.rarity != -1 ? "Convert 6 into an upgraded version." : "Convert into an upgraded version.";
				bupgrade.style.display = "";
				bunupgrade.style.display = "none";
			}
			if (card.rarity == 5) {
				bpolish.style.display = bunpolish.style.display = "none";
				tinfo3.text = "This card cannot be " + (card.shiny ? "un" : "") + "polished.";
			}
			else if (card.shiny){
				bpolish.style.display = "none";
				bunpolish.style.display = "";
				tinfo3.text = card.isFree() ? "" : card.rarity != -1 ? "Convert into 6 non-shiny copies." : "Convert into 2 non-shiny copies.";
			}else{
				tinfo3.text = card.isFree() ? "50$ to polish" : card.rarity == 5 ? "This card cannot be polished." : card.rarity != -1 ? "Convert 6 into a shiny version." : "Convert 2 into a shiny version.";
				bpolish.style.display = "";
				bunpolish.style.display = "none";
			}
			bsell.style.display = ~card.rarity?"":"none";
			bsell.value = card.isFree() ? "Polgrade" : "Sell";
			tinfo2.text = card.rarity == -1 ? "" : card.isFree() ? "300$ to upgrade & polish" :
				"Sell for " + userutil.sellValues[card.rarity] * (card.upped ? 6 : 1) * (card.shiny ? 6 : 1) + "$";
			twarning.text = "";
		}, true
	);
	upgradeui.addChild(cardsel);
	cardsel.cardminus = [];
	adjustdeck();
	dom.style(bupgrade, bpolish, bsell, bunupgrade, bunpolish, {display: "none"});
	px.view(stage);
}