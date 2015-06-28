"use strict";
var etg = require("../etg");
var Cards = require("../Cards");
var Actives = require("../Actives");
var enableLogging = false, logbuff, logstack;
function logStart(){
	if (enableLogging){
		logbuff = {};
		logstack = [];
	}
}
function logEnd(){
	if (enableLogging){
		console.log(logbuff);
		logstack = logbuff = undefined;
	}
}
function logNest(x){
	if (enableLogging){
		logstack.push(logbuff);
		logbuff = logbuff[x] = {};
	}
}
function logNestEnd(x){
	if (enableLogging){
		logbuff = logstack.pop();
	}
}
function log(x, y){
	if (enableLogging){
		if (!(x in logbuff)){
			logbuff[x] = y;
		}else if (logbuff[x] instanceof Array){
			logbuff[x].push(y);
		}else{
			logbuff[x] = [logbuff[x], y];
		}
	}
}
function pillarval(c){
	return c instanceof etg.CardInstance?.1:Math.sqrt(c.status.charges);
}
var ActivesValues = Object.freeze({
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
	brawl:8,
	brew:4,
	brokenmirror:2,
	burrow:1,
	butterfly:12,
	catapult:6,
	chimera:4,
	clear:2,
	corpseexplosion:1,
	counter:3,
	countimmbur:1,
	cpower:4,
	darkness:1,
	deadalive:2,
	deathwish:1,
	deckblast:function(c){
		return c.owner.deck.length/2;
	},
	deja:4,
	deployblobs: function(c) {
		return 2+(c instanceof etg.CardInstance ? Math.min(c.card.attack, c.card.health) : Math.min(c.trueatk(), c.truehp()))/4;
	},
	destroy:8,
	destroycard:1,
	devour:function(c){
		return 2+(c instanceof etg.CardInstance?c.card.health:c.truehp());
	},
	drawcopy:1,
	disarm:function(c){
		return !c.owner.foe.weapon ? .1 : c.owner.foe.hand.length == 8 ? .5 : c.owner.foe.weapon.card.cost;
	},
	disfield:8,
	disshield:7,
	dive:function(c, ttatk){
		return c instanceof etg.CardInstance?c.card.attack:ttatk-(c.status.dive||0)/1.5;
	},
	divinity:3,
	drainlife:10,
	draft:1,
	dryspell:5,
	dshield:4,
	duality:4,
	earth:1,
	earthquake:4,
	eatspell:3,
	empathy:function(c){
		return c.owner.countcreatures();
	},
	enchant:6,
	endow:4,
	envenom:3,
	epidemic:4,
	epoch:2,
	evolve:2,
	feed:6,
	fickle:3,
	fire:1,
	firebolt:10,
	flatline:1,
	flyingweapon:7,
	foedraw:8,
	forceplay:2,
	fractal:function(c){
		return 9-c.owner.hand.length;
	},
	freeze:[3,3.5],
	fungusrebirth:1,
	gas:5,
	give:1,
	golemhit:function(c){
		var dmg = 0;
		for(var i=0; i<23; i++){
			var cr = c.owner.creatures[i];
			if (cr && cr.status.golem && !cr.status.delayed && !cr.status.frozen){
				var atk = getDamage(cr);
				if (atk > dmg) dmg = atk;
			}
		}
		return dmg;
	},
	gpull:function(c){
		return c instanceof etg.CardInstance || c != c.owner.gpull ? 2 : 0;
	},
	gpullspell:3,
	gratitude:4,
	grave:1,
	"growth 1":3,
	"growth 2":5,
	guard:4,
	halveatk:function(c){
		var atk;
		return c instanceof etg.CardInstance ? -c.card.attack/4 : ((atk = c.trueatk()) < 0)-(atk > 0);
	},
	hasten:function(c){
		return Math.min(c.owner.deck.length/4, 10);
	},
	hatch:3,
	heal:8,
	heatmirror:2,
	holylight:3,
	hope:2,
	icebolt:10,
	ignite:4,
	immolate:5,
	improve:6,
	inertia:2,
	infect:4,
	ink:3,
	innovation:3,
	integrity:4,
	jetstream:2.5,
	layegg:5,
	light:1,
	lightning:7,
	liquid:5,
	livingweapon:2,
	lobotomize:6,
	loot:2,
	luciferin:3,
	lycanthropy:4,
	mend:3,
	metamorph: 2,
	midas:6,
	mimic:3,
	miracle:function(c){
		return c.owner.maxhp/8;
	},
	mitosis:function(c){
		return 4+c.card.cost;
	},
	mitosisspell:6,
	momentum:2,
	mutation:4,
	neuro:function(c) {
		return c.owner.foe.neuro?evalactive(c, etg.parseActive("poison 1"))+.1:6;
	},
	neurofy:function(c) {
		return c.owner.foe.neuro?1:5;
	},
	nightmare:function(c){
		var val = 24-c.owner.foe.hand.length;
		c.owner.hand.forEach(function(inst){
			if (inst.card.isOf(Cards.Nightmare)) val /= 2;
		});
		return val;
	},
	nova:4,
	nova2:6,
	nullspell:4,
	nymph:7,
	ouija:3,
	overdrive:function(c){
		return c.truehp()-1;
	},
	overdrivespell:5,
	pacify:5,
	pairproduce:2,
	paleomagnetism:[4,5],
	pandemonium:3,
	pandemonium2:4,
	paradox:5,
	parallel:8,
	phoenix:3,
	photosynthesis:2,
	plague:5,
	platearmor:1,
	poisonfoe:1.4,
	"poison 1":2,
	"poison 2":3,
	"poison 3":4,
	powerdrain:6,
	precognition:1,
	predator:function(c, tatk){
		return !(c instanceof etg.CardInstance) && c.owner.foe.hand.length > 4 ? tatk + Math.max(c.owner.foe.hand.length-6, 1) : 1;
	},
	protectonce:2,
	protectall:4,
	purify:2,
	queen:7,
	quint:6,
	quinttog:7,
	rage:[5, 6],
	readiness: 3,
	rebirth:[5, 2],
	reducemaxhp: function(c, ttatk){
		return (c instanceof etg.Creature ? ttatk : c.card.attack)*5/3;
	},
	regenerate: 5,
	regeneratespell: 5,
	regrade:3,
	reinforce:.5,
	ren:5,
	rewind:6,
	ricochet:2,
	sadism:5,
	salvage:2,
	sanctuary:6,
	scarab:4,
	scramble:function(c){
		var a=0, fq=c.owner.foe.quanta;
		for(var i=1; i<13; i++){
			if (!fq[i])a++;
		}
		return a;
	},
	serendepity: 4,
	shadow: 5,
	shtriga:6,
	silence:1,
	singularity:-20,
	sinkhole:3,
	siphon:4,
	siphonactive:3,
	siphonstrength:4,
	skyblitz:10,
	snipe:7,
	sosa:6,
	soulcatch:2,
	spores:4,
	sskin:5,
	steal:6,
	steam:6,
	stoneform:1,
	"storm 2":6,
	"storm 3":12,
	swave:6,
	tempering:[2,3],
	throwrock:4,
	tick:function(c){
		return c instanceof etg.CardInstance ? 1 : 1+(c.maxhp-c.truehp())/c.maxhp;
	},
	tornado:9,
	trick:4,
	turngolem:function(c){
		return c instanceof etg.CardInstance ? 0 : c.status.storedpower/3;
	},
	upkeep: -.5,
	upload:3,
	vampire:function(c, ttatk){
		return (c instanceof etg.CardInstance?c.card.attack:ttatk)*.7;
	},
	virtue:function(c){
		return c instanceof etg.CardInstance ? (c.owner.foe.shield ? Math.min(c.owner.foe.shield.truedr(), c.card.attack) : 0) : (c.trueatk() - getDamage(c)) / 1.5;
	},
	virusplague:1,
	void:5,
	voidshell:function(c){
		return (c.owner.maxhp - c.owner.hp) / 10;
	},
	quantagift:4,
	web:1,
	wind:function(c){
		return c instanceof etg.CardInstance ? -2 : c.status.storedAtk/2 - 2;
	},
	wisdom:4,
	yoink:4,
	vengeance:2,
	vindicate:3,
	pillar:pillarval,
	pend:pillarval,
	pillmat:pillarval,
	pillspi:pillarval,
	pillcar:pillarval,
	absorber:5,
	blockwithcharge:function(c){
		return (c instanceof etg.CardInstance?c.card.status.charges:c.status.charges)/(1+c.owner.foe.countcreatures()*2);
	},
	cold:7,
	despair:5,
	evade100:function(c){
		return c.status?(c.status.charges == 0 && c.owner == c.owner.game.turn?0:1):1;
	},
	evade40:1,
	evade50:1,
	firewall:7,
	chaos:[8, 9],
	skull:5,
	slow:6,
	solar:function(c){
		var coq = c.owner.quanta[etg.Light];
		return 5-4*coq/(4+coq);
	},
	thorn:5,
	weight:5,
	wings:function(c){
		return c.status?(c.status.charges == 0 && c.owner == c.owner.game.turn?0:6):6;
	},
});
var statusValues = Object.freeze({
	airborne: 0.2,
	ranged: 0.2,
	voodoo: 1,
	swarm: 1,
	tunnel: 3,
	cloak: function(c) {
		return c.status?(c.status.charges == 0 && c.owner == c.owner.game.turn?0:4):0;
	},
	flooding: function(c) {
		return c.owner.foe.countcreatures() - 3;
	},
	patience: function(c) {
		return 1 + c.owner.countcreatures() * 2;
	},
	freedom: 5,
	reflect: 1
})

