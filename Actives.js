var Effect = require("./Effect");
var etg = require("./etg");
function mutantactive(t){
	lobo(t);
	var abilities = ["hatch","freeze","burrow","destroy","steal","dive","heal","paradox","lycanthropy","scavenger","infect","gpull","devour","mutation","growth","ablaze","poison","deja","endow","guard","mitosis"];
	var index = t.owner.upto(abilities.length+2)-2;
	if (index<0){
		t.status[["momentum","immaterial"][~index]] = true;
	}else{
		var active = Actives[abilities[index]];
		if (active == Actives.scavenger){
			t.active.death = active;
		}else{
			t.active.cast = active;
			return true;
		}
	}
}
function lobo(t){
	// TODO deal with combined actives
	for (var key in t.active){
		if (!(t.active[key].activename in etg.passives)) delete t.active[key];
	}
}
var Actives = {
ablaze:function(c,t){
	Effect.mkText("2|0", c);
	c.atk += 2;
},
acceleration:function(c,t){
	Effect.mkText("2|-1", c);
	c.atk += 2;
	c.dmg(1, true);
},
accelerationspell:function(c,t){
	lobo(t);
	t.active.auto = Actives.acceleration;
},
accretion:function(c,t){
	Actives.destroy(c, t);
	c.buffhp(15);
	if (c.truehp() > 45){
		c.die();
		if (c.owner.hand.length < 8){
			new etg.CardInstance(Cards.BlackHole.asUpped(c.card.upped), c.owner).place();
		}
	}
},
accumulation:function(c,t){
	return c.status.charges;
},
adrenaline:function(c,t){
	Effect.mkText("Adrenaline", t);
	t.status.adrenaline = 1;
},
aflatoxin:function(c,t){
	Effect.mkText("Aflatoxin", t);
	t.addpoison(2);
	if (!(t instanceof etg.Player)){
		t.status.aflatoxin = true;
	}
},
aggroskele:function(c,t){
	var dmg = 0;
	new etg.Creature(Cards.Skeleton.asUpped(c.card.upped), c.owner).place();
	for (var i=0; i<23; i++){
		if (c.owner.creatures[i] && c.owner.creatures[i].card.isOf(Cards.Skeleton)){
			dmg += c.owner.creatures[i].trueatk();
		}
	}
	Effect.mkText("-"+dmg, t);
	t.dmg(dmg);
},
air:function(c,t){
	Effect.mkText("1:9", c);
	c.owner.spend(etg.Air, -1);
},
alphawolf: function (c, t) {
	new etg.Creature(Cards.PackWolf.asUpped(c.card.upped), c.owner).place();
	new etg.Creature(Cards.PackWolf.asUpped(c.card.upped), c.owner).place();
},
animateweapon: function(c, t) {
	var cr = new etg.Creature(t.card, t.owner);
	cr.atk = t.atk;
	cr.active = etg.clone(t.active);
	cr.cast = t.cast;
	cr.castele = t.castele;
	cr.status = etg.clone(t.status);
	cr.place();
	t.owner.weapon = undefined;
},
antimatter:function(c,t){
	Effect.mkText("Antimatter", t);
	t.atk -= t.trueatk(0, true)*2;
},
appease:function(c,t){
	Actives.devour(c, t);
	c.status.appeased = true;
},
axe:function(c,t){
	return c.owner.mark == etg.Fire || c.owner.mark == etg.Time?1:0;
},
axedraw:function(c,t){
	c.defstatus("dive", 0);
	if (c.status.dive < 4){
		c.status.dive++;
	}
},
bblood:function(c,t){
	Effect.mkText("0|20", t);
	t.buffhp(20);
	t.delay(6);
},
blackhole:function(c,t){
	if (!t.sanctuary){
		for (var q=1; q<13; q++){
			c.owner.dmg(-Math.min(t.quanta[q],3));
			t.quanta[q] = Math.max(t.quanta[q]-3,0);
		}
	}
},
bless:function(c,t){
	Effect.mkText("3|3", t);
	t.atk += 3;
	t.buffhp(3);
},
boneyard:function(c,t){
	if (!t.card.isOf(Cards.Skeleton)){
		new etg.Creature(Cards.Skeleton.asUpped(c.card.upped), c.owner).place();
	}
},
bow:function(c,t){
	return c.owner.mark == etg.Air || c.owner.mark == etg.Light?1:0;
},
bounce:function(c,t){
	if (c.owner.hand.length < 8) {
		new etg.CardInstance(c.card, c.owner).place();
		c.remove();
		return true;
	}
},
bravery:function(c,t){
	if (!c.owner.foe.sanctuary){
		for(var i=0; i<2 && c.owner.hand.length<8 && c.owner.foe.hand.length<8; i++){
			c.owner.drawcard();
			c.owner.foe.drawcard();
		}
	}
},
brokenmirror:function(c,t, fromhand){
	if (fromhand && t instanceof etg.Creature && c.owner != t.owner){
		new etg.Creature(Cards.Phantom.asUpped(c.card.upped), c.owner).place();
	}
},
burrow:function(c,t){
	c.status.burrowed = true;
	c.active.cast = Actives.unburrow;
	c.cast = 0;
},
butterfly:function(c,t){
	lobo(t);
	t.active.cast = Actives.destroy;
	t.cast = 3;
	t.castele = etg.Entropy;
},
catapult:function(c,t){
	Effect.mkText("Catapult", t);
	t.die();
	c.owner.foe.dmg(Math.ceil(t.truehp()*(t.frozen?150:100)/(t.truehp()+100)));
	if (t.status.poison){
		c.owner.foe.addpoison(t.status.poison);
	}
	if (t.status.frozen){
		c.owner.foe.freeze(3);
	}
},
chimera:function(c,t){
	var atk=0, hp=0;
	for(var i=0; i<23; i++){
		if (c.owner.creatures[i]){
			atk += c.owner.creatures[i].trueatk();
			hp += c.owner.creatures[i].truehp();
		}
	}
	var chim = new etg.Creature(c.card, c.owner);
	chim.atk = atk;
	chim.maxhp = hp;
	chim.hp = hp;
	chim.active = {};
	chim.status.momentum = true;
	c.owner.creatures = [chim];
	c.owner.creatures.length = 23;
	c.owner.gpull = chim;
},
clear:function(c,t){
	Effect.mkText("Clear", t);
	t.status.adrenaline = 0;
	t.status.poison = 0;
	delete t.status.aflatoxin;
	delete t.status.momentum;
	delete t.status.psion;
	if (t.status.delayed > 0){
		t.status.delayed--;
	}
	if (t.status.frozen > 0){
		t.status.frozen--;
	}
	t.dmg(-1);
},
corpseexplosion:function(c,t){
	function dmg1(c,t){ t.dmg(1); }
	t.die();
	c.owner.foe.masscc(c, dmg1, !c.card.upped);
	if (t.status.poisonous){
		c.owner.foe.addpoison(1);
	}
	if (t.status.poison){
		c.owner.foe.addpoison(t.status.poison);
	}
},
counter:function(c,t){
	if (!c.status.frozen && !c.status.delayed){
		t.dmg(c.trueatk());
	}
},
cpower:function(c,t){
	t.buffhp(c.owner.uptoceil(5));
	t.atk += c.owner.uptoceil(5);
},
cseed:function(c,t){
	if (t.card.isOf(Cards.Elf)){
		t.transform(Cards.FallenElf.asUpped(t.card.upped));
	}else{
		Actives[["drainlife", "firebolt", "freeze", "gpullspell", "icebolt", "infect", "lightning", "lobotomize", "parallel", "rewind", "snipe", "swave"][c.owner.upto(12)]](c, t);
	}
},
dagger:function(c,t){
	return (c.owner.mark == etg.Darkness||c.owner.mark == etg.Death) + c.owner.isCloaked();
},
darkness:function(c,t){
	c.owner.spend(etg.Darkness, -1);
},
deadalive:function(c,t){
	c.deatheffect(c.getIndex());
},
decrsteam:function(c){
	c.defstatus("steamatk", 0);
	if (c.status.steamatk > 0){
		c.atk--;
		c.status.steamatk--;
	}
},
deja:function(c,t){
	delete c.active.cast;
	Actives.parallel(c, c);
},
deployblobs:function(c,t){
	if (c.trueatk()>1 && c.truehp()>1){
		new etg.Creature(Cards.Blob.asUpped(c.card.upped), c.owner).place();
		new etg.Creature(Cards.Blob.asUpped(c.card.upped), c.owner).place();
		new etg.Creature(Cards.Blob.asUpped(c.card.upped), c.owner).place();
		c.atk -= 2;
		c.dmg(2);
	}
},
destroy:function(c,t, dontsalvage, donttalk){
	if (!donttalk){
		Effect.mkText("Destroy", t);
	}
	if (t.status.stackable){
		if(--t.status.charges<=0){
			t.die();
		}
	}else t.die();
	if (!dontsalvage){
		etg.salvageScan(c.owner, t);
	}
},
destroycard:function(c,t){
	if (!t.owner.sanctuary){
		t.remove();
	}
},
devour:function(c,t){
	Effect.mkText("1|1", c);
	c.buffhp(1);
	c.atk += 1;
	if (t.status.poisonous){
		c.addpoison(1);
	}
	t.die();
},
die:function(c,t){
	c.die();
},
disarm:function(c,t){
	if (t instanceof etg.Player && t.weapon && t.hand.length < 8){
		new etg.CardInstance(t.weapon.card, t).place();
		t.weapon = undefined;
	}
},
disc:function(c,t){
	return c.owner.mark == etg.Entropy || c.owner.mark == etg.Aether?1:0;
},
discping:function(c,t){
	t.dmg(1);
	c.die();
	new etg.CardInstance(c.card, c.owner).place();
},
disfield:function(c,t, dmg){
	if (!c.owner.spend(etg.Other, dmg)){
		for(var i=1; i<13; i++){
			c.owner.quanta[i] = 0;
		}
		c.owner.shield = undefined;
	}
	return true;
},
disshield:function(c,t, dmg){
	if (!c.owner.spend(etg.Entropy, Math.ceil(dmg/3))){
		c.owner.quanta[etg.Entropy] = 0;
		c.owner.shield = undefined;
	}
	return true;
},
dive:function(c,t){
	Effect.mkText("Dive", c);
	c.defstatus("dive", 0);
	c.status.dive = c.trueatk();
},
divinity:function(c,t){
	c.owner.maxhp += 8;
	c.owner.buffhp(16);
},
drainlife:function(c,t){
	c.owner.dmg(-t.spelldmg(2+Math.floor(c.owner.quanta[etg.Darkness]/5)));
},
draft:function(c,t){
	Effect.mkText("Draft", t);
	if((t.status.airborne = !t.status.airborne)){
		if (t.active.cast == Actives.burrow){
			delete t.active.cast;
		}
	}
},
dryspell:function(c,t){
	function dryeffect(c,t){
		c.spend(etg.Water, -t.dmg(1));
	}
	c.owner.foe.masscc(c.owner, dryeffect, true);
},
dshield:function(c,t){
	c.status.immaterial = true;
},
duality:function(c,t){
	if (c.owner.foe.deck.length > 0 && c.owner.hand.length < 8){
		new etg.CardInstance(c.owner.foe.deck[c.owner.foe.deck.length-1], c.owner).place();
	}
},
earth:function(c,t){
	Effect.mkText("1:4", c);
	c.owner.spend(etg.Earth, -1);
},
earthquake:function(c,t){
	Effect.mkText("Earthquake", t);
	if (t.status.charges>3){
		t.status.charges -= 3;
	}else{
		t.die();
	}
	etg.salvageScan(c.owner, t);
},
empathy:function(c,t){
	var healsum = c.owner.countcreatures();
	Effect.mkText("+"+healsum, c);
	c.owner.dmg(-healsum);
	if (!c.owner.spend(etg.Life, Math.floor(healsum/8))){
		c.owner.quanta[etg.Life] = 0;
		c.die();
	}
},
enchant:function(c,t){
	Effect.mkText("Enchant", t);
	t.status.immaterial = true;
},
endow:function(c,t){
	Effect.mkText("Endow", t);
	for (key in t.status) {
		if (typeof t.status[key] == "boolean")
			c.status[key] = c.status[key] || t.status[key]
		else if (typeof t.status[key] == "number")
			c.status[key] = t.status[key] + (c.status[key] ? c.status[key] : 0);
		else
			c.status[key] = t.status[key];
	}
 	if (c.status.adrenaline > 1)
		c.status.adrenaline = 1;
	c.active = etg.clone(t.active);
	c.cast = t.cast;
	c.castele = t.castele;
	if (c.active.cast && c.active.cast.activename == "endow") {
		delete c.active.cast;
	}
	c.atk += t.trueatk();
	if (t.active.buff){
		c.atk -= t.active.buff(t);
	}
	c.buffhp(2);
},
epidemic:function(c,t){
	if (t.status.poison){
		c.owner.foe.addpoison(t.status.poison);
	}
},
atk2hp:function(c,t){
	t.maxhp = t.hp = t.trueatk();
},
evolve:function(c,t){
	c.transform(Cards.Shrieker.asUpped(c.card.upped));
	delete c.status.burrowed;
},
fickle:function(c,t){
	if (t.owner != c.owner && t.owner.sanctuary){
		return;
	}
	var cards = [];
	for(var i=0; i<t.owner.deck.length; i++){
		var card = t.owner.deck[i];
		if (t.owner.canspend(card.costele, card.cost)){
			cards.push(i);
		}
	}
	if (cards.length > 0){
		var pick = t.owner.upto(cards.length);
		t.owner.hand[t.getIndex()] = new etg.CardInstance(t.owner.deck[cards[pick]], t.owner);
		t.owner.deck[cards[pick]] = t.card;
	}
},
fiery:function(c,t){
	return Math.floor(c.owner.quanta[etg.Fire]/5);
},
fire:function(c,t){
	Effect.mkText("1:6", c);
	c.owner.spend(etg.Fire, -1);
},
firebolt:function(c,t){
	t.spelldmg(3+Math.floor(c.owner.quanta[etg.Fire]/4));
	if (t instanceof etg.Player){
		if (t.weapon){
			t.weapon.status.frozen = 0;
		}
	}else{
		t.status.frozen = 0;
	}
},
flatline:function(c,t){
	if (!c.owner.foe.sanctuary){
		c.owner.foe.flatline = true;
	}
},
flyingweapon: function(c, t) {
	var cr = new etg.Creature(t.card, t.owner);
	cr.atk = t.atk;
	cr.active = etg.clone(t.active);
	cr.cast = t.cast;
	cr.castele = t.castele;
	cr.status = etg.clone(t.status);
	cr.status.airborne = true;
	cr.place();
	t.owner.weapon = undefined;
},
fractal:function(c,t){
	Effect.mkText("Fractal", t);
	c.owner.quanta[etg.Aether] = 0;
	for(var i=c.owner.hand.length; i<8; i++){
		c.owner.hand[i] = new etg.CardInstance(t.card, c.owner);
	}
},
freeze:function(c,t){
	Effect.mkText("Freeze", t);
	t.freeze(c.card.upped && c.card != Cards.PandemoniumUp ? 4 : 3);
},
fungusrebirth:function(c,t){
	c.transform(Cards.Fungus.asUpped(c.card.upped));
},
gaincharge2:function(c,t){
	c.status.charges += 2;
},
gainchargeowner:function(c,t){
	if (c.owner == t){
		c.status.charges++;
	}
},
gas:function(c,t){
	new etg.Permanent(Cards.UnstableGas.asUpped(c.card.upped), c.owner).place();
},
give:function(c,t){
	c.owner.dmg(c.card.upped?-10:-5);
	if (t instanceof etg.Creature){
		if (t.hasactive("auto", "singularity")){
			t.die();
		}else{
			t.remove();
			t.owner = c.owner.foe;
			t.place();
		}
	}else if (t instanceof etg.Permanent){
		Actives.steal(c.owner.foe, t);
	}else{
		t.remove();
		t.owner = c.owner.foe;
		t.place();
	}
},
gpull:function(c,t){
	Effect.mkText("Pull", c);
	c.owner.gpull = c;
},
gpullspell:function(c,t){
	if (t instanceof etg.Player){
		delete t.gpull;
	}else Actives.gpull(t);
},
gratitude:function(c,t){
	Effect.mkText("+4", c);
	c.owner.dmg(-4);
},
grave:function(c,t){
	delete c.status.burrowed;
	c.transform(t.card);
},
growth: function (c, t) {
    Effect.mkText("2|2", c)
	c.buffhp(2);
	c.atk += 2;
},
guard:function(c,t){
	Effect.mkText("Guard", t);
	c.delay(1);
	t.delay(1);
	if (!t.status.airborne){
		t.dmg(c.trueatk());
	}
},
halveatk: function(c, t) {
	t = t || c;
	var storedatk = Math.ceil(t.atk / 2);
	if (!t.status.storedAtk) t.status.storedAtk = 0;
	t.status.storedAtk += storedatk;
	t.atk -= storedatk;
},
hammer:function(c,t){
	return c.owner.mark == etg.Gravity||c.owner.mark == etg.Earth?1:0;
},
hasten:function(c,t){
	c.owner.drawcard();
},
hatch:function(c,t){
	Effect.mkText("Hatch", c);
	c.transform(c.owner.randomcard(c.card.upped, function(x){return x.type == etg.CreatureEnum}));
},
heal:function(c,t){
	t.dmg(-5);
},
heal20:function(c,t){
	t.dmg(-20);
},
heatmirror: function(c, t, fromhand) {
	if (fromhand && t instanceof etg.Creature && c.owner != t.owner) {
		new etg.Creature(Cards.Spark.asUpped(c.card.upped), c.owner).place();
	}
},
holylight:function(c,t){
	t.dmg(!(t instanceof etg.Player) && (t.card.element == etg.Darkness || t.card.element == etg.Death || t.status.nocturnal)?10:-10);
},
hope:function(c,t){
	var dr=0;
	for(var i=0; i<23; i++){
		if(c.owner.creatures[i] && c.owner.creatures[i].hasactive("auto", "light")){
			dr++;
		}
	}
	return dr;
},
icebolt:function(c,t){
	var bolts = Math.floor(c.owner.quanta[etg.Water]/5);
	t.spelldmg(2+bolts);
	if (c.owner.rng() < .35+bolts/20){
		t.freeze(3);
	}
},
ignite:function(c,t){
	c.die();
	c.owner.foe.spelldmg(20);
	c.owner.foe.masscc(c, function(c,x){x.dmg(1)}, true);
},
immolate:function(c,t){
	t.die();
	if (!t.hasactive("auto", "singularity")){
		for(var i=1; i<13; i++)
			c.owner.spend(i, -1);
		c.owner.spend(etg.Fire, -7);
	}
},
improve:function(c,t){
	Effect.mkText("Improve", t);
	t.transform(c.owner.randomcard(false, function(x){return x.type == etg.CreatureEnum}));
	t.buffhp(c.owner.upto(5));
	t.atk += c.owner.upto(5);
	if(mutantactive(t)){
		t.cast = c.owner.uptoceil(2);
		t.castele = t.card.element;
	}
},
infect:function(c,t){
	Effect.mkText("Infect", t);
	t.addpoison(1);
},
infest:function(c,t){
	new etg.Creature(Cards.MalignantCell, c.owner).place();
},
ink:function(c,t){
	var p=new etg.Permanent(Cards.Cloak, c.owner);
	p.status.charges = 1;
	p.place();
},
innovation:function(c,t){
	if (!t.owner.sanctuary){
		t.remove();
		for(var i=0; i<3; i++){
			t.owner.drawcard();
		}
	}
},
integrity:function(c,t){
	var activeType = ["auto", "hit", "buff", "death"];
	var shardTally = [0, 0, 0,0 , 1, 0, 0, 0, 0, 0, 0, 0, 0];
	var shardSkills = [
		[],
		["deadalive", "mutation", "paradox", "improve", "scramble", "antimatter"],
		["infect", "scavenger", "poison", "poison", "aflatoxin", "poison2"],
		["devour", "devour", "devour", "devour", "devour", "blackhole"],
		["burrow", "stoneform", "guard", "guard", "bblood", "bblood"],
		["growth", "adrenaline", "adrenaline", "adrenaline", "adrenaline", "mitosis"],
		["ablaze", "ablaze", "fiery", "destroy", "destroy", "rage"],
		["steam", "steam", "freeze", "freeze", "nymph", "nymph"],
		["heal", "endow", "endow", "luciferin", "luciferin", "luciferin"],
		["queen", "queen", "sniper", "dive", "gas", "gas"],
		["scarab", "scarab", "deja", "neuro", "precognition", "precognition"],
		["siphon", "vampire", "vampire", "liquid", "liquid", "steal"],
		["lobotomize", "lobotomize", "lobotomize", "quint", "quint", "quint"],
	];
	var shardCosts = {
		burrow:1, stoneform:1, guard:1, petrify:2,
		deadalive:1, mutation: 2, paradox: 2, improve: 2, scramble: -2, antimatter: 4,
		infection:1, scavenger: -4, poison: -2, aflatoxin: 2, poison2: -2,
		devour: 3, blackhole: 4,
		growth: 2, adrenaline: 2, mitosis: 4,
		ablaze: 1, fiery: -3, destroy: 3, rage: 2,
		steam: 2, freeze: 2, nymph: 4,
		heal: 1, endow: 2, luciferin: 4,
		queen: 2, sniper: 2, dive: 2, gas: 2,
		scarab: 2, deja: 4, neuro: -2, precognition: 2,
		siphon: -1, vampire: -2, liquid: 2, steal: 3,
		lobotomize: 2, quint: 2,
	};
	var stat=c.card.upped?1:0;
	for(var i=c.owner.hand.length-1; i>=0; i--){
		var card = c.owner.hand[i].card;
		if (card.status && card.status.shard){
			if (card.upped){
				stat++;
			}
			shardTally[card.element]++;
			c.owner.hand.splice(i, 1);
		}
	}
	var active = "burrow", num=0;
	for(var i=1; i<13; i++){
		stat += shardTally[i]*2;
		if (shardTally[i]>num){
			num = shardTally[i];
			active = shardSkills[i][num-1];
		}
	}
	var actives = {}, cost = shardCosts[active];
	actives[cost < 0 ? activeType[~cost] : "cast"] = Actives[active];
	var status = {};
	if (shardTally[etg.Air]>0){
		status.airborne = true;
	}
	if (shardTally[etg.Darkness]>0){
		status.voodoo = true;
	}
	if (shardTally[etg.Time]>0){
		status.swarm = true;
	}
	if (shardTally[etg.Life]>0){
		status.poisonous = true;
	}
	if (shardTally[etg.Gravity]>0){
		status.salvage = true;
	}
	if (shardTally[etg.Aether]>1){
		status.immaterial = true;
	}
	if (shardTally[etg.Gravity]>1){
		status.momentum = true;
	}
	if (shardTally[etg.Life]>0){
		status.adrenaline = 1;
	}
	c.owner.shardgolem = {
		stat: stat,
		status: status,
		active: actives,
		cast: cost
	};
	new etg.Creature(Cards.ShardGolem, c.owner).place();
},
layegg:function(c,t){
	new etg.Creature(Cards.FateEgg.asUpped(c.card.upped), c.owner).place();
},
light:function(c,t){
	Effect.mkText("1:8", c);
	c.owner.spend(etg.Light, -1);
},
lightning:function(c,t){
	Effect.mkText("-5", t);
	t.spelldmg(5);
},
liquid:function(c,t){
	Effect.mkText("Liquid", t);
	lobo(t);
	t.active.hit = Actives.vampire;
	t.addpoison(1);
},
livingweapon:function(c,t){
	if (c.owner == t.owner || !t.owner.weapon){
		var w = new etg.Weapon(t.card, t.owner);
		w.atk = t.atk;
		w.active = etg.clone(t.active);
		w.castele = t.castele;
		w.cast = t.cast;
		w.status = etg.clone(t.status);
		t.owner.weapon = w;
		t.remove();
	}
},
lobotomize:function(c,t){
	Effect.mkText("Lobotomize", t);
	lobo(t);
	delete t.status.momentum;
	delete t.status.psion;
},
losecharge:function(c,t){
	if(--c.status.charges<0){
		c.die();
	}
},
luciferin:function(c,t){
	c.owner.dmg(-10);
	c.owner.masscc(c, function(c,x){
		if (etg.isEmpty(x.active)){
			x.active.auto = Actives.light;
		}
	});
},
lycanthropy:function(c,t){
	Effect.mkText("5|5", c);
	c.buffhp(5);
	c.atk += 5;
	delete c.active.cast;
	c.status.nocturnal = true;
},
martyr:function(c,t){
	return c.maxhp-c.hp;
},
metamorph:function(c,t){
	c.owner.mark = t instanceof etg.Player?t.mark:t.card.element;
	c.owner.spend(c.owner.mark, -2);
},
mimic: function (c, t) {
	if (c != t && t instanceof etg.Creature) {
		c.transform(t.card);
		c.addactive("play", Actives.mimic);
	}
},
miracle:function(c,t){
	c.owner.quanta[etg.Light] = 0;
	if (c.owner.sosa){
		c.owner.hp = 1;
	}else if (c.owner.hp<c.owner.maxhp){
		c.owner.hp = c.owner.maxhp-1;
	}
},
mitosis:function(c,t){
	new etg.Creature(c.card, c.owner).place();
},
mitosisspell:function(c,t){
	t.active.cast = Actives.mitosis;
	t.castele = t.card.element;
	t.cast = t.card.cost;
	t.buffhp(1);
},
momentum:function(c,t){
	Effect.mkText("Momentum", t);
	t.atk += 1;
	t.buffhp(1);
	t.status.momentum = true;
},
mutant: function (c, t) {
	if (mutantactive(c)){
		c.cast = c.owner.uptoceil(2);
		c.castele = c.owner.upto(13);
	}
},
mutation:function(c,t){
	var rnd = c.owner.rng();
	if (rnd<.1){
		Effect.mkText("Death", t);
		t.die();
	}else if (rnd<(t.card.isOf(Cards.Abomination)?.9:.5)){
		Actives.improve(c, t);
	}else{
		Effect.mkText("Abomination", t);
		t.transform(Cards.Abomination);
	}
},
neuro:function(c,t){
	t.addpoison(1);
	if (t instanceof etg.Player){
		t.neuro = true;
	}
},
neuroify:function(c,t){
	if (c.owner.foe.status.poison){
		c.owner.foe.neuro = true;
	}
},
nightmare:function(c,t){
	if (!c.owner.foe.sanctuary){
		Effect.mkText("Nightmare", t);
		c.owner.dmg(-c.owner.foe.spelldmg(16-c.owner.foe.hand.length*2));
		for(var i = c.owner.foe.hand.length; i<8; i++){
			c.owner.foe.hand[i] = new etg.CardInstance(t.card, c.owner.foe);
		}
	}
},
nova:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.spend(i, -1);
	}
	c.owner.nova += 2;
	if (c.owner.nova >= 6){
		new etg.Creature(Cards.Singularity, c.owner).place();
	}
},
nova2:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.spend(i, -2);
	}
	c.owner.nova += 3;
	if (c.owner.nova >= 6){
		new etg.Creature(Cards.SingularityUp, c.owner).place();
	}
},
nymph:function(c,t){
	Effect.mkText("Nymph", t);
	var e = t.card.element || c.owner.uptoceil(12);
	Actives.destroy(c, t, false, true);
	new etg.Creature(CardCodes[etg.NymphList[e*2+(t.card.upped?1:0)]], t.owner).place();
},
obsession:function(c,t){
	t.dmg(c.card.upped?10:8);
},
ouija:function(c,t){
	if(!c.owner.foe.sanctuary && c.owner.foe.hand.length<8){
		new etg.CardInstance(Cards.OuijaEssence, c.owner.foe).place();
	}
},
overdrive:function(c,t){
	Effect.mkText("3|-1", c);
	c.atk += 3;
	c.dmg(1, true);
},
overdrivespell:function(c,t){
	lobo(t);
	t.active.auto = Actives.overdrive;
},
pacify:function(c,t){
	t.atk -= t.trueatk();
},
pandemonium:function(c,t){
	c.owner.foe.masscc(c, Actives.cseed, true);
},
pandemonium2:function(c,t){
	t.masscc(c, Actives.cseed);
},
paradox:function(c,t){
	Effect.mkText("Paradox", t);
	t.die();
},
parallel:function(c,t){
	Effect.mkText("Parallel", t);
	var copy = t.clone(c.owner);
	copy.place();
	if (copy.status.voodoo){
		c.owner.foe.dmg(copy.maxhp-copy.hp);
		if (copy.status.poison){
			c.owner.foe.addpoison(copy.status.poison);
		}
		if (c.owner.foe.weapon){
			if (copy.status.delayed){
				c.owner.foe.delay(copy.status.delayed);
			}
			if (copy.status.frozen>c.owner.foe.weapon.frozen){
				c.owner.foe.freeze(copy.status.frozen);
			}
		}
	}
},
phoenix:function(c,t, index){
	if (!c.owner.creatures[index]){
		c.owner.creatures[index] = new etg.Creature(Cards.Ash.asUpped(c.card.upped), c.owner);
	}
},
photosynthesis:function(c,t){
	Effect.mkText("2:5", c);
	c.owner.spend(etg.Life, -2);
	if (c.cast > 0){
		c.usedactive = false;
	}
},
plague:function(c,t){
	t.masscc(c, Actives.infect);
},
platearmor:function(c,t){
	var buff = c.card.upped?6:4;
	Effect.mkText("0|"+buff, t);
	t.buffhp(buff);
},
poison:function(c,t){
	(t || c.owner.foe).addpoison(1);
},
poison2:function(c,t){
	(t || c.owner.foe).addpoison(2);
},
poison3:function(c,t){
	(t || c.owner.foe).addpoison(3);
},
precognition:function(c,t){
	c.owner.drawcard();
	c.owner.precognition = true;
},
purify:function(c,t){
	t.status.poison = t.status.poison?Math.min(t.status.poison-2,-2):-2;
	if (t instanceof etg.Player){
		t.neuro = false;
		t.sosa = 0;
	}else{
		delete t.status.aflatoxin;
	}
},
queen:function(c,t){
	new etg.Creature(Cards.Firefly.asUpped(c.card.upped), c.owner).place();
},
quint:function(c,t){
	Effect.mkText("Immaterial", t);
	t.status.immaterial = true;
	t.status.frozen = 0;
},
randomdr: function(c, t) {
	if (c==t)
		c.dr = c.owner.upto(c.card.upped?4:3);
},
rage:function(c,t){
	var dmg = c.card.upped?6:5;
	Effect.mkText(dmg+"|-"+dmg, t);
	t.atk += dmg;
	t.dmg(dmg);
},
readiness:function(c,t){
	Effect.mkText("Ready", t);
	if (t.active.cast){
		t.cast = 0;
		t.usedactive = false;
	}
},
rebirth:function(c,t){
	c.transform(Cards.Phoenix.asUpped(c.card.upped));
},
regen:function(c,t){
	c.owner.status.poison--;
},
regenerate:function(c,t){
	Effect.mkText("+5", c);
	c.owner.dmg(-5);
},
regeneratespell:function(c,t){
	lobo(t);
	t.active.auto = Actives.regenerate;
	if (t instanceof etg.Permanent){
		t.status = {};
	}
},
regrade:function(c,t){
	t.card = t.card.asUpped(!t.card.upped);
	c.owner.spend(t.card.element, -2);
},
reinforce:function(c,t){
	var atk = c.trueatk(), hp = c.truehp()
	Effect.mkText(atk+"|"+hp, t);
	t.atk += atk;
	t.buffhp(hp);
	c.remove();
},
ren:function(c,t){
	if (!t.hasactive("predeath", "bounce")){
		Effect.mkText("Ren", t);
		t.addactive("predeath", Actives.bounce);
	}
},
reveal: function (c, t) {
	c.owner.precognition = true;
},
rewind:function(c,t){
	if (t.card.isOf(Cards.Skeleton)){
		Actives.hatch(t);
	}else if (t.card.isOf(Cards.Mummy)){
		t.transform(Cards.Pharaoh.asUpped(t.card.upped));
	}else{
		Effect.mkText("Rewind", t);
		t.remove();
		t.owner.deck.push(t.card);
	}
},
ricochet:function(c,t){
	var tgting = Targeting[t.card.active.activename];
	function tgttest(x){
		if (x && x != t) {
			if (tgting(t.owner, x)) tgts.push([x, t.owner]);
			if (tgting(t.owner.foe, x)) tgts.push([x, t.owner.foe]);
		}
	}
	if (tgting){
		var tgts = [];
		for(var i=0; i<2; i++){
			var pl=i==0?c.owner:c.owner.foe;
			for(var j=0; j<23; j++){
				tgttest(pl.creatures[j]);
			}
			for(var j=0; j<16; j++){
				tgttest(pl.permanents[j]);
			}
			tgttest(pl.shield);
			tgttest(pl.weapon);
		}
		if (tgts.length > 0){
			var tgt = tgts[c.owner.upto(tgts.length)], town = t.owner;
			t.owner = tgt[1];
			t.card.active(t, tgt[0]); // NB bypasses SoFr
			t.owner = town;
		}
	}
},
sadism:function(c, t, dmg){
	if (dmg > 0 && (!c.card.upped || c.owner == t.owner)){
		c.owner.dmg(-dmg);
	}
},
sanctuary:function(c,t){
	c.owner.sanctuary = true;
	Effect.mkText("+4", c);
	c.owner.dmg(-4);
},
scarab:function(c,t){
	new etg.Creature(Cards.Scarab.asUpped(c.card.upped), c.owner).place();
},
scavenger:function(c,t){
	Effect.mkText("1|1", c);
	c.atk += 1;
	c.buffhp(1);
},
scramble:function(c,t){
	if (t instanceof etg.Player && !t.sanctuary){
		for (var i=0; i<9; i++){
			if (t.spend(etg.Other, 1)){
				t.spend(etg.Other, -1);
			}
		}
	}
},
serendipity:function(c,t){
	var cards = [], num = Math.min(8-c.owner.hand.length, 3), anyentro = false;
	for(var i=num-1; i>=0; i--){
		cards[i] = c.owner.randomcard(c.card.upped, function(x){return x.type != etg.PillarEnum && !~etg.NymphList.indexOf(x.code) && !(x.status && x.status.shard) && (i>0 || anyentro || x.element == etg.Entropy)});
		anyentro |= cards[i].element == etg.Entropy;
	}
	for(var i=0; i<num; i++){
		new etg.CardInstance(cards[i], c.owner).place();
	}
},
silence:function(c,t){
	if (t instanceof etg.Player){
		if (!t.sanctuary){
			t.silence = true;
		}
	}else{
		t.usedactive = true;
	}
},
singularity:function(c,t){
	var r = c.owner.rng();
	if (r > .9){
		c.status.adrenaline = 1;
	}else if (r > .8){
		c.active.hit = Actives.vampire;
	}else if (r > .7){
		Actives.quint(c, c);
	}else if (r > .6){
		Actives.scramble(c, c.owner);
	}else if (r > .5){
		Actives.blackhole(c.owner.foe, c.owner);
	}else if (r > .4){
		c.atk -= c.owner.uptoceil(5);
		c.buffhp(c.owner.uptoceil(5));
	}else if (r > .3){
		Actives.nova(c.owner.foe);
		c.owner.foe.nova = 0;
	}else if (r > .2){
		Actives.parallel(c, c);
	}else if (r > .1 && c.owner.weapon){
		c.owner.weapon = new etg.Weapon(Cards.Dagger, c.owner);
	}
	c.dmg(c.trueatk(), true);
},
sinkhole:function(c,t){
	Effect.mkText("Sinkhole", t);
	t.status.burrowed = true;
	lobo(t);
	t.active.cast = Actives.unburrow;
	t.cast = c.card.upped?1:0;
	t.castele = etg.Earth;
	t.usedactive = true;
},
siphon: function(c, t) {
	if (!c.owner.foe.sanctuary && c.owner.foe.spend(etg.Other, 1)) {
		Effect.mkText("1:11", c);
		c.owner.spend(etg.Darkness, -1);
	}
},
siphonactive:function(c,t){
	Effect.mkText("Siphon", t);
	for(var key in t.active){
		if (!(t.active[key].activename in etg.passives)) c.active[key] = t.active[key];
	}
	c.cast = t.cast;
	c.castele = t.castele;
	lobo(t);
},
siphonstrength:function(c,t){
	Effect.mkText("+1|0", c);
	Effect.mkText("-1|0", t);
	t.atk--;
	c.atk++;
},
skyblitz:function(c,t){
	c.owner.quanta[etg.Air] = 0;
	for(var i=0; i<23; i++){
		var cr = c.owner.creatures[i];
		if (cr && cr.status.airborne){
			Effect.mkText("Dive", cr);
			cr.defstatus("dive", 0);
			cr.status.dive += cr.trueatk();
		}
	}
},
snipe:function(c,t){
	Effect.mkText("-3", t);
	t.dmg(3);
},
sosa:function(c,t){
	c.owner.sosa += 2;
	for(var i=1; i<13; i++){
		if (i != etg.Death){
			c.owner.quanta[i] = 0;
		}
	}
	var n = c.card.upped?40:48;
	c.owner.dmg(Math.max(Math.ceil(c.owner.maxhp*n/100), n), true);
},
soulcatch:function(c,t){
	Effect.mkText("Soul", c);
	c.owner.spend(etg.Death, -3);
},
spores:function(c,t, index){
	new etg.Creature(Cards.Spore.asUpped(c.card.upped), c.owner).place();
	new etg.Creature(Cards.Spore.asUpped(c.card.upped), c.owner).place();
},
sskin:function(c,t){
	c.owner.buffhp(c.owner.quanta[etg.Earth]);
},
staff:function(c,t){
	return c.owner.mark == etg.Life||c.owner.mark == etg.Water?1:0;
},
steal:function(c,t){
	if (t.status.stackable){
		Actives.destroy(c, t, true);
		if (t instanceof etg.Shield){
			if (c.owner.shield && c.owner.shield.card == t.card){
				c.owner.shield.status.charges++;
			}else{
				c.owner.shield = new etg.Shield(t.card, c.owner);
				c.owner.shield.status.charges = 1;
			}
		}else if (t instanceof etg.Weapon){
			if (c.owner.weapon && c.owner.weapon.card == t.card){
				c.owner.shield.status.charges++;
			}else{
				c.owner.weapon = new etg.Weapon(t.card, c.owner);
				c.owner.weapon.status.charges = 1;
			}
		}else if (t instanceof etg.Pillar){
			new etg.Pillar(t.card, c.owner).place();
		}else{
			new etg.Permanent(t.card, c.owner).place();
		}
	}else{
		t.die();
		t.owner = c.owner;
		t.usedactive = true;
		t.place();
	}
},
steam:function(c,t){
	Effect.mkText("5|0", c);
	c.defstatus("steamatk", 0);
	c.status.steamatk += 5;
	c.atk += 5;
},
stoneform:function(c,t){
	Effect.mkText("0|20", c);
	c.buffhp(20);
	delete c.active.cast;
},
storm2:function(c,t){
	t.masscc(c, function(c,x){x.dmg(2)});
},
storm3:function(c,t){
	t.masscc(c, Actives.snipe);
},
swarm:function(c,t){
	var hp = 0;
	for (var i=0; i<23; i++){
		if (c.owner.creatures[i] && c.owner.creatures[i].active.hp == Actives.swarm){
			hp++;
		}
	}
	return hp;
},
swave:function(c,t){
	if (t.status.frozen){
		Effect.mkText("Death", t);
		t.die();
	}else{
		if (t instanceof etg.Player && t.weapon && t.weapon.status.frozen){
			Actives.destroy(c, t.weapon);
		}
		Effect.mkText("-4", t);
		t.spelldmg(4);
	}
},
tempering:function(c,t){
	var atk = c.card.upped?5:3;
	Effect.mkText(atk+"|0", t);
	t.atk += atk;
},
throwrock:function(c,t){
	var dmg = c.card.upped?4:3;
	Effect.mkText("-"+dmg, t);
	t.spelldmg(dmg);
	t.owner.deck.splice(c.owner.upto(t.owner.deck.length), 0, Cards.ThrowRock.asUpped(c.card.upped));
},
tick:function(c,t){
	c.dmg(c.trueatk() + (c.card.upped?2:1));
	if (c.hp <= 0) {
		if (c.card.upped) c.owner.foe.masscc(c, function (c, x) { x.dmg(4) });
		else c.owner.foe.spelldmg(15);
	}
},
unappease:function(c,t){
	delete c.status.appeased;
},
unburrow:function(c,t){
	c.status.burrowed = false;
	c.active.cast = Actives.burrow;
	c.cast = 1;
},
upkeep:function(c,t){
	if (!c.owner.spend(c.card.element, 1)){
		c.owner.quanta[c.card.element] = 0;
		c.die();
	}
},
upload:function(c,t){
	Effect.mkText(2 + "|" + 0, t);
	t.atk += c.dmg(2);
},
vampire:function(c,t, dmg){
	c.owner.dmg(-dmg);
},
virusinfect:function(c,t){
	Actives.infect(c, t);
	c.die();
},
virusplague:function(c,t){
	Actives.plague(c, t);
	c.die();
},
void:function(c,t){
	c.owner.foe.maxhp = Math.max(c.owner.foe.maxhp-3, 1);
	if (c.owner.foe.hp > c.owner.foe.maxhp){
		c.owner.foe.hp = c.owner.foe.maxhp;
	}
},
quantagift:function(c,t){
	c.owner.spend(c.card.element, -2);
	if (c.owner.mark != c.card.element){
		c.owner.spend(c.owner.mark, -2);
	}
},
web:function(c,t){
	Effect.mkText("Web", t);
	delete t.status.airborne;
},
wind:function(c,t){
	if (!c.status.storedAtk) return;
	c.atk += c.status.storedAtk;
	delete c.status.storedAtk;
},
wisdom:function(c,t){
	Effect.mkText("3|0", t);
	t.atk += 3;
	if (t.status.immaterial){
		t.status.psion = true;
	}
},
yoink:function(c,t){
	if (!t.owner.sanctuary){
		t.remove();
		if (c.owner.hand.length < 8){
			t.owner = c.owner;
			c.owner.hand.push(t);
		}
	}
},
pillar:function(c,t){
	if (!t)
		c.owner.spend(c.card.element, -c.status.charges * (c.card.element > 0 ? 1 : 3));
	else if (c == t)
		c.owner.spend(c.card.element, -(c.card.element > 0 ? 1 : 3))
},
pend:function(c,t){
    c.owner.spend(c.pendstate ? c.owner.mark : c.card.element, -c.status.charges * (c.card.element > 0 ? 1 : 3));
	c.pendstate ^= true;
},
blockwithcharge:function(c,t){
	if (--c.status.charges <= 0){
		c.owner.shield = undefined;
	}
	return true;
},
chaos:function(c,t){
	randomchance = c.owner.rng();
	if (randomchance < .25) {
		return true;
	}
	else if (t instanceof etg.Creature && randomchance < .5) {
		Actives.cseed(c, t);
	}
},
cold:function(c,t){
	if (c.owner.rng()<.3){
		Effect.mkText("Freeze", t);
		t.freeze(3);
	}
},
despair:function(c,t){
	var chance=0;
	for(var i=0; i<23; i++){
		if (c.owner.creatures[i] && (c.owner.creatures[i].hasactive("auto", "siphon") || c.owner.creatures[i].hasactive("auto", "darkness"))) {
			chance++;
		}
	}
	if (c.owner.rng() < 1.2-Math.pow(.95, chance)){
		Effect.mkText("-1|-1", t);
		t.atk--;
		t.dmg(1);
	}
},
evade100:function(c,t){
	return true;
},
evade40:function(c,t){
	return c.owner.rng() < .4;
},
evade50:function(c,t){
	return c.owner.rng() < .5;
},
firewall:function(c,t){
	t.dmg(1);
},
skull:function(c,t){
	if (t instanceof etg.Creature && !t.card.isOf(Cards.Skeleton)) {
		var thp = t.truehp();
		if (thp <= 0 || c.owner.rng() < .5/thp){
			var index = t.getIndex();
			t.die();
			if (!t.owner.creatures[index] || t.owner.creatures[index].card != Cards.MalignantCell){
				t.owner.creatures[index] = new etg.Creature(Cards.Skeleton.asUpped(t.card.upped), t.owner);
			}
		}
	}
},
slow:function(c,t){
	t.delay(2);
},
solar:function(c,t){
	c.owner.spend(etg.Light, -1);
},
thorn:function(c,t){
	if (c.owner.rng() < .75){
		t.addpoison(1);
	}
},
weight:function(c,t){
	return t instanceof etg.Creature && t.truehp()>5;
},
wings:function(c,t){
	return !t.status.airborne && !t.status.ranged;
},
}
for(var key in Actives){
	Actives[key].activename = key;
}
module.exports = Actives