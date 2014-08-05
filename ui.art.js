require("./etg.client").loadcards(function(Cards, CardCodes, Targeting) {
	var credits = [
		[["andretimpa", "http://andretimpa.deviantart.com"], ["Element Icons", "assets/esheet.png"], ["Rarity Icons", "assets/raritysheet.png"],
			["4sa", "4si", "4sk", "4sl", "4sm", "4sn", "4so", "4sp", "4sq", "4ss", "4st", "4su", "4vr", "55s", "6ub"]],
		[["artimies", "http://elementscommunity.org/forum/profile/?u=140"], ["593"]],
		[["Drake_XIV", "http://elementscommunity.org/forum/profile/?u=107"],
			["59b"]],
		[["jarozaoz", "http://elementscommunity.org/forum/profile/?u=6364"],
			["4t3", "4vn", "500", "532", "52s", "534", "55k", "568", "59c", "5c2", "5ff", "5fk", "5fe", "5io", "5le", "5lf", "5ls", "5la", "5li", "5oq", "5op", "5rh", "5s4", "5v8", "62c"]],
		[["mega plini", "http://elementscommunity.org/forum/profile/?u=202"], ["5ig"]],
		[["OdinVanguard", "http://elementscommunity.org/forum/profile/?u=232"],
			["4se", "4sf", "4t4", "4td", "4vf", "4vk", "4vo", "52i", "52m", "52o", "52p", "530", "55t", "565", "594", "5c5", "5cr", "5cs", "5f4", "5f6", "5fg", "5fj", "5i8", "5lq", "5oi", "5on", "5or", "5ri", "5ru", "5s1", "5up",
			"5ur", "5us", "5v0", "5v1", "61u", "623", "628", "629", "716"]],
		[["pepokish", "http://theowlettenest.com"],
			["52g", "58o", "5bv", "5f0", "5i4", "5ie", "5l8", "5lb", "5oj"]],
		[["Ravizant", "http://elementscommunity.org/forum/profile/?u=8037"], ["Element Icons", "assets/esheet.png"], ["Card Backgrounds", "assets/backsheet.png"],
			["4sc", "4vi", "4vj", "4vq", "4vt", "4vu", "50a", "50u", "53e", "542", "55q", "55v", "564", "56i", "576", "58q", "599", "59m", "5c3", "5cb", "5ce", "5cf", "5cg", "5cq", "5de", "5f3", "5fd", "5fi", "5fu", "5gi", "5ia",
			"5im", "5j2", "5jm", "5l9", "5m6", "5mq", "5ou", "5pa", "5pu", "5rq", "5se", "5t2", "5uq", "5uu", "5vi", "61p", "61q", "61v", "620", "627", "62m", "6u3", "77a", "77p", "7au", "7av", "7dj", "7e2", "7qa", "7ta", "809", "80a"]],
		[["serprex", "http://fiction.wikia.com/wiki/User:Serprex"], ["622", "62a"]],
		[["vrt", "http://vrt-designs.com"], ["Donation thread", "http://elementscommunity.org/forum/card-art/help-support-an-artist"],
			["4vc", "4ve", "4vh", "52t", "55l", "55o", "55r", "560", "562", "563", "591", "5c1", "5c9", "5f2", "5fc", "5i5", "5i7", "5ij", "5ll", "5oc", "5rk", "5rs", "5rt", "5uk", "5ul", "5um", "5ut", "5uv", "5v3", "61o", "61t", "624", "625", "626"]],
		[["willowdream", "http://willowdream.carbonmade.com"], ["Status Icons", "assets/statussheet.png"], ["Status Borders", "assets/statusborders.png"],
			["5fb", "5ib", "5il", "5iq", "5od", "5oe", "5ok", "5om", "5oo", "5os", "5p0", "5uo", "5v2", "7gr", "7h5"]],
	];
	var str = "<br>";
	for(var i=0; i<credits.length; i++){
		var credit = credits[i];
		for(var j=0; j<credit.length-1; j++){
			str += "<a href='"+credit[j][1]+"'>"+credit[j][0]+"</a>&emsp;";
		}
		var codes = credit[credit.length-1];
		if (codes.length){
			codes.sort();
			str += "<table><tr>";
			for(var j=0; j<codes.length; j++){
				var code=codes[j];
				str += "<td><a href='Cards/"+code+".png' onmouseover='document.getElementById(\"codeimg\").src=\"Cards/"+code+".png\"'>"+CardCodes[code].name+"</a></td>";
				if ((j&7)==7)str += "</tr><tr>";
			}
			str += "</tr></table><br>";
		}else str += "<br><br>";
	}
	document.getElementById("codecreds").innerHTML = str;
});