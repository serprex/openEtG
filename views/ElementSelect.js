"use strict";
var px = require("../px");
var etg = require("../etg");
var gfx = require("../gfx");
var sock = require("../sock");
module.exports = function() {
	var eledesc = px.domText("Select your starter element"),
		dom = [
		[100, 250, eledesc],
		[100, 400, ["Exit", function(){
			sock.userEmit("delete");
			sock.user = undefined;
			require("./Login")();
		}]]
	];
	etg.eleNames.forEach(function(name, i){
		if (i < 1 || i > 14) return;
		var b = px.domEButton(i < 13 ? i : i == 13 ? 14 : 13, function() {
			var msg = { u: sock.user.name, a: sock.user.auth, e: i ==14 ? etg.PlayerRng.uptoceil(12) : i };
			sock.user = undefined;
			sock.emit("inituser", msg);
		});
		b.addEventListener("mouseover", function(){
			eledesc.text = i < 13 ? name : i == 13 ? "Build your own" : "Random";
		});
		dom.push([100 + i * 32, 300, b]);
	});
	px.view({seldom: dom, cmds:{
		login:function(data) {
			delete data.x;
			sock.user = data;
			sock.prepuser();
			require("./MainMenu")();
		},
	}});
}