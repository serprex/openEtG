"use strict";
var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");
var chat = require("./chat");
var sock = require("./sock");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var userutil = require("./userutil");
module.exports = function(reward, numberofcopies, code) {
	if (!numberofcopies) numberofcopies = 1;
	var rewardList, chosenReward;
	if (typeof reward == "string") {
		var shiny = reward.charAt(0) == "!";
		if (shiny) reward = reward.slice(1);
		var upped = reward.slice(0, 5) == "upped";
		var rarity = userutil.rewardwords[upped ? reward.slice(5) : reward];
		rewardList = etg.filtercards(upped, function(x) { return x.rarity == rarity }).map(function(card){ return card.code });
		if (shiny) rewardList = rewardList.map(function(x) { return x.shiny });
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
		px.setClick(exitButton, require("./MainMenu"));
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
	chosenRewardImage.position.set(233, 10);
	rewardui.addChild(chosenRewardImage);
	rewardList.forEach(function(reward, i){
		var card = new PIXI.Sprite(gfx.getCardImage(reward));
		card.position.set(100 + Math.floor(i/12) * 133, 272 + (i%12) * 19);
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