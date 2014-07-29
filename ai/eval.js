"use strict";
var etg = require("./etg");
var Actives = require("./Actives");
var disableLogging = true;
function log(){
	if (!disableLogging){
		console.log.apply(console, arguments);
	}
}
var ActivesValues = {
	ablaze:3,
	accelerationspell:5,
	acceleration:function(c){
		return c.truehp()-2;
	},
	accretion:8,
	adrenaline:8,
	aflatoxin:5,
	aggroskele:2,
	air:1,
	alphawolf:function(c){
		return c instanceof etg.CardInstance?3:0;
	},
	animateweapon:4,
	antimatter:12,
	appease:function(c){
		return c instanceof etg.CardInstance?-6:c.status.appeased?0:c.trueatk()*-1.5;
	},
	bblood:7,
	blackhole:function(c){
		var a=0, fq=c.owner.foe.quanta;
		for(var i=1; i<13; i++){
			a += Math.min(fq[i], 3)/3;
		}
		return a;
	},
	bless:4,
	boneyard:3,
	bounce:function(c){
		return c.card.cost+(c.card.upped?1:0);
	},
	bravery:3,
	burrow:1,
	butterfly:4,
	catapult:6,
	chimera:4,
	clear:2,
	corpseexplosion:1,
	counter:3,
	cpower:4,
	darkness:1,
	deadalive:2,
	deja:4,
	deployblobs: function(c) {
		return 2+(c instanceof etg.CardInstance ? Math.min(c.card.attack, c.card.health) : Math.min(c.trueatk(), c.truehp()));
	},
	destroy:8,
	destroycard:1,
	devour:function(c){
		return 2+(c instanceof etg.CardInstance?c.card.health:c.truehp());
	},
	disarm:function(c){
		return !c.owner.foe.weapon ? .1 : c.owner.foe.hand.length == 8 ? .5 : c.owner.foe.weapon.card.cost;
	},
	disfield:8,
	disshield:7,
	dive:function(c, ttatk){
		return c instanceof etg.CardInstance?c.card.attack:ttatk-c.cast-(c.status.dive||0);
	},
	divinity:3,
	drainlife:10,
	draft:1,
	dryspell:5,
	dshield:4,
	duality:4,
	earth:1,
	earthquake:5,
	empathy:function(c){
		return c.owner.countcreatures();
	},
	enchant:6,
	endow:4,
	epidemic:4,
	evolve:2,
	fickle:3,
	fire:1,
	firebolt:10,
	flatline:1,
	flyingweapon:7,
	fractal:9,
	freeze:3,
	fungusrebirth:2,
	gas:5,
	give:1,
	gpull:2,
	gpullspell:3,
	gratitude:4,
	grave:4,
	growth:5,
	guard:4,
	hasten:function(c){
		return c.owner.deck.length/10;
	},
	hatch:3,
	heal:3,
	heal20:8,
	holylight:3,
	hope:2,
	icebolt:10,
	ignite:4,
	immolate:5,
	improve:6,
	infect:4,
	ink:3,
	innovation:3,
	integrity:4,
	layegg:5,
	light:1,
	lightning:7,
	liquid:5,
	livingweapon:2,
	lobotomize:6,
	luciferin:3,
	lycanthropy:4,
	metamorph: 2,
	mimic: 3,
	miracle:12,
	mitosis:function(c){
		return c.card.cost;
	},
	mitosisspell:6,
	momentum:2,
	mutation:4,
	neuro:function(c) {
		return c.owner.foe.neuro?evalactive(c, "poison")+.1:6;
	},
	neurofy:function(c) {
		return c.owner.foe.neuro?1:5;
	},
	nightmare:12,
	nova:6,
	nova2:6,
	nymph:7,
	ouija:3,
	overdrive:function(c){
		return c.truehp()-1;
	},
	overdrivespell:5,
	pacify:5,
	pandemonium:3,
	pandemonium2:4,
	paradox:5,
	parallell:7,
	phoenix:3,
	photosynthesis:2,
	plague:5,
	platearmor:1,
	poison:2,
	poison2:3,
	poison3:4,
	precognition:1,
	purify:4,
	queen:7,
	quint:6,
	rage:[5, 6],
	readiness: 4,
	rebirth:[5, 2],
	regenerate: 5,
	regeneratespell: 5,
	regrade:3,
	reinforce:4,
	ren:5,
	rewind:6,
	ricochet:3,
	sanctuary:6,
	scarab:4,
	scavenger:4,
	scramble:function(c){
		var a=0, fq=c.owner.foe.quanta;
		for(var i=1; i<13; i++){
			if (!fq[i])a++;
		}
		return a;
	},
	serendepity:4,
	silence:1,
	singularity:-20,
	sinkhole:3,
	siphon:5,
	siphonactive:6,
	siphonstrength:4,
	skyblitz:10,
	snipe:7,
	sosa:6,
	soulcatch:2,
	spores:4,
	sskin:5,
	steal:6,
	steam:6,
	stoneform:3,
	storm2:6,
	storm3:12,
	swave:6,
	tempering:3,
	throwrock:4,
	tick:function(c){
		return c instanceof etg.CardInstance ? 3 : c.maxhp - c.truehp();
	},
	unburrow:0,
	upkeep: -.5,
	upload:3,
	vampire:function(c, ttatk){
		return (c instanceof etg.CardInstance?c.card.attack:ttatk)*.7;
	},
	virusinfect:0,
	virusplague:1,
	void:5,
	quantagift:3,
	web:2,
	wisdom:4,
	yoink:4,
	pillar:function(c){
		return c instanceof etg.CardInstance?0:c.status.charges/4;
	},
	pend:function(c){
		return c instanceof etg.CardInstance?0:c.status.charges/4;
	},
	blockwithcharge:function(c){
		return c instanceof etg.CardInstance?c.card.status.charges:c.status.charges;
	},
	cold:7,
	despair:5,
	evade100:function(c){
		return c.status?(c.status.charges == 0 && c.owner == c.owner.game.turn?0:1):1;
	},
	evade40:1,
	evade50:1,
	firewall:7,
	chaos:9,
	skull:5,
	slow:6,
	solar:function(c){
		var coq = c.owner.quanta[etg.Light];
		return 6*coq/(6+coq);
	},
	thorn:5,
	weight:5,
	wings:function(c){
		return c.status?(c.status.charges == 0 && c.owner == c.owner.game.turn?0:6):6;
	}
}

