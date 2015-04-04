// Modified/Simplified from PIXI's interaction manager
var over, down, DOMElement,
	mouse = new PIXI.math.Point(), _tempPoint = new PIXI.math.Point();
exports.init = function(stage, renderer)
{
	exports.stage = stage;
	DOMElement = renderer.view;

	DOMElement.addEventListener('mousemove', onMouseMove,  true);
	DOMElement.addEventListener('mousedown', onMouseDown,  true);
	DOMElement.addEventListener('mouseout',	 onMouseOut,   true);
	window.addEventListener('mouseup', onMouseUp, true);
}

exports.uninit = function(){
	if (!DOMElement)
	{
		return;
	}

	DOMElement.removeEventListener('mousemove', onMouseMove, true);
	DOMElement.removeEventListener('mousedown', onMouseDown, true);
	DOMElement.removeEventListener('mouseout',  onMouseOut,  true);
	window.removeEventListener('mouseup',  onMouseUp, true);

	exports.stage = DOMElement = null;
}

exports.hitTest = hitTest;
exports.mouse = mouse;
exports.stage = null;

function visitChildren(displayObject, visitFunc)
{
	if (!displayObject.interactive || !hitTest(displayObject)) return;
	var children = displayObject.children;
	for (var i = children.length - 1; i >= 0; i--)
	{
		var ret = visitChildren(children[i], visitFunc);
		if (ret)
		{
			return ret;
		}
	}
	return visitFunc(displayObject);
};

function onMouseMove(event)
{
	var rect = DOMElement.getBoundingClientRect();
	mouse.set(
		(event.clientX - rect.left) * (DOMElement.width / rect.width),
		(event.clientY - rect.top) * (DOMElement.height / rect.height));

	var newOver = null;
	visitChildren(exports.stage, function(item){
		if (item.mousemove)
		{
			item.mousemove();
		}
		if (!newOver && (item.mouseover || item.mouseout))
		{
			newOver = item;
		}
	});
	if (newOver !== over)
	{
		if (over && over.mouseout)
		{
			over.mouseout();
		}
		over = newOver;
		if (over && over.mouseover)
		{
			over.mouseover();
		}
	}
}

function onMouseDown(event)
{
	if (event.which != 1) return;
	visitChildren(exports.stage, function(item){
		if (item.mousedown || item.click || item.mouseupoutside)
		{
			//call the function!
			if (item.mousedown)
			{
				item.mousedown();
			}
			down = item;
			return true;
		}
	});
}

function onMouseOut(event)
{
	if (over)
	{
		if (over.mouseout)
		{
			over.mouseout();
		}
		over = null;
	}
}

function onMouseUp(event)
{
	if (event.which != 1) return;
	var up = visitChildren(exports.stage, function(item){
		if (item.mouseup || item.click || item.mouseupoutside)
		{
			if (item.mouseup)
			{
				item.mouseup();
			}
			return item;
		}
	});
	if (down)
	{
		var ev = up === down ? "click" : "mouseupoutside";
		if (down[ev])
		{
			down[ev]();
		}
	}
	down = null;
}

function hitTest(item, xy)
{
	if (!item.worldVisible) return false;
	if (!xy) xy = mouse;

	// map the global point to local space
	item.worldTransform.applyInverse(xy, _tempPoint);

	var x = _tempPoint.x, y = _tempPoint.y;

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
		return hitTest(child, xy);
	});
}