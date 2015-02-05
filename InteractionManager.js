// Modified/Simplified from PIXI's interaction manager
function InteractionManager(stage, renderer)
{
	this.stage = stage;
	this.over = null;
	this.down = null;
	this.mouse = new PIXI.math.Point();
	this.interactionDOMElement = null;
	this.eventsAdded = false;
	this.lastmove = 0;
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

InteractionManager.prototype.visitChildren = function (visitFunc, displayObject)
{
	var children = (displayObject || this.stage).children;
	var length = children.length;

	for (var i = length - 1; i >= 0; i--)
	{
		var child = children[i];
		if (child.children.length > 0 && child.interactiveChildren !== false)
		{
			var ret = this.visitChildren(visitFunc, child);
			if (ret)
			{
				return ret;
			}
		}
		if (child.interactive)
		{
			var vret = visitFunc.call(this, child);
			if (vret)
			{
				return vret;
			}
		}
	}
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

	this.interactionDOMElement.addEventListener('mousemove',	this.onMouseMove,  true);
	this.interactionDOMElement.addEventListener('mousedown',	this.onMouseDown,  true);
	this.interactionDOMElement.addEventListener('mouseout',	 this.onMouseOut,   true);

	window.addEventListener('mouseup', this.onMouseUp, true);

	this.eventsAdded = true;
};

InteractionManager.prototype.removeEvents = function ()
{
	if (!this.interactionDOMElement)
	{
		return;
	}

	this.interactionDOMElement.removeEventListener('mousemove', this.onMouseMove, true);
	this.interactionDOMElement.removeEventListener('mousedown', this.onMouseDown, true);
	this.interactionDOMElement.removeEventListener('mouseout',  this.onMouseOut, true);

	this.interactionDOMElement = null;

	window.removeEventListener('mouseup',  this.onMouseUp, true);

	this.eventsAdded = false;
};

InteractionManager.prototype.onMouseMove = function (event)
{
	var now = Date.now();
	if (now - this.lastmove < 16) return;
	this.lastmove = now;
	this.mouse.set(event.clientX, event.clientY);

	var over = null;
	this.visitChildren(function(item){
		if (item.mousemove)
		{
			item.mousemove(this.mouse);
		}
		if (!over && (item.mouseover || item.mouseout) && this.hitTest(item, this.mouse))
		{
			over = item;
		}
	});
	if (over !== this.over)
	{
		if (this.over && this.over.mouseout)
		{
			this.over.mouseout(this.mouse);
		}
		this.over = over;
		if (this.over && this.over.mouseover)
		{
			this.over.mouseover(this.mouse);
		}
	}
};

InteractionManager.prototype.onMouseDown = function (event)
{
	var isRightButton = event.button === 2 || event.which === 3;
	var downFunction = isRightButton ? 'rightdown' : 'mousedown';
	var clickFunction = isRightButton ? 'rightclick' : 'click';
	var upOutsideFunction = isRightButton ? 'rightupoutside' : 'mouseupoutside';

	this.visitChildren(function(item){
		if (item[downFunction] || item[clickFunction] || item[upOutsideFunction])
		{
			var hit = this.hitTest(item, this.mouse);

			if (hit)
			{
				//call the function!
				if (item[downFunction])
				{
					item[downFunction](this.mouse);
				}
				this.down = item;
				return true;
			}
		}
	});
};

InteractionManager.prototype.onMouseOut = function (event)
{
	if (this.over)
	{
		if (this.over.mouseout)
		{
			this.over.mouseout(this.mouse);
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

	var up = this.visitChildren(function(item){
		if (item[upFunction] || item[clickFunction] || item[upOutsideFunction])
		{
			if (this.hitTest(item, this.mouse))
			{
				if (item[upFunction])
				{
					item[upFunction](this.mouse);
				}
				return item;
			}
		}
	});
	if (this.down)
	{
		var ev = up === this.down ? clickFunction : upOutsideFunction;
		if (this.down[ev])
		{
			this.down[ev](this.mouse);
		}
	}
	this.down = null;
};

InteractionManager.prototype.hitTest = function (item, global)
{
	if (!item.worldVisible)
	{
		return false;
	}

	// map the global point to local space.
	item.worldTransform.applyInverse(global,  this._tempPoint);

	var x = this._tempPoint.x,
		y = this._tempPoint.y,
		i;

	//a sprite or display object with a hit area defined
	if (item.hitArea && item.hitArea.contains)
	{
		return item.hitArea.contains(x, y);
	}
	// a sprite with no hitarea defined
	else if (item instanceof PIXI.Sprite)
	{
		var width = item.texture.frame.width;
		var height = item.texture.frame.height;
		var x1 = -width * item.anchor.x;
		var y1;

		if (x > x1 && x < x1 + width)
		{
			y1 = -height * item.anchor.y;

			if (y > y1 && y < y1 + height)
			{
				// set the target property if a hit is true!
				return true;
			}
		}
	}
	else if (item instanceof PIXI.Graphics)
	{
		var graphicsData = item.graphicsData;
		for (i = 0; i < graphicsData.length; i++)
		{
			var data = graphicsData[i];
			// only deal with fills..
			if (data.fill && data.shape && data.shape.contains(x, y))
			{
				return true;
			}
		}
	}

	var length = item.children.length;

	for (i = 0; i < length; i++)
	{
		var tempItem = item.children[i];
		var hit = this.hitTest(tempItem, global);
		if (hit)
		{
			return true;
		}
	}
	return false;
};