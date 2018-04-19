var px = require("../px");
var gfx = require("../gfx");
module.exports = function(){
	if (gfx.load){
		var loadingBar = document.createElement("span");
		loadingBar.style.backgroundColor = "#fff";
		loadingBar.style.height = "32px";
		gfx.load(function(progress){
			loadingBar.style.width = (progress*900) + "px";
		}, function(){
			require("./Editor")();
		});
		px.refreshRenderer({logdom:[0, 568, loadingBar]});
	}else return require("./Editor")();
}