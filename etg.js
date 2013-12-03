function loadcards(cb){
	var Cards = {};
	var Targeting = {};
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	var count = 0;
	function maybeCallback(){
		if (++count == names.length+1)cb(Cards, Targeting);
	}
	for(var i=0; i<names.length; i++){
		var xhr = new XMLHttpRequest();
		xhr.open("GET",names[i] + ".csv",true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200){
				var csv = this.responseText.split("\n");
				var keys = csv[0].split(",");
				for(var j=1; j<csv.length; j++){
					var carddata = csv[j].split(",");
					var cardcode = carddata[2];
					var cardinfo = {};
					for(var k=0; k<carddata.length; k++)cardinfo[keys[k]] = carddata[k];
					Cards[carddata[1] in Cards?carddata[1].replace(" ","")+"Up":carddata[1]] = Cards[cardcode] = new Card(this.TYPE, cardinfo);
				}
				maybeCallback();
			}
		};
		xhr.TYPE = i;
		xhr.send();
	}
	var xhr = new XMLHttpRequest();
	xhr.open("GET","active.csv",true);
	xhr.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200){
			var csv = this.responseText.split("\n");
			for (var i=0; i<csv.length; i++){
				var keypair = csv[i].split(",");
				Targeting[Actives[keypair[0]]] = parseInt(keypair[1],10);
			}
			maybeCallback();
		}
	}
	xhr.send();
}
function etgReadCost(card, attr, cost, e){
	if(cost.indexOf("+") == -1){
		card[attr]=parseInt(cost);
		card[attr+"ele"]=e;
	}else{
		var c=cost.split("+");
		card[attr]=parseInt(c[0]);
		card[attr+"ele"]=parseInt(c[1]);
	}
}
function Card(type, info){
	this.type = type;
	this.element = parseInt(info.Element);
	this.name = info.Name;
	this.code = info.Code;
	this.upped = parseInt(this.code,32)>6999;
	this.attack = parseInt(info.Attack||"0");
	this.health = parseInt(info.Health||"0");
	etgReadCost(this, "cost", info.Cost||"0", this.element);
	etgReadCost(this, "cast", info.Cast||"0", this.element);
	this.active = Actives[info.Active];
	this.passive = info.Passive||undefined;
	this.airborne = info.Airborne == "1";
}
function randomquanta(quanta){
	var nonzero = 0
	for(var i=1; i<13; i++){
		if (quanta[i] > 0)nonzero++;
	}
	if (nonzero == 0){
		return -1;
	}
	nonzero = Math.floor(random()*nonzero);
	for(var i=1; i<13; i++){
		if (quanta[i]>0&&--nonzero == 0){
			return i;
		}
	}
}
function Player(){
	this.owner = this
	this.isPlayer = true;
	this.shield = null;
	this.weapon = null;
	this.poison = 0;
	this.neuro = false;
	this.sosa = 0;
	this.silence = false;
	this.sanctuary = false;
	this.gpull = null;
	this.nova = 0;
	this.maxhp = 100;
	this.hp = 100;
	this.hand = [];
	this.deck = [];
	this.creatures = new Array(23);
	this.permanents = new Array(23);
	this.quanta = [undefined,0,0,0,0,0,0,0,0,0,0,0,0];
	this.mark = 0;
}
Player.prototype.spend = function(qtype, x) {
	if (qtype == Other){
		var b = x<0?-1:1;
		var sum=0;
		for (var i=1; i<13; i++){
			sum += this.quanta[i];
		}
		if (sum >= x){
			for (var i=x*b; i>0; i--){
				this.quanta[b==-1?1+Math.floor(random()*12):randomquanta(this.quanta)] -= b
			}
			return true;
		}else return false;
	}else if (this.quanta[qtype] >= x){
		this.quanta[qtype] -= x;
		return true;
	}else return false;
}
Player.prototype.endturn = function() {
	this.foe.hp -= this.foe.poison;
	for (var i=0; i<23; i++){
		if(this.creatures[i])attack(this.creatures[i], this.foe);
	}
	this.spend(this.mark, -1);
	for (var i=0; i<23; i++){
		if (this.permanents[i]){
			var p = this.permanents[i];
			if (p.card.type == PillarEnum || p.cast == -1){
				p.active(p);
			}
			if (p.active == Actives.cloak || p.passive == "stasis"){
				p.charges -= 1;
				if (p.charges < 0){
					delete this.permanents[i];
				}
			}
		}
	}
	if (this.shield){
		if (this.shield.active == Actives.evade100 || this.shield.active == Actives.wings){
			this.shield.charges -= 1;
			if (this.shield.charges < 0){
				this.shield = new Permanent(noshield, this);
			}
		}
		else if (this.shield.active == Actives.hope){
			var hp = this.shield.card.upped?1:0;
			for (var i=0; i<23; i++){
				if (this.creatures[i] && this.creatures[i].active == Actives.light)
					hp++;
			}
			this.shield.health = hp;
		}
	}
	if(this.weapon)attack(this.weapon, this.foe);
	this.nova = 0;
	this.foe.drawcard();
}
Player.prototype.drawcard = function() {
	if (this.hand.length<8){
		this.hand[this.hand.length] = Cards[this.deck.pop()];
	}
}
Player.prototype.freeze = function(x) {
	if (this.weapon)this.weapon.frozen=x;
}
Player.prototype.dmg = function(x) {
	if (x<0){
		this.heal(-x);
		return;
	}
	this.hp-=x;
	if (this.hp<=0){
		// todo win
	}
}
Player.prototype.heal = function(x) {
	this.hp=Math.min(this.maxhp, this.hp+x);
}
function Creature(card, owner){
	this.card = card
	this.maxhp = this.hp = card.health
	this.atk = card.attack
	this.buffatk = 0
	this.airborne = card.airborne
	this.active = card.active
	this.passive = card.passive
	this.cast = card.cast
	this.castele = card.castele
	this.poison = 0
	this.aflatoxin = false
	this.delay = 0
	this.frozen = 0
	this.dive = 0
	this.spelldamage = card==Cards.Psion || card==Cards.PsionUp;
	this.momentum = card==Cards.SapphireCharger || card==Cards.EliteCharger;
	this.adrenaline = false
	this.owner = owner
	this.burrowed = card==Cards.Graboid || card==Cards.EliteGraboid
	this.immaterial = card==Cards.Immortal || card==Cards.EliteImmortal || card==Cards.PhaseDragon || card==Cards.ElitePhaseDragon
	this.usedactive = true
}
Creature.prototype.addpoison = function(x) {
	this.poison += x;
	if (this.passive == "voodoo"){
		this.owner.foe.poison += x;
	}
}
Creature.prototype.buffhp = function(x){
	this.hp+=x;
	this.maxhp+=x;
}
Creature.prototype.heal = function(x){
	this.hp=Math.min(this.maxhp,this.hp+x);
}
Creature.prototype.freeze = function(x){
	this.frozen = x;
	if(this.passive == "voodoo")this.owner.foe.freeze(x);
}
Creature.prototype.spelldmg = Creature.prototype.dmg = function(x,dontdie){
	this.hp-=x;
	if(this.hp<=0){
		if(!dontdie)this.die();
	}else if(this.passive == "voodoo")this.owner.foe.dmg(x);
}
Creature.prototype.trueatk = function(){return this.atk+this.buffatk+this.dive;}
Creature.prototype.die = function() {
	var index = this.owner.creatures.indexOf(this);
	delete this.owner.creatures[index];
	if (this.owner.gpull == this)this.owner.gpull = null;
	if (this.aflatoxin){
		this.owner.creatures[index] = new Creature(Cards.MalignantCell, this.owner);
	}else if (this.active == Actives.phoenix){
		this.owner.creatures[index] = new Creature(this.card.upped?Cards.AshUp:Cards.Ash, this.owner);
	}
	for(var i=0; i<2; i++){
		var pl=players[i];
		for(var j=0; j<23; j++){
			var c = pl.creatures[j];
			if (c && c.active == A.scavange){
				c.atk += 1;
				c.buffhp(1);
			}
		}
		for(var j=0; j<23; j++){
			var p = pl.permanents[j];
			if (p.passive == "boneyard"){
				summon(p.card.upped?EliteSkeleton:Skeleton,p.owner);
			}else if (p.passive == "soulcatcher"){
				pl.spend(Death, p.card.upped?-3:-2);
			}
		}
		if (pl.shield && pl.shield.active == Actives.bones){
			pl.shield.charges += 2
		}
	}
}
function Permanent(card, owner){
	this.card = card
	this.atk = card.attack
	this.health = card.health
	this.cast = card.cast
	this.castele = card.castele
	this.active = card.active
	this.passive = card.passive
	this.charges = 0
	this.usedactive = true
	this.owner = owner
	this.immaterial = card == Cards.Hope || card == Cards.HopeUp || this.passive == "reflect";
	//weapons:
	this.frozen = 0
	this.delay = 0
}
Permanent.prototype.die = function(){ delete this.owner.permanents[this.owner.permanents.indexOf(this)]; }
Permanent.prototype.attack = attack
Creature.prototype.attack = attack
function attack(){
	this.dmg(this.poison, true);
	var target = this.owner.foe;
	// Adrenaline will be annoying
	this.usedactive = false
	if (this.cast == -1)
		this.active(this)
	if (this.passive == "devour" && target.spend(Other, 1)){
		this.owner.spend(Darkness, -1);
	}
	var stasis=false;
	for(var i=0; i<23; i++){
		if (this.owner.permanents[i] && (this.owner.permanents[i].passive == "stasis" || target.permanents[i].passive == "stasis")){
			stasis=true;
			break;
		}
	}
	if (!stasis && this.frozen==0 && this.delay==0){
		if (this.spelldamage){
			target.spelldmg(this.trueatk)
		}else if (this.momentum || this.trueatk() < 0){
			target.dmg(this.trueatk())
		}else if (target.gpull){
			this.owner.heal(target.gpull.dmg(this.trueatk()));
		}else if (this.trueatk() > this.owner.foe.shield.health){
			if (target.shield && target.shield.active == Actives.bones){
				this.owner.foe.shield.charges -= 1
				if (target.shield.charges == 0)
					target.shield = undefined
			}else if (!target.sanctuary && target.shield && target.shield.active == Actives.disshield){
				if(!target.spend(Entropy, Math.ceil(this.trueatk()/3))){
					target.shield = undefined
				}
			}else if (!target.sanctuary && target.shield && target.shield.active == Actives.disfield){
				if(!target.spend(Other, this.trueatk())){
					target.shield = undefined
				}
			}else if(!target.shield || !(shieldevades(target.shield, this.airborne || this.passive == "ranged") || (this.card.type == CreatureEnum && target.shield.active == Actives.weight && this.hp > 5))){
				dmg = this.trueatk() - (target.shield?target.shield.health:0)
				target.dmg(dmg)
				if (this.active == Actives.vampire){
					this.owner.heal(dmg)
				}else if (this.active == Actives.venom){
					target.poison += 1
				}else if (this.active == Actives.neuro){
					target.poison += 1
					target.neuro = true
				}else if (this.active == Actives.deadly){
					target.poison += 2
				}
				if(target.shield)target.shield.active(target.shield, this)
			}
		}
	}
	if (this.frozen > 0){
		this.frozen -= 1;
	}
	if(this.delay > 0){
		this.delay -= 1;
	}
	this.dive = 0
	if (this.active == Actives.dshield){
		this.immaterial = false;
	}
	if(this.type==CreatureEnum&&this.hp <= 0){
		this.die();
	}
}
function summon(card, owner, target){
	if (card.type <= PermanentEnum){
		if (card.type == PillarEnum){
			if (card.upped){
				//bug upped marks grant like quantum tower
				owner.spend(card.element, -1);
			}
			for (var i=0; i<23; i++){
				if (owner.permanents[i] != undefined && owner.permanents[i].card.code == card.code){
					owner.permanents[i].charges += 1;
					return owner.permanents[i];
				}
			}
		}
		var p = new Permanent(card, owner);
		if (card.type == WeaponEnum){
			owner.weapon = p;
		}else if (card.type == ShieldEnum){
			owner.shield = p;
			if (card == DimensionalShield || card == PhaseShield){
				c.charges = 3;
			}
			else if (card == Wings || card == WingsUp){
				c.charges = 5;
			}
		}else{
			for(var i=0; i<23; i++){
				if (!owner.permanents[i]){
					var p=owner.permanents[i]=new Permanent(card, owner);
					if (card.type == PillarEnum){
						p.charges = 1;
					}
					return p;
				}
			}
		}
		return p;
	}else if (card.type == SpellEnum){
		owner.card = card
		card.active(owner, target)
		return null;
	}else if (card.type == CreatureEnum) {
		for(var i=0; i<23; i++){
			if (!owner.creatures[i]){
				return owner.creatures[i]=new Creature(card, owner);
			}
		}
	}else console.log("Unknown card type: "+card.type);
}
function removeItem(list, item){
	var index=list.indexOf(item);
	if (index!=-1){
		delete list[index];
		return true;
	}
	return false;
}
Other = 0;
Entropy = 1;
Death = 2;
Gravity = 3;
Earth = 4;
Life = 5;
Fire = 6;
Water = 7;
Light = 8;
Air = 9;
Time = 10;
Darkness = 11;
Aether = 12;
PillarEnum = 0;
WeaponEnum = 1;
ShieldEnum = 2;
PermanentEnum = 3;
SpellEnum = 4;
CreatureEnum = 5;
TrueMarks = ["8pi", "8pj", "8pk", "8pl", "8pm", "8pn", "8po", "8pp", "8pq", "8pr", "8ps", "8pt", "8pu"];
NymphList = [undefined, undefined,
	"500", "6ug",
	"534", "71k",
	"568", "74o",
	"59c", "77s",
	"5cg", "7b0",
	"5fk", "7e4",
	"5io", "7h8",
	"5ls", "7kc",
	"5p0", "7ng",
	"5s4", "7qk",
	"5v8", "7to",
	"62c", "80s"];
