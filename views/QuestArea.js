var px = require("../px");
var dom = require("../dom");
var sock = require("../sock");
var Quest = require("../Quest");
function startQuest(questname) {
	if (!sock.user.quests[questname] && sock.user.quests[questname] != 0) {
		sock.userExec("updatequest", { quest: questname, newstage: 0 });
	}
}
var bg_quest = new PIXI.Texture(new PIXI.BaseTexture());
(function(){
	var img = new Image();
	img.addEventListener("load", function(){
		bg_quest.baseTexture = new PIXI.BaseTexture(img);
		bg_quest.frame = new PIXI.math.Rectangle(0, 0, img.width, img.height);
	});
	img.src = "assets/bg_quest.png";
})();
module.exports = function(area) {
	var questui = px.mkView(function() {
		tinfo.text = "";
	});
	var questmap = new PIXI.Sprite(bg_quest);
	questmap.position.set(124, 162);
	questui.addChild(questmap);
	var tinfo = dom.text("");
	tinfo.style.maxWidth = "850px";
	var errinfo = dom.text("");
	tinfo.style.maxWidth = errinfo.style.maxWidth = 850;
	var div = dom.div([9, 9, dom.box(880, 111)],
		[26, 26, tinfo],
		[26, 125, errinfo],
		[750, 246, ["Exit", require("./QuestMain")]]);
	function mkQuestButton(quest, stage) {
		var circle = document.createElement("span");
		circle.className = "imgb";
		circle.style.border = "2px solid #88aa66";
		circle.style.borderRadius = "50%";
		circle.style.backgroundColor = sock.user.quests[quest] > stage ? "#4f0" : "#000";
		circle.style.display = "inline-block";
		circle.style.width = circle.style.height = "32px";
		circle.addEventListener("mouseover", function() {
			tinfo.text = Quest[quest].info.text[stage];
		});
		circle.addEventListener("click", function() {
			var err = Quest.mkQuestAi(quest, stage, area);
			if (typeof err === "string") errinfo.text = err;
		});
		return circle;
	}
	Quest.areas[area].forEach(function(quest){
		var stage0 = Quest[quest][0];
		if (stage0.dependency === undefined || stage0.dependency(sock.user))
			startQuest(quest);
	});
	Quest.areas[area].forEach(function(quest){
		var pos;
		if ((sock.user.quests[quest] !== undefined) && Quest[quest]) {
			for (var i = 0;i <= sock.user.quests[quest];i++) {
				if ((pos = Quest[quest].info.pos[i])) {
					dom.add(div, [pos[0], pos[1], mkQuestButton(quest, i)]);
				}
			}
		}
	});
	px.view({view:questui, dom:div});
}