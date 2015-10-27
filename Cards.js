"use strict";
exports.Codes = [];
exports.Targeting = null;
exports.loadcards = function(){
	require("./Cards.json").forEach(function(cards, type){
		if (type == 6) parseTargeting(cards);
		else parseCsv(type, cards);
	});
}
function parseCsv(type, data){
	var keys = data[0], cardinfo = {};
	for(var i=1; i<data.length; i++){
		cardinfo.E = i-1;
		data[i].forEach(function(carddata){
			keys.forEach(function(key, i){
				cardinfo[key] = carddata[i];
			});
			var cardcode = cardinfo.Code;
			if (cardcode in exports.Codes){
				console.log(cardcode + " duplicate " + cardinfo.Name + " " + exports.Codes[cardcode].name);
			}else{
				exports.Codes[cardcode] = new etg.Card(type, cardinfo);
				if (cardcode < 7000) exports[cardinfo.Name.replace(/\W/g, "")] = exports.Codes[cardcode];
				cardinfo.Code = etgutil.asShiny(cardcode, true);
				exports.Codes[cardinfo.Code] = new etg.Card(type, cardinfo);
			}
		});
	}
}
function parseTargeting(data){
	for(var key in data){
		data[key] = getTargetFilter(data[key]);
	}
	exports.Targeting = data;
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
		return t.isMaterial(etg.Creature) && t.active.cast != c.active.cast;
	},
	notskele:function(c, t){
		return t.isMaterial(etg.Creature) && !t.card.isOf(exports.Skeleton);
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
		return t.status.golem && t.attack;
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
var etg = require("./etg");
var etgutil = require("./etgutil");