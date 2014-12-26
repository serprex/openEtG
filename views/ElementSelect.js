"use strict";
var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");
var sock = require("./sock");
module.exports = function() {
	var stage = px.mkView();
	var eledesc = px.domText("Select your starter element");
	etg.eleNames.forEach(function(name, i){
		if (i > 13) return;
		var ele = new PIXI.Sprite(gfx.eicons[i]);
		ele.position.set(100 + i * 32, 300);
		ele.mouseover = function(){
			eledesc.setText(name);
		}
		px.setClick(ele, function() {
			var msg = { u: sock.user.name, a: sock.user.auth, e: i };
			sock.user = undefined;
			sock.emit("inituser", msg);
			require("./MainMenu")();
		});
		ele.interactive = true;
		stage.addChild(ele);
	});
	px.refreshRenderer({view: stage, seldom: [
		[100, 250, eledesc],
		[100, 400, ["Exit", function(){
			sock.userEmit("delete");
			sock.user = undefined;
			require("./MainMenu")();
		}]
	]]});
}