function evalactive(c, active, extra){
	var aval = ActivesValues[active.activename];
	return aval === undefined?0:
		aval instanceof Function?aval(c, extra):
		aval instanceof Array?aval[c.card.upped?1:0]:aval;
}

function checkpassives(c){
	var score = 0;
	if (c.passives) {
		if (c.passives.airborne) score += 0.2;
		if (c.passives.voodoo) score += 1;
		if (c.passives.swarm) score += 1;
		if (c.passives.stasis) score += 5;
		if (c.passives.flooding) score += 3;
		if (c.passives.patience) score -= 4;
		if (c.passives.freedom) score += 6;
		if (c.passives.tunneling) score += 2;
		if (c.passives.reflect) score += 1;
	}
	return score;
}

function evalthing(c) {
	if (!c) return 0;
	var score = 0;
	var isCreature = c instanceof etg.Creature, isWeapon = c instanceof etg.Weapon;
	var delaymix = Math.max((c.status.frozen||0), (c.status.delayed||0));
	var ttatk;
	if (isWeapon || isCreature) {
		ttatk = c.estimateDamage();
		score += ttatk*(delaymix?1-Math.min(delaymix/5, .6):1);
	}else ttatk = 0;
	if (!etg.isEmpty(c.active)) {
		for (var key in c.active) {
			if (key == "hit"){
				if (!delaymix){
					score += evalactive(c, c.active.hit, ttatk)*(ttatk?1:c.status.immaterial?0:.3)*(c.status.adrenaline?2:1);
				}
			}else if(key == "auto"){
				if (!c.status.frozen){
					score += evalactive(c, c.active.auto)*(c.status.adrenaline?2:1);
				}
			}else if(key == "shield" && isCreature){
				if (!delaymix){
					score += evalactive(c, c.active.shield)*(c.owner.gpull == c?1:.2);
				}
			}else if (key == "cast"){
				if (!delaymix && caneventuallyactive(c.castele, c.cast, c.owner)){
					score += evalactive(c, c.active.cast, ttatk) - (c.usedactive?.02:0);
				}
			}else if (key != "owndeath" || isCreature){
				score += evalactive(c, c.active[key]);
			}
		}
	}
	score += checkpassives(c);
	if (isCreature){
		var hp = Math.max(c.truehp(), 0), poison = c.status.poison || 0;
		if (poison > 0){
			hp = Math.max(hp - poison, 0);
			if (c.status.aflatoxin) score -= 2;
		}else if (poison < 0){
			hp += Math.min(-poison, c.maxhp-c.hp);
		}
		score *= hp?(c.status.immaterial || c.status.burrowed ? 1.5 : 1+Math.log(Math.min(hp, 33))/7):.2;
	}else{
		score *= c.status.immaterial?2:1.5;
	}
	if (delaymix){
		var delayed = Math.min(delaymix*(c.status.adrenaline?.5:1), 12);
		score *= 1-(12*delayed/(12+delayed))/16;
	}
	log("\t" + c.card.name + " worth " + score);
	return score;
}

