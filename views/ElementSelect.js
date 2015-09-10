"use strict";
var px = require("../px");
var dom = require("../dom");
var etg = require("../etg");
var sock = require("../sock");
module.exports = function() {
	var eledesc = dom.text("Select your starter element");
	eledesc.style.width = "700px";
	var div = dom.div(
		[100, 300, eledesc],
		[100, 450, ["Exit", function(){
			sock.userEmit("delete");
			sock.user = undefined;
			require("./Login")();
		}]]),
		descriptions = [
			"Element of randomness. Trade of consistency for cost effectiveness, make use of all elements, spawn mutants, & seek turn advantages into disadvantages.",
			"Element of decay. Gains advantages through destroying creatures and exhibiting control through poison.",
			"Element of order. Employs huge creatures that defend their owner, eat smaller creatures, and bypass shields.",
			"Element of defense. Its creatures may protect themselves and delay other creatures for a long time. Stoneskin allows increasing maxium HP.",
			"Element of healing. Likes having high HP and attacking with lots of small, cheap creatures. They may also multiply their creatures and make them attack multiple times.",
			"Element of destruction. Sacrifice defense for offense. Many of its spells damage creatures.",
			"Element of versatility. Water elementals like freezing opponent's creatures and mixing with other elements to grant them various powerful effects.",
			"Element of protection. Its creatures have high HP & it supports them with healing. Light's permanents allow it to be protected from spell damage, quanta drain, forced discard, and freezing.",
			"Element of efficiency. Its low cost creatures and permanents trade well with single target removal, while its own removal is area of effect.",
			"Element of speed. It speeds itself with card draw while delaying creatures & unsummoning them to their owner's deck.",
			"Element of trickery. Steals its opponent's resources such as HP, quanta, cards, & permanents. May deny their opponent from healing through reducing maxium health.",
			"Element of dimension. It copies creatures and generates cards. Many of their creatures are immaterial.",
			"Start without any cards, but gain several extra booster cards instead!",
			"Start with a random element!"
		];
	etg.eleNames.forEach(function(name, i){
		if (i < 1 || i > 14) return;
		var b = dom.icob(i < 13 ? i : i == 13 ? 14 : 13, function() {
			var msg = { u: sock.user.name, a: sock.user.auth, e: i ==14 ? etg.PlayerRng.uptoceil(12) : i };
			sock.user = undefined;
			sock.emit("inituser", msg);
		});
		b.addEventListener("mouseover", function(){
			eledesc.text = name + "\n\n" + descriptions[i-1];
		});
		dom.add(div, [100 + Math.floor((i-1)/2) * 64, 180+((i-1)&1)*64, b]);
	});
	px.view({dom:div, cmds:{
		login:function(data) {
			delete data.x;
			sock.user = data;
			require("./MainMenu")();
		},
	}
	});
}