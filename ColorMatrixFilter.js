// From PIXI
function ColorMatrixFilter(matrix)
{
    PIXI.AbstractFilter.call(this,
        // vertex shader
        null,
        // fragment shader
        "precision mediump float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform mat4 matrix;void main(void){gl_FragColor = texture2D(uSampler, vTextureCoord) * matrix;}",
        // custom uniforms
        {
            matrix: { type: 'mat4', value: matrix }
        }
    );
}

ColorMatrixFilter.prototype = Object.create(PIXI.AbstractFilter.prototype);
ColorMatrixFilter.prototype.constructor = ColorMatrixFilter;
module.exports = ColorMatrixFilter;

Object.defineProperties(ColorMatrixFilter.prototype, {
    matrix: {
        get: function ()
        {
            return this.uniforms.matrix.value;
        },
        set: function (value)
        {
            this.uniforms.matrix.value = value;
        }
    }
});
