"use strict";
var px = require("../px");
var dom = require("../dom");
var etg = require("../etg");
var gfx = require("../gfx");
var chat = require("../chat");
var mkAi = require("../mkAi");
var sock = require("../sock");
var util = require("../util");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var options = require("../options");
var RngMock = require("../RngMock");
var userutil = require("../userutil");
var streak200 = new Uint8Array([10, 10, 15, 20, 15, 20]);
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
		case 1:mkAi.mkPremade(1)();break;
		case 2:mkAi.mkAi(2)();break;
		case 3:mkAi.mkPremade(3)();break;
		case 4:sock.userEmit("foearena", {lv:0});break;
		case 5:sock.userEmit("foearena", {lv:1});break;
		case undefined:
			if (game.foename == "Custom" || game.foename == "Test"){
				var gameData = { deck: etgutil.encodedeck(foeDeck) + etgutil.toTrueMarkSuffix(game.player2.mark), urdeck: sock.getDeck(), seed: util.randint(), foename: game.foename, cardreward: "" };
				if (game.foename == "Custom"){
					options.parsepvpstats(gameData);
					options.parseaistats(gameData);
				}else{
					// Inaccurate if stats changed throughout game
					gameData.p2hp = game.player2.maxhp;
					gameData.p2markpower = game.player2.markpower;
					gameData.p2deckpower = game.player2.deckpower;
				}
				require("./Match")(gameData, true);
			}
		}
	}
	function computeBonuses() {
		if (game.endurance !== undefined) return 1;
		var bonus = [
			["Creature Domination", game.player1.countcreatures() > 2*game.player2.countcreatures() ? .1 : 0],
			["Creatureless", game.bonusstats.creaturesplaced == 0 ? .1 : 0],
			["Current Health", game.player1.hp/300],
			["Deckout", game.player2.deck.length == 0 && game.player2.hp > 0 ? .5 : 0],
			["Double Kill", game.player2.hp < -game.player2.maxhp ? .15 : 0],
			["Equipped", game.player1.weapon && game.player1.shield ? .05 : 0],
			["Full Health", game.player1.hp == game.player1.maxhp ? .2 : 0],
			["Grounds Keeper", (game.player1.countpermanents()-8)/40],
			["Last point", game.player1.hp == 1 ? .3 : 0],
			["Mid Turn", game.turn == game.player1 ? .1 : 0],
			["Murderer", game.bonusstats.creatureskilled > 5 ? .15 : 0],
			["Perfect Damage", game.player2.hp == 0 ? .1 : 0],
			["Pillarless", game.bonusstats.cardsplayed[0] == 0 ? .05 : 0],
			["Size matters", (etgutil.decklength(sock.getDeck())-36)/150],
			["Toxic", game.player2.status.get("poison") > 18 ? .1 : 0],
			["Unupped", (function(){
				var unupnu = 0;
				etgutil.iterraw(sock.getDeck(), function(code, count){
					var card = Cards.Codes[code];
					if (card && !card.upped) unupnu += count;
				});
				return unupnu/300;
			})()],
			["Waiter", game.player1.deck.length == 0 ? .3 : 0],
			["Weapon Master", game.bonusstats.cardsplayed[1] >= 3 ? .1 : 0],
		].reduce(function(bsum, data) {
			var b = data[1];
			if (b > 0) {
				lefttext.push(Math.round(b*100) + "% " + data[0]);
				return bsum + b;
			}else return bsum;
		}, 1);
		lefttext.push(((streakrate+1)*bonus*100-100).toFixed(1) + "% total bonus");
		return bonus;
	}
	var div = dom.div([412, 440, ["Exit", exitFunc]]), lefttext = [game.ply + " plies", (game.time / 1000).toFixed(1) + " seconds"];
	if (!game.quest && game.daily === undefined){
		dom.add(div, [412, 490, ["Rematch", rematch]]);
	}
	var streakrate = 0;
	if (winner){
		if (sock.user){
			if (game.level !== undefined || !game.ai) sock.userExec("addwin", { pvp: !game.ai });
			if (!game.quest && game.ai) {
				if (game.cardreward === undefined && foeDeck) {
					var winnable = foeDeck.filter(function(card){ return card.rarity > 0 && card.rarity < 4; }), cardwon;
					if (winnable.length) {
						cardwon = RngMock.choose(winnable);
						if (cardwon == 3 && Math.random() < .5)
							cardwon = RngMock.choose(winnable);
					} else {
						var elewin = foeDeaddck[Math.floor(Math.random() * foeDeck.length)];
						cardwon = RngMock.randomcard(elewin.upped, function(x) { return x.element == elewin.element && x.type != etg.Pillar && x.rarity <= 3; });
					}
					if (game.level !== undefined && game.level < 2) {
						cardwon = cardwon.asUpped(false);
					}
					game.cardreward = "01" + etgutil.asShiny(cardwon.code, false).toString(32);
				}
				if (!game.goldreward) {
					var goldwon;
					if (game.level !== undefined) {
						if (game.daily == undefined){
							var streak = sock.user.streak[game.level] || 0;
							streakrate = Math.min(streak200[game.level]*streak/200, 1);
							sock.userExec("setstreak", {l:game.level, n:++streak});
							lefttext.push(streak + " win streak", (streakrate * 100).toFixed(1) + "% streak bonus");
						}else var streak = 0;
						goldwon = Math.floor(userutil.pveCostReward[game.level*2+1] * (1+streakrate) * computeBonuses());
					} else goldwon = 0;
					game.goldreward = goldwon;
				}
			}
			if (game.addonreward){
				game.goldreward = (game.goldreward || 0) + game.addonreward;
			}
			if (game.goldreward) {
				var goldwon = dom.text(game.goldreward - (game.cost || 0) + "$");
				goldwon.style.textAlign = "center";
				goldwon.style.width = "900px";
				dom.add(div, [0, 550, goldwon]);
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
		}
		var tinfo = dom.text(game.quest ? game.wintext : "You won!");
		tinfo.style.textAlign = "center";
		tinfo.style.width = "900px";
		dom.add(div, [0, game.cardreward ? 100 : 250, tinfo]);
	}
	dom.add(div, [10, 290, lefttext.join("\n")]);

	if (game.endurance == undefined){
		chat([game.level === undefined ? -1 : game.level,
			(game.foename || "?").replace(/,/g, " "),
			winner ? "W" : "L",
			game.ply,
			game.time,
			game.player1.hp,
			game.player1.maxhp,
			(game.goldreward || 0) - (game.cost || 0),
			game.cardreward || "-",
			userutil.calcWealth(game.cardreward),
			!sock.user || game.level === undefined ? -1 : sock.user.streak[game.level],
			streakrate.toFixed(3).replace(/\.?0+$/, "")].join(), null, "Stats");
	}
	function onkeydown(e){
		if (e.keyCode == 32 || e.keyCode == 13) exitFunc();
		else if (e.keyCode == 87 && !game.quest && game.daily === undefined){
			rematch();
		}
	}
	document.addEventListener("keydown", onkeydown);
	px.view({view:stage, dom:div, endnext:function() {
		document.removeEventListener("keydown", onkeydown);
	}});
}