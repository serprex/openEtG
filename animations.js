var anims = [], disableEffects = false;
function Effect(){}
Effect.prototype.remove = function(){
	if (this.gfx && this.gfx.parent){
		this.gfx.parent.removeChild(this.gfx);
	}
	for(var i=0; i<anims.length; i++){
		if (anims[i] == this){
			anims.splice(i, 1);
			return;
		}
	}
}
function DeathEffect(pos){
	if (disableEffects)return;
	this.step = 0;
	this.position = pos;
	this.gfx = new PIXI.Graphics();
	anims.push(this);
	gameui.addChild(this.gfx);
}
function TextEffect(text, pos){
	if (disableEffects || !pos)return;
	this.step = 0;
	this.gfx = new PIXI.Sprite(getTextImage(text, 16));
	this.gfx.position = pos;
	this.gfx.anchor.x = .5;
	anims.push(this);
	gameui.addChild(this.gfx);
}
DeathEffect.prototype = Object.create(Effect.prototype);
TextEffect.prototype = Object.create(Effect.prototype);
DeathEffect.prototype.next = function(){
	if (++this.step==10){
		this.remove();
	}else{
		this.gfx.clear();
		this.gfx.beginFill(0, 1-this.step/10);
		this.gfx.drawRect(this.position.x-60, this.position.y-15, 120, 30);
		this.gfx.endFill();
	}
}
TextEffect.prototype.next = function(){
	if (++this.step==15){
		this.remove();
	}else{
		this.gfx.position.y -= 3;
		this.gfx.alpha = 1-(Math.pow(this.step, 2)/225);
	}
}
