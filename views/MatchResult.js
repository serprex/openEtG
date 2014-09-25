"use strict";
var px = require("./px");
var gfx = require("./gfx");
var chat = require("./chat");
var sock = require("./sock");
var etgutil = require("./etgutil");
var aiDecks = require("./Decks");
module.exports = function(game) {
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
				require("./Reward")(game.choicerewards, game.rewardamount, true);
			else
				require("./QuestArea")(game.area);
		}
		else if (game.daily !== undefined){
			require("./Colosseum")();
		}else require("./MainMenu")();
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
				var cardArt = new PIXI.Sprite(gfx.getArt(code));
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
			case 0:aiDecks.mkAi(0)();break;
			case 1:aiDecks.mkPremade("mage")();break;
			case 2:aiDecks.mkAi(2)();break;
			case 3:aiDecks.mkPremade("demigod")();break;
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