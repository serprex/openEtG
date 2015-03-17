// From PIXI
function ColorMatrixFilter()
{
    PIXI.AbstractFilter.call(this, null,
		"precision mediump float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform mat4 matrix;void main(void){gl_FragColor = texture2D(uSampler, vTextureCoord).gbra;}");
}

ColorMatrixFilter.prototype = Object.create(PIXI.AbstractFilter.prototype);
ColorMatrixFilter.prototype.constructor = ColorMatrixFilter;
module.exports = ColorMatrixFilter;