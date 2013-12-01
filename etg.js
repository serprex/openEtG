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
					var card = {type: this.TYPE};
					var carddata = csv[j].split(",");
					var cardcode = carddata[2];
					for(var k=0; k<carddata.length; k++)card[keys[k].toLowerCase()] = carddata[k];
					card.upped = parseInt(cardcode,32)>6999;
					Cards[carddata[1] in Cards?carddata[1]+"Up":carddata[1]] = Cards[cardcode] = card;
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
				Targeting[keypair[0]] = parseInt(keypair[1],10);
			}
			maybeCallback();
		}
	}
	xhr.send();
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
	this.nova2 = 0;
	this.maxhp = 100;
	this.hp = 100;
	this.hand = new Array(8);
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
	/*
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
	attack(this.weapon, this.foe);
	*/
	this.nova = 0;
	this.nova2 = 0;
}
function Creature(card, owner){
	this.card = card
	this.maxhp = this.hp = parseInt(card.health)
	this.atk = parseInt(card.attack)
	this.buffatk = 0
	this.airborne = card.airborne == "1"
	this.active = Actives[card.active]
	this.passive = card.passive
	this.cast = parseInt(card.cast)
	this.castele = parseInt(card.castele)
	this.poison = 0
	this.aflatoxin = false
	this.delay = 0
	this.frozen = 0
	this.dive = 0
	this.spelldamage = false
	this.momentum = false
	this.adrenaline = false
	this.owner = owner
	this.burrowed = card==Cards.Graboid || card==Cards.EliteGraboid
	this.immaterial = card==Cards.Immortal || card==Cards.EliteImmortal || card==Cards.PhaseDragon || card==Cards.ElitePhaseDragon
	this.usedactive = true
}
function Permanent(card, owner){
	this.card = card
	this.atk = parseInt(card.attack)
	this.health = parseInt(card.health)
	this.cast = parseInt(card.cast)
	this.active = Actives[card.active]
	this.passive = card.passive
	this.charges = 0
	this.usedactive = true
	this.owner = owner
	this.immaterial = false
	//weapons:
	self.frozen = 0
	self.delay = 0
}
function attack(c, tgt){
	tgt.hp -= c.atk;
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
		var p = new Permanent(card, owner)
		if (card.type == WeaponEnum){
			owner.weapon = p
		}else if (card.type == ShieldEnum){
			owner.shield = p
			if (card == DimensionalShield || card == PhaseShield){
				c.charges = 3
			}
			else if (card == Wings || card == WingsUp){
				c.charges = 5
			}
		}else{
			for(var i=0; i<23; i++){
				if (!owner.permanents[i]){
					return owner.permanents[i]=new Permanent(card, owner);
				}
			}
		}
		return p;
	}else if (card.type == SpellEnum){
		owner.card = card
		card.active(owner, target)
		return null;
	}else {
		for(var i=0; i<23; i++){
			if (!owner.creatures[i]){
				return owner.creatures[i]=new Creature(card, owner);
			}
		}
	}
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
	damage(c,1);
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
	t.poison+=2;
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
			c.owner.damage(-Math.min(quanta[q],3));
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
	c.owner.foe.damage(Math.ceil(t.hp*(t.frozen?150:100)/(t.hp+100)));
	c.owner.foe.poison += t.poison;
	if (t.frozen && c.owner.foe.weapon != C.noweapon){
		c.owner.foe.weapon.frozen = 3;
	}
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
	t.die();
},
devour:function(c,t){
	if (c.hp > t.hp){
		t.die();
	}
},
die:function(c,t){
	c.die();
},
dive:function(c,t){
	c.diveatk += c.trueatk();
},
divinity:function(c,t){
	c.maxhp += c.mark==Light?24:16;
},
drainlife:function(c,t){
},
dryspell:function(c,t){
},
dshield:function(c,t){
},
duality:function(c,t){
},
earth:function(c,t){
	c.owner.spend(Earth, -1);
},
earthquake:function(c,t){
},
empathy:function(c,t){
},
enchant:function(c,t){
	t.immaterial = true
},
endow:function(c,t){
},
evolve:function(c,t){
},
fiery:function(c,t){
},
fire:function(c,t){
	c.owner.spend(Fire, -1);
},
firebolt:function(c,t){
},
flyingweapon:function(c,t){
},
fractal:function(c,t){
},
freeze:function(c,t){
	t.frozen = c.card.upped ? 4 : 3;
},
gas:function(c,t){
},
gpull:function(c,t){
},
gpullspell:function(c,t){
},
gratitude:function(c,t){
},
growth:function(c,t){
	c.buffhp(2);
	c.atk += 2;
},
guard:function(c,t){
},
hammer:function(c,t){
},
hasten:function(c,t){
},
hatch:function(c,t){
},
heal:function(c,t){
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
},
ignite:function(c,t){
},
immaterial:function(c,t){
},
immolate:function(c,t){
},
improve:function(c,t){
},
infect:function(c,t){
},
integrity:function(c,t){
},
light:function(c,t){
},
lightning:function(c,t){
},
liquid:function(c,t){
},
lobotomize:function(c,t){
},
luciferin:function(c,t){
},
lycanthropy:function(c,t){
},
miracle:function(c,t){
},
mitosisspell:function(c,t){
},
momentum:function(c,t){
},
momentumspell:function(c,t){
},
mutation:function(c,t){
},
neuro:function(c,t){
},
nightmare:function(c,t){
},
nova:function(c,t){
},
nova2:function(c,t){
},
nymph:function(c,t){
},
overdrivespell:function(c,t){
},
pandemonium:function(c,t){
},
paradox:function(c,t){
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
},
poison:function(c,t){
},
poison2:function(c,t){
},
precognition:function(c,t){
},
psion:function(c,t){
},
purify:function(c,t){
},
queen:function(c,t){
},
quint:function(c,t){
},
rage:function(c,t){
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
	c.owner.silence = true
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
},
steal:function(c,t){
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
},
sword:function(c,t){
},
vampire:function(c,t){
},
venom:function(c,t){
},
void:function(c,t){
},
web:function(c,t){
	t.airborne = false;
},
wisdom:function(c,t){
},
entropy:function(c,t){
	c.owner.spend(Entropy,-c.charges);
}
}