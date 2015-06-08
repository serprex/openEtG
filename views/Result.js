"use strict";
var px = require("../px");
var ui = require("../ui");
var etg = require("../etg");
var gfx = require("../gfx");
var chat = require("../chat");
var mkAi = require("../mkAi");
var sock = require("../sock");
var etgutil = require("../etgutil");
var options = require("../options");
var userutil = require("../userutil");
module.exports = function(game, foeDeck) {
	var winner = game.winner == game.player1, stage;
	function exitFunc(){
		if (game.quest) {
			if (winner && game.choicerewards)
				require("./Reward")(game.choicerewards, game.rewardamount);
			else
				require("./QuestArea")(game.area);
		}
		else if (game.daily !== undefined){
			require("./Colosseum")();
		}else require("./MainMenu")();
	}
	function rematch(){
		switch(game.level){
		case 0:mkAi.mkAi(0)();break;
		case 1:mkAi.mkPremade("mage")();break;
		case 2:mkAi.mkAi(2)();break;
		case 3:mkAi.mkPremade("demigod")();break;
		case 4:sock.userEmit("foearena", {lv:0});break;
		case 5:sock.userEmit("foearena", {lv:1});break;
		default:
			if (game.foename == "Custom"){
				var gameData = { deck: options.aideck, urdeck: sock.getDeck(), seed: Math.random() * etgutil.MAX_INT, foename: "Custom", cardreward: "" };
				ui.parsepvpstats(gameData);
				ui.parseaistats(gameData);
				require("./Match")(gameData, true);
			}
		}
	}
	function computeBonuses() {
		if (game.endurance !== undefined) return 1;
		var bonus = 1;
		[	["Full Health", function() { return game.player1.hp == game.player1.maxhp ? .2 : 0 }],
			["Deckout", function() { return game.player2.deck.length == 0 && game.player2.hp > 0 ? .5 : 0 }],
			["Double Kill", function() { return game.player2.hp < -game.player2.maxhp ? .25 : 0 }],
			["Waiter", function() { return game.player1.deck.length == 0 ? .2 : 0 }],
			["Grounds Keeper", function() { return Math.max((game.player1.countpermanents()-8)/40, 0) }],
			["Creature Domination", function() { return game.player1.countcreatures() > 2*game.player2.countcreatures() ? .1 : 0 }],
			["Creatureless", function() { return game.player1.bonusstats.cardsplayed[5] == 0 ? .1 : 0 }],
			["Toxic", function() { return game.player2.status.poison > 18 ? .1 : 0 }],
			["Equipped", function() { return game.player1.weapon && game.player1.shield ? .05 : 0 }],
			["Mid Turn", function() { return game.turn == game.player1 ? .1 : 0 }],
			["Pillarless", function() { return game.player1.bonusstats.cardsplayed[0] == 0 ? .05 : 0 }],
			["Weapon Master", function() { return game.player1.bonusstats.cardsplayed[1] >= 3 ? .1 : 0 }],
			["Murderer", function() { return game.player1.bonusstats.creatureskilled > 5 ? .2 : 0 }],
			["One Turn Kill", function() { return game.player1.bonusstats.otk && game.player2.hp <= 0 ? .2 : 0 }],
			["Last point", function() { return game.player1.hp == 1 ? .3 : 0 }],
		].forEach(function(data) {
			var ret = data[1]();
			if (ret > 0) {
				lefttext.push(Math.round(ret*100) + "% " + data[0]);
				bonus += ret;
			}
		});
		lefttext.push(Math.round(bonus*100) + "% total bonus");
		return bonus;
	}
	var div = px.dom.div([412, 440, ["Exit", exitFunc]]), lefttext = [game.ply + " plies", (game.time / 1000).toFixed(1) + " seconds"];
	if (!game.quest && game.daily === undefined){
		px.dom.add(div, [412, 490, ["Rematch", rematch]]);
	}
	var streakrate = 0;
	if (winner){
		if (sock.user){
			if (game.level !== undefined || !game.ai) sock.userExec("addwin", { pvp: !game.ai });
			if (!game.quest && game.ai) {
				if (game.cardreward === undefined && foeDeck) {
					var winnable = foeDeck.filter(function(card){ return card.rarity > 0 && card.rarity < 4; }), cardwon;
					if (winnable.length) {
						cardwon = etg.PlayerRng.choose(winnable);
						if (cardwon == 3 && Math.random() < .5)
							cardwon = etg.PlayerRng.choose(winnable);
					} else {
						var elewin = foeDeaddck[Math.floor(Math.random() * foeDeck.length)];
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
						var streak = "streak" + game.level;
						streakrate = Math.min([.05, .05, .075, .1, .075, .1][game.level]*(sock.user[streak]||0), 1);
						var reward = userutil.pveCostReward[game.level*2+1] * (1+streakrate);
						sock.user[streak] = (sock.user[streak] || 0)+1;
						goldwon = Math.floor(reward * (200 + game.player1.hp) / 300);
						lefttext.push(sock.user[streak] + " win streak", (streakrate * 100).toFixed(1) + "% streak bonus");
					} else goldwon = 0;
					game.goldreward = goldwon + (game.cost || 0);
				}
			}
		}
		if (game.goldreward) {
			game.goldreward = Math.round(game.goldreward * computeBonuses());
			var reward = (game.addonreward || 0) + game.goldreward - (game.cost || 0),
				goldwon = px.dom.text(reward + "$");
			goldwon.style.textAlign = "center";
			goldwon.style.width = "900px";
			px.dom.add(div, [0, 550, goldwon]);
			sock.userExec("addgold", { g: game.goldreward });
		}
		if (game.cardreward) {
			var x0 = 470-etgutil.decklength(game.cardreward)*20;
			stage = new PIXI.Container();
			etgutil.iterdeck(game.cardreward, function(code, i){
				var cardArt = new PIXI.Sprite(gfx.getArt(code));
				cardArt.anchor.x = .5;
				cardArt.position.set(x0+i*40, 170);
				stage.addChild(cardArt);
			});
			sock.userExec(game.quest?"addbound":"addcards", { c: game.cardreward });
		}
		var tinfo = px.dom.text(game.quest ? game.wintext : "You won!");
		tinfo.style.textAlign = "center";
		tinfo.style.width = "900px";
		px.dom.add(div, [0, game.cardreward ? 100 : 250, tinfo]);
	}
	px.dom.add(div, [10, 290, lefttext.join("\n")]);

	if (options.stats && game.endurance == undefined){
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
			streakrate.toFixed(3).replace(/\.?0+$/, "")].join());
	}
	function onkeydown(e){
		if (e.keyCode == 32) exitFunc();
		else if (e.keyCode == 87 && !game.quest && game.daily === undefined){
			rematch();
		}
	}
	document.addEventListener("keydown", onkeydown);

	px.view({view:stage, dom:div, endnext:function() {
		document.removeEventListener("keydown", onkeydown);
	}});
}