Actives={
ablaze:function(c,t){
	c.atk+=2;
},
acceleration:function(c,t){
	c.atk+=2;
	c.dmg(1,true);
},
accelerationspell:function(c,t){
	c.cast=-1;
	c.active=Actives.acceleration;
},
accretion:function(c,t){
	destroy(c,t);
	c.buffhp(15);
	if (c.hp > 45){
		removeItem(c.owner.creatures, c);
		c.hand.append(c.card.upped?Cards.BlackHoleUp:Cards.BlackHole);
	}
},
adrenaline:function(c,t){
	t.adrenaline=true;
},
aflatoxin:function(c,t){
	t.addpoison(2);
	t.aflatoxin=true;
},
air:function(c,t){
	c.owner.spend(Air, -1);
},
antimatter:function(c,t){
	t.atk *= -1
},
bblood:function(c,t){
	t.buffhp(20);
	t.delay += 6;
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
bow:function(c,t){
},
bravery:function(c,t){
},
burrow:function(c,t){
	c.burrowed = true;
},
butterfly:function(c,t){
	if (t.trueatk() < 3){
		t.cast = 3;
		t.castele = Entropy;
		t.active = destroy;
	}
},
catapult:function(c,t){
	c.owner.foe.dmg(Math.ceil(t.hp*(t.frozen?150:100)/(t.hp+100)));
	c.owner.foe.poison += t.poison;
	if (t.frozen && c.owner.foe.weapon != C.noweapon){
		c.owner.foe.weapon.frozen = 3;
	}
},
cpower:function(c,t){
	t.buffhp(Math.ceil(random()*5));
	t.atk += Math.ceil(random()*5);
},
cseed:function(c,t){
	Actives[["infect", "lightning", "icebolt", "firebolt", "freeze", "parallel", "lobotomize", "drainlife", "snipe", "rewind", "gpullspell"][Math.floor(random()*12)]](c,t)
},
cloak:function(c,t){
},
dagger:function(c,t){
},
deadalive:function(c,t){
	var index=c.owner.creatures.indexOf(c);
	c.die();
	c.owner.creatures[index] = c;
},
deadly:function(c,t){
},
deja:function(c,t){
},
destroy:function(c,t){
	if (t.type == PillarEnum && t.charges>1){
		t.charges--;
	}else{
		t.die();
	}
},
devour:function(c,t){
	if (c.hp > t.hp){
		if (t.passive == "poisonous"){
			c.addpoison(1);
		}
		t.die();
	}
},
die:function(c,t){
	c.die();
},
dive:function(c,t){
	c.dive += c.trueatk();
},
divinity:function(c,t){
	c.maxhp += c.mark==Light?24:16;
},
drainlife:function(c,t){
	c.heal(t.spelldmg(2+Math.floor((c.owner.quanta[Fire]+c.card.cost)/10)*2));
},
dryspell:function(c,t){
},
dshield:function(c,t){
	c.immaterial=true;
},
duality:function(c,t){
},
earth:function(c,t){
	c.owner.spend(Earth, -1);
},
earthquake:function(c,t){
	if (t.charges>3){
		t.charges-=3;
	}else{
		t.die();
	}
},
empathy:function(c,t){
	var healsum=0;
	for(var i=0; i<23; i++){
		if (c.owner.creatures[i])healsum++;
	}
	c.owner.heal(healsum);
},
enchant:function(c,t){
	t.immaterial = true
},
endow:function(c,t){
	c.active = t.active;
	c.passive = t.passive;
	c.atk += t.atk;
	c.buffhp(2);
},
evolve:function(c,t){
	var shrieker = c.owner.creatures[c.owner.creatures.indexOf(c)] = new Creature(Cards.Shrieker, c.owner);
	shrieker.poison = c.poison;
},
fiery:function(c,t){
},
fire:function(c,t){
	c.owner.spend(Fire, -1);
},
firebolt:function(c,t){
	t.spelldmg(3+Math.floor((c.owner.quanta[Fire]+c.card.cost)/10)*3);
},
flyingweapon:function(c,t){
},
fractal:function(c,t){
	c.owner.quanta[Aether]=0;
	for(var i=c.owner.hand.length; i<8; i++){
		c.owner.hand[i]=t.card;
	}
},
freeze:function(c,t){
	t.frozen = c.card.upped ? 4 : 3;
},
gas:function(c,t){
},
gpull:function(c,t){
	c.owner.gpull = c;
},
gpullspell:function(c,t){
	c.owner.gpull = t;
},
gratitude:function(c,t){
	c.owner.heal(c.card.upped?5:3);
},
growth:function(c,t){
	c.buffhp(2);
	c.atk += 2;
},
guard:function(c,t){
	t.delay++;
	if (!t.airborne){
		t.dmg(c.trueatk());
	}
},
hammer:function(c,t){
},
hasten:function(c,t){
	c.owner.drawcard();
},
hatch:function(c,t){
},
heal:function(c,t){
	t.heal(5);
},
heal20:function(c,t){
	c.owner.heal(20);
},
holylight:function(c,t){
	if (t.isPlayer){
		t.heal(10);
	}
},
icebolt:function(c,t){
	var bolts=1+Math.floor((c.owner.quanta[Fire]+c.card.cost)/10);
	t.spelldmg(bolts*2);
	if (random() < .3+bolts/10){
		if (!t.isPlayer){
			t.frozen = 3
		}else if (t.weapon != C.noweapon){
			t.weapon.frozen = 3
		}
	}
},
ignite:function(c,t){
},
immaterial:function(c,t){
},
immolate:function(c,t){
	t.die();
	for(var i=1; i<13; i++)
		c.quanta[i]++;
	c.quanta[Fire]+=c.card.upped?7:5;
},
improve:function(c,t){
},
infect:function(c,t){
	t.addpoison(1);
},
integrity:function(c,t){
},
light:function(c,t){
	c.owner.spend(Light, -1);
},
lightning:function(c,t){
	t.spelldmg(5);
},
liquid:function(c,t){
	t.cast = -1;
	t.active=Actives.vampire;
	t.addpoison(1);
},
lobotomize:function(c,t){
	t.active = undefined;
	t.momentum = false;
},
luciferin:function(c,t){
},
lycanthropy:function(c,t){
	c.buffhp(5);
	c.atk += 5;
},
miracle:function(c,t){
	c.quanta[Light] = 0;
	if (c.hp<c.maxhp)c.hp = c.maxhp-1;
},
mitosis:function(c,t){
	summon(c.card, c.owner);
},
mitosisspell:function(c,t){
	if (c.card.type != WeaponEnum){
		c.castele = c.card.element;
		c.cast = c.card.cost;
		c.active = mitosis;
	}
},
momentum:function(c,t){
},
momentumspell:function(c,t){
	t.atk+=1;
	t.buffhp(1);
	t.momentum=true;
},
mutation:function(c,t){
},
neuro:function(c,t){
},
nightmare:function(c,t){
	if (!c.owner.sanctuary){
		c.owner.heal(16-c.owner.foe.hand.length*2);
		for(var i=c.owner.foe.hand.length; i<8; i++){
			c.owner.foe.hand[i]=t.card;
		}
	}
},
nova:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.quanta[i]++;
	}
	c.owner.nova++;
	if (c.owner.nova>=3){
		summon(Cards.Singularity, c.owner);
	}
},
nova2:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.quanta[i]+=2;
	}
	c.owner.nova+=2;
	if (c.owner.nova>=3){
		summon(Cards.SingularityUp, c.owner);
	}
},
nymph:function(c,t){
	var e = t.card.element > 0?t.card.element:Math.ceil(random()*12);
	destroy(c,t);
	summon(Cards[NymphList[e*2+(t.card.upped?1:0)]], t.owner);
},
overdrive:function(c,t){
	c.atk+=3;
	c.dmg(1,true);
},
overdrivespell:function(c,t){
	c.cast=-1;
	c.active=Actives.overdrive;
},
pandemonium:function(c,t){
},
paradox:function(c,t){
	if(t.trueatk()>t.hp)t.die();
},
parallel:function(c,t){
},
phoenix:function(c,t){
},
photosynthesis:function(c,t){
},
plague:function(c,t){
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
precognition:function(c,t){
	hasten(c,t);
	//TODO show hand
},
psion:function(c,t){
},
purify:function(c,t){
	t.poison=Math.max(t.poison-2,-2);
	t.neuro=false;
	t.sosa=0;
},
queen:function(c,t){
},
quint:function(c,t){
	t.immaterial=true;
	t.frozen=0;
},
rage:function(c,t){
	var dmg=c.card.upped?6:5;
	t.atk+=dmg;
	t.dmg(dmg);
},
readiness:function(c,t){
},
rebirth:function(c,t){
},
regenerate:function(c,t){
},
relic:function(c,t){
},
rewind:function(c,t){
},
sanctuary:function(c,t){
	c.owner.sanctuary=true;
	c.owner.heal(4);
},
scarab:function(c,t){
},
scavange:function(c,t){
},
scramble:function(c,t){
	for (var i=0; i<9; i++){
		if(t.spend(Other, 1)){
			t.spend(Other, -1);
		}
	}
},
serendipity:function(c,t){
},
silence:function(c,t){
	c.owner.silence = true;
},
skyblitz:function(c,t){
},
snipe:function(c,t){
	t.dmg(3);
},
sosa:function(c,t){
	t.owner.sosa = 2;
	t.owner.truedmg(c.card.upped?40:48);
},
sskin:function(c,t){
	c.buffhp(c.quanta[Earth]+c.card.cost);
},
steal:function(c,t){
	var index=t.owner.permanents.indexOf(t);
	delete t.owner[index];
	t.owner = c.owner;
	for(var i=0; i<23; i++){
		if(!c.owner.permanents[i]){
			c.owner.permanents[i]=t;
			break;
		}
	}
},
steam:function(c,t){
},
stoneform:function(c,t){
	c.maxhp += c.quanta[Earth];
},
storm2:function(c,t){
},
storm3:function(c,t){
},
swave:function(c,t){
	t.spelldmg(4);
},
sword:function(c,t){
},
vampire:function(c,t){
},
venom:function(c,t){
},
void:function(c,t){
	c.owner.foe.buffhp(c.owner.mark==Darkness?-6:-3);
},
web:function(c,t){
	t.airborne = false;
},
wisdom:function(c,t){
},
pillar:function(c,t){
	c.owner.spend(c.card.element,-c.charges*(c.card.element>0?1:3));
},
pend:function(c,t){
	c.owner.spend(c.airborne?c.owner.mark:c.card.element,-c.charges);
	c.airborne^=true;
}
}