function getDamage(c){
	return damageHash[c.hash()] || 0;
}
function estimateDamage(c, freedomChance, wallCharges, wallIndex) {
	if (!c || c.status.frozen || c.status.delayed){
		return 0;
	}
	function estimateAttack(tatk){
		if (momentum) {
			return tatk;
		} else if ((fshactive == Actives.weight || fshactive == Actives.wings) && fshactive(c.owner.foe.shield, c)) {
			return 0;
		}else if (wallCharges[wallIndex]){
			wallCharges[wallIndex]--;
			return 0;
		}else return Math.max(tatk - dr, 0);
	}
	var tatk = c.trueatk(), fsh = c.owner.foe.shield, fshactive = fsh && fsh.active.shield;
	var momentum = !fsh || tatk <= 0 || c.status.momentum || c.status.psionic ||
		(c.status.burrowed && c.owner.permanents.some(function(pr){ return pr && pr.status.tunnel }));
	var dr = momentum ? 0 : fsh.truedr(), atk = estimateAttack(tatk);
	if (c.status.adrenaline) {
		var attacks = etg.countAdrenaline(tatk);
		while (c.status.adrenaline < attacks) {
			c.status.adrenaline++;
			atk += estimateAttack(c.trueatk());
		}
		c.status.adrenaline = 1;
	}
	if (!momentum){
		atk *= (fshactive == Actives.evade100 ? 0 : fshactive == Actives.evade50 ? .5 : fshactive == Actives.evade40 ? .6 : fshactive == Actives.chaos && fsh.card.upped ? .8 : 1);
	}
	if (!fsh && freedomChance && c.status.airborne){
		atk += Math.ceil(atk/2) * freedomChance;
	}
	if (c.owner.foe.sosa) atk *= -1;
	damageHash[c.hash()] = atk;
	return atk;
}
function calcExpectedDamage(pl, wallCharges, wallIndex) {
	var totalDamage = 0, stasisFlag = false, freedomChance = 0;
	for(var i=0; i<16; i++){
		var p;
		if ((p=pl.permanents[i]) && (p.status.charges !== 0)){
			if (p.status.stasis || p.status.patience){
				stasisFlag = true;
			}else if (p.status.freedom){
				freedomChance++;
			}
		}
		if ((p=pl.foe.permanents[i]) && p.status.stasis){
			stasisFlag = true;
		}
	}
	if (freedomChance){
		freedomChance = 1-Math.pow(.7, freedomChance);
	}
	if (pl.foe.shield && pl.foe.shield.hasactive("shield", "blockwithcharge")){
		wallCharges[wallIndex] = pl.foe.shield.status.charges;
	}
	if (!stasisFlag){
		pl.creatures.forEach(function(c){
			var dmg = estimateDamage(c, freedomChance, wallCharges, wallIndex);
			if (dmg && !(c.status.psionic && pl.foe.shield && pl.foe.shield.status.reflect)){
				totalDamage += dmg;
			}
		});
	}
	totalDamage += estimateDamage(pl.weapon, freedomChance, wallCharges, wallIndex);
	if (pl.foe.status.poison) totalDamage += pl.foe.status.poison;
	return totalDamage;
}

