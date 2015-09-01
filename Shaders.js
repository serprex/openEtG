exports.GBRA = function(renderer){
	return new PIXI.TextureShader(renderer.shaderManager,
		null, "precision mediump float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform mat4 matrix;void main(void){gl_FragColor=texture2D(uSampler,vTextureCoord).gbra;}",
		null, null);
}
exports.DarkGrayScale = function(renderer){
	return new PIXI.TextureShader(renderer.shaderManager,
		null, "precision mediump float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform mat4 matrix;void main(void){vec4 c=texture2D(uSampler,vTextureCoord);float gray=dot(c.rgb,vec3(0.14,0.3,0.6));gl_FragColor=vec4(gray,gray,gray,c.a);}",
		null, null);
}