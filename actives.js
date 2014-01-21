var Actives = (function(){
function mutantactive(t){
	t.active = {};
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
var Actives = {
ablaze:function(c,t){
	c.atk += 2;
},
acceleration:function(c,t){
	c.atk += 2;
	c.dmg(1, true);
},
accelerationspell:function(c,t){
	t.active = {auto: Actives.acceleration};
},
accretion:function(c,t){
	Actives.destroy(c, t);
	c.buffhp(15);
	if (c.truehp() > 45){
		c.die();
		if (c.owner.hand.length < 8){
			new CardInstance(Cards.BlackHole.asUpped(c.card.upped), c.owner).place();
		}
	}
},
accumulation:function(c,t){
	return c.status.charges;
},
adrenaline:function(c,t){
	t.status.adrenaline = 1;
},
aflatoxin:function(c,t){
	t.addpoison(2);
	if (!(t instanceof Player)){
		t.status.aflatoxin = true;
	}
},
aggroskele:function(c,t){
	var dmg = 0;
	for (var i=0; i<23; i++){
		if (c.owner.creatures[i] && c.owner.creatures[i].card.isOf(Cards.Skeleton)){
			dmg += c.owner.creatures[i].trueatk();
		}
	}
	t.dmg(dmg);
},
air:function(c,t){
	c.owner.spend(Air, -1);
},
antimatter:function(c,t){
	t.atk -= t.trueatk(0, true)*2;
},
bblood:function(c,t){
	t.buffhp(20);
	t.delay(6);
},
blackhole:function(c,t){
	if (!c.owner.foe.sanctuary){
		quanta = c.owner.foe.quanta;
		for (var q=1; q<13; q++){
			c.owner.dmg(-Math.min(quanta[q],3));
			quanta[q] = Math.max(quanta[q]-3,0);
		}
	}
},
bless:function(c,t){
	t.atk += 3;
	t.buffhp(3);
},
boneyard:function(c,t){
	if (!t.card.isOf(Cards.Skeleton)){
		new Creature(Cards.Skeleton.asUpped(c.card.upped), c.owner).place();
	}
},
bow:function(c,t){
	return c.owner.mark == Air?1:0;
},
bounce:function(c,t){
	if (c.owner.hand.length < 8) {
		new CardInstance(c.card, c.owner).place();
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
burrow:function(c,t){
	c.status.burrowed = true;
	c.active = {cast: Actives.unburrow};
	c.cast = 0;
},
butterfly:function(c,t){
	t.active = {cast: Actives.destroy};
	t.cast = 3;
	t.castele = Entropy;
},
catapult:function(c,t){
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
	var chim = new Creature(c.card, c.owner);
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
	t.status.adrenaline = 0;
	t.status.poison = 0;
	t.status.aflatoxin = false;
	t.status.momentum = false;
	t.status.psion = false;
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
	if (t.passives.poisonous){
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
	return c.owner.mark == Darkness||c.owner.mark == Death?1:0;
},
darkness:function(c,t){
	c.owner.spend(Darkness, -1);
},
deadalive:function(c,t){
	c.deatheffect();
},
deja:function(c,t){
	delete c.active.cast;
	Actives.parallel(c, c);
},
deployblobs:function(c,t){
	if (c.trueatk()>1 && c.truehp()>1){
		new Creature(Cards.Blob.asUpped(c.card.upped), c.owner).place();
		new Creature(Cards.Blob.asUpped(c.card.upped), c.owner).place();
		new Creature(Cards.Blob.asUpped(c.card.upped), c.owner).place();
		c.atk -= 2;
		c.dmg(2);
	}
},
destroy:function(c,t, dontsalvage){
	if (t.passives.stackable){
		if(--t.status.charges<=0){
			t.die();
		}
	}else t.die();
	if (!dontsalvage){
		salvageScan(c.owner, t);
	}
},
destroycard:function(c,t){
	if (!t.owner.sanctuary){
		t.remove();
	}
},
devour:function(c,t){
	c.buffhp(1);
	c.atk += 1;
	if (t.passives.poisonous){
		c.addpoison(1);
	}
	t.die();
},
die:function(c,t){
	c.die();
},
disarm:function(c,t){
	if (t instanceof Player && t.weapon && t.hand.length < 8){
		new CardInstance(t.weapon.card, t);
		t.weapon = undefined;
	}
},
disfield:function(c,t, dmg){
	if (!c.owner.spend(Other, dmg)){
		for(var i=1; i<13; i++){
			c.owner.quanta[i] = 0;
		}
		c.owner.shield = undefined;
	}
	return true;
},
disshield:function(c,t, dmg){
	if (!c.owner.spend(Entropy, Math.ceil(dmg/3))){
		c.owner.quanta[Entropy] = 0;
		c.owner.shield = undefined;
	}
	return true;
},
dive:function(c,t){
	c.defstatus("dive", 0);
	c.status.dive += c.trueatk();
},
divinity:function(c,t){
	c.owner.maxhp += 8;
	c.owner.buffhp(16);
},
drainlife:function(c,t){
	c.owner.dmg(-t.spelldmg(2+Math.floor(c.owner.quanta[Darkness]/5)));
},
draft:function(c,t){
	if((t.passives.airborne = !t.passives.airborne)){
		if (t.active.cast == Actives.burrow){
			delete t.active.cast;
		}
	}
},
dryspell:function(c,t){
	function dryeffect(c,t){
		c.spend(Water, -t.dmg(1));
	}
	c.owner.foe.masscc(c.owner, dryeffect, true);
},
dshield:function(c,t){
	c.status.immaterial = true;
},
duality:function(c,t){
	if (c.owner.foe.deck.length > 0 && c.owner.hand.length < 8){
		new CardInstance(c.owner.foe.deck[c.owner.foe.deck.length-1], c.owner).place();
	}
},
earth:function(c,t){
	c.owner.spend(Earth, -1);
},
earthquake:function(c,t){
	if (t.status.charges>3){
		t.status.charges -= 3;
	}else{
		t.die();
	}
	salvageScan(c.owner, t);
},
empathy:function(c,t){
	var healsum = 0;
	for(var i=0; i<23; i++){
		if (c.owner.creatures[i])healsum++;
	}
	c.owner.dmg(-healsum);
},
enchant:function(c,t){
	t.status.immaterial = true
},
endow:function(c,t){
	c.active = clone(t.active);
	c.passives = clone(t.passives);
	c.status = clone(t.status);
	c.cast = t.cast;
	c.castele = t.castele;
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
	c.status.burrowed = false;
},
fickle:function(c,t){
	var cards = [];
	for(var i=0; i<t.owner.deck.length; i++){
		var card = t.owner.deck[i];
		if (t.owner.canspend(card.costele, card.cost)){
			cards.push(i);
		}
	}
	if (cards.length > 0){
		var pick = t.owner.upto(cards.length);
		t.owner.hand[t.getIndex()] = new CardInstance(t.owner.deck[cards[pick]], t.owner);
		t.owner.deck[cards[pick]] = t.card;
	}
},
fiery:function(c,t){
	return Math.floor(c.owner.quanta[Fire]/5);
},
fire:function(c,t){
	c.owner.spend(Fire, -1);
},
firebolt:function(c,t){
	t.spelldmg(3+Math.floor(c.owner.quanta[Fire]/7)*2);
},
flatline:function(c,t){
	if (!c.owner.foe.sanctuary){
		c.owner.foe.flatline = true;
	}
},
flyingweapon:function(c,t){
	if (t.weapon){
		var cr = new Creature(t.weapon.card, t.owner);
		cr.atk = t.weapon.atk;
		cr.active = clone(t.weapon.active);
		cr.cast = t.weapon.cast;
		cr.castele = t.weapon.castele;
		cr.passives = clone(t.weapon.passives);
		cr.status = clone(t.weapon.status);
		cr.passives.airborne = true;
		cr.place();
		t.weapon = undefined;
	}
},
fractal:function(c,t){
	c.owner.quanta[Aether] = 0;
	for(var i=c.owner.hand.length; i<8; i++){
		c.owner.hand[i] = new CardInstance(t.card, c.owner);
	}
},
freeze:function(c,t){
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
	new Permanent(Cards.UnstableGas.asUpped(c.card.upped), c.owner).place();
},
give:function(c,t){
	c.owner.dmg(-5);
	if (t instanceof Creature){
		if (t.hasactive("auto", "singularity")){
			t.die();
		}else{
			t.remove();
			t.owner = c.owner.foe;
			t.place();
		}
	}else if (t instanceof Permanent){
		Actives.steal(c.owner.foe, t);
	}else{
		t.remove();
		t.owner = c.owner.foe;
		t.place();
	}
},
gpull:function(c,t){
	c.owner.gpull = c;
},
gpullspell:function(c,t){
	if (t instanceof Player){
		delete t.gpull;
	}else{
		t.owner.gpull = t;
	}
},
gratitude:function(c,t){
	c.owner.dmg(-4);
},
grave:function(c,t){
	delete c.status.burrowed;
	c.transform(t.card);
},
growth:function(c,t){
	c.buffhp(2);
	c.atk += 2;
},
guard:function(c,t){
	c.delay(1);
	t.delay(1);
	if (!t.passives.airborne){
		t.dmg(c.trueatk());
	}
},
hammer:function(c,t){
	return c.owner.mark == Gravity||c.owner.mark == Earth?1:0;
},
hasten:function(c,t){
	c.owner.drawcard();
},
hatch:function(c,t){
	c.transform(c.owner.randomcard(c.card.upped, function(x){return x.type == CreatureEnum}));
},
heal:function(c,t){
	t.dmg(-5);
},
heal20:function(c,t){
	t.dmg(-20);
},
holylight:function(c,t){
	t.dmg(!(t instanceof Player) && (t.card.element == Darkness || t.card.element == Death || t.passives.nocturnal)?10:-10);
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
	var bolts = Math.floor(c.owner.quanta[Water]/5);
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
		c.owner.spend(Fire, -7);
	}
},
improve:function(c,t){
	t.transform(c.owner.randomcard(false, function(x){return x.type == CreatureEnum}));
	t.buffhp(c.owner.upto(5));
	t.atk += c.owner.upto(5);
	if(mutantactive(t)){
		t.cast = c.owner.uptoceil(2);
		t.castele = t.card.element;
	}
},
infect:function(c,t){
	t.addpoison(1);
},
infest:function(c,t){
	if(!c.usedactive){
		new Creature(Cards.MalignantCell, c.owner).place();
	}
},
ink:function(c,t){
	var p=new Permanent(Cards.Cloak, c.owner);
	p.status.charges = 1;
	p.place();
},
innovation:function(c,t){
	if (!t.owner.sanctuary && t.card != c){
		t.remove();
		for(var i=0; i<3; i++){
			t.owner.drawcard();
		}
	}
},
integrity:function(c,t){
	var activeType = ["auto", "hit", "buff", "death"];
	var shardTally = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
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
	var stat=c.card.upped?5:4;
	for(var i=c.owner.hand.length-1; i>=0; i--){
		var card = c.owner.hand[i].card;
		if (~ShardList.indexOf(card.code)){
			if (card.upped){
				stat++;
			}
			shardTally[card.element]++;
			c.owner.hand.splice(i, 1);
		}
	}
	var active = "burrow", num=0, cast=0;
	for(var i=1; i<13; i++){
		stat += shardTally[i]*2;
		if (shardTally[i]>num){
			num = shardTally[i];
			active = shardSkills[i][num];
		}
	}
	var actives = {}, cost = shardCosts[active];
	actives[cost<0?activeType[~cost]:"cast"] = Actives[active];
	var passives = {};
	var status = {};
	if (shardTally[Air]>0){
		passives.airborne = true;
	}
	if (shardTally[Darkness]>0){
		passives.voodoo = true;
	}
	if (shardTally[Time]>0){
		passives.swarm = true;
	}
	if (shardTally[Life]>0){
		passives.poisonous = true;
	}
	if (shardTally[Death]>0){
		passives.undead = true;
	}
	if (shardTally[Gravity]>0){
		passives.salvage = true;
	}
	if (shardTally[Aether]>1){
		status.immaterial = true;
	}
	if (shardTally[Gravity]>1){
		status.momentum = true;
	}
	if (shardTally[Life]>0){
		status.adrenaline = 1;
	}
	c.owner.shardgolem = {
		stat: stat,
		passives: passives,
		status: status,
		active: actives,
		cast: cast
	};
	new Creature(Cards.ShardGolem, c.owner).place();
},
layegg:function(c,t){
	new Creature(Cards.FateEgg.asUpped(c.card.upped), c.owner).place();
},
light:function(c,t){
	c.owner.spend(Light, -1);
},
lightning:function(c,t){
	t.spelldmg(5);
},
liquid:function(c,t){
	t.active = {hit: Actives.vampire};
	t.addpoison(1);
},
livingweapon:function(c,t){
	if (!t.owner.weapon){
		var w = new Weapon(t.card, t.owner);
		w.atk = t.atk;
		w.active = clone(t.active);
		w.passives = clone(t.passives);
		w.status = clone(t.status);
		t.owner.weapon = w;
		t.remove();
	}
},
lobotomize:function(c,t){
	t.active = {};
	t.status.momentum = false;
	t.status.psion = false;
},
losecharge:function(c,t){
	if(--c.status.charges<0){
		c.die();
	}
},
luciferin:function(c,t){
	c.owner.dmg(-10);
	c.owner.masscc(c, function(c,x){
		if (isEmpty(x.active)){
			x.active.auto = Actives.light;
		}
	});
},
lycanthropy:function(c,t){
	c.buffhp(5);
	c.atk += 5;
	delete c.active.cast;
	c.passives.nocturnal = true;
},
metamorph:function(c,t){
	c.owner.mark = t instanceof Player?t.mark:t.card.element;
	c.owner.spend(c.owner.mark, -2);
},
miracle:function(c,t){
	c.owner.quanta[Light] = 0;
	if (c.owner.sosa){
		c.owner.hp = 1;
	}else if (c.owner.hp<c.owner.maxhp){
		c.owner.hp = c.owner.maxhp-1;
	}
},
mitosis:function(c,t){
	new Creature(c.card, c.owner).place();
},
mitosisspell:function(c,t){
	t.active.cast = Actives.mitosis;
	t.castele = t.card.element;
	t.cast = t.card.cost;
	t.buffhp(2);
},
momentum:function(c,t){
	t.atk += 1;
	t.buffhp(1);
	t.status.momentum = true;
},
mutant:function(c,t){
	if (mutantactive(c)){
		c.cast = c.owner.uptoceil(2);
		c.castele = c.owner.upto(13);
	}
},
mutation:function(c,t){
	var rnd = c.owner.rng();
	if (rnd<.1){
		t.die();
	}else if (rnd<(t.card.isOf(Cards.Abomination)?.9:.5)){
		Actives.improve(c, t);
	}else{
		t.transform(Cards.Abomination);
	}
},
neuro:function(c,t){
	t.addpoison(1);
	if (t instanceof Player){
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
		c.owner.dmg(-c.owner.foe.dmg(16-c.owner.foe.hand.length*2));
		for(var i = c.owner.foe.hand.length; i<8; i++){
			c.owner.foe.hand[i] = new CardInstance(t.card, c.owner.foe);
		}
	}
},
nova:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.spend(i, -1);
	}
	c.owner.nova++;
	if (c.owner.nova >= 3){
		new Creature(Cards.Singularity, c.owner).place();
	}
},
nova2:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.spend(i, -2);
	}
	c.owner.nova += 2;
	if (c.owner.nova >= 3){
		new Creature(Cards.SingularityUp, c.owner).place();
	}
},
nymph:function(c,t){
	var e = t.card.element || c.owner.uptoceil(12);
	Actives.destroy(c, t);
	new Creature(CardCodes[NymphList[e*2+(t.card.upped?1:0)]], t.owner).place();
},
obsession:function(c,t){
	t.dmg(c.card.upped?10:8);
},
ouija:function(c,t){
	if(!c.owner.foe.sanctuary && c.owner.foe.hand.length<8){
		new CardInstance(Cards.OuijaEssence, c.owner.foe).place();
	}
},
overdrive:function(c,t){
	c.atk += 3;
	c.dmg(1, true);
},
overdrivespell:function(c,t){
	t.active = {auto: Actives.overdrive};
},
pandemonium:function(c,t){
	c.owner.foe.masscc(c, Actives.cseed, true);
},
pandemonium2:function(c,t){
	t.masscc(c, Actives.cseed);
},
paradox:function(c,t){
	if (t.trueatk()>t.truehp())t.die();
},
parallel:function(c,t){
	var copy = new Creature(t.card, c.owner);
	for(var attr in t){
		if (t.hasOwnProperty(attr))copy[attr] = t[attr];
	}
	copy.passives = clone(t.passives);
	copy.active = clone(t.active);
	copy.status = clone(t.status);
	copy.owner = c.owner;
	copy.place();
	if (copy.voodoo){
		c.owner.foe.dmg(copy.maxhp-copy.hp);
		if (copy.status.poison){
			c.owner.foe.addpoison(copy.status.poison);
		}
		if (c.owner.foe.weapon){
			if (copy.status.delayed){
				c.owner.foe.delay(copy.status.delayed);
			}
			if (copy.status.delayed && copy.status.frozen>c.owner.foe.weapon.frozen){
				c.owner.foe.freeze(copy.status.frozen);
			}
		}
	}
},
phoenix:function(c,t, index){
	if (c == t && !c.owner.creatures[index]){
		c.transform(Cards.Ash.asUpped(c.card.upped));
		c.owner.creatures[index] = c;
		c.usedactive = true;
	}
},
photosynthesis:function(c,t){
	c.owner.spend(Life, -2);
	if (c.cast > 0){
		c.usedactive = false;
	}
},
plague:function(c,t){
	t.masscc(c, Actives.infect);
},
platearmor:function(c,t){
	t.buffhp(c.card.upped?6:4);
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
	if (t instanceof Player){
		t.neuro = false;
		t.sosa = 0;
	}else{
		t.status.aflatoxin = false;
	}
},
queen:function(c,t){
	new Creature(Cards.Firefly.asUpped(c.card.upped), c.owner).place();
},
quint:function(c,t){
	t.status.immaterial = true;
	t.status.frozen = 0;
},
rage:function(c,t){
	var dmg = c.card.upped?6:5;
	t.atk += dmg;
	t.dmg(dmg);
},
readiness:function(c,t){
	if (t.active.cast){
		t.cast = 0;
		t.usedactive = false;
	}
},
rebirth:function(c,t){
	c.transform(Cards.Phoenix.asUpped(c.card.upped));
},
regenerate:function(c,t){
	c.owner.dmg(-5);
},
reinforce:function(c,t){
	t.atk += c.atk;
	t.buffhp(c.truehp());
	c.die();
},
regrade:function(c,t){
	t.card = t.card.asUpped(!t.card.upped);
},
ren:function(c,t){
    t.addactive("predeath", Actives.bounce);
},
rewind:function(c,t){
	if (t.card.isOf(Cards.Skeleton)){
		Actives.hatch(t);
	}else if (t.card.isOf(Cards.Mummy)){
		t.transform(Cards.Pharaoh.asUpped(t.card.upped));
	}else{
		t.remove();
		t.owner.deck.push(t.card);
	}
},
ricochet:function(c,t){
	var tgting = Targeting[t.card.active.activename];
	var tgts = [];
	function tgttest(x){
		if (x && tgting(t.owner, x) && tgting(t.owner.foe, x)){
			tgts.push(x);
		}
	}
	if (tgting){
		for(var i=0; i<2; i++){
			var pl=i==0?t:t.foe;
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
			t.card.active(t.rng() < .5?t:t.foe, tgts[t.upto(tgts.length)]); // NB bypasses SoFr
		}
	}
},
sanctuary:function(c,t){
	c.owner.sanctuary = true;
	c.owner.dmg(-4);
},
scarab:function(c,t){
	new Creature(Cards.Scarab.asUpped(c.card.upped), c.owner).place();
},
scavenger:function(c,t){
	c.atk += 1;
	c.buffhp(1);
},
scramble:function(c,t){
	if (t instanceof Player && !t.sanctuary){
		for (var i=0; i<9; i++){
			if (t.spend(Other, 1)){
				t.spend(Other, -1);
			}
		}
	}
},
serendipity:function(c,t){
	var cards = [], num = Math.min(8-c.owner.hand.length, 3), anyentro = false;
	for(var i=num-1; i>=0; i--){
		cards[i] = c.owner.randomcard(c.card.upped, function(x){return x.type != PillarEnum && !~NymphList.indexOf(x.code) && !~ShardList.indexOf(x.code) && (i>0 || anyentro || x.element == Entropy)});
		anyentro |= cards[i].element == Entropy;
	}
	for(var i=0; i<num; i++){
		new CardInstance(cards[i], c.owner).place();
	}
},
silence:function(c,t){
	if (t instanceof Player){
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
		Actives.blackhole(c.owner.foe);
	}else if (r > .4){
		c.atk -= c.owner.uptoceil(5);
		c.buffhp(c.owner.uptoceil(5));
	}else if (r > .3){
		Actives.nova(c.owner.foe);
		c.owner.foe.nova = 0;
	}else if (r > .2){
		Actives.parallel(c, c);
	}else if (r > .1){
		c.owner.weapon = new Weapon(Cards.Dagger, c.owner);
	}
	c.dmg(c.trueatk(), true);
},
sinkhole:function(c,t){
	t.status.burrowed = true;
	t.active = {cast: Actives.unburrow};
	t.cast = c.card.upped?1:0;
	t.castele = Earth;
	t.usedactive = true;
},
siphon:function(c,t){
	if (c.owner.foe.spend(Other, 1)){
		c.owner.spend(Darkness, -1)
	}
},
siphonactive:function(c,t){
	c.active = t.active;
	c.cast = t.cast;
	c.castele = t.castele;
	t.active = {};
},
siphonstrength:function(c,t){
	t.atk--;
	c.atk++;
},
skyblitz:function(c,t){
	c.owner.quanta[Air] = 0;
	for(var i=0; i<23; i++){
		if (c.owner.creatures[i] && c.owner.creatures[i].passives.airborne){
			Actives.dive(c.owner.creatures[i]);
		}
	}
},
snipe:function(c,t){
	t.dmg(3);
},
sosa:function(c,t){
	c.owner.sosa += 2;
	for(var i=1; i<13; i++){
		if (i != Death){
			c.owner.quanta[i] = 0;
		}
	}
	var n = c.card.upped?40:48;
	c.owner.dmg(Math.max(Math.ceil(c.owner.maxhp*n/100), n), true);
},
soulcatch:function(c,t){
	c.owner.spend(Death, -3);
},
spores:function(c,t, index){
	if (c == t){
		new Creature(Cards.Spore.asUpped(c.card.upped), c.owner).place();
		new Creature(Cards.Spore.asUpped(c.card.upped), c.owner).place();
	}
},
sskin:function(c,t){
	c.owner.buffhp(c.owner.quanta[Earth]);
},
staff:function(c,t){
	return c.owner.mark == Life||c.owner.mark == Water?1:0;
},
steal:function(c,t){
	if (t.passives.stackable){
		Actives.destroy(c, t, true);
		if (t instanceof Shield){
			if (c.owner.shield && c.owner.shield.card == t.card){
				c.owner.shield.status.charges++;
			}else{
				c.owner.shield = new Shield(t.card, c.owner);
				c.owner.shield.status.charges = 1;
			}
		}else if (t instanceof Weapon){
			if (c.owner.weapon && c.owner.weapon.card == t.card){
				c.owner.shield.status.charges++;
			}else{
				c.owner.weapon = new Weapon(t.card, c.owner);
				c.owner.weapon.status.charges = 1;
			}
		}else if (t instanceof Pillar){
			new Pillar(t.card, c.owner).place();
		}else{
			new Permanent(t.card, c.owner).place();
		}
	}else{
		t.die();
		t.owner = c.owner;
		t.usedactive = true;
		t.place();
	}
},
steam:function(c,t){
	c.defstatus("steamatk", 0);
	c.status.steamatk += 5;
},
stoneform:function(c,t){
	c.buffhp(20);
	delete c.active.cast;
},
storm2:function(c,t){
	t.masscc(c, function(c,x){x.dmg(2)});
},
storm3:function(c,t){
	t.masscc(c, Actives.snipe);
},
swave:function(c,t){
	t.spelldmg(4);
},
tempering:function(c,t){
	t.atk += c.card.upped?4:3;
},
throwrock:function(c,t){
	t.spelldmg(c.card.upped?3:2);
	t.owner.deck.splice(c.owner.upto(t.owner.deck.length), 0, c.card);
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
		c.owner.spend(c.mark, -2);
	}
},
web:function(c,t){
	t.passives.airborne = false;
},
wisdom:function(c,t){
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
	c.owner.spend(c.card.element,-c.status.charges*(c.card.element>0?1:3));
},
pend:function(c,t){
	c.owner.spend(c.pendstate?c.owner.mark:c.card.element,-c.status.charges);
	c.pendstate ^= true;
},
blockwithcharge:function(c,t){
	if (--c.status.charges <= 0){
		c.owner.shield = undefined;
	}
	return true;
},
cold:function(c,t){
	if (c.owner.rng()<.3){
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
	if (t instanceof Creature){
		var thp = t.truehp();
		if (thp <= 0 || c.owner.rng() < .5/thp){
			var index = t.getIndex();
			t.die();
			if (!t.owner.creatures[index] || t.owner.creatures[index].card != Cards.MalignantCell){
				t.owner.creatures[index] = new Creature(Cards.Skeleton.asUpped(t.card.upped), t.owner);
			}
		}
	}
},
slow:function(c,t){
	t.delay(1);
},
solar:function(c,t){
	c.owner.spend(Light, -1);
},
thorn:function(c,t){
	if (c.owner.rng() < .75){
		t.addpoison(1);
	}
},
weight:function(c,t){
	return t instanceof Creature && t.truehp()>5;
},
wings:function(c,t){
	return !t.passives.airborne && !t.passives.ranged;
},
}
for(var key in Actives){
	Actives[key].activename = key;
}
return Actives;
})();