var fs = require("fs");
var etg = require("./etg");
exports.loadcards = function(cb){
	var Cards = {}, CardCodes = {}, Targeting = {};
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	for(var i=0; i<names.length; i++){
		var csv = fs.readFileSync(names[i] + ".csv").toString().split("\n");
		var keys = csv[0].split(",");
		for(var j=1; j<csv.length; j++){
			var carddata = csv[j].split(",");
			var cardcode = carddata[2];
			var cardinfo = {};
			for(var k=0; k<carddata.length; k++){
				if (carddata[k].charAt(0) == '"'){
					for (var kk=k+1; kk<carddata.length; kk++){
						carddata[k] += "," + carddata[kk];
					}
					cardinfo[keys[k]] = carddata[k].substring(1, carddata[k].length-1).replace(/""/g, '"');
					break;
				}else{
					cardinfo[keys[k]] = carddata[k];
				}
			}
			var nospacename = carddata[1].replace(/ |'/g,"");
			Cards[nospacename in Cards?nospacename+"Up":nospacename] = CardCodes[cardcode] = new etg.Card(i, cardinfo);
		}
	}
	var csv = fs.readFileSync("active.csv").toString().split("\n");
	for (var i=0; i<csv.length; i++){
		var keypair = csv[i].split(",");
		Targeting[keypair[0]] = etg.getTargetFilter(keypair[1]);
	}
	cb(Cards, CardCodes, Targeting);
}