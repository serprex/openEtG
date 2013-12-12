var Actives = {
ablaze:function(t){
	this.atk += 2;
},
acceleration:function(t){
	this.atk += 2;
	this.dmg(1,true);
},
accelerationspell:function(t){
	t.cast = -1;
	t.active = Actives.acceleration;
},
accretion:function(t){
	Actives.destroy.call(this, t);
	this.buffhp(15);
	if (this.truehp() > 45){
		this.die();
		if (this.owner.hand.length < 8){
			this.owner.hand.push(this.card.upped?Cards.BlackHoleUp:Cards.BlackHole);
		}
	}
},
adrenaline:function(t){
	t.adrenaline = 1;
},
aflatoxin:function(t){
	t.addpoison(2);
	t.aflatoxin = true;
},
air:function(t){
	this.owner.spend(Air, -1);
},
antimatter:function(t){
	t.atk -= t.trueatk()*2;
},
bblood:function(t){
	t.buffhp(20);
	t.delay(6);
},
blackhole:function(t){
	if (!this.owner.foe.sanctuary){
		quanta = this.owner.foe.quanta;
		for (var q=1; q<13; q++){
			this.owner.dmg(-Math.min(quanta[q],3));
			quanta[q] = Math.max(quanta[q]-3,0);
		}
	}
},
bless:function(t){
	t.atk += 3;
	t.buffhp(3);
},
bow:function(t){
	return this.owner.mark == Air?1:0;
},
bravery:function(t){
	if (!this.owner.foe.sanctuary){
		var maxdraw = this.owner.mark == Fire?3:2;
		for(var i=0; i<maxdraw && this.owner.hand.length<8 && this.owner.foe.hand.length<8; i++){
			this.owner.drawcard();
			this.owner.foe.drawcard();
		}
	}
},
burrow:function(t){
	this.burrowed = true;
	this.active = Actives.unburrow;
	this.cast = 0;
},
butterfly:function(t){
	if (t.trueatk() < 3){
		t.cast = 3;
		t.castele = Entropy;
		t.active = Actives.destroy;
	}
},
catapult:function(t){
	t.die();
	this.owner.foe.dmg(Math.ceil(t.truehp()*(t.frozen?150:100)/(t.truehp()+100)));
	this.owner.foe.poison += t.poison;
	if (t.frozen){
		this.owner.foe.freeze(3);
	}
},
chimera:function(t){
	var atk=0, hp=0;
	for(var i=0; i<23; i++){
		if (this.owner.creatures[i]){
			atk += this.owner.creatures[i].trueatk();
			hp += this.owner.creatures[i].truehp();
		}
	}
	var chim = new Creature(this.card, this.owner);
	chim.atk = atk;
	chim.maxhp = hp;
	chim.hp = hp;
	chim.cast = 0;
	chim.castele = 0;
	chim.momentum = true;
	this.owner.creatures = [chim];
	this.owner.creatures.length = 23;
	this.owner.gpull = chim;
},
cpower:function(t){
	t.buffhp(Math.ceil(rng.real()*5));
	t.atk += Math.ceil(rng.real()*5);
},
cseed:function(t){
	Actives[["drainlife", "firebolt", "freeze", "gpullspell", "icebolt", "infect", "lightning", "lobotomize", "parallel", "rewind", "snipe", "swave"][Math.floor(rng.real()*12)]].call(this, t);
},
dagger:function(t){
	return this.owner.mark == Darkness||this.owner.mark == Death?1:0;
},
deadalive:function(t){
	deatheffect();
},
deja:function(t){
	this.active = undefined;
	Actives.parallel.call(this, this);
},
destroy:function(t, dontsalvage){
	if ((t instanceof Pillar || t.card == Cards.BoneWall || t.card == Cards.BoneWallUp) && t.charges>1){
		t.charges--;
	}else{
		t.die();
	}
	if (!dontsalvage){
		salvageScan(this.owner, t);
	}
},
devour:function(t){
	if (this.truehp() > t.truehp()){
		this.buffhp(1);
		this.atk += 1;
		if (t.passive == "poisonous"){
			this.addpoison(1);
		}
		t.die();
	}
},
die:function(t){
	this.die();
},
disfield:function(t){
	if (!this.owner.sanctuary){
		if (!this.owner.spend(Other, t.trueatk())){
			for(var i=1; i<13; i++){
				this.owner.quanta[i] = 0;
			}
			this.owner.shield = undefined;
		}
		return true;
	}
},
disshield:function(t){
	if (!this.owner.sanctuary){
		if (!this.owner.spend(Entropy, Math.ceil(t.trueatk()/3))){
			this.owner.quanta[Entropy] = 0;
			this.owner.shield = undefined;
		}
		return true;
	}
},
dive:function(t){
	this.dive += this.trueatk();
},
divinity:function(t){
	this.owner.buffhp(this.owner.mark == Light?24:16);
},
drainlife:function(t){
	this.dmg(-t.spelldmg(2+Math.floor(this.owner.quanta[Darkness]/10)*2));
},
dryspell:function(t){
	dmg = this.card.upped?2:1;
	var self=this;
	function dryeffect(cr){
		self.spend(Water, -cr.dmg(dmg));
	}
	masscc(this.foe, this, dryeffect);
	if (!this.card.upped){
		masscc(this, this, dryeffect);
	}
},
dshield:function(t){
	this.immaterial = true;
},
duality:function(t){
	if (this.owner.foe.deck.length > 0 && this.owner.hand.length < 8){
		this.owner.hand.push(this.owner.foe.deck[this.owner.foe.deck.length-1])
	}
},
earth:function(t){
	this.owner.spend(Earth, -1);
},
earthquake:function(t){
	if (t.charges>3){
		t.charges -= 3;
	}else{
		t.die();
	}
	salvageScan(this.owner, t);
},
empathy:function(t){
	var healsum = 0;
	for(var i=0; i<23; i++){
		if (this.owner.creatures[i])healsum++;
	}
	this.owner.dmg(-healsum);
},
enchant:function(t){
	t.immaterial = true
},
endow:function(t){
	this.active = t.active;
	this.cast = t.cast;
	this.castele = t.castele;
	this.passive = t.passive;
	this.atk += t.trueatk();
	if (t.active && t.cast == -3){
		this.atk -= t.active();
	}
	this.momentum |= t.momentum;
	this.psion |= t.psion;
	if (t.adrenaline>0){
		this.adrenaline = 1
	}
	this.buffhp(2);
},
evolve:function(t){
	this.owner.creatures[this.remove()] = new Creature(this.card.upped?Cards.EliteShrieker:Cards.Shrieker, this.owner, this.poison);
},
fiery:function(t){
	return Math.floor(this.owner.quanta[Fire]/5);
},
fire:function(t){
	this.owner.spend(Fire, -1);
},
firebolt:function(t){
	t.spelldmg(3+Math.floor(this.owner.quanta[Fire]/10)*3);
},
flyingweapon:function(t){
	if (t.weapon){
		var cr = new Creature(t.weapon.card, t.owner);
		cr.passive = t.weapon.passive;
		cr.airborne = true;
		place(t.owner.creatures, cr);
		t.weapon = undefined;
	}
},
fractal:function(t){
	this.owner.quanta[Aether] = 0;
	for(var i=this.owner.hand.length; i<8; i++){
		this.owner.hand[i] = t.card;
	}
},
freeze:function(t){
	t.freeze(this.card.upped && this.card != Cards.PandemoniumUp ? 4 : 3);
},
gas:function(t){
	place(this.owner.permanents, new Permanent(this.card.upped?Cards.UnstableGasUp:Cards.UnstableGas, this.owner))
},
gpull:function(t){
	this.owner.gpull = this;
},
gpullspell:function(t){
	t.owner.gpull = t;
},
gratitude:function(t){
	this.owner.dmg(this.owner.mark == Life?-5:-3);
},
growth:function(t){
	this.buffhp(2);
	this.atk += 2;
},
guard:function(t){
	this.delay(1);
	t.delay(1);
	if (!t.airborne){
		t.dmg(this.trueatk());
	}
},
hammer:function(t){
	return this.owner.mark == Gravity||this.owner.mark == Earth?1:0;
},
hasten:function(t){
	this.owner.drawcard();
},
hatch:function(t){
	this.owner.creatures[this.remove()] = new Creature(randomcard(this.card.upped, function(x){return x.type == CreatureEnum}), this.owner, this.poison);
},
heal:function(t){
	t.dmg(-5);
},
heal20:function(t){
	this.owner.dmg(-20);
},
holylight:function(t){
	t.dmg(!(t instanceof Player) && (t.card.element == Darkness || t.card.element == Death)?10:-10);
},
icebolt:function(t){
	var bolts = 1+Math.floor(this.owner.quanta[Water]/10);
	t.spelldmg(bolts*2);
	if (rng.real() < .3+bolts/10){
		t.freeze(3);
	}
},
ignite:function(t){
	this.die();
	this.owner.foe.spelldmg(20);
	masscc(this.owner.foe, this, function(x){x.dmg(1)});
	masscc(this.owner, this, function(x){x.dmg(1)});
},
immolate:function(t){
	t.die();
	for(var i=1; i<13; i++)
		this.quanta[i]++;
	this.quanta[Fire] += this.card.upped?7:5;
},
improve:function(t){
	var cr = new Creature(randomcard(false, function(x){return x.type == CreatureEnum}), t.owner, this.poison);
	var abilities = [null,null,"hatch","freeze","burrow","destroy","steal","dive","heal","paradox","lycanthropy","scavenger","infection","gpull","devour","mutation","growth","ablaze","poison","deja","endow","guard","mitosis"];
	cr.active = Actives[abilities[Math.floor(rng.real()*abilities.length)]];
	if (!cr.active){
		cr.passive = rng.real()<.5?"momentum":"immaterial";
	}
	if (cr.active == Actives.scavenger){
		cr.cast = -1;
	}else{
		cr.cast = Math.ceil(rng.real()*2);
		cr.castele = cr.card.element;
	}
	cr.buffhp(Math.floor(rng.real()*5));
	cr.atk += Math.floor(rng.real()*5);
	t.owner.creatures[t.remove()] = cr;
},
infect:function(t){
	t.addpoison(1);
},
infest:function(t){
	if(!this.usedactive){
		place(this.owner.creatures, new Creature(Cards.MalignantCell, this.owner));
	}
},
integrity:function(t){
	var shardTally = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
	var shardSkills = [
		[],
		["deadalive", "mutation", "paradox", "improve", "scramble", "antimatter"],
		["infect", "scavenger", "poison", "poison", "aflatoxin", "poison2"],
		["devour", "devour", "devour", "devour", "devour", "blackhole"],
		["burrow", "stoneform", "guard", "guard", "bblood", "bblood"],
		["growth", "adrenaline", "adrenaline", "adrenaline", "adrenaline", "adrenaline", "mitosis"],
		["ablaze", "ablaze", "fiery", "destroy", "destroy", "rage"],
		["steam", "steam", "freeze", "freeze", "nymph", "nymph"],
		["heal", "endow", "endow", "luciferin", "luciferin", "luciferin"],
		["queen", "queen", "sniper", "dive", "gas", "gas"],
		["scarab", "scarab", "deja", "neuro", "precognition", "precognition"],
		["vampire", "vampire", "vampire", "liquid", "liquid", "steal"],
		["lobotomize", "lobotomize", "lobotomize", "quint", "quint", "quint"],
	];
	var shardCosts = {
		burrow:1, stoneform:1, guard:1, petrify:2,
		deadalive:1, mutation: 2, paradox: 2, improve: 2, scramble: -2, antimatter: 4,
		infection:1, scavenger: -1, poison: -2, aflatoxin: 2, poison2: -2,
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
	var hp=1, atk=4, bonus=this.card.upped?1:0;
	for(var i=this.owner.hand.length-1; i>=0; i--){
		var card = this.owner.hand[i];
		if (~ShardList.indexOf(card.code)){
			if (card.upped){
				bonus++;
			}
			shardTally[card.element]++;
			this.owner.hand.splice(i, 1);
		}
	}
	var active = Actives.burrow, num=0;
	for(var i=1; i<13; i++){
		atk += shardTally[i]*(i==Gravity?0:i==Earth?1:i==Fire?3:2);
		hp += shardTally[i]*(i==Gravity?6:i==Earth?4:i==Fire?0:2);
		if (shardTally[i]>num){
			num = shardTally[i];
			active = shardSkills[i][num];
		}
	}
	this.owner.shardgolem = {
		atk: atk + bonus,
		hp: hp + bonus,
		airborne: shardTally[Air]>0,
		passive: shardTally[Darkness]>1?"voodoo":shardTally[Darkness]==1?"devour":undefined,
		immaterial: shardTally[Aether]>1,
		momentum: shardTally[Gravity]>1,
		adrenaline: shardTally[Life]>1?1:0,
		active: Actives[active],
		cast: shardCosts[active]
	};
	place(this.owner.creatures, new Creature(Cards.ShardGolem, this.owner));
},
light:function(t){
	this.owner.spend(Light, -1);
},
lightning:function(t){
	t.spelldmg(5);
},
liquid:function(t){
	t.cast = -2;
	t.active = Actives.vampire;
	t.addpoison(1);
},
lobotomize:function(t){
	t.active = undefined;
	t.momentum = false;
	t.psion = false;
},
luciferin:function(t){
	this.owner.dmg(-10);
	masscc(this.owner, this, function(x){
		if (!x.active){
			x.cast = -1;
			x.active = Actives.light;
		}
	})
},
lycanthropy:function(t){
	this.buffhp(5);
	this.atk += 5;
	this.active = undefined;
},
miracle:function(t){
	this.quanta[Light] = 0;
	if (this.sosa){
		this.hp = 1;
	}else{
		if (this.hp<this.maxhp)this.hp = this.maxhp-1;
	}
},
mitosis:function(t){
	place(this.owner.creatures, new Creature(this.card, this.owner))
},
mitosisspell:function(t){
	t.castele = t.card.element;
	t.cast = t.card.cost;
	t.active = Actives.mitosis;
},
momentum:function(t){
	t.atk += 1;
	t.buffhp(1);
	t.momentum = true;
},
mutation:function(t){
	var rnd = rng.real();
	if (rnd<.1){
		t.die();
	}else if (rnd<.5){
		Actives.improve.call(this, t);
	}else{
		t.owner.creatures[t.remove()] = new Creature(Cards.Abomination, t.owner, this.poison);
	}
},
neuro:function(t){
	t.poison += 1
	t.neuro = true
},
nightmare:function(t){
	if (!this.owner.foe.sanctuary){
		this.owner.dmg(-this.owner.foe.dmg(16-this.owner.foe.hand.length*2));
		for(var i = this.owner.foe.hand.length; i<8; i++){
			this.owner.foe.hand[i] = t.card;
		}
	}
},
nova:function(t){
	for (var i=1; i<13; i++){
		this.owner.quanta[i]++;
	}
	this.owner.nova++;
	if (this.owner.nova >= 3){
		place(this.owner.creatures, new Creature(Cards.Singularity, this.owner));
	}
},
nova2:function(t){
	for (var i=1; i<13; i++){
		this.owner.quanta[i] += 2;
	}
	this.owner.nova += 2;
	if (this.owner.nova >= 3){
		place(this.owner.creatures, new Creature(Cards.SingularityUp, this.owner));
	}
},
nymph:function(t){
	var e = t.card.element > 0?t.card.element:Math.ceil(rng.real()*12);
	Actives.destroy.call(this, t);
	place(this.owner.creatures, new Creature(Cards[NymphList[e*2+(t.card.upped?1:0)]], t.owner));
},
overdrive:function(t){
	this.atk += 3;
	this.dmg(1, true);
},
overdrivespell:function(t){
	t.cast = -1;
	t.active = Actives.overdrive;
},
pandemonium:function(t){
	masscc(this.owner.foe, this, Actives.cseed);
	if (!this.card.upped){
		masscc(this.owner, this, Actives.cseed);
	}
},
paradox:function(t){
	if (t.trueatk()>t.truehp())t.die();
},
parallel:function(t){
	var copy = new Creature(t.card, this.owner);
	for(var attr in t){
		if (t.hasOwnProperty(attr))copy[attr] = t[attr];
	}
	copy.owner = this.owner;
	copy.usedactive = true;
	place(this.owner.creatures, copy);
	if (copy.passive == "voodoo"){
		this.owner.foe.dmg(copy.maxhp-copy.hp);
		this.owner.foe.addpoison(copy.poison);
		if (this.owner.foe.weapon){
			this.owner.foe.delay(copy.delayed);
			if (copy.frozen>this.owner.foe.weapon.frozen){
				this.owner.foe.freeze(copy.frozen);
			}
		}
	}
},
phoenix:function(t){
},
photosynthesis:function(t){
	this.owner.spend(Life, -2);
	if (this.cast > 0){
		this.usedactive = false;
	}
},
plague:function(t){
	masscc(this.owner.foe, this, Actives.infect);
},
platearmor:function(t){
	t.buffhp(this.card.upped?6:3);
},
poison:function(t){
	this.owner.foe.poison += 1;
},
poison2:function(t){
	this.owner.foe.poison += 2;
},
poison3:function(t){
	this.owner.foe.poison += 3;
},
precognition:function(t){
	this.owner.drawcard();
	this.owner.precognition = true;
},
purify:function(t){
	t.poison = Math.min(t.poison-2,-2);
	t.neuro = false;
	t.aflatoxin = false;
	t.sosa = 0;
},
queen:function(t){
	place(this.owner.creatures, new Creature(this.card.upped?Cards.EliteFirefly:Cards.Firefly, this.owner));
},
quint:function(t){
	t.immaterial = true;
	t.frozen = 0;
},
rage:function(t){
	var dmg = this.card.upped?6:5;
	t.atk += dmg;
	t.dmg(dmg);
},
readiness:function(t){
	if (t.cast >= 0){
		t.cast = 0;
		if (t.card.element == Time){
			t.usedactive = false;
		}
	}
},
rebirth:function(t){
	this.owner.creatures[this.remove()] = new Creature(this.card.upped?Cards.MinorPhoenix:Cards.Phoenix, this.owner, this.poison);
},
regenerate:function(t){
	this.owner.dmg(-5);
},
rewind:function(t){
	if (t.passive == "undead"){
		Actives.hatch.call(t);
	}else if (t.passive == "mummy"){
		t.owner.creatures[t.remove()] = new Creature(t.card.upped?Cards.Pharaoh:Cards.PharaohUp, t.owner);
	}else{
		t.remove();
		t.owner.deck.push(t.card);
	}
},
sanctuary:function(t){
	this.owner.sanctuary = true;
	this.owner.dmg(-4);
},
scarab:function(t){
	place(this.owner.creatures, new Creature(this.card.upped?Cards.EliteScarab:Cards.Scarab, this.owner));
},
scavenger:function(t){
},
scramble:function(t){
	if (t instanceof Player && !t.sanctuary){
		for (var i=0; i<9; i++){
			if (t.spend(Other, 1)){
				t.spend(Other, -1);
			}
		}
	}
},
serendipity:function(t){
	var cards = [], num = Math.min(8-this.owner.hand.length, 3), anyentro = false;
	for(var i=num-1; i>=0; i--){
		cards[i] = randomcard(this.card.upped, function(x){return !~NymphList.indexOf(x.code) && !~ShardList.indexOf(x.code) && (i>0 || anyentro || x.element == Entropy)});
		anyentro |= cards[i].element == Entropy;
	}
	for(var i=0; i<num; i++){
		this.owner.hand.push(cards[i]);
	}
},
silence:function(t){
	this.owner.foe.silence = !this.owner.foe.sanctuary;
},
skyblitz:function(t){
	this.quanta[Air] = 0;
	for(var i=0; i<23; i++){
		if (this.creatures[i] && this.creatures[i].airborne){
			Actives.dive.call(this.creatures[i]);
		}
	}
},
snipe:function(t){
	t.dmg(3);
},
sosa:function(t){
	this.sosa += 2;
	for(var i=1; i<13; i++){
		if (i != Death){
			this.quanta[i] = 0;
		}
	}
	this.dmg(this.card.upped?40:48, true);
},
sskin:function(t){
	this.buffhp(this.quanta[Earth]);
},
steal:function(t){
	if (t instanceof Pillar){
		Actives.destroy.call(this, t, true);
		if (t.card.upped){
			this.spend(t.card.element, t.card.element>0?-1:-3);
		}
		for(var i=0; i<16; i++){
			if (this.owner.permanents[i] && this.owner.permanents[i].card == t.card){
				this.owner.permanents[i].charges++;
				return;
			}
		}
		place(this.owner.permanents, new Pillar(t.card, this.owner));
	}else if (t.card == Cards.BoneWall || t.card == Cards.BoneWallUp){
		Actives.destroy.call(this, t, true);
		if (this.owner.shield == Cards.BoneWall || this.owner.shield == Cards.BoneWallUp){
			this.owner.shield.charges++;
		}else{
			this.owner.shield = new Shield(t.card.upped?Cards.BoneWallUp:Cards.BoneWall, this.owner);
			this.owner.shield.charges = 1;
		}
	}else{
		t.die();
		t.owner = this.owner;
		if (t instanceof Weapon){
			this.owner.weapon = t;
		}else if (t instanceof Shield){
			this.owner.shield = t;
		}else{
			place(this.owner.permanents, t);
		}
	}
},
steam:function(t){
	this.steamatk += 5;
},
stoneform:function(t){
	this.buffhp(20);
},
storm2:function(t){
	masscc(this.owner.foe, this, function(x){x.dmg(2)});
},
storm3:function(t){
	masscc(this.owner.foe, this, Actives.snipe);
},
swave:function(t){
	t.spelldmg(4);
},
sword:function(t){
},
unburrow:function(t){
	this.burrowed = false;
	this.active = Actives.burrow;
	this.cast = 1;
},
vampire:function(t){
	this.owner.dmg(-this.dmgdone);
},
void:function(t){
	this.owner.foe.maxhp = Math.max(this.owner.foe.maxhp-(this.owner.mark == Darkness?3:2), 1);
	if (this.owner.foe.hp > this.owner.foe.maxhp){
		this.owner.foe.hp = this.owner.foe.maxhp;
	}
},
web:function(t){
	t.airborne = false;
},
wisdom:function(t){
	t.atk += 4;
	if (t.immaterial){
		t.psion = true;
	}
},
pillar:function(t){
	this.owner.spend(this.card.element,-this.charges*(this.card.element>0?1:3));
},
pend:function(t){
	this.owner.spend(this.pendstate?this.owner.mark:this.card.element,-this.charges);
	this.pendstate ^= true;
},
skull:function(t){
	if (t instanceof Creature){
		var thp = t.truehp();
		if (thp <= 0 || rng.real() < .5/thp){
			var index = t.getIndex()
			t.die();
			if (!t.owner.creatures[index] || t.owner.creatures[index].card != Cards.MalignantCell){
				t.owner.creatures[index] = new Creature(t.card.upped?Cards.EliteSkeleton:Cards.Skeleton, t.owner);
			}
		}
	}
},
bones:function(t){
	if (--this.charges <= 0){
		this.owner.shield = undefined;
	}
	return true;
},
weight:function(t){
	return t instanceof Creature && t.truehp()>5;
},
thorn:function(t){
	if (rng.real()<.75){
		t.addpoison(1);
	}
},
reflect:function(t){
},
firewall:function(t){
	t.dmg(1);
},
cold:function(t){
	if (rng.real()<.3){
		t.freeze(3);
	}
},
solar:function(t){
	if (!this.owner.sanctuary){
		this.owner.spend(Light, -1);
	}
},
hope:function(t){
},
evade40:function(t){
	return rng.real()>.4;
},
wings:function(t){
	return !t.airborne && t.passive != "ranged";
},
slow:function(t){
	t.delay(1);
},
evade50:function(t){
	return rng.real()>.5;
},
evade100:function(t){
	return true;
},
}