// Modified/Simplified from PIXI's interaction manager
function InteractionManager(stage, renderer)
{
	this.stage = stage;
	this.over = null;
	this.down = null;
	this.mouse = new PIXI.math.Point();
	this.interactionDOMElement = null;
	this.onMouseMove = this.onMouseMove.bind(this);
	this.onMouseDown = this.onMouseDown.bind(this);
	this.onMouseOut = this.onMouseOut.bind(this);
	this.onMouseUp = this.onMouseUp.bind(this);
	this._tempPoint = new PIXI.math.Point();
	if (renderer)
	{
		this.setTargetElement(renderer.view);
	}
}

InteractionManager.prototype.constructor = InteractionManager;
module.exports = InteractionManager;

InteractionManager.prototype.visitChildren = function (displayObject, visitFunc)
{
	if (!displayObject.interactive || !this.hitTest(displayObject)) return;
	var children = displayObject.children;
	for (var i = children.length - 1; i >= 0; i--)
	{
		var ret = this.visitChildren(children[i], visitFunc);
		if (ret)
		{
			return ret;
		}
	}
	return visitFunc.call(this, displayObject);
};

InteractionManager.prototype.setTargetElement = function (element)
{
	this.removeEvents();
	this.interactionDOMElement = element;
	this.addEvents();
};

InteractionManager.prototype.addEvents = function ()
{
	if (!this.interactionDOMElement)
	{
		return;
	}

	this.interactionDOMElement.addEventListener('mousemove', this.onMouseMove,  true);
	this.interactionDOMElement.addEventListener('mousedown', this.onMouseDown,  true);
	this.interactionDOMElement.addEventListener('mouseout',	 this.onMouseOut,   true);

	window.addEventListener('mouseup', this.onMouseUp, true);
};

InteractionManager.prototype.removeEvents = function ()
{
	if (!this.interactionDOMElement)
	{
		return;
	}

	this.interactionDOMElement.removeEventListener('mousemove', this.onMouseMove, true);
	this.interactionDOMElement.removeEventListener('mousedown', this.onMouseDown, true);
	this.interactionDOMElement.removeEventListener('mouseout',  this.onMouseOut,  true);

	this.interactionDOMElement = null;

	window.removeEventListener('mouseup',  this.onMouseUp, true);
};

InteractionManager.prototype.onMouseMove = function (event)
{
	var rect = this.interactionDOMElement.getBoundingClientRect();
	this.mouse.set(
		(event.clientX - rect.left) * (this.interactionDOMElement.width / rect.width),
		(event.clientY - rect.top) * (this.interactionDOMElement.height / rect.height));

	var over = null;
	this.visitChildren(this.stage, function(item){
		if (item.mousemove)
		{
			item.mousemove();
		}
		if (!over && (item.mouseover || item.mouseout))
		{
			over = item;
		}
	});
	if (over !== this.over)
	{
		if (this.over && this.over.mouseout)
		{
			this.over.mouseout();
		}
		this.over = over;
		if (this.over && this.over.mouseover)
		{
			this.over.mouseover();
		}
	}
};

InteractionManager.prototype.onMouseDown = function (event)
{
	var isRightButton = event.button === 2 || event.which === 3;
	var downFunction = isRightButton ? 'rightdown' : 'mousedown';
	var clickFunction = isRightButton ? 'rightclick' : 'click';
	var upOutsideFunction = isRightButton ? 'rightupoutside' : 'mouseupoutside';

	this.visitChildren(this.stage, function(item){
		if (item[downFunction] || item[clickFunction] || item[upOutsideFunction])
		{
			//call the function!
			if (item[downFunction])
			{
				item[downFunction]();
			}
			this.down = item;
			return true;
		}
	});
};

InteractionManager.prototype.onMouseOut = function (event)
{
	if (this.over)
	{
		if (this.over.mouseout)
		{
			this.over.mouseout();
		}
		this.over = null;
	}
};

InteractionManager.prototype.onMouseUp = function (event)
{
	var isRightButton = event.button === 2 || event.which === 3;

	var upFunction = isRightButton ? 'rightup' : 'mouseup';
	var clickFunction = isRightButton ? 'rightclick' : 'click';
	var upOutsideFunction = isRightButton ? 'rightupoutside' : 'mouseupoutside';

	var up = this.visitChildren(this.stage, function(item){
		if (item[upFunction] || item[clickFunction] || item[upOutsideFunction])
		{
			if (item[upFunction])
			{
				item[upFunction]();
			}
			return item;
		}
	});
	if (this.down)
	{
		var ev = up === this.down ? clickFunction : upOutsideFunction;
		if (this.down[ev])
		{
			this.down[ev]();
		}
	}
	this.down = null;
};

InteractionManager.prototype.hitTest = function (item, xy)
{
	if (!item.worldVisible) return false;
	if (!xy) xy = this.mouse;

	// map the global point to local space
	item.worldTransform.applyInverse(xy,  this._tempPoint);

	var x = this._tempPoint.x, y = this._tempPoint.y;

	//a sprite or display object with a hit area defined
	if (item.hitArea && item.hitArea.contains)
	{
		return item.hitArea.contains(x, y);
	}
	// a sprite with no hitarea defined
	else if (item instanceof PIXI.Sprite)
	{
		var width = item.texture.frame.width;
		var x1 = -width * item.anchor.x;
		if (x > x1 && x < x1 + width)
		{
			var height = item.texture.frame.height;
			var y1 = -height * item.anchor.y;
			if (y > y1 && y < y1 + height)
			{
				return true;
			}
		}
	}

	return item.children.some(function(child){
		return this.hitTest(child, xy);
	}, this);
};