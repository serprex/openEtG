var Cards = require("../Cards");
var infobox = document.getElementById("infobox");
document.getElementById("nameinput").addEventListener("keydown", printstat);
function printstat(e){
	if (e.keyCode != 13) return;
	var letter,
		hide = new Set(["pillar", "mark", "shard", "rare", "nymph"].filter(x => document.getElementById("hide"+x).checked)),
		ignore = function(name){return name};
	["Elite", "Improved", "Shard", "Mark"].forEach(function(x){
		if (document.getElementById("ignore"+x).checked){
			var oldignore = ignore;
			ignore = function(name){
				return oldignore(name).replace(new RegExp("^" + x + "( of)? "), "");
			}
		}
	});
	var upped = document.querySelector("input[name='upped']:checked").value;
	function cardfilter(card){
		if (ignore(card.name).charAt(0) != letter) return false;
		if (hide.has('pillar') && !card.type) return false;
		if (hide.has('mark') && card.name.match(/^Mark of /)) return false;
		if (hide.has('shard') && card.name.match(/^Shard of /)) return false;
		if (hide.has('rare') && (card.tier == 6 || card.tier == 8 || card.tier == 18)) return false;
		if (hide.has('nymph') && (card.tier == 15 || card.tier == 20)) return false;
		return true;
	}
	while (infobox.firstChild) infobox.firstChild.remove();
	var deck = [], letters = new Set();
	for(var i=0; i<this.value.length; i++){
		letter = this.value.charAt(i).toUpperCase();
		if (letters.has(letter)) continue;
		letters.add(letter);
		if (upped == "no" || upped == "both") Array.prototype.push.apply(deck, Cards.filter(false, cardfilter));
		if (upped == "yes" || upped == "both") Array.prototype.push.apply(deck, Cards.filter(true, cardfilter));
	}
	if (document.getElementById("sortele").checked) deck.sort(function(x,y){return x.element-y.element});
	for(var i=0; i<deck.length; i+=70){
		var img = document.createElement("img");
		img.src = "http://dek.im/deck/" + deck.slice(i, i+70).map(function(x){return x.code.toString(32)}).join(" ");
		infobox.appendChild(img);
	}
	if (!deck.length) infobox.appendChild(document.createTextNode("No matches"));
}

