"use strict";
exports.Codes = [];
exports.Targeting = null;
exports.loadcards = function(){
	require("./Cards.json").forEach(function(cards, type){
		if (type == 6) parseTargeting(cards);
		else parseCsv(type, cards);
	});
}
exports.codeCmp = function(x, y){
	var cx = exports.Codes[etgutil.asShiny(x, false)], cy = Cards.Codes[etgutil.asShiny(y, false)];
	return cx.upped - cy.upped || cx.element - cy.element || cx.cost - cy.cost || cx.type - cy.type || (cx.code > cy.code) - (cx.code < cy.code) || (x > y) - (x < y);
}
exports.cardCmp = function(x, y){
	return exports.codeCmp(x.code, y.code);
}
var filtercache = [];
exports.filter = function(upped, filter, cmp, showshiny){
	var cacheidx = (upped?1:0)|(showshiny?2:0);
	if (!(cacheidx in filtercache)){
		filtercache[cacheidx] = [];
		for (var key in exports.Codes){
			var card = exports.Codes[key];
			if (card.upped == upped && !card.shiny == !showshiny && !card.status.token){
				filtercache[cacheidx].push(card);
			}
		}
		filtercache[cacheidx].sort();
	}
	var keys = filtercache[cacheidx].filter(filter);
	if (cmp) keys.sort(cmp);
	return keys;
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
				exports.Codes[cardcode] = new Card(type, cardinfo);
				if (cardcode < 7000) exports[cardinfo.Name.replace(/\W/g, "")] = exports.Codes[cardcode];
				cardinfo.Code = etgutil.asShiny(cardcode, true);
				exports.Codes[cardinfo.Code] = new Card(type, cardinfo);
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
		return c != t && t.type == etg.SpellEnum;
	},
	pill:function(c, t){
		return t.isMaterial(etg.PillarEnum);
	},
	weap:function(c, t){
		return (t.type == etg.WeaponEnum || (t.type != etg.PlayerEnum && t.card.type == etg.WeaponEnum)) && !t.status.immaterial && !t.status.burrowed;
	},
	shie:function(c, t){
		return (t.type == etg.ShieldEnum || (t.type != etg.PlayerEnum && t.card.type == etg.ShieldEnum)) && !t.status.immaterial && !t.status.burrowed;
	},
	playerweap:function(c,t){
		return t.type == etg.WeaponEnum;
	},
	perm:function(c, t){
		return t.isMaterial(etg.PermanentEnum);
	},
	permnonstack:function(c,t){
		return t.isMaterial(etg.PermanentEnum) && !t.status.stackable;
	},
	stack:function(c,t){
		return t.isMaterial(etg.PermanentEnum) && t.status.stackable;
	},
	crea:function(c, t){
		return t.isMaterial(etg.CreatureEnum);
	},
	play:function(c, t){
		return t.type == etg.PlayerEnum;
	},
	notplay:function(c, t){
		return t.type != etg.PlayerEnum;
	},
	sing:function(c, t){
		return t.isMaterial(etg.CreatureEnum) && t.active.cast != c.active.cast;
	},
	notskele:function(c, t){
		return t.isMaterial(etg.CreatureEnum) && !t.card.isOf(exports.Skeleton);
	},
	butterfly:function(c, t){
		return (t.type == etg.CreatureEnum || t.type == etg.WeaponEnum) && !t.status.immaterial && !t.status.burrowed && (t.trueatk()<3 || (t.type == etg.CreatureEnum && t.truehp()<3));
	},
	devour:function(c, t){
		return t.isMaterial(etg.CreatureEnum) && t.truehp()<c.truehp();
	},
	paradox:function(c, t){
		return t.isMaterial(etg.CreatureEnum) && t.truehp()<t.trueatk();
	},
	forceplay:function(c, t){
		return t.type == etg.SpellEnum || (t.isMaterial() && t.active.cast);
	},
	airbornecrea:function(c, t){
		return t.isMaterial(etg.CreatureEnum) && t.status.airborne;
	},
	golem:function(c, t){
		return t.status.golem && t.attack;
	},
	groundcrea:function(c, t){
		return t.isMaterial(etg.CreatureEnum) && !t.status.airborne;
	},
	wisdom:function(c, t){
		return (t.type == etg.CreatureEnum || t.type == etg.WeaponEnum) && !t.status.burrowed;
	},
	quinttog:function(c, t){
		return t.type == etg.CreatureEnum && !t.status.burrowed;
	},
};
var etg = require("./etg");
var Card = require("./Card");
var Player = require("./Player");
var etgutil = require("./etgutil");