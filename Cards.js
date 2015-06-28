"use strict";
exports.loaded = false;
exports.Targeting = {};
exports.Codes = {};
exports.loadcards = function(cb, loadfunc){
	if (exports.loaded) cb(exports);
	var count = 0, names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	function maybeLoaded(){
		if (++count == names.length+1){
			exports.loaded = true;
			console.log("Cards loaded");
			if (cb) cb();
		}
	}
	names.forEach(function(name, i){
		loadfunc(name + ".csv", function(text){
			parseCsv(i, text);
			maybeLoaded();
		});
	});
	loadfunc("active.csv", function(text){
		parseTargeting(text);
		maybeLoaded();
	});
}
var etg = require("./etg");
var Actives = require("./Actives");
var etgutil = require("./etgutil");
function parseCsv(type, file){
	var keys;
	etg.iterSplit(file, "\n", function(line){
		if (!keys){
			keys = line.split(",")
		}else{
			var cardinfo = {}, nth = 0;
			etg.iterSplit(line, ",", function(value){
				cardinfo[keys[nth++]] = value;
			});
			var cardcode = cardinfo.Code;
			if (cardcode in exports.Codes){
				console.log(cardcode + " duplicate " + cardinfo.Name + " " + exports.Codes[cardcode].name);
			}else{
				exports.Codes[cardcode] = new etg.Card(type, cardinfo);
				if (cardcode < "6qo") exports[cardinfo.Name.replace(/\W/g, "")] = exports.Codes[cardcode];
				cardinfo.Code = etgutil.asShiny(cardcode, true);
				exports.Codes[cardinfo.Code] = new etg.Card(type, cardinfo);
			}
		}
	});
}
function parseTargeting(file){
	etg.iterSplit(file, "\n", function(line){
		var cidx = line.indexOf(",");
		exports.Targeting[line.substr(0, cidx)] = getTargetFilter(line.substr(cidx+1));
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
		return t.isMaterial(etg.Permanent) && t.card.type == etg.PillarEnum;
	},
	weap:function(c, t){
		return (t instanceof etg.Weapon || (t instanceof etg.Creature && t.card.type == etg.WeaponEnum)) && !t.status.immaterial && !t.status.burrowed;
	},
	shie:function(c, t){
		return (t instanceof etg.Shield || (t instanceof etg.Creature && t.card.type == etg.ShieldEnum)) && !t.status.immaterial && !t.status.burrowed;
	},
	playerweap:function(c,t){
		return t instanceof etg.Weapon && t == t.owner.weapon;
	},
	perm:function(c, t){
		return t.isMaterial(etg.Permanent);
	},
	permnonstack:function(c,t){
		return t.isMaterial(etg.Permanent) && !t.status.stackable;
	},
	stack:function(c,t){
		return t.isMaterial(etg.Permanent) && t.status.stackable;
	},
	crea:function(c, t){
		return t.isMaterial(etg.Creature);
	},
	creaonly:function(c, t){
		return t.isMaterial(etg.Creature) && t.card.type == etg.CreatureEnum;
	},
	play:function(c, t){
		return t instanceof etg.Player;
	},
	notplay:function(c, t){
		return !(t instanceof etg.Player);
	},
	sing:function(c, t){
		return t.isMaterial(etg.Creature) && t.active.cast != Actives.sing;
	},
	butterfly:function(c, t){
		return (t instanceof etg.Creature || t instanceof etg.Permanent) && !t.status.immaterial && !t.status.burrowed && ((t.trueatk && t.trueatk()<3) || (t instanceof etg.Creature && t.truehp()<3));
	},
	devour:function(c, t){
		return t.isMaterial(etg.Creature) && t.truehp()<c.truehp();
	},
	paradox:function(c, t){
		return t.isMaterial(etg.Creature) && t.truehp()<t.trueatk();
	},
	forceplay:function(c, t){
		return t instanceof etg.CardInstance || (t.isMaterial() && t.active.cast);
	},
	airbornecrea:function(c, t){
		return t.isMaterial(etg.Creature) && t.status.airborne;
	},
	golem:function(c, t){
		return t.isMaterial() && t.status.golem;
	},
	groundcrea:function(c, t){
		return t.isMaterial(etg.Creature) && !t.status.airborne;
	},
	wisdom:function(c, t){
		return (t instanceof etg.Creature || t instanceof etg.Weapon) && !t.status.burrowed;
	},
	quinttog:function(c, t){
		return t instanceof etg.Creature && !t.status.burrowed;
	},
};