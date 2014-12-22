"use strict";
var px = require("./px");
var gfx = require("./gfx");
var chat = require("./chat");
var mkAi = require("./mkAi");
var sock = require("./sock");
var etgutil = require("./etgutil");
var options = require("./options");
var userutil = require("./userutil");
module.exports = function(game) {
	var winner = game.winner == game.player1;
	var victoryui = px.mkView();
	var dom = [
		[10, 290, game.ply + " plies\n" + (game.time / 1000).toFixed(1) + " seconds\n" + (winner && sock.user && game.level !== undefined ? (sock.user["streak" + game.level] || 0) + " win streak\n+" +
			Math.min([5, 5, 7.5, 10, 7.5, 10][game.level] * Math.max(sock.user["streak" + game.level] - 1, 0), 100) + "% streak bonus" : "")],
		[412, 430, ["Exit", function() {
			if (game.quest) {
				if (winner && game.choicerewards)
					require("./Reward")(game.choicerewards, game.rewardamount);
				else
					require("./QuestArea")(game.area);
			}
			else if (game.daily !== undefined){
				require("./Colosseum")();
			}else require("./MainMenu")();
		}]]
	];

	if (winner){
		var tinfo = px.domText(game.quest ? game.wintext : "You won!", 500);
		tinfo.textAlign = "center";
		dom.push([450, game.cardreward ? 130 : 250, tinfo]);
	}

	if (winner && sock.user){
		sock.userExec("addwin", { pvp: !game.ai });
		if (game.goldreward) {
			dom.push([340, 550, (game.goldreward - (game.cost || 0)) + "$"]);
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
	if (options.stats){
		chat([game.level === undefined ? -1 : game.level,
			(game.foename || "?").replace(/,/g, " "),
			winner ? "W" : "L",
			game.ply,
			game.time,
			game.player1.hp,
			game.player1.maxhp,
			(game.goldreward || 0) - (game.cost || 0),
			game.cardreward || "-",
			userutil.calcWealth(etgutil.deck2pool(game.cardreward)),
			!sock.user || game.level === undefined ? -1 : sock.user["streak"+game.level],
			!sock.user || game.level === undefined ? 0 : Math.min([.05, .05, .075, .1, .075, .1][game.level]*Math.max(sock.user["streak"+game.level]-1, 0), 1).toFixed(3).replace(/\.?0+$/, "")].join());
	}
	function onkeydown(e){
		if (e.keyCode == 32) bexit.click();
		else if (e.keyCode == 87 && !game.quest && game.daily === undefined){
			switch(game.level){
			case 0:mkAi.mkAi(0)();break;
			case 1:mkAi.mkPremade("mage")();break;
			case 2:mkAi.mkAi(2)();break;
			case 3:mkAi.mkPremade("demigod")();break;
			case 4:sock.userEmit("foearena", {lv:0});break;
			case 5:sock.userEmit("foearena", {lv:1});break;
			}
		}
	}
	document.addEventListener("keydown", onkeydown);
	victoryui.endnext = function() {
		document.removeEventListener("keydown", onkeydown);
	}

	px.refreshRenderer({view:victoryui, domvic:dom});
}