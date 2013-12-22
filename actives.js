var Actives = {
ablaze:function(c,t){
	c.atk += 2;
},
acceleration:function(c,t){
	c.atk += 2;
	c.dmg(1,true);
},
accelerationspell:function(c,t){
	t.active.auto = Actives.acceleration;
},
accretion:function(c,t){
	Actives.destroy(c, t);
	c.buffhp(15);
	if (c.truehp() > 45){
		c.die();
		if (c.owner.hand.length < 8){
			c.owner.hand.push(Cards.BlackHole.asUpped(c.card.upped));
		}
	}
},
accumulation:function(c,t){
	return c.charges;
},
adrenaline:function(c,t){
	t.adrenaline = 1;
},
aflatoxin:function(c,t){
	t.addpoison(2);
	t.aflatoxin = true;
},
air:function(c,t){
	c.owner.spend(Air, -1);
},
antimatter:function(c,t){
	t.atk -= t.trueatk()*2;
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
	if (t.card.isOf(Cards.Skeleton)){
		new Creature(Cards.Skeleton.asUpped(c.card.upped), c.owner).place();
	}
},
bow:function(c,t){
	return c.owner.mark == Air?1:0;
},
bravery:function(c,t){
	if (!c.owner.foe.sanctuary){
		var maxdraw = c.owner.mark == Fire?3:2;
		for(var i=0; i<maxdraw && c.owner.hand.length<8 && c.owner.foe.hand.length<8; i++){
			c.owner.drawcard();
			c.owner.foe.drawcard();
		}
	}
},
burrow:function(c,t){
	c.burrowed = true;
	c.active.cast = Actives.unburrow;
	c.cast = 0;
},
butterfly:function(c,t){
	t.active.cast = Actives.destroy;
	t.cast = 3;
	t.castele = Entropy;
},
catapult:function(c,t){
	t.die();
	c.owner.foe.dmg(Math.ceil(t.truehp()*(t.frozen?150:100)/(t.truehp()+100)));
	c.owner.foe.poison += t.poison;
	if (t.frozen){
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
	chim.momentum = true;
	c.owner.creatures = [chim];
	c.owner.creatures.length = 23;
	c.owner.gpull = chim;
},
cpower:function(c,t){
	t.buffhp(Math.ceil(rng.real()*5));
	t.atk += Math.ceil(rng.real()*5);
},
cseed:function(c,t){
	Actives[["drainlife", "firebolt", "freeze", "gpullspell", "icebolt", "infect", "lightning", "lobotomize", "parallel", "rewind", "snipe", "swave"][Math.floor(rng.real()*12)]](c, t);
},
dagger:function(c,t){
	return c.owner.mark == Darkness||c.owner.mark == Death?1:0;
},
deadalive:function(c,t){
	c.deatheffect();
},
deja:function(c,t){
	c.active.cast = undefined;
	Actives.parallel(c, c);
},
destroy:function(c,t, dontsalvage){
	if (t.passives.stackable){
		if(--t.charges<=0){
			t.die();
		}
	}else t.die();
	if (!dontsalvage){
		salvageScan(c.owner, t);
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
	if (t.weapon && t.hand.length < 8){
		t.hand.push(t.weapon.card);
		t.weapon = undefined;
	}
},
disfield:function(c,t){
	if (!c.owner.sanctuary){
		if (!c.owner.spend(Other, t.trueatk())){
			for(var i=1; i<13; i++){
				c.owner.quanta[i] = 0;
			}
			c.owner.shield = undefined;
		}
		return true;
	}
},
disshield:function(c,t){
	if (!c.owner.sanctuary){
		if (!c.owner.spend(Entropy, Math.ceil(t.trueatk()/3))){
			c.owner.quanta[Entropy] = 0;
			c.owner.shield = undefined;
		}
		return true;
	}
},
dive:function(c,t){
	c.dive += c.trueatk();
},
divinity:function(c,t){
	c.owner.buffhp(c.owner.mark == Light?24:16);
},
drainlife:function(c,t){
	c.dmg(-t.spelldmg(2+Math.floor(c.owner.quanta[Darkness]/10)*2));
},
dryspell:function(c,t){
	dmg = c.card.upped?2:1;
	var self=c;
	function dryeffect(c,cr){
		self.spend(Water, -cr.dmg(dmg));
	}
	c.owner.foe.masscc(c, dryeffect);
	if (!c.card.upped){
		c.owner.masscc(c, dryeffect);
	}
},
dshield:function(c,t){
	c.immaterial = true;
},
duality:function(c,t){
	if (c.owner.foe.deck.length > 0 && c.owner.hand.length < 8){
		c.owner.hand.push(c.owner.foe.deck[c.owner.foe.deck.length-1])
	}
},
earth:function(c,t){
	c.owner.spend(Earth, -1);
},
earthquake:function(c,t){
	if (t.charges>3){
		t.charges -= 3;
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
	t.immaterial = true
},
endow:function(c,t){
	c.active = clone(t.active);
	c.cast = t.cast;
	c.castele = t.castele;
	c.atk += t.trueatk();
	if (t.active.buff){
		c.atk -= t.active.buff(t);
	}
	for(var key in t){
		if (t[key] === true && key != "usedactive")c[key] = true;
	}
	for(var key in t.passives){
		c[key] = t.passives[t];
	}
	if (t.adrenaline>0){
		c.adrenaline = 1
	}
	c.buffhp(2);
},
evolve:function(c,t){
	c.transform(Cards.Shrieker.asUpped(c.card.upped));
	c.burrowed = false;
},
fiery:function(c,t){
	return Math.floor(c.owner.quanta[Fire]/5);
},
fire:function(c,t){
	c.owner.spend(Fire, -1);
},
firebolt:function(c,t){
	t.spelldmg(3+Math.floor(c.owner.quanta[Fire]/10)*3);
},
flyingweapon:function(c,t){
	if (t.weapon){
		var cr = new Creature(t.weapon.card, t.owner);
		cr.passives = clone(t.weapon.passives);
		for (var key in t.weapon){
			if (t.weapon[key] === true)cr[key] = true;
		}
		cr.place();
		t.weapon = undefined;
	}
},
fractal:function(c,t){
	c.owner.quanta[Aether] = 0;
	for(var i=c.owner.hand.length; i<8; i++){
		c.owner.hand[i] = t.card;
	}
},
freeze:function(c,t){
	t.freeze(c.card.upped && c.card != Cards.PandemoniumUp ? 4 : 3);
},
gas:function(c,t){
	new Permanent(Cards.UnstableGas.asUpped(c.card.upped), c.owner).place();
},
gpull:function(c,t){
	c.owner.gpull = c;
},
gpullspell:function(c,t){
	t.owner.gpull = t;
},
gratitude:function(c,t){
	c.owner.dmg(c.owner.mark == Life?-5:-3);
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
	c.transform(randomcard(c.card.upped, function(x){return x.type == CreatureEnum}));
},
heal:function(c,t){
	t.dmg(-5);
},
heal20:function(c,t){
	c.owner.dmg(-20);
},
holylight:function(c,t){
	t.dmg(!(t instanceof Player) && (t.card.element == Darkness || t.card.element == Death)?10:-10);
},
hope:function(c,t){
	var dr=0;
	for(var i=0; i<23; i++){
		if(c.owner.creatures[i] && c.owner.creatures[i].active.auto == Actives.light){
			dr++;
		}
	}
	return dr;
},
icebolt:function(c,t){
	var bolts = 1+Math.floor(c.owner.quanta[Water]/10);
	t.spelldmg(bolts*2);
	if (rng.real() < .3+bolts/10){
		t.freeze(3);
	}
},
ignite:function(c,t){
	c.die();
	c.owner.foe.spelldmg(20);
	c.owner.foe.masscc(c, function(c,x){x.dmg(1)});
	c.owner.masscc(c, function(c,x){x.dmg(1)});
},
immolate:function(c,t){
	t.die();
	for(var i=1; i<13; i++)
		c.quanta[i]++;
	c.quanta[Fire] += c.card.upped?7:5;
},
improve:function(c,t){
	t.transform(randomcard(false, function(x){return x.type == CreatureEnum}));
	var abilities = [null,null,"hatch","freeze","burrow","destroy","steal","dive","heal","paradox","lycanthropy","scavenger","infection","gpull","devour","mutation","growth","ablaze","poison","deja","endow","guard","mitosis"];
	var active = Actives[abilities[Math.floor(rng.real()*abilities.length)]];
	if (!active){
		if(rng.real()<.5){
			t.momentum = true;
		}else{
			t.immaterial = true;
		}
	}
	if (active == Actives.scavenger){
		t.active.auto = active;
		t.cast = -1;
	}else{
		t.active.cast = active;
		t.cast = Math.ceil(rng.real()*2);
		t.castele = t.card.element;
	}
	t.buffhp(Math.floor(rng.real()*5));
	t.atk += Math.floor(rng.real()*5);
},
infect:function(c,t){
	t.addpoison(1);
},
infest:function(c,t){
	if(!c.usedactive){
		new Creature(Cards.MalignantCell, c.owner).place();
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
		vampire: -2, liquid: 2, steal: 3,
		lobotomize: 2, quint: 2,
	};
	var hp=1, atk=4, bonus=c.card.upped?1:0;
	for(var i=c.owner.hand.length-1; i>=0; i--){
		var card = c.owner.hand[i];
		if (~ShardList.indexOf(card.code)){
			if (card.upped){
				bonus++;
			}
			shardTally[card.element]++;
			c.owner.hand.splice(i, 1);
		}
	}
	var active = "burrow", num=0, cast=0;
	for(var i=1; i<13; i++){
		atk += shardTally[i]*(i==Gravity?0:i==Earth?1:i==Fire?3:2);
		hp += shardTally[i]*(i==Gravity?6:i==Earth?4:i==Fire?0:2);
		if (shardTally[i]>num){
			num = shardTally[i];
			active = shardSkills[i][num];
		}
	}
	var actives = {}, cost = shardCosts[active];
	actives[cost<0?activeType[~cost]:"cast"] = Actives[active];
	var passives = {};
	if (shardTally[Air]>0){
		passives.airborne = true;
	}
	if (shardTally[Darkness]>0){
		passives.voodoo = true;
	}
	c.owner.shardgolem = {
		atk: atk + bonus,
		hp: hp + bonus,
		passives: passives,
		immaterial: shardTally[Aether]>1,
		momentum: shardTally[Gravity]>1,
		adrenaline: shardTally[Life]>1?1:0,
		active: actives,
		cast: cast
	};
	new Creature(Cards.ShardGolem, c.owner).place();
},
light:function(c,t){
	c.owner.spend(Light, -1);
},
lightning:function(c,t){
	t.spelldmg(5);
},
liquid:function(c,t){
	t.active.hit = Actives.vampire;
	t.addpoison(1);
},
lobotomize:function(c,t){
	t.active = {};
	t.momentum = false;
	t.psion = false;
},
losecharge:function(c,t){
	if(--c.charges<0){
		c.die();
	}
},
luciferin:function(c,t){
	c.owner.dmg(-10);
	c.owner.masscc(c, function(c,x){
		// TODO OP? Need to make sure there's no other actives
		if (isEmpty(x.active)){
			x.active.auto = Actives.light;
		}
	})
},
lycanthropy:function(c,t){
	c.buffhp(5);
	c.atk += 5;
	c.active.cast = undefined;
},
miracle:function(c,t){
	c.quanta[Light] = 0;
	if (c.sosa){
		c.hp = 1;
	}else{
		if (c.hp<c.maxhp)c.hp = c.maxhp-1;
	}
},
mitosis:function(c,t){
	new Creature(c.card, c.owner).place();
},
mitosisspell:function(c,t){
	t.active.cast = Actives.mitosis;
	t.castele = t.card.element;
	t.cast = t.card.cost;
},
momentum:function(c,t){
	t.atk += 1;
	t.buffhp(1);
	t.momentum = true;
},
mutation:function(c,t){
	var rnd = rng.real();
	if (rnd<.1){
		t.die();
	}else if (rnd<.5){
		Actives.improve(c, t);
	}else{
		t.transform(Cards.Abomination);
	}
},
neuro:function(c,t){
	t.poison += 1
	t.neuro = true
},
neuroify:function(c,t){
	if (c.foe.poison>0){
		c.foe.neuro = true;
	}
},
nightmare:function(c,t){
	if (!c.owner.foe.sanctuary){
		c.owner.dmg(-c.owner.foe.dmg(16-c.owner.foe.hand.length*2));
		for(var i = c.owner.foe.hand.length; i<8; i++){
			c.owner.foe.hand[i] = t.card;
		}
	}
},
nova:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.quanta[i]++;
	}
	c.owner.nova++;
	if (c.owner.nova >= 3){
		new Creature(Cards.Singularity, c.owner).place();
	}
},
nova2:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.quanta[i] += 2;
	}
	c.owner.nova += 2;
	if (c.owner.nova >= 3){
		new Creature(Cards.SingularityUp, c.owner).place();
	}
},
nymph:function(c,t){
	var e = t.card.element > 0?t.card.element:Math.ceil(rng.real()*12);
	Actives.destroy(c, t);
	new Creature(Cards[NymphList[e*2+(t.card.upped?1:0)]], t.owner).place();
},
overdrive:function(c,t){
	c.atk += 3;
	c.dmg(1, true);
},
overdrivespell:function(c,t){
	t.active.auto = Actives.overdrive;
},
pandemonium:function(c,t){
	c.owner.foe.masscc(c, Actives.cseed);
	if (!c.card.upped){
		c.owner.masscc(c, Actives.cseed);
	}
},
paradox:function(c,t){
	if (t.trueatk()>t.truehp())t.die();
},
parallel:function(c,t){
	var copy = new Creature(t.card, c.owner);
	for(var attr in t){
		if (t.hasOwnProperty(attr))copy[attr] = t[attr];
	}
	copy.passives = clone(copy.passives);
	copy.owner = c.owner;
	copy.usedactive = true;
	copy.place();
	if (copy.voodoo){
		c.owner.foe.dmg(copy.maxhp-copy.hp);
		c.owner.foe.addpoison(copy.poison);
		if (c.owner.foe.weapon){
			c.owner.foe.delay(copy.delayed);
			if (copy.frozen>c.owner.foe.weapon.frozen){
				c.owner.foe.freeze(copy.frozen);
			}
		}
	}
},
phoenix:function(c,t, index){
	if (c == t && !c.owner.creatures[index]){
		c.owner.creatures[index] = new Creature(Cards.Ash.asUpped(c.card.upped), c.owner);
	}
},
photosynthesis:function(c,t){
	c.owner.spend(Life, -2);
	if (c.cast > 0){
		c.usedactive = false;
	}
},
plague:function(c,t){
	c.owner.foe.masscc(c, Actives.infect);
},
platearmor:function(c,t){
	t.buffhp(c.card.upped?6:3);
},
poison:function(c,t){
	c.owner.foe.poison += 1;
},
poison2:function(c,t){
	c.owner.foe.poison += 2;
},
poison3:function(c,t){
	c.owner.foe.poison += 3;
},
precognition:function(c,t){
	c.owner.drawcard();
	c.owner.precognition = true;
},
purify:function(c,t){
	t.poison = Math.min(t.poison-2,-2);
	if (t instanceof Player){
		t.neuro = false;
		t.sosa = 0;
	}else{
		t.aflatoxin = false;
	}
},
queen:function(c,t){
	new Creature(Cards.Firefly.asUpped(c.card.upped), c.owner).place();
},
quint:function(c,t){
	t.immaterial = true;
	t.frozen = 0;
},
rage:function(c,t){
	var dmg = c.card.upped?6:5;
	t.atk += dmg;
	t.dmg(dmg);
},
readiness:function(c,t){
	if (t.active.cast){
		t.cast = 0;
		if (t.card.element == Time){
			t.usedactive = false;
		}
	}
},
rebirth:function(c,t){
	c.transform(Cards.Phoenix.asUpped(c.card.upped));
},
regenerate:function(c,t){
	c.owner.dmg(-5);
},
rewind:function(c,t){
	if (t.undead){
		Actives.hatch(t);
	}else if (t.mummy){
		t.transform(Cards.Pharaoh.asUpped(t.card.upped));
	}else{
		t.remove();
		t.owner.deck.push(t.card);
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
		cards[i] = randomcard(c.card.upped, function(x){return x.type != PillarEnum && !~NymphList.indexOf(x.code) && !~ShardList.indexOf(x.code) && (i>0 || anyentro || x.element == Entropy)});
		anyentro |= cards[i].element == Entropy;
	}
	for(var i=0; i<num; i++){
		c.owner.hand.push(cards[i]);
	}
},
silence:function(c,t){
	c.owner.foe.silence = !c.owner.foe.sanctuary;
},
siphon:function(c,t){
	if (c.owner.foe.spend(Other, 1)){
		c.owner.spend(Darkness, -1)
	}
},
skyblitz:function(c,t){
	c.quanta[Air] = 0;
	for(var i=0; i<23; i++){
		if (c.creatures[i] && c.creatures[i].passives.airborne){
			Actives.dive(c.creatures[i]);
		}
	}
},
snipe:function(c,t){
	t.dmg(3);
},
sosa:function(c,t){
	c.sosa += 2;
	for(var i=1; i<13; i++){
		if (i != Death){
			c.quanta[i] = 0;
		}
	}
	c.dmg(c.card.upped?40:48, true);
},
soulcatch:function(c,t){
	c.owner.spend(Death, c.card.upped?-3:-2);
},
sskin:function(c,t){
	c.buffhp(c.quanta[Earth]);
},
steal:function(c,t){
	if (t.passives.stackable){
		Actives.destroy(c, t, true);
		if (t instanceof Shield){
			if (c.owner.shield && c.owner.shield.card == t.card){
				c.owner.shield.charges++;
			}else{
				c.owner.shield = new Shield(t.card, c.owner);
				c.owner.shield.charges = 1;
			}
		}else if (t instanceof Weapon){
			if (c.owner.weapon && c.owner.weapon.card == t.card){
				c.owner.shield.charges++;
			}else{
				c.owner.weapon = new Weapon(t.card, c.owner);
				c.owner.weapon.charges = 1;
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
	c.steamatk += 5;
},
stoneform:function(c,t){
	c.buffhp(20);
	c.active.cast = undefined;
},
storm2:function(c,t){
	c.owner.foe.masscc(c, function(c,x){x.dmg(2)});
},
storm3:function(c,t){
	c.owner.foe.masscc(c, Actives.snipe);
},
swave:function(c,t){
	t.spelldmg(4);
},
unburrow:function(c,t){
	c.burrowed = false;
	c.active.cast = Actives.burrow;
	c.cast = 1;
},
vampire:function(c,t, dmg){
	c.owner.dmg(-dmg);
},
void:function(c,t){
	c.owner.foe.maxhp = Math.max(c.owner.foe.maxhp-3, 1);
	if (c.owner.foe.hp > c.owner.foe.maxhp){
		c.owner.foe.hp = c.owner.foe.maxhp;
	}
},
watergift:function(c,t){
	c.spend(Water, -3);
	c.spend(c.mark, -3);
},
web:function(c,t){
	t.passives.airborne = false;
},
wisdom:function(c,t){
	t.atk += 4;
	if (t.immaterial){
		t.psion = true;
	}
},
pillar:function(c,t){
	c.owner.spend(c.card.element,-c.charges*(c.card.element>0?1:3));
},
pend:function(c,t){
	c.owner.spend(c.pendstate?c.owner.mark:c.card.element,-c.charges);
	c.pendstate ^= true;
},
skull:function(c,t){
	if (t instanceof Creature){
		var thp = t.truehp();
		if (thp <= 0 || rng.real() < .5/thp){
			var index = t.getIndex();
			t.die();
			if (!t.owner.creatures[index] || t.owner.creatures[index].card != Cards.MalignantCell){
				t.owner.creatures[index] = new Creature(Cards.Skeleton.asUpped(t.card.upped), t.owner);
			}
		}
	}
},
bones:function(c,t){
	if (--c.charges <= 0){
		c.owner.shield = undefined;
	}
	return true;
},
weight:function(c,t){
	return t instanceof Creature && t.truehp()>5;
},
thorn:function(c,t){
	if (rng.real()<.75){
		t.addpoison(1);
	}
},
firewall:function(c,t){
	t.dmg(1);
},
cold:function(c,t){
	if (rng.real()<.3){
		t.freeze(3);
	}
},
solar:function(c,t){
	if (!c.owner.sanctuary){
		c.owner.spend(Light, -1);
	}
},
evade40:function(c,t){
	return rng.real()>.4;
},
wings:function(c,t){
	return !t.passives.airborne && !t.passives.ranged;
},
slow:function(c,t){
	t.delay(1);
},
evade50:function(c,t){
	return rng.real()>.5;
},
evade100:function(c,t){
	return true;
},
}