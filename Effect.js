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
function Death(pos){
	if (exports.disable || !anims)return;
	PIXI.Graphics.call(this);
	this.step = 0;
	this.position = pos;
	anims.addChild(this);
}
function Text(text, pos){
	if (exports.disable || !anims || !pos)return;
	PIXI.Sprite.call(this, getTextImage(text, 16));
	this.step = 0;
	this.position = pos;
	this.anchor.x = .5;
	anims.addChild(this);
}
Death.prototype = Object.create(PIXI.Graphics.prototype);
Text.prototype = Object.create(PIXI.Sprite.prototype);
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
exports.Death = Death;
exports.Text = Text;