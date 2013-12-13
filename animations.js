function Effect(){
}
Effect.prototype.remove = function(){
	for(var i=0; i<anims.length; i++){
		if (anims[i] == this){
			anims.splice(i, 1);
			return;
		}
	}
}
function DeathEffect(pos){
	this.step = 0;
	this.position = pos;
	this.gfx = new PIXI.Graphics();
	anims.push(this);
	gameui.addChild(this.gfx);
}
DeathEffect.prototype = new Effect();
DeathEffect.prototype.next = function(){
	if (++this.step==30){
		gameui.removeChild(this.gfx);
		this.remove();
	}else{
		this.gfx.clear();
		this.gfx.beginFill(0, (30-this.step)/30);
		this.gfx.drawRect(this.position.x-40, this.position.y-10, 80, 20);
		this.gfx.endFill();
	}
}
var anims = [];