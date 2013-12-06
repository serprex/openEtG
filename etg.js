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
		let _i=i;
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200){
				var csv = this.responseText.split("\n");
				var keys = csv[0].split(",");
				for(var j=1; j<csv.length; j++){
					var carddata = csv[j].split(",");
					var cardcode = carddata[2];
					var cardinfo = {};
					for(var k=0; k<carddata.length; k++)cardinfo[keys[k]] = carddata[k];
					Cards[carddata[1] in Cards?carddata[1].replace(" ","")+"Up":carddata[1]] = Cards[cardcode] = new Card(_i, cardinfo);
				}
				maybeCallback();
			}
		};
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
	if(~cost.indexOf("+")){
		var c=cost.split("+");
		card[attr]=parseInt(c[0]);
		card[attr+"ele"]=parseInt(c[1]);
	}else{
		card[attr]=parseInt(cost);
		card[attr+"ele"]=e;
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
	this.passive = info.Passive;
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
	this.shield = null;
	this.weapon = null;
	this.poison = 0;
	this.neuro = false;
	this.sosa = 0;
	this.silence = false;
	this.sanctuary = false;
	this.precognition = false;
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
	this.precognition = this.sanctuary = this.silence = false;
	this.foe.hp -= this.foe.poison;
	for (var i=0; i<23; i++){
		if(this.creatures[i])this.creatures[i].attack();
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
			var dr = this.shield.card.upped?1:0;
			for (var i=0; i<23; i++){
				if (this.creatures[i] && this.creatures[i].active == Actives.light)
					dr++;
			}
			this.shield.dr = dr;
		}
	}
	if(this.weapon)this.weapon.attack();
	this.nova = 0;
	this.foe.drawcard();
}
Player.prototype.drawcard = function() {
	if (this.hand.length<8){
		this.hand[this.hand.length] = Cards[this.deck.pop()];
	}
}
Player.prototype.drawhand = function() {
	shuffle(this.deck);
	var mulligan = true;
	for(var i=0; i<7; i++){
		if (this.deck[i].cost == 0){
			mulligan=false;
			break;
		}
	}
	if (mulligan){
		shuffle(this.deck);
	}
	for(var i=0; i<7; i++){
		this.hand.push(this.deck.pop());
	}
}
Player.prototype.freeze = function(x) {
	if (this.weapon)this.weapon.freeze(x);
}
Player.prototype.dmg = function(x) {
	if (x<0){
		this.heal(-x);
		return x;
	}
	var dmg=Math.min(this.hp,x);
	this.hp-=x;
	if (this.hp<=0){
		// todo win
	}
	return dmg;
}
function Creature(card, owner){
	this.delay = 0
	this.frozen = 0
	this.dive = 0
	this.poison = 0
	this.steamatk = 0
	this.adrenaline = false
	this.aflatoxin = false
	this.usedactive = true
	if (card == undefined){
		return;
	}
	this.owner = owner
	this.card = card
	this.maxhp = this.hp = card.health
	this.atk = card.attack
	this.airborne = card.airborne
	this.active = card.active
	this.passive = card.passive
	this.cast = card.cast
	this.castele = card.castele
	this.spelldamage = card==Cards.Psion || card==Cards.PsionUp;
	this.momentum = card==Cards.SapphireCharger || card==Cards.EliteCharger;
	this.burrowed = card==Cards.Graboid || card==Cards.EliteGraboid
	this.immaterial = card==Cards.Immortal || card==Cards.EliteImmortal || card==Cards.PhaseDragon || card==Cards.ElitePhaseDragon
}
function Permanent(card, owner){
	if (card == undefined){
		return;
	}
	this.owner = owner
	this.card = card
	this.cast = card.cast
	this.castele = card.castele
	this.active = card.active
	this.passive = card.passive
	this.charges = 0
	this.usedactive = true
	this.immaterial = card == Cards.MorningStar || card == Cards.MorningGlory || card == Cards.Hope || card == Cards.HopeUp || this.active == Actives.reflect;
}
function Weapon(card, owner){
	Permanent.apply(this, arguments)
	this.spelldamage = false
	this.frozen = 0
	this.delay = 0
	this.momentum = card == Cards.Titan || card == Cards.TitanUp
	this.atk = card.attack
	this.dive = 0
	this.steamatk = 0
	this.adrenaline = false
	this.usedactive = true
}
function Shield(card, owner){
	Permanent.apply(this, arguments)
	this.dr = card.health
}
function Pillar(card, owner){
	this.owner = owner;
	this.card = card;
	this.active = card.active;
	this.charges = 1;
	this.pendstate = false;
}
Weapon.prototype = new Permanent();
Shield.prototype = new Permanent();
Pillar.prototype = new Permanent();
Player.prototype.spelldmg = function(x) {
	return (!this.shield || this.shield.active != Actives.reflect?this:this.foe).dmg(x);
}
Player.prototype.heal = function(x) {
	this.hp=Math.min(this.maxhp, this.hp+x);
}
Creature.prototype.getIndex = function() { return this.owner.creatures.indexOf(this); }
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
Weapon.prototype.freeze = Creature.prototype.freeze = function(x){
	this.frozen = x;
	if(this.passive == "voodoo")this.owner.foe.freeze(x);
}
Creature.prototype.spelldmg = Creature.prototype.dmg = function(x,dontdie){
	var dmg = Math.min(this.hp, x);
	this.hp-=x;
	if(this.hp<=0){
		if(!dontdie)this.die();
	}else if(this.passive == "voodoo")this.owner.foe.dmg(x);
	return dmg;
}
Creature.prototype.die = function() {
	var index = this.getIndex();
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
			if (c && c.active == Actives.scavange){
				c.atk += 1;
				c.buffhp(1);
			}
		}
		for(var j=0; j<23; j++){
			var p = pl.permanents[j];
			if(p){
				if (p.passive == "boneyard"){
					place(p.owner.creatures, new Creature(p.card.upped?EliteSkeleton:Skeleton,p.owner));
				}else if (p.passive == "soulcatcher"){
					pl.spend(Death, p.card.upped?-3:-2);
				}
			}
		}
		if (pl.shield && pl.shield.active == Actives.bones){
			pl.shield.charges += 2
		}
	}
}
Weapon.prototype.trueatk = Creature.prototype.trueatk = function(){
	var dmg=this.atk+this.steamatk+this.dive;
	if (this.cast == -3)dmg+=this.active(this);
	return this.burrowed?Math.ceil(dmg/2):dmg;
}
Permanent.prototype.getIndex = function() { return this.owner.permanents.indexOf(this); }
Permanent.prototype.die = function(){ delete this.owner.permanents[this.owner.permanents.getIndex()]; }
Weapon.prototype.die = function() { this.owner.weapon = undefined; }
Shield.prototype.die = function() { this.owner.shield = undefined; }
Weapon.prototype.attack = Creature.prototype.attack = function(){
	var isCreature = this instanceof Creature;
	if (isCreature){
		this.dmg(this.poison, true);
	}
	var target = this.owner.foe;
	// Adrenaline will be annoying
	this.usedactive = false
	if (this.cast == -1){
		this.active(this)
	}
	if (this.passive == "devour" && target.spend(Other, 1)){
		this.owner.spend(Darkness, -1);
	}
	var stasis=this.frozen>0 || this.delay>0;
	if (isCreature&&!stasis){
		for(var i=0; i<23; i++){
			if ((this.owner.permanents[i] && this.owner.permanents[i].passive == "stasis") || (target.permanents[i] && target.permanents[i].passive == "stasis")){
				stasis=true;
				break;
			}
		}
	}
	if (this.frozen > 0){
		this.frozen -= 1;
	}
	if(this.delay > 0){
		this.delay -= 1;
	}
	if (!stasis){
		if (this.spelldamage){
			target.spelldmg(this.trueatk())
		}else if (this.momentum || this.trueatk() < 0){
			target.dmg(this.trueatk())
		}else if (target.gpull){
			this.owner.heal(target.gpull.dmg(this.trueatk()));
		}else if (!target.shield || (this.trueatk() > target.shield.dr && (!target.shield.active || !target.shield.active(target.shield, this)))){
			var dmg = target.dmg(this.trueatk() - (target.shield?target.shield.dr:0));
			if (this.cast == -2){
				this.dmgdone = dmg;
				this.active(this, target);
			}
		}
	}
	this.dive = 0
	if (this.active == Actives.dshield){
		this.immaterial = false;
	}
	if (this.steamatk>0){
		this.steamatk--;
	}
	if(this.type==CreatureEnum&&this.hp <= 0&&this.getIndex()!=-1){
		this.die();
	}
}
function place(array, item){
	for (var i=0; i<array.length; i++){
		if (!array[i]){
			return array[i]=item;
		}
	}
}
Player.prototype.summon = function(index, target){
	var card = this.hand[index];
	this.hand.splice(index,1);
	if (this.neuro){
		this.poison+=1;
	}
	if (card.type <= PermanentEnum){
		if (card.type == PillarEnum){
			if (card.upped){
				//bug upped marks grant like quantum tower
				this.spend(card.element, -1);
			}
			for (var i=0; i<23; i++){
				if (this.permanents[i] && this.permanents[i].card == card){
					this.permanents[i].charges += 1;
					return this.permanents[i];
				}
			}
			return place(this.permanents, new Pillar(card, this));
		}else if (card.type == WeaponEnum){
			return this.weapon = new Weapon(card, this);
		}else if (card.type == ShieldEnum){
			this.shield = new Shield(card, this);
			if (card == Cards.DimensionalShield || card == Cards.PhaseShield){
				this.shield.charges = 3;
			}
			else if (card == Cards.Wings || card == Cards.WingsUp){
				this.shield.charges = 5;
			}
			return this.shield;
		}else{
			return place(this.permanents, new Permanent(card, this));
		}
		return p;
	}else if (card.type == SpellEnum){
		this.card = card
		card.active(this, target)
		return undefined;
	}else if (card.type == CreatureEnum) {
		return place(this.creatures, new Creature(card, this));
	}else console.log("Unknown card type: "+card.type);
}
var Other = 0;
var Entropy = 1;
var Death = 2;
var Gravity = 3;
var Earth = 4;
var Life = 5;
var Fire = 6;
var Water = 7;
var Light = 8;
var Air = 9;
var Time = 10;
var Darkness = 11;
var Aether = 12;
var PillarEnum = 0;
var WeaponEnum = 1;
var ShieldEnum = 2;
var PermanentEnum = 3;
var SpellEnum = 4;
var CreatureEnum = 5;
var TrueMarks = ["8pi", "8pj", "8pk", "8pl", "8pm", "8pn", "8po", "8pp", "8pq", "8pr", "8ps", "8pt", "8pu"];
var NymphList = [undefined, undefined,
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
function randomcard(upped, onlycreature){
    var keys = [];
    for(var key in Cards) {
       if(key.length == 3 && Cards[key].upped==upped && (!onlycreature || Cards[key].type == CreatureEnum)) {
           keys.push(key);
       }
    }
    return Cards[keys[Math.floor(random() * keys.length)]];
}
function masscc(player, func){
	for (var i=0; i<23; i++){
		if (player.creatures[i] && !player.creatures[i].immaterial && !player.creatures[i].burrowed){
			func(player.creatures[i]);
		}
	}
}
var Actives={
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
		c.die();
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
	t.atk -= t.trueatk()*2;
},
bblood:function(c,t){
	t.buffhp(20);
	t.delay += 6;
},
blackhole:function(c,t){
	if (!c.owner.foe.sanctuary){
		quanta = c.owner.foe.quanta;
		for (var q=1; q<13; q++){
			c.owner.heal(Math.min(quanta[q],3));
			quanta[q] = Math.max(quanta[q]-3,0);
		}
	}
},
bless:function(c,t){
	t.atk += 3;
	t.buffhp(3);
},
bow:function(c,t){
	return c.owner.mark==Air?1:0;
},
bravery:function(c,t){
	var maxdraw=c.owner.mark==Fire?3:2;
	for(var i=0; i<maxdraw && c.owner.hand.length<8 && c.owner.foe.hand.length<8; i++){
		c.owner.drawcard();
		c.owner.foe.drawcard();
	}
},
burrow:function(c,t){
	c.burrowed = true;
	c.active = Actives.unburrow;
	c.cast = 0;
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
chimera:function(c,t){
	var atk,hp;
	for(var i=0; i<23; i++){
		if (c.owner.creatures[i]){
			atk+=c.owner.creatures[i].trueatk();
			hp+=c.owner.creatures[i].hp;
		}
	}
	var chim=new Creature();
	chim.card=c.card;
	chim.atk=atk;
	chim.maxhp=hp;
	chim.hp=hp;
	chim.cast=0;
	chim.castele=0;
	chim.momentum=true;
	c.owner.creatures=[chim];
	c.owner.gpull=chim;
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
	return c.owner.mark==Darkness||c.owner.mark==Death?1:0;
},
deadalive:function(c,t){
	var index=c.getIndex();
	c.die();
	c.owner.creatures[index] = c;
},
deadly:function(c,t){
	t.poison += 2
},
deja:function(c,t){
	c.active = undefined;
	parallel(c,c);
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
disfield:function(c,t){
	if (!c.owner.sanctuary){
		if (!c.owner.spend(Other, t.trueatk())){
			c.owner.shield = undefined;
		}
		return true;
	}
},
disshield:function(c,t){
	if (!c.owner.sanctuary){
		if (!c.owner.spend(Entropy, Math.ceil(t.trueatk()/3))){
			c.owner.shield = undefined;
		}
		return true;
	}
},
dive:function(c,t){
	c.dive += c.trueatk();
},
divinity:function(c,t){
	c.owner.buffhp(c.owner.mark==Light?24:16);
},
drainlife:function(c,t){
	c.heal(t.spelldmg(2+Math.floor((c.owner.quanta[Darkness]+(c.card.costele==Darkness?c.card.cost:0)/10)*2)));
},
dryspell:function(c,t){
	dmg = c.card.upped?2:1;
	function dryeffect(cr){
		c.spend(Water, -cr.dmg(dmg));
	}
	masscc(c.foe, dryeffect);
	if (!c.card.upped){
		masscc(c, dryeffect);
	}
},
dshield:function(c,t){
	c.immaterial=true;
},
duality:function(c,t){
	if (c.owner.foe.deck.length > 0 && c.owner.hand.length < 8){
		c.owner.hand.push(Cards[c.owner.foe.deck[c.owner.foe.deck.length-1]])
	}
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
	var shrieker = c.owner.creatures[c.getIndex()] = new Creature(c.card.upped?Cards.EliteShrieker:Cards.Shrieker, c.owner);
	shrieker.poison = c.poison;
},
fiery:function(c,t){
	return Math.floor(c.owner.quanta[Fire]/5);
},
fire:function(c,t){
	c.owner.spend(Fire, -1);
},
firebolt:function(c,t){
	t.spelldmg(3+Math.floor((c.owner.quanta[Fire]+(c.card.costele==Fire?c.card.cost:0))/10)*3);
},
flyingweapon:function(c,t){
	if (t.weapon){
		var cr=new Creature(t.weapon.card, t.owner);
		cr.airborne = true;
	}
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
	place(c.owner.permanents, new Permanent(c.upped?Cards.UnstableGasUp:Cards.UnstableGas, c.owner))
},
gpull:function(c,t){
	c.owner.gpull = c;
},
gpullspell:function(c,t){
	c.owner.gpull = t;
},
gratitude:function(c,t){
	c.owner.heal(c.owner.mark==Life?5:3);
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
	return c.owner.mark==Gravity||c.owner.mark==Earth?1:0;
},
hasten:function(c,t){
	c.owner.drawcard();
},
hatch:function(c,t){
	c.owner.creatures[index]=new Creature(randomcard(c.card.upped,true), c.owner);
},
heal:function(c,t){
	t.heal(5);
},
heal20:function(c,t){
	c.owner.heal(20);
},
holylight:function(c,t){
	if (!(t instanceof player) && (t.card.element == Darkness || t.card.element == Death)){
		t.dmg(10);
	}else t.heal(10);
},
icebolt:function(c,t){
	var bolts=1+Math.floor((c.owner.quanta[Water]+(c.card.costele==Water?c.card.cost:0))/10);
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
	masscc(c.owner.foe, function(x){x.dmg(1)});
	masscc(c.owner, function(x){x.dmg(1)});
	c.owner.foe.spelldmg(20);
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
	var cr=new Creature(randomcard(false, true), t.owner);
	var abilities=["hatch","freeze","burrow","destroy","steal","dive","heal","momentum","paradox","lycanthropy","scavenger","infection","gpull","devour","mutation","growth","ablaze","poison","deja","immaterial","endow","guard","mitosis"];
	cr.active = Actives[abilities[Math.floor(random()*abilities.length)]]
	cr.cast = Math.ceil(random(2));
	cr.castele = cr.card.element;
	cr.buffhp(Math.floor(random()*5));
	cr.atk += Math.floor(random()*5);
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
	t.cast = -2;
	t.active=Actives.vampire;
	t.addpoison(1);
},
lobotomize:function(c,t){
	t.active = undefined;
	t.momentum = false;
},
luciferin:function(c,t){
	c.owner.heal(10);
	masscc(c.owner, function(x){
		if (x.active == undefined){
			x.active = light;
		}
	})
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
	place(c.owner.creatures, new Creature(c.card, c.owner))
},
mitosisspell:function(c,t){
	if (c.card.type == CreatureEnum){
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
	var index=t.getIndex();
	var rnd=random();
	if (rnd<.1){
		t.die();
	}else if(rnd<.5){
		Actives.improve(c,t);
	}else{
		t.owner.creatures[index] = new Creature(Cards.Abomination, t.owner);
	}
},
neuro:function(c,t){
	t.poison += 1
	t.neuro = true
},
nightmare:function(c,t){
	if (!c.owner.sanctuary){
		var dmg=16-c.owner.foe.hand.length*2;
		c.owner.heal(dmg);
		c.owner.foe.dmg(dmg);
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
		place(c.owner.creatures, new Creature(Cards.Singularity, c.owner));
	}
},
nova2:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.quanta[i]+=2;
	}
	c.owner.nova+=2;
	if (c.owner.nova>=3){
		place(c.owner.creatures, new Creature(Cards.SingularityUp, c.owner));
	}
},
nymph:function(c,t){
	var e = t.card.element > 0?t.card.element:Math.ceil(random()*12);
	destroy(c,t);
	place(c.owner.creatures, new Creature(Cards[NymphList[e*2+(t.card.upped?1:0)]], t.owner));
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
	masscc(c.owner.foe, function(x){Actives.cseed(c,x)});
},
paradox:function(c,t){
	if(t.trueatk()>t.hp)t.die();
},
parallel:function(c,t){
},
phoenix:function(c,t){
},
photosynthesis:function(c,t){
	c.owner.spend(Life, -2);
	c.usedactive = false;
},
plague:function(c,t){
	masscc(c.owner.foe, function(x){x.addpoison(1)});
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
	c.owner.precognition = true;
},
psion:function(c,t){
},
purify:function(c,t){
	t.poison=Math.max(t.poison-2,-2);
	t.neuro=false;
	t.sosa=0;
},
queen:function(c,t){
	place(c.owner.creatures, new Creature(c.upped?Cards.EliteFirefly:Cards.Firefly, c.owner));
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
	if (t.cast>0){
		t.cast=0;
	}
},
rebirth:function(c,t){
	c.owner.creatures[c.getIndex()]=new Creature(c.upped?Cards.MinorPhoenix:Cards.Phoenix, c.owner);
},
regenerate:function(c,t){
	c.owner.heal(5);
},
relic:function(c,t){
},
rewind:function(c,t){
	delete t.owner.creatures[t.getIndex()];
	t.owner.deck.push(t.card.code);
},
sanctuary:function(c,t){
	c.owner.sanctuary=true;
	c.owner.heal(4);
},
scarab:function(c,t){
	place(c.owner.creatures, new Creature(c.upped?Cards.EliteScarab:Cards.Scarab, c.owner));
},
scavange:function(c,t){
},
scramble:function(c,t){
	if (!t.sanctuary){
		for (var i=0; i<9; i++){
			if(t.spend(Other, 1)){
				t.spend(Other, -1);
			}
		}
	}
},
serendipity:function(c,t){
	var cards=[], num=Math.min(8-c.owner.hand.length, 3), anyentro=false;
	for(var i=0; i<num; i++){
		cards[i]=randomcard(c.card.upped);
		if (cards[i].element == Entropy)anyentro=true;
	}
	if (!anyentro){
		while (cards[0].element != Entropy){
			cards[0]=randomcard(c.card.upped);
		}
	}
	for(var i=0; i<num; i++){
		c.owner.hand.push(cards[i]);
	}
},
silence:function(c,t){
	c.owner.foe.silence = true;
},
skyblitz:function(c,t){
	for(var i=0; i<23; i++){
		if (c.creatures[i])Actives.dive(c.creatures[i]);
	}
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
	var index=t.getIndex();
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
	c.steamatk += 5;
},
stoneform:function(c,t){
	c.maxhp += c.quanta[Earth];
},
storm2:function(c,t){
	masscc(c.owner.foe, function(x){x.dmg(2)});
},
storm3:function(c,t){
	masscc(c.owner.foe, function(x){x.dmg(3)});
},
swave:function(c,t){
	t.spelldmg(4);
},
sword:function(c,t){
},
unburrow:function(c,t){
	c.burrowed = false;
	c.active = Actives.burrow;
	c.cast = 1;
},
vampire:function(c,t){
	c.owner.heal(c.dmgdone);
},
venom:function(c,t){
	t.poison += 1
},
void:function(c,t){
	c.owner.foe.buffhp(c.owner.mark==Darkness?-6:-3);
},
web:function(c,t){
	t.airborne = false;
},
wisdom:function(c,t){
	t.atk += 4;
	if (t.immaterial){
		t.spelldamage = true;
	}
},
pillar:function(c,t){
	c.owner.spend(c.card.element,-c.charges*(c.card.element>0?1:3));
},
pend:function(c,t){
	c.owner.spend(c.pendstate?c.owner.mark:c.card.element,-c.charges);
	c.pendstate^=true;
},
skull:function(c,t){
	if (t.hp <= 0 || random() < .5/t.hp){
		t.die();
		place(t.owner, new Creature(t.card.upped?Cards.EliteSkeleton:Cards.Skeleton, t.owner));
	}
},
bones:function(c,t){
	if (--c.charges<=0){
		c.owner.shield = undefined;
	}
	return true;
},
weight:function(c,t){
	return t.hp>5;
},
thorn:function(c,t){
	if (random()<.75){
		t.addpoison(1);
	}
},
reflect:function(c,t){
},
firewall:function(c,t){
	t.dmg(1);
},
cold:function(c,t){
	if (random()<.3){
		t.freeze(3);
	}
},
solar:function(c,t){
	if (!c.owner.sanctuary){
		c.owner.spend(Light, -1);
	}
},
hope:function(c,t){
},
evade40:function(c,t){
	return random()>.4;
},
wings:function(c,t){
	return t.airborne || t.passive == "ranged";
},
slow:function(c,t){
	t.delay = 1;
},
evade50:function(c,t){
	return random()>.5;
},
evade100:function(c,t){
	return true;
},
}