function evalactive(c, active, extra){
	var sum = 0;
	for(var i=0; i<active.activename.length; i++){
		var aval = ActivesValues[active.activename[i]];
		sum += aval === undefined?0:
			aval instanceof Function?aval(c, extra):
			aval instanceof Array?aval[c.card.upped?1:0]:aval;
	}
	return sum;
}

function checkpassives(c) {
	var score = 0, statuses = c.status;
	for (var status in statuses)
	{
		if (uniqueStatuses[status] && !(c instanceof etg.CardInstance)) {
			if (!uniquesActive[status]) {
				uniquesActive[status] = true;
			}
			else {
				continue;
			}
		}
		var sval = statusValues[status];
		score += sval === undefined ? 0 :
			sval instanceof Function ? sval(c) : sval;
	}
	return score;
}

var throttled = Object.freeze({"poison 1":true, "poison 2":true, "poison 3":true, neuro:true, regen:true, siphon:true});
function evalthing(c) {
	if (!c) return 0;
	var ttatk, hp, poison, score = 0;
	var isCreature = c instanceof etg.Creature, isWeapon = c instanceof etg.Weapon;
	var adrenalinefactor = c.status.adrenaline ? etg.countAdrenaline(c.trueatk()) : 1;
	if (isWeapon || isCreature){
		var delaymix = Math.max((c.status.frozen||0), (c.status.delayed||0))/adrenalinefactor, delayfactor = delaymix?1-Math.min(delaymix/5, .6):1;
	}else{
		var delaymix = 0, delayfactor = 1;
	}
	if (isCreature){
		hp = Math.max(c.truehp(), 0);
		poison = c.status.poison || 0;
		if (poison > 0){
			hp = Math.max(hp - poison*2, 0);
			if (c.status.aflatoxin) score -= 2;
		}else if (poison < 0){
			hp += Math.min(-poison, c.maxhp-c.hp);
		}
	}
	if (isWeapon || isCreature) {
		ttatk = getDamage(c);
		if (c.status.psionic && c.owner.foe.shield && c.owner.foe.shield.status.reflect) ttatk *= -1;
		score += c.trueatk()/20;
		score += ttatk*delayfactor;
	}else ttatk = 0;
	var throttlefactor = adrenalinefactor < 3 || (isCreature && c.owner.weapon && c.owner.weapon.status.nothrottle) ? adrenalinefactor : 2;
	for (var key in c.active) {
		var adrfactor = key in throttled ? throttlefactor : key == "disarm" ? 1 : adrenalinefactor;
		if (key == "hit"){
			score += evalactive(c, c.active.hit, ttatk)*(ttatk?1:c.status.immaterial?0:.3)*adrfactor*delayfactor;
		}else if(key == "auto"){
			if (!c.status.frozen){
				score += evalactive(c, c.active.auto, ttatk)*adrfactor;
			}
		}else if (key == "cast"){
			if (caneventuallyactive(c.castele, c.cast, c.owner)){
				score += evalactive(c, c.active.cast, ttatk) * delayfactor;
			}
		}else if (key != (isCreature ? "shield" : "owndeath")){
			score += evalactive(c, c.active[key]);
		}
	}
	score += checkpassives(c);
	if (isCreature){
		if (c.owner.gpull == c){
			score = (score + hp) * Math.log(hp)/4;
			if (c.status.voodoo) score += hp;
			if (c.active.shield && !delaymix){
				score += evalactive(c, c.active.shield);
			}
		}else score *= hp?(c.status.immaterial || c.status.burrowed ? 1.3 : 1+Math.log(Math.min(hp, 33))/7):.2;
	}else{
		score *= c.status.immaterial?1.35:1.25;
	}
	if (delaymix){ // TODO this is redundant alongside delayfactor
		var delayed = Math.min(delaymix*(c.status.adrenaline?.5:1), 12);
		score *= 1-(12*delayed/(12+delayed))/16;
	}
	log(c, score);
	return score;
}

