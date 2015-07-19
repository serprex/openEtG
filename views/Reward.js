"use strict";
var px = require("../px");
var dom = require("../dom");
var etg = require("../etg");
var gfx = require("../gfx");
var chat = require("../chat");
var sock = require("../sock");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var userutil = require("../userutil");
module.exports = function(reward, numberofcopies, code) {
	if (!numberofcopies) numberofcopies = 1;
	var rewardList, chosenReward;
	if (typeof reward == "string") {
		var shiny = reward.charAt(0) == "!";
		if (shiny) reward = reward.slice(1);
		var upped = reward.slice(0, 5) == "upped";
		var rarity = userutil.rewardwords[upped ? reward.slice(5) : reward];
		rewardList = etg.filtercards(upped, function(x) { return x.rarity == rarity }).map(function(card){ return card.asShiny(shiny).code });
	}else if (reward instanceof Array){
		rewardList = reward;
	}else{
		console.log("Unknown reward", reward);
		return;
	}
	var rewardui = px.mkView(),
		div = dom.div([10, 40, ["Done", function() {
			if (chosenReward) {
				if (code === undefined) {
					sock.userExec("addbound", { c: etgutil.encodeCount(numberofcopies) + chosenReward });
					require("./MainMenu")();
				}
				else {
					sock.userEmit("codesubmit2", { code: code, card: chosenReward });
				}
			}else chat("Choose a reward");
		}]]);
	if (numberofcopies > 1) {
		dom.add(div, [20, 100, "You will get " + numberofcopies + " copies of the card you choose"]);
	}
	if (code){
		dom.add(div, [10, 10, ["Exit", require("./MainMenu")]]);
	}
	var chosenRewardImage = new PIXI.Sprite(gfx.nopic);
	chosenRewardImage.position.set(233, 10);
	rewardui.addChild(chosenRewardImage);
	rewardList.forEach(function(reward, i){
		var card = new PIXI.Sprite(gfx.getCardImage(reward));
		card.position.set(100 + Math.floor(i/12) * 133, 272 + (i%12) * 19);
		px.setClick(card, function(){
			chosenReward = reward;
			chosenRewardImage.texture = gfx.getArt(chosenReward);
		}, "cardClick");
		card.interactive = true;
		rewardui.addChild(card);
	});

	var cmds = {
		codedone:function(data) {
			sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
			chat(Cards.Codes[data.card].name + " added!");
			require("./MainMenu")();
		},
	}

	px.view({view:rewardui, dom:div, cmds:cmds});
}