function evalcardinstance(cardInst) {
	var c = cardInst.card;
	if (!caneventuallyactive(cardInst.card.costele, cardInst.card.cost, cardInst.owner)){
		return cardInst.card.active && cardInst.card.active.discard == Actives.obsession ? -7 : -2;
	}
	var score = 0;
	if (c.type == etg.SpellEnum){
		score += evalactive(cardInst, c.active);
	} else {
		if (!etg.isEmpty(c.active)) {
			for (var key in c.active) {
				score += evalactive(cardInst, c.active[key]);
			}
		}
		if (c.type == etg.CreatureEnum){
			score += c.attack;
			var hp = Math.max(c.health, 0);
			if (c.status && c.status.poison > 0){
				score -= hp/c.status.poison;
			}
			score *= hp?(c.status && (c.status.immaterial || c.status.burrowed) ? 2 : Math.pow(Math.min(hp, 15), .3)):.2;
		}else if (c.type == etg.WeaponEnum){
			score += c.attack;
			if (cardInst.owner.weapon) score /= 2;
		}else if (c.type == etg.ShieldEnum){
			score += c.health*c.health;
			if (cardInst.owner.shield) score /= 2;
		}
		score += checkpassives(c);
	}
	score *= (cardInst.canactive() ? 0.6 : 0.5) * (!cardInst.card.cost || !cardInst.card.costele?1:(15+Math.min(cardInst.owner.quanta[cardInst.card.costele], 10))/30);
	log("\t:: " + c.name + " worth " + score);
	return score;
}

function caneventuallyactive(element, cost, pl){
	if (!cost || !element || pl.quanta[element] || pl.mark == element) return true;
	for (var i = 0; i < 16; i++) {
		if (pl.permanents[i] && pl.permanents[i].type == etg.PillarEnum && (!pl.permanents[i].element || pl.permanents[i].element == element))
			return true;
	}
	return false;
}

module.exports = function(game) {
	if (game.winner){
		return game.winner==game.player1?99999999:-99999999;
	}
	if (game.turn.foe.deck.length == 0){
		return game.turn == game.player1?99999990:-99999990;
	}
	var gamevalue = 0;
	for (var j = 0; j < 2; j++) {
		var pscore = 0, player = game.players[j];
		pscore += evalthing(player.weapon);
		pscore += evalthing(player.shield);
		for (var i = 0; i < 23; i++) {
			pscore += evalthing(player.creatures[i]);
		}
		for (var i = 0; i < 16; i++) {
			pscore += evalthing(player.permanents[i]);
		}
		for (var i = 0; i < player.hand.length; i++) {
			pscore += evalcardinstance(player.hand[i]);
		}
		// Remove this if logic is updated to call endturn
		if (player != game.turn && player.hand.length < 8 && player.deck.length > 0){
			var code = player.deck.pop();
			player.hand.push(new etg.CardInstance(code, player));
			pscore += evalcardinstance(player.hand[player.hand.length-1]);
			player.hand.pop();
			player.deck.push(code);
		}
		if (player.gpull) {
			pscore += player.gpull.truehp()/4 + (player.gpull.passives.voodoo ? 10 : 0) - player.gpull.trueatk();
		}
		pscore += Math.sqrt(player.hp)*4;
		if (player.isCloaked()) pscore += 4;
		if (player.status.poison) pscore -= player.status.poison;
		if (player.precognition) pscore += .5;
		if (!player.weapon) pscore += 1;
		if (!player.shield) pscore += 1;
		if (player.silence) pscore -= player.hand.length+1;
		if (player.flatline) pscore -= 1;
		if (player.neuro) pscore -= 5;
		log("\tpscore" + j + ": " + pscore);
		gamevalue += pscore*(j == 0?1:-1);
	}
	log("Eval " + gamevalue);
	return gamevalue;
}