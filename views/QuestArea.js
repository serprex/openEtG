var px = require("../px");
var gfx = require("../gfx");
var sock = require("../sock");
var Quest = require("../Quest");
function startQuest(questname) {
	if (!sock.user.quest[questname] && sock.user.quest[questname] != 0) {
		sock.user.quest[questname] = 0;
		sock.userEmit("updatequest", { quest: questname, newstage: 0 });
	}
}
module.exports = function(area) {
	var questui = px.mkView(function() {
		tinfo.text = "";
	});
	var questmap = new PIXI.Sprite(gfx.bg_quest);
	questmap.position.set(124, 162);
	questui.addChild(questmap);
	var tinfo = px.domText("");
	tinfo.style.maxWidth = "850px";
	var errinfo = px.domText("");
	tinfo.style.maxWidth = errinfo.style.maxWidth = 850;
	var dom = [
		[9, 9, px.domBox(880, 111)],
		[26, 26, tinfo],
		[26, 125, errinfo],
		[750, 246, ["Exit", require("./QuestMain")]]
	];
	function mkQuestButton(quest, stage) {
		var circle = document.createElement("span");
		circle.className = "imgb";
		circle.style.border = "2px solid #88aa66";
		circle.style.borderRadius = "50%";
		circle.style.backgroundColor = sock.user.quest[quest] > stage ? "#4cff00" : "black";
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
		if ((sock.user.quest[quest] !== undefined) && Quest[quest]) {
			for (var i = 0;i <= sock.user.quest[quest];i++) {
				if ((pos = Quest[quest].info.pos[i])) {
					dom.push([pos[0], pos[1], mkQuestButton(quest, i)]);
				}
			}
		}
	});
	px.refreshRenderer({view:questui, qdom:dom});
}