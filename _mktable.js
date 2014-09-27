"use strict";
require("./etg.server").loadcards();
var etg = require("./etg");
var write = process.stdout.write.bind(process.stdout);
function writetd(){
	write("[tr]");
	for(var i=0; i<arguments.length; i++)
		write("[td]"+arguments[i]+"[/td]");
	write("[/tr]");
}
write("[right][table]");
writetd("Tot", "Ele", "C", "P", "S", "/", "R", "U", "C");
for(var i=0; i<13; i++){
	var ofele = etg.filtercards(false, function(x){return x.element == i});
	writetd(
		ofele.length,
		etg.eleNames[i],
		ofele.filter(function(x){return x.type == etg.CreatureEnum}).length,
		ofele.filter(function(x){return x.type <= etg.PermanentEnum}).length,
		ofele.filter(function(x){return x.type == etg.SpellEnum}).length,
		"/",
		ofele.filter(function(x){return x.rarity == 3}).length,
		ofele.filter(function(x){return x.rarity == 2}).length,
		ofele.filter(function(x){return x.rarity == 1}).length);
}
write("[/table][/right]");