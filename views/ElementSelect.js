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
		if (i > 13) return;
		var b = px.domEButton(i, function() {
			var msg = { u: sock.user.name, a: sock.user.auth, e: i };
			sock.user = undefined;
			sock.emit("inituser", msg);
			require("./MainMenu")();
		});
		b.addEventListener("mouseover", function(){
			eledesc.text = name;
		});
		dom.push([100 + i * 32, 300, b]);
	});
	px.view({seldom: dom});
}