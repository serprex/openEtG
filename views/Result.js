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
module.exports = function(game, data) {
	var winner = game.winner == game.player1, stage, foeDeck = data.p2deck, h = preact.h;
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
					gameData.p2hp = data.p2hp;
					gameData.p2markpower = data.p2markpower;
					gameData.p2drawpower = data.p2drawpower;
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
	var view = h('div', { id: 'app', style: { display: ''} },
		h(dom.ExitBtn, { x: 412, y: 440, onClick: exitFunc }));
	var lefttext = [game.ply + " plies", (game.time / 1000).toFixed(1) + " seconds"];
	if (!game.quest && game.daily === undefined){
		view.children.push(h('input', {
			type: 'button',
			value: 'Rematch',
			onClick: rematch,
			style: {
				position: 'absolute',
				left: '412px',
				top: '490px',
			},
		}));
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
						var elewin = foeDeck[Math.floor(Math.random() * foeDeck.length)];
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
							var streak = (sock.user.streakback || 0) + 1;
							sock.user.streakback = 0;
							streakrate = Math.min(streak200[game.level]*streak/200, 1);
							sock.userExec("setstreak", {l:game.level, n:streak});
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
				var goldwon = game.goldreward - (game.cost || 0) + "$";
				view.children.push(h(dom.Text, {
					text: goldwon,
					style: {
						textAlign: 'center',
						width: '900px',
						position: 'absolute',
						left: '0px',
						top: '550px',
					}
				}));
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
		var tinfo = game.quest ? game.wintext : "You won!";
		view.children.push(h(dom.Text, {
			text: tinfo,
			style: {
				textAlign: 'center',
				width: '900px',
				position: 'absolute',
				left: '0px',
				top: game.cardreward ? '100px' : '250px',
			}
		}));
	}
	view.children.push(h('span', { style: { position: 'absolute', left: '8px', top: '290px', whiteSpace: 'pre' }}, lefttext.join("\n")));

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
		var kc = e.which || e.keyCode;
		if (kc == 32 || kc == 13) exitFunc();
		else if (kc == 87 && !game.quest && game.daily === undefined){
			rematch();
		}
	}
	document.addEventListener("keydown", onkeydown);
	px.view({view:stage, endnext:function() {
		px.hideapp();
		document.removeEventListener("keydown", onkeydown);
	}});
	px.render(view);
}