function evalcardinstance(cardInst) {
	if (!cardInst) return 0;
	var c = cardInst.card;
	if (!caneventuallyactive(c.costele, c.cost, cardInst.owner)){
		return c.active.discard == Actives.obsession ? (c.upped?-7:-6) : 0;
	}
	var score = 0;
	if (c.type == etg.SpellEnum){
		score += evalactive(cardInst, c.active);
	} else {
		for (var key in c.active) {
			score += evalactive(cardInst, c.active[key]);
		}
		score += checkpassives(cardInst);
		if (c.type == etg.CreatureEnum){
			score += c.attack;
			var hp = Math.max(c.health, 0), poison = c.status.poison || 0;
			if (poison > 0){
				hp = Math.max(hp - poison*2, 0);
				if (c.status.aflatoxin) score -= 2;
			}else if (poison < 0){
				hp += Math.min(-poison, c.maxhp-c.hp);
			}
			score *= hp?(c.status.immaterial || c.status.burrowed ? 1.3 : 1+Math.log(Math.min(hp, 33))/7):.5;
		}else if (c.type == etg.WeaponEnum){
			score += c.attack;
			if (cardInst.owner.weapon || cardInst.owner.hand.some(function(cinst){ return cinst.card.type == etg.WeaponEnum })) score /= 2;
		}else if (c.type == etg.ShieldEnum){
			score += c.health*c.health;
			if (cardInst.owner.shield || cardInst.owner.hand.some(function(cinst){ return cinst.card.type == etg.ShieldEnum })) score /= 2;
		}
	}
	score *= !cardInst.card.cost ? .8 : (cardInst.canactive() ? .6 : .5) * (!cardInst.card.costele?1:.9+Math.log(1+cardInst.owner.quanta[cardInst.card.costele])/50);
	log(c, score);
	return score;
}

function caneventuallyactive(element, cost, pl){
	if (!cost || !element || pl.quanta[element] || !pl.mark || pl.mark == element) return true;
	return pl.permanents.some(function(pr){
		return pr && ((pr.card.type == etg.PillarEnum && (!pr.card.element || pr.card.element == element)) || (pr.active == Actives.locket && pr.status.mode == element));
	});
}

var uniqueStatuses = Object.freeze({flooding:"all", nightfall:"all", tunnel:"self", patience:"self", cloak:"self"});
var uniquesActive, damageHash;

module.exports = function(game) {
	logStart();
	if (game.winner){
		return game.winner==game.player1?99999999:-99999999;
	}
	if (game.player1.deck.length == 0 && game.player1.hand.length < 8){
		return -99999990;
	}
	var wallCharges = new Int32Array([0, 0]);
	damageHash = [];
	uniquesActive = {};
	var expectedDamage = calcExpectedDamage(game.player2, wallCharges, 0);
	if (expectedDamage > game.player1.hp){
		return Math.min(expectedDamage - game.player1.hp, 500)*-999;
	}
	if (game.player2.deck.length == 0){
		return 99999980;
	}
	expectedDamage = calcExpectedDamage(game.player1, wallCharges, 1); // Call to fill damageHash
	var gamevalue = expectedDamage > game.player2.hp ? 999 : 0;
	for (var j = 0;j < 2;j++) {
		for (var key in uniqueStatuses) {
			if (uniqueStatuses[key] == "self")
				uniquesActive[key] = undefined;
		}
		logNest(j);
		var pscore = wallCharges[j]*4, player = game.players(j);
		pscore += evalthing(player.weapon);
		pscore += evalthing(player.shield);
		logNest("creas");
		for (var i = 0; i < 23; i++) {
			pscore += evalthing(player.creatures[i]);
		}
		logNestEnd();
		logNest("perms");
		for (var i = 0; i < 16; i++) {
			pscore += evalthing(player.permanents[i]);
		}
		logNestEnd();
		logNest("hand");
		for (var i = 0; i < player.hand.length; i++) {
			pscore += evalcardinstance(player.hand[i]);
		}
		logNestEnd();
		// Remove this if logic is updated to call endturn
		if (player != game.turn && player.hand.length < 8 && player.deck.length > 0){
			var code = player.deck.pop();
			player.hand.push(new etg.CardInstance(code, player));
			pscore += evalcardinstance(player.hand[player.hand.length-1]);
			player.hand.pop();
			player.deck.push(code);
		}
		pscore += Math.min(8-player.hand.length, player.drawpower)*2;
		pscore += Math.sqrt(player.hp)*4;
		if (player.status.poison) pscore -= player.status.poison;
		if (player.precognition) pscore += .5;
		if (!player.weapon) pscore += 1;
		if (!player.shield) pscore += 1;
		if (player.silence) pscore -= (player.hand.length+(player.hand.length>6?7:4))/4;
		if (player.flatline) pscore -= 1;
		if (player.neuro) pscore -= 5;
		log("Eval", pscore);
		logNestEnd();
		gamevalue += pscore*(j?-1:1);
	}
	log("Eval", gamevalue);
	logEnd();
	damageHash = uniquesActive = null;
	return gamevalue;
}
