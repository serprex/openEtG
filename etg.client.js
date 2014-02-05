function loadcards(cb){
	var Cards = {};
	var CardCodes = {};
	var Targeting = {};
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	var count = 0;
	function maybeCallback(){
		if (++count == names.length+1)cb(Cards, CardCodes, Targeting);
	}
	for(var i=0; i<names.length; i++){
		(function(_i){
			var xhr = new XMLHttpRequest();
			xhr.open("GET", names[_i] + ".csv", true);
			xhr.onreadystatechange = function() {
				if (this.readyState == 4 && this.status == 200){
					var csv = this.responseText.split("\n");
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
						if(cardcode in CardCodes){
							console.log(cardcode + " duplicate");
						}
						Cards[nospacename in Cards?nospacename+"Up":nospacename] = CardCodes[cardcode] = new Card(_i, cardinfo);
					}
					maybeCallback();
				}
			}
			xhr.send();
		})(i);
	}
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "active.csv", true);
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200){
			var csv = this.responseText.split("\n");
			for (var i=0; i<csv.length; i++){
				var keypair = csv[i].split(",");
				Targeting[keypair[0]] = getTargetFilter(keypair[1]);
			}
			maybeCallback();
		}
	}
	xhr.send();
}