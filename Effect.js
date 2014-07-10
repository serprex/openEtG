var anims;
exports.disable = false;
exports.register = function(doc){
	anims = doc;
}
exports.next = function(p2cloaked){
	if (anims){
		for (var i = anims.children.length - 1;i >= 0;i--) {
			var child = anims.children[i];
			if ((p2cloaked && new PIXI.Rectangle(130, 20, 660, 280).contains(child.position.x, child.position.y)) || child.next()){
				anims.removeChild(child);
			}
		}
	}
}
function make(cons){
	return function(){
		if (exports.disable || !anims) return;
		var effect = Object.create(cons.prototype);
		var effectOverride = cons.apply(effect, arguments);
		anims.addChild(effectOverride === undefined ? effect : effectOverride);
	}
}
function makemake(){
	for(var i=0; i<arguments.length; i++){
		var cons = arguments[i];
		exports[cons.name] = cons;
		exports["mk" + cons.name] = make(cons);
	}
}
function Death(pos){
	PIXI.Graphics.call(this);
	this.step = 0;
	this.position = pos;
}
function Text(text, pos){
	if (!pos){
		console.log("Blank position " + text);
		pos = new PIXI.Point(-99, -99);
	}
	PIXI.Sprite.call(this, getTextImage(text, 16));
	this.step = 0;
	this.position = pos;
	this.anchor.x = .5;
}
function Notification(text, pos) {
	if (!pos)
		pos = new PIXI.Point(450, 300);
	PIXI.Graphics.call(this);
	var pixitext = new PIXI.Text(text, { fill: 'white', font: "20px Dosis" });
	pixitext.anchor.set(0.5, 0.5);
	this.beginFill(0);
	this.drawRect(-pixitext.width / 2-2, -pixitext.height / 2-2, pixitext.width+4, pixitext.height+4);
	this.endFill();
	this.addChild(pixitext);
	this.step = 0;
	this.position = pos;
}
Death.prototype = Object.create(PIXI.Graphics.prototype);
Text.prototype = Object.create(PIXI.Sprite.prototype);
Notification.prototype = Object.create(PIXI.Graphics.prototype);
Death.prototype.next = function(){
	if (++this.step==10){
		return true;
	}
	this.clear();
	this.beginFill(0, 1-this.step/10);
	this.drawRect(-30, -30, 60, 60);
	this.endFill();
}
Text.prototype.next = function(){
	if (++this.step==15){
		return true;
	}
	this.position.y -= 3;
	this.alpha = 1-((1<<this.step)/225);
}
Notification.prototype.next = function() {
	if (++this.step == 80) {
		return true;
	}
	if (this.step > 40) this.alpha = 1 - ((this.step-40) / 50);
}
makemake(Death, Text, Notification);