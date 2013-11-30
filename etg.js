function loadcards(cb){
	var Cards = {}
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"]
	for(var i=0; i<names.length; i++){
		var xhr = new XMLHttpRequest();
		xhr.open("GET",names[i] + ".csv",true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200){
				var csv = xhr.responseText.split("\n");
				var keys = csv[0].split(",");
				for(var j=1; j<csv.length; j++){
					var card = {type: i};
					var carddata = csv[j].split(",");
					for(var k=0; k<carddata.length; k++)card[keys[k].toLowerCase()] = carddata[k];
					Cards[carddata[1] in Cards?carddata[1]+"Up":carddata[1]] = Cards[carddata[2]] = card;
				}
			}
		}
		xhr.send();
	}
	cb(Cards);
}