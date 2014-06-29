var anims = [];
exports.disable = false;
exports.clear = function(){
	if (anims.length) {
		while (anims.length) {
			anims[0].remove();
		}
	}
}
exports.next = function(){
	for (var i = anims.length - 1;i >= 0;i--) {
		anims[i].next();
	}
}
function removeEffect(effect){
	if (effect && effect.parent){
		effect.parent.removeChild(effect);
	}
	for(var i=0; i<anims.length; i++){
		if (anims[i] == effect){
			anims.splice(i, 1);
			return;
		}
	}
}
function Death(pos){
	if (exports.disable)return;
	PIXI.Graphics.call(this);
	this.step = 0;
	this.position = pos;
	this.anchor.set(.5, .5);
	anims.push(this);
	gameui.addChild(this);
}
function Text(text, pos){
	if (exports.disable || !pos)return;
	PIXI.Sprite.call(this, getTextImage(text, 16));
	this.step = 0;
	this.position = pos;
	this.anchor.x = .5;
	anims.push(this);
	gameui.addChild(this);
}
Death.prototype = Object.create(PIXI.Graphics.prototype);
Text.prototype = Object.create(PIXI.Sprite.prototype);
Death.prototype.next = function(){
	if (++this.step==10){
		removeEffect(this);
	}else{
		this.clear();
		this.beginFill(0, 1-this.step/10);
		this.drawRect(-30, -30, 60, 60);
		this.endFill();
	}
}
Text.prototype.next = function(){
	if (++this.step==15){
		removeEffect(this);
	}else{
		this.position.y -= 3;
		this.alpha = 1-((1<<this.step)/225);
	}
}
exports.Death = Death;
exports.Text = Text;