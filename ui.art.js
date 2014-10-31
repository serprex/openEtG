"use strict";
require("./httpcards")(function() {
	var Cards = require("./Cards");
	var credits = [
		[["andretimpa", "http://andretimpa.deviantart.com"], ["Element Icons", "assets/esheet.png"], ["Rarity Icons", "assets/raritysheet.png"], ["Opening Music", "sound/openingMusic.ogg"],
			["4sa", "4si", "4sj", "4sk", "4sl", "4sm", "4sn", "4so", "4sp", "4sq", "4sr", "4ss", "4st", "4su", "4vr", "55k", "55s", "6ub"]],
		[["artimies", "http://elementscommunity.org/forum/profile/?u=140"], ["593"]],
		[["Cryotube", "http://cryotube.deviantart.com"],
			["566", "597", "5fe", "5lr"]],
		[["Hawanja", "http://hawanja.deviantart.com"], ["4vs"]],
		[["jarozaoz", "http://elementscommunity.org/forum/profile/?u=6364"],
			["4t3", "4vn", "532", "5le", "5op"]],
		[["kae", "http://willowdream.carbonmade.com"], ["Status Icons", "assets/statussheet.png"], ["Status Borders", "assets/statusborders.png"],
			["4sd", "4sg", "4tc", "501", "52l", "52q", "535", "536", "55u", "567", "56b", "58s", "598", "59b", "59c", "59d", "59e", "5bs", "5bu", "5c2", "5c4", "5c6", "5f5", "5fb", "5fk", "5fl", "5fm", "5fo", "5ib", "5il", "5io", "5iq", "5ld", "5lg", "5lj", "5ls", "5lt", "5od", "5oe", "5og",
			"5ok", "5om", "5oo", "5os", "5ov", "5p0", "5rg", "5rj", "5rr", "5s4", "5s8", "5uo", "5v2", "5v8", "5vf", "62b", "6rs", "7ae", "7ak", "77c", "7gr", "7h5", "7k0"]],
		[["mega plini", "http://elementscommunity.org/forum/profile/?u=202"], ["5ig"]],
		[["moomoose", "http://elementscommunity.org/forum/profile/?u=40"], ["5i6"]],
		[["OdinVanguard", "http://elementscommunity.org/forum/profile/?u=232"],
			["4se", "4sf", "4t4", "4t5", "4td", "4vf", "4vk", "4vo", "52i", "52m", "52o", "52p", "52s", "530", "538", "55t", "565", "594", "596", "5c5", "5cr", "5cs", "5f4", "5f6", "5ff", "5fg", "5fj", "5fn", "5i8", "5ii", "5ir", "5lq", "5lu", "5lv", "5oi", "5on", "5or", "5ri", "5ru", "5s1", "5s6", "5s7", "5up",
			"5ur", "5us", "5v0", "5v1", "5vc", "61u", "623", "628", "629", "62d", "716", "7e7"]],
		[["pepokish", "http://theowlettenest.com"],
			["52g", "58o", "5bv", "5f0", "5i4", "5ie", "5l8", "5lb", "5oj"]],
		[["Ravizant", "http://elementscommunity.org/forum/profile/?u=8037"], ["Element Icons", "assets/esheet.png"], ["Card Backgrounds", "assets/backsheet.png"],
			["4sc", "4tb", "4vp", "4vi", "4vj", "4vq", "4vt", "4vu", "50a", "50u", "52h", "52k", "52v", "53e", "542", "55q", "55v", "564", "56i", "576", "58p", "58q", "599", "59m", "5c3", "5cb", "5ce", "5cf", "5cg", "5cq", "5de", "5f3", "5f8", "5f9", "5fd", "5fi", "5fu", "5gi", "5ia",
			"5ih", "5ik", "5im", "5ip", "5j2", "5jm", "5l9", "5lc", "5lh", "5lp", "5m6", "5mq", "5oh", "5ou", "5pa", "5pu", "5rn", "5rq", "5se", "5t2", "5uq", "5uu", "5vi", "61p", "61q", "61v", "620", "627", "62m", "6rr", "6u3", "77a", "77p", "7au", "7av", "7dj", "7e2", "7k1", "7qa", "7ta", "809", "80a"]],
		[["serprex", "http://fiction.wikia.com/wiki/User:Serprex"], ["5rl", "5ro", "5rp", "5s0", "5va", "622", "62a"]],
		[["Thalas", "http://elementscommunity.org/forum/profile/?u=103"], ["5i9", "5if", "7dl"]],
		[["vrt", "http://vrt-designs.com"], ["Donation thread", "http://elementscommunity.org/forum/card-art/help-support-an-artist"],
			["4sb", "4vc", "4ve", "4vh", "52t", "55l", "55o", "55r", "560", "562", "563", "591", "5c0", "5c1", "5c9", "5f1", "5f2", "5fa", "5fc", "5i5", "5i7", "5id", "5ij", "5ll", "5oc", "5of", "5rk", "5rs", "5rt", "5uk", "5ul", "5um", "5ut", "5uv", "5v3", "61o", "61t", "624", "625", "626", "74a", "80g"]],
		[["NASA", "http://nasa.gov"], ["5p2"]],
		[["freeSFX", "http://www.freesfx.co.uk"],[]]
	];
	var table = document.createElement("table");
	credits.forEach(function(credit){
		var tr = document.createElement("tr");
		tr.className = "padtop";
		var x = 0;
		function incx(text, link){
			var td = document.createElement("td");
			var a = document.createElement("a");
			a.href = link;
			if (link.match(/\.png$/)) a.addEventListener("mouseover", function(){document.getElementById("codeimg").src=this.href;});
			a.appendChild(document.createTextNode(text));
			td.appendChild(a);
			tr.appendChild(td);
			if (++x == 9){
				table.appendChild(tr);
				tr = document.createElement("tr");
				tr.appendChild(document.createElement("td"));
				x = 1;
			}
		}
		for(var i=0; i<credit.length-1; i++){
			incx(credit[i][0], credit[i][1]);
		}
		var codes = credit[credit.length-1];
		if (codes.length){
			codes.sort();
			codes.forEach(function(code, i){
				incx(Cards.Codes[code].name, "Cards/"+code+".png");
			});
		}
		table.appendChild(tr);
	});
	document.body.insertBefore(table, document.getElementById("codeimg"));
});