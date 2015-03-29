"use strict";
var px = require("../px");
var etg = require("../etg");
var gfx = require("../gfx");
var sock = require("../sock");
function mkBox(w, h) {
	var d = document.createElement("div");
	d.style.width = w + "px";
	d.style.height = h + "px";
	return d;
}
module.exports = function() {
	var eledesc = px.dom.text("Select your starter element"),
		descbox = mkBox(700, 100);
	descbox.appendChild(eledesc);
	var	div = px.dom.div(
		[100, 250, descbox],
		[100, 400, ["Exit", function(){
			sock.userEmit("delete");
			sock.user = undefined;
			require("./Login")();
		}]]),
		descriptions = [
			"",
			"Entropy is the element of randomness. It can scramble the opponent's quantum, generate powerful mutants, random creatures, effects and cards.",
			"Death elementals gain advantage of the death generating quantum, producing creatures and increasing it's defense. It is also the element that controls the poison.",
			"Gravity is the element of order. It has huge creatures that can use as shield, eat smaller creatures, drain opponent's quantum and bypass shields. ",
			"Earth is the element of the defense. Its' creatures can protect themselves and they can delay opponent's creatures for a long time. Earth elementals can also increase their maxium HP.",
			"Life is the element of the healing. Life elementals like having high HP and attacking with lots of small, cheap creatures. They can also multiply their creatures and make them attack multiple times.",
			"Fire is the element of destruction. Its creatures have very high attack and are more fragile. It has also a lot of cards that damage the opponent's creatures.",
			"Water is the element of versatility. Water elementals like freezing opponent's creatures and using the other element to grant them various powerful effects.",
			"Light is the element of protection and divinity. Light creatures have high HP and it has spells and abilities that heals them. It can also make your hand immune to certain effects.",
			"Air is the element of lightness. It has cheap shields and creatures that can double their attack. Air elementals like their games be fluid, simple and without many troubles. ",
			"Time is the element of speed control. Time elementals like drawing multiple cards per turn. They can also make opponent's creatures stop attacking and send them back to their hands. It has also a special type of poison.",
			"Darkness is the element of the tricks. Darkness elementals can drain HP and quantum from the opponent, steal their cards and reduce their maxium health. ",
			"Time is the element of speed control. Time elementals like drawing multiple cards per turn. They can also make opponent's creatures stop attacking and send them back to their hands. It has also a special type of poison.",
			"Start without any cards, but gain several extra booster cards instead!",
			"Start with a random element!"
		];
	etg.eleNames.forEach(function(name, i){
		if (i < 1 || i > 14) return;
		var b = px.dom.icob(i < 13 ? i : i == 13 ? 14 : 13, function() {
			var msg = { u: sock.user.name, a: sock.user.auth, e: i ==14 ? etg.PlayerRng.uptoceil(12) : i };
			sock.user = undefined;
			sock.emit("inituser", msg);
		});
		b.addEventListener("mouseover", function(){
			eledesc.text = (i < 13 ? name : i == 13 ? "Build your own" : "Random") + "\n\n" + descriptions[i];
		});
		px.dom.add(div,[100 + i * 32, 200, b]);
	});
	px.view({dom:div, cmds:{
		login:function(data) {
			delete data.x;
			sock.user = data;
			sock.prepuser();
			require("./MainMenu")();
		},
	}
	});
}