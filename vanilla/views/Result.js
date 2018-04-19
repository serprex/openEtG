var px = require("../px");
module.exports = function(game){
	var dom = [
		[10, 290, game.ply + " plies\n" + (game.time/1000).toFixed(1) + " seconds"],
		[412, 440, ["Exit", require("./Editor")]]
	];

	if (game.winner == game.player1){
		var tinfo = px.domText("You won!");
		tinfo.style.textAlign = "center";
		tinfo.style.width = "900px";
		dom.push([0, 250, tinfo]);
	}
	px.refreshRenderer({rdom:dom});
}