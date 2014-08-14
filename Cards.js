"use strict";
exports.loaded = false;
exports.Targeting = {};
exports.Codes = {};
var etg = require("./etg");
var etgutil = require("./etgutil");
exports.parseCsv = function(type, file){
	var csv = file.split("\n");
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
		if (cardcode in exports.Codes){
			console.log(cardcode + " duplicate " + carddata[1] + " " + exports.Codes[cardcode].name);
		}else{
			var nospacename = carddata[1].replace(/ |'/g, "");
			exports[nospacename in exports?nospacename+"Up":nospacename] = exports.Codes[cardcode] = new etg.Card(type, cardinfo);
			cardinfo.Code = etgutil.asShiny(cardcode, true);
			(exports.Codes[cardinfo.Code] = new etg.Card(type, cardinfo)).shiny = true;
		}
	}
}
exports.parseTargeting = function(file){
	var csv = file.split("\n");
	csv.forEach(function(line){
		var keypair = line.split(",");
		exports.Targeting[keypair[0]] = getTargetFilter(keypair[1]);
	});
}
function getTargetFilter(str){
	function getFilterFunc(funcname){ return TargetFilters[funcname]; }
	if (str in TargetFilters){
		return TargetFilters[str];
	}else{
		var splitIdx = str.lastIndexOf(":");
		var prefixes = ~splitIdx ? str.substr(0, splitIdx).split(":").map(getFilterFunc) : [],
			filters = (~splitIdx ? str.substr(splitIdx+1) : str).split("+").map(getFilterFunc);
		return TargetFilters[str] = function(c, t){
			function check(f){ return f(c, t); }
			return prefixes.every(check) && filters.some(check);
		}
	}
}
var TargetFilters = {
	own:function(c, t){
		return c.owner == t.owner;
	},
	foe:function(c, t){
		return c.owner != t.owner
	},
	notself:function(c, t){
		return c != t;
	},
	all:function(c, t){
		return true;
	},
	card:function(c, t){
		return c != t && t instanceof etg.CardInstance;
	},
	pill:function(c, t){
		return t.isMaterialInstance(etg.Pillar);
	},
	weap:function(c, t){
		return (t instanceof etg.Weapon || (t instanceof etg.Creature && t.card.type == etg.WeaponEnum)) && !t.status.immaterial && !t.status.burrowed;
	},
	playerweap:function(c,t){
		return t instanceof etg.Weapon && t == t.owner.weapon;
	},
	perm:function(c, t){
		return t.isMaterialInstance(etg.Permanent);
	},
	permnonstack:function(c,t){
		return t.isMaterialInstance(etg.Permanent) && !t.status.stackable;
	},
	crea:function(c, t){
		return t.isMaterialInstance(etg.Creature);
	},
	creaonly:function(c, t){
		return t.isMaterialInstance(etg.Creature) && t.card.type == etg.CreatureEnum;
	},
	creanonspell:function(c, t){
		return t.isMaterialInstance(etg.Creature) && t.card.type != etg.SpellEnum;
	},
	play:function(c, t){
		return t instanceof etg.Player;
	},
	butterfly:function(c, t){
		return (t instanceof etg.Creature || t instanceof etg.Permanent) && !t.status.immaterial && !t.status.burrowed && ((t.trueatk && t.trueatk()<3) || (t instanceof etg.Creature && t.truehp()<3));
	},
	devour:function(c, t){
		return t.isMaterialInstance(etg.Creature) && t.truehp()<c.truehp();
	},
	paradox:function(c, t){
		return t.isMaterialInstance(etg.Creature) && t.truehp()<t.trueatk();
	},
	airbornecrea:function(c, t){
		return t.isMaterialInstance(etg.Creature) && t.status.airborne;
	},
	groundcrea:function(c, t){
		return t.isMaterialInstance(etg.Creature) && !t.status.airborne;
	},
	wisdom:function(c, t){
		return (t instanceof etg.Creature || t instanceof etg.Weapon) && !t.status.burrowed;
	}
};