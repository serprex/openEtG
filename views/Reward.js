"use strict";
var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");
var chat = require("./chat");
var sock = require("./sock");
module.exports = function(reward, numberofcopies, code) {
	if (!numberofcopies) numberofcopies = 1;
	if (reward.type !== undefined) reward = reward.type;
	var rewardList, chosenReward;
	if (typeof reward == "string") {
		var upped = reward.substring(0, 5) == "upped";
		var rarity = userutil.rewardwords[upped ? reward.substring(5) : reward];
		rewardList = etg.filtercards(upped, function(x) { return x.rarity == rarity }).map(function(card){ return card.code });
	}else if (reward instanceof Array){
		rewardList = reward;
	}else{
		console.log("Unknown reward", reward);
		return;
	}
	var rewardui = px.mkView();

	if (numberofcopies > 1) {
		var infotext = new px.MenuText(20, 100, "You will get " + numberofcopies + " copies of the card you choose")
		rewardui.addChild(infotext);
	}

	if (code){
		var exitButton = px.mkButton(10, 10, "Exit");
		px.setClick(exitButton, startMenu);
		rewardui.addChild(exitButton);
	}

	var confirmButton = px.mkButton(10, 40, "Done");
	px.setClick(confirmButton, function() {
		if (chosenReward) {
			if (code === undefined) {
				sock.userExec("addbound", { c: etgutil.encodeCount(numberofcopies) + chosenReward });
				require("./MainMenu")();
			}
			else {
				sock.userEmit("codesubmit2", { code: code, card: chosenReward });
			}
		}
	});
	rewardui.addChild(confirmButton);

	var chosenRewardImage = new PIXI.Sprite(gfx.nopic);
	chosenRewardImage.position.set(450, 20);
	rewardui.addChild(chosenRewardImage);
	rewardList.forEach(function(reward, i){
		var card = new PIXI.Sprite(getCardImage(reward));
		card.position.set(100 + Math.floor(i/12) * 130, 272 + (i%12) * 20);
		px.setClick(card, function(){
			chosenReward = reward;
			chosenRewardImage.setTexture(gfx.getArt(chosenReward));
		}, "cardClick");
		rewardui.addChild(card);
		px.setInteractive(card);
	});

	rewardui.cmds = {
		codedone:function(data) {
			sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
			chat(Cards.Codes[data.card].name + " added!");
			require("./MainMenu")();
		},
	}

	px.refreshRenderer(rewardui);
}