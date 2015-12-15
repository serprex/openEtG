"use strict";
var lastmove = 0;
document.addEventListener("mousemove", function(e){
	if (e.timeStamp - lastmove < 16){
		e.stopPropagation();
	}else{
		lastmove = e.timeStamp;
	}
});
var audio = require("./audio");
var renderer = new PIXI.autoDetectRenderer(900, 600, {view:document.getElementById("leftpane"), transparent:true});
var noStage = {}, curStage = noStage;
var interman = require("./InteractionManager");
interman.init(noStage, renderer);
exports.mouse = interman.mouse;
function animate() {
	if (curStage.view){
		renderer.render(curStage.view);
		setTimeout(requestAnimate, 20);
	}
}
function requestAnimate() { requestAnimationFrame(animate); }
exports.mkRenderTexture = function(width, height){
	return new PIXI.RenderTexture(renderer, width, height);
}
exports.getCmd = function(cmd){
	return curStage.cmds ? curStage.cmds[cmd] : null;
}
exports.view = function(stage) {
	if (curStage.endnext){
		curStage.endnext();
	}
	if (stage.dom){
		document.body.appendChild(stage.dom);
	}
	if (curStage.dom){
		curStage.dom.remove();
	}
	if (stage.view){
		if (!curStage.view) requestAnimate();
		renderer.render(stage.view);
		renderer.view.style.display = "";
		interman.stage = stage.view;
	} else {
		interman.stage = noStage;
		renderer.view.style.display = "none";
	}
	curStage = stage;
}
exports.setClick = function(obj, click, sound) {
	if (sound === undefined) sound = "buttonClick";
	else if (typeof sound !== "string"){
		obj.click = click;
		return;
	}
	obj.click = function() {
		audio.playSound(sound);
		click.apply(this, arguments);
	}
}
exports.hitTest = interman.hitTest;
exports.setInteractive = function() {
	for (var i = 0;i < arguments.length;i++) {
		arguments[i].interactive = true;
	}
}
exports.mkView = function(mouseover){
	var view = new PIXI.Container();
	view.interactive = true;
	if (mouseover){
		view.hitArea = new PIXI.math.Rectangle(0, 0, 900, 600);
		view.mouseover = mouseover;
	}
	return view;
}
exports.mkBgRect = function(){
	var g = new PIXI.Graphics();
	g.beginFill(0x0d2e4a);
	for(var i=0; i<arguments.length; i+=4){
		g.drawRect(arguments[i], arguments[i+1], arguments[i+2], arguments[i+3], 6);
	}
	g.endFill();
	g.lineStyle(2, 0x121212);
	for(var i=0; i<arguments.length; i+=4){
		g.moveTo(arguments[i], arguments[i+1]);
		g.lineTo(arguments[i], arguments[i+1]+arguments[i+3]);
		g.lineTo(arguments[i]+arguments[i+2], arguments[i+1]+arguments[i+3]);
	}
	g.lineStyle(2, 0x969696);
	for(var i=0; i<arguments.length; i+=4){
		g.moveTo(arguments[i], arguments[i+1]);
		g.lineTo(arguments[i]+arguments[i+2], arguments[i+1]);
		g.lineTo(arguments[i]+arguments[i+2], arguments[i+1]+arguments[i+3]);
	}
	return g;
}
exports.adjust = function adjust(cardminus, code, x) {
	if (code in cardminus) {
		cardminus[code] += x;
	} else cardminus[code] = x;
	delete cardminus.rendered;
}