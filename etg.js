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
		xhr.open("GET", names[i] + ".csv", true);
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
					Cards[(carddata[1] in Cards?carddata[1]+"Up":carddata[1]).replace(" ", "")] = Cards[cardcode] = new Card(_i, cardinfo);
				}
				maybeCallback();
			}
		};
		xhr.send();
	}
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "active.csv", true);
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200){
			var csv = this.responseText.split("\n");
			for (var i=0; i<csv.length; i++){
				var keypair = csv[i].split(",");
				Targeting[Actives[keypair[0]]] = TargetFilters[keypair[1]];
			}
			maybeCallback();
		}
	}
	xhr.send();
}
var m_w = 0, m_z = 0;
function seed(i) {
	m_w = i;
	m_z = 987654321;
}
function random()
{
	var mask = 0xffffffff;
	m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
	m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
	var result = ((m_z << 16) + m_w) & mask;
	result /= 4294967296;
	return result + 0.5;
}
function shuffle(array) {
	var counter = array.length, temp, index;
	while (counter--) {
		index = (random() * counter) | 0;
		temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
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
	this.upped = parseInt(this.code, 32)>6999;
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
	this.mark = 0;
	this.quanta = [];
	for(var i=1; i<13; i++)this.quanta[i]=0;
}
Player.prototype.canspend = function(qtype, x) {
	if (x == 0)return true;
	if (qtype == Other){
		var b = x<0?-1:1;
		var sum=0;
		for (var i=1; i<13; i++){
			sum += this.quanta[i];
		}
		return sum >= x;
	}else return this.quanta[qtype] >= x;
}
Player.prototype.spend = function(qtype, x) {
	if (x == 0)return true;
	if (qtype == Other){
		var b = x<0?-1:1;
		var sum=0;
		for (var i=1; i<13; i++){
			sum += this.quanta[i];
		}
		if (sum >= x){
			for (var i=x*b; i>0; i--){
				this.quanta[b==-1?Math.ceil(random()*12):randomquanta(this.quanta)] -= b
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
			if (p instanceof Pillar || p.cast == -1){
				p.active();
			}
			p.usedactive = false;
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
				this.shield = undefined;
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
	if (this.weapon)this.weapon.attack();
	if (this.sosa > 0){
		this.sosa--;
	}
	this.nova = 0;
	this.foe.drawcard();
}
Player.prototype.drawcard = function() {
	if (this.hand.length<8){
		if (this.deck.length>0){
			this.hand[this.hand.length] = this.deck.pop();
		}else if(!winner){
			setWinner(this.foe);
		}
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
Weapon.prototype.addpoison = function(x) {
	return this.owner.addpoison(x);
}
Weapon.prototype.spelldmg = function(x) {
	return this.owner.spelldmg(x);
}
Weapon.prototype.dmg = function(x) {
	return this.owner.dmg(x);
}
Player.prototype.dmg = function(x) {
	if (x<0){
		this.heal(-x);
		return x;
	}
	var dmg=Math.min(this.hp,x);
	this.hp-=x;
	if (this.hp <= 0 && !winner){
		setWinner(this.foe);
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
	this.spelldamage = card.passive == "psion";
	this.momentum = card.passive == "momentum";
	this.burrowed = card.passive == "burrowed";
	this.immaterial = card.passive == "immaterial";
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
	this.immaterial = card.passive == "immaterial" || card == Cards.Hope || card == Cards.HopeUp || this.active == Actives.reflect;
}
function Weapon(card, owner){
	Permanent.apply(this, arguments)
	this.spelldamage = false
	this.frozen = 0
	this.delay = 0
	this.momentum = card.passive == "momentum"
	this.atk = card.attack
	this.dive = 0
	this.steamatk = 0
	this.adrenaline = false
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
	this.hp=Math.min(this.maxhp, this.hp+x);
}
Weapon.prototype.freeze = Creature.prototype.freeze = function(x){
	this.frozen = x;
	if(this.passive == "voodoo")this.owner.foe.freeze(x);
}
Creature.prototype.spelldmg = Creature.prototype.dmg = function(x, dontdie){
	var dmg = Math.min(this.hp, x);
	this.hp-=x;
	if(this.hp <= 0){
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
					place(p.owner.creatures, new Creature(p.card.upped?EliteSkeleton:Skeleton, p.owner));
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
	if (this.cast == -3)dmg+=this.active();
	if (this instanceof Creature && (this.card.element == Death || this.card.element == Darkness))dmg+=calcEclipse();
	return this.burrowed?Math.ceil(dmg/2):dmg;
}
Player.prototype.truehp = function(){ return this.hp; }
Creature.prototype.truehp = function(){
	var hp=this.hp;
	if ((this.card.element == Darkness || this.card.element == Death) && calcEclipse() != 0){
		hp++;
	}
	if (this.passive == "scarab"){
		for (var i=0; i<23; i++){
			if (this.owner.creatures[i] && this.owner.creatures[i].passive == "scarab" && this.owner.creatures[i] != this){
				hp++;
			}
		}
	}
	return hp;
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
		this.active()
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
		}else if (!target.shield || (this.trueatk() > target.shield.dr && (!target.shield.active || !target.shield.active(this)))){
			var dmg = target.dmg(this.trueatk() - (target.shield?target.shield.dr:0));
			if (this.cast == -2){
				this.dmgdone = dmg;
				this.active(target);
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
	if(this instanceof Creature && this.truehp() <= 0 && ~this.getIndex()){
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
	this.hand.splice(index, 1);
	this.spend(card.costele, card.cost);
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
			}else if (card == Cards.Wings || card == Cards.WingsUp){
				this.shield.charges = 5;
			}else if (card == Cards.BoneWall || card == Cards.BoneWallUp){
				this.shield.charges = 7;
			}
			return this.shield;
		}else{
			return place(this.permanents, new Permanent(card, this));
		}
		return p;
	}else if (card.type == SpellEnum){
		this.card = card
		card.active.call(this, target)
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
function calcEclipse(){
	var bonus=0;
	for (var j=0; j<2; j++){
		for (var i=0; i<23; i++){
			if (players[j].permanents[i]){
				if(players[j].permanents[i].card == Cards.Nightfall){
					bonus=1;
				}else if(players[j].permanents[i].card == Cards.Eclipse){
					return 2;
				}
			}
		}
	}
	return bonus;
}
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
function creatgt(c, t){
	return t instanceof Creature && !t.immaterial && !t.burrowed;
}
var TargetFilters={
	pill:function(c, t){
		return t instanceof Pillar;
	},
	weap:function(c, t){
		return t instanceof Weapon;
	},
	perm:function(c, t){
		return t instanceof Permanent;
	},
	crea:creatgt,
	play:function(c, t){
		return t instanceof Player;
	},
	creaorplay:function(c, t){
		return creatgt(c, t) || t instanceof Player;
	},
	foeperm:function(c, t){
		return c.owner!=t.owner && t instanceof Permanent;
	},
	devour:function(c, t){
		return creatgt(c, t) && t.truehp()<c.truehp();
	},
	paradox:function(c, t){
		return creatgt(c, t) && t.truehp()<t.trueatk();
	},
	airbornecrea:function(c, t){
		return creatgt(c, t) && t.airborne;
	},
	wisdom:function(c, t){
		return t instanceof Creature && !t.burrowed;
	}

}
var Actives={
ablaze:function(t){
	this.atk+=2;
},
acceleration:function(t){
	this.atk+=2;
	this.dmg(1,true);
},
accelerationspell:function(t){
	this.cast=-1;
	this.active=Actives.acceleration;
},
accretion:function(t){
	Actives.destroy.call(this, t);
	this.buffhp(15);
	if (this.truehp() > 45){
		this.die();
		this.hand.append(this.card.upped?Cards.BlackHoleUp:Cards.BlackHole);
	}
},
adrenaline:function(t){
	t.adrenaline=true;
},
aflatoxin:function(t){
	t.addpoison(2);
	t.aflatoxin=true;
},
air:function(t){
	this.owner.spend(Air, -1);
},
antimatter:function(t){
	t.atk -= t.trueatk()*2;
},
bblood:function(t){
	t.buffhp(20);
	t.delay += 6;
},
blackhole:function(t){
	if (!this.owner.foe.sanctuary){
		quanta = this.owner.foe.quanta;
		for (var q=1; q<13; q++){
			this.owner.heal(Math.min(quanta[q],3));
			quanta[q] = Math.max(quanta[q]-3,0);
		}
	}
},
bless:function(t){
	t.atk += 3;
	t.buffhp(3);
},
bow:function(t){
	return this.owner.mark==Air?1:0;
},
bravery:function(t){
	var maxdraw=this.owner.mark==Fire?3:2;
	for(var i=0; i<maxdraw && this.owner.hand.length<8 && this.owner.foe.hand.length<8; i++){
		this.owner.drawcard();
		this.owner.foe.drawcard();
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
		t.active = destroy;
	}
},
catapult:function(t){
	this.owner.foe.dmg(Math.ceil(t.truehp()*(t.frozen?150:100)/(t.truehp()+100)));
	this.owner.foe.poison += t.poison;
	if (t.frozen){
		this.owner.foe.freeze(3);
	}
},
chimera:function(t){
	var atk,hp;
	for(var i=0; i<23; i++){
		if (this.owner.creatures[i]){
			atk+=this.owner.creatures[i].trueatk();
			hp+=this.owner.creatures[i].truehp();
		}
	}
	var chim=new Creature();
	chim.card=this.card;
	chim.atk=atk;
	chim.maxhp=hp;
	chim.hp=hp;
	chim.cast=0;
	chim.castele=0;
	chim.momentum=true;
	this.owner.creatures=[chim];
	this.owner.gpull=chim;
},
cpower:function(t){
	t.buffhp(Math.ceil(random()*5));
	t.atk += Math.ceil(random()*5);
},
cseed:function(t){
	Actives[["infect", "lightning", "icebolt", "firebolt", "freeze", "parallel", "lobotomize", "drainlife", "snipe", "rewind", "gpullspell"][Math.floor(random()*12)]](this, t)
},
cloak:function(t){
},
dagger:function(t){
	return this.owner.mark==Darkness||this.owner.mark==Death?1:0;
},
deadalive:function(t){
	var index=this.getIndex();
	this.die();
	this.owner.creatures[index] = this;
},
deadly:function(t){
	t.poison += 2
},
deja:function(t){
	this.active = undefined;
	parallel(this,this);
},
destroy:function(t){
	if (t instanceof Pillar && t.charges>1){
		t.charges--;
	}else{
		t.die();
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
			this.owner.shield = undefined;
		}
		return true;
	}
},
disshield:function(t){
	if (!this.owner.sanctuary){
		if (!this.owner.spend(Entropy, Math.ceil(t.trueatk()/3))){
			this.owner.shield = undefined;
		}
		return true;
	}
},
dive:function(t){
	this.dive += this.trueatk();
},
divinity:function(t){
	this.owner.buffhp(this.owner.mark==Light?24:16);
},
drainlife:function(t){
	this.heal(t.spelldmg(2+Math.floor((this.owner.quanta[Darkness]+(this.card.costele==Darkness?this.card.cost:0)/10)*2)));
},
dryspell:function(t){
	dmg = this.card.upped?2:1;
	function dryeffect(cr){
		this.spend(Water, -cr.dmg(dmg));
	}
	masscc(this.foe, dryeffect);
	if (!this.card.upped){
		masscc(this, dryeffect);
	}
},
dshield:function(t){
	this.immaterial=true;
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
		t.charges-=3;
	}else{
		t.die();
	}
},
empathy:function(t){
	var healsum=0;
	for(var i=0; i<23; i++){
		if (this.owner.creatures[i])healsum++;
	}
	this.owner.heal(healsum);
},
enchant:function(t){
	t.immaterial = true
},
endow:function(t){
	this.active = t.active;
	this.passive = t.passive;
	this.atk += t.atk;
	this.buffhp(2);
},
evolve:function(t){
	var shrieker = this.owner.creatures[this.getIndex()] = new Creature(this.card.upped?Cards.EliteShrieker:Cards.Shrieker, this.owner);
	shrieker.poison = this.poison;
},
fiery:function(t){
	return Math.floor(this.owner.quanta[Fire]/5);
},
fire:function(t){
	this.owner.spend(Fire, -1);
},
firebolt:function(t){
	t.spelldmg(3+Math.floor((this.owner.quanta[Fire]+(this.card.costele==Fire?this.card.cost:0))/10)*3);
},
flyingweapon:function(t){
	if (t.weapon){
		var cr=new Creature(t.weapon.card, t.owner);
		cr.airborne = true;
	}
},
fractal:function(t){
	this.owner.quanta[Aether]=0;
	for(var i=this.owner.hand.length; i<8; i++){
		this.owner.hand[i]=t.card;
	}
},
freeze:function(t){
	t.frozen = this.card.upped ? 4 : 3;
},
gas:function(t){
	place(this.owner.permanents, new Permanent(this.upped?Cards.UnstableGasUp:Cards.UnstableGas, this.owner))
},
gpull:function(t){
	this.owner.gpull = this;
},
gpullspell:function(t){
	this.owner.gpull = t;
},
gratitude:function(t){
	this.owner.heal(this.owner.mark==Life?5:3);
},
growth:function(t){
	this.buffhp(2);
	this.atk += 2;
},
guard:function(t){
	t.delay++;
	if (!t.airborne){
		t.dmg(this.trueatk());
	}
},
hammer:function(t){
	return this.owner.mark==Gravity||this.owner.mark==Earth?1:0;
},
hasten:function(t){
	this.owner.drawcard();
},
hatch:function(t){
	this.owner.creatures[this.getIndex()]=new Creature(randomcard(this.card.upped,true), this.owner);
},
heal:function(t){
	t.heal(5);
},
heal20:function(t){
	this.owner.heal(20);
},
holylight:function(t){
	if (!(t instanceof player) && (t.card.element == Darkness || t.card.element == Death)){
		t.dmg(10);
	}else t.heal(10);
},
icebolt:function(t){
	var bolts=1+Math.floor((this.owner.quanta[Water]+(this.card.costele==Water?this.card.cost:0))/10);
	t.spelldmg(bolts*2);
	if (random() < .3+bolts/10){
		t.freeze(3);
	}
},
ignite:function(t){
	masscc(this.owner.foe, function(x){x.dmg(1)});
	masscc(this.owner, function(x){x.dmg(1)});
	this.owner.foe.spelldmg(20);
},
immolate:function(t){
	t.die();
	for(var i=1; i<13; i++)
		this.quanta[i]++;
	this.quanta[Fire]+=this.card.upped?7:5;
},
improve:function(t){
	var cr=new Creature(randomcard(false, true), t.owner);
	var abilities=["hatch","freeze","burrow","destroy","steal","dive","heal","momentum","paradox","lycanthropy","scavenger","infection","gpull","devour","mutation","growth","ablaze","poison","deja","immaterial","endow","guard","mitosis"];
	cr.active = Actives[abilities[Math.floor(random()*abilities.length)]]
	cr.cast = Math.ceil(random(2));
	cr.castele = cr.card.element;
	cr.buffhp(Math.floor(random()*5));
	cr.atk += Math.floor(random()*5);
},
infect:function(t){
	t.addpoison(1);
},
integrity:function(t){
},
light:function(t){
	this.owner.spend(Light, -1);
},
lightning:function(t){
	t.spelldmg(5);
},
liquid:function(t){
	t.cast = -2;
	t.active=Actives.vampire;
	t.addpoison(1);
},
lobotomize:function(t){
	t.active = undefined;
	t.momentum = false;
},
luciferin:function(t){
	this.owner.heal(10);
	masscc(this.owner, function(x){
		if (x.active == undefined){
			x.active = light;
		}
	})
},
lycanthropy:function(t){
	this.buffhp(5);
	this.atk += 5;
},
miracle:function(t){
	this.quanta[Light] = 0;
	if (this.hp<this.maxhp)this.hp = this.maxhp-1;
},
mitosis:function(t){
	place(this.owner.creatures, new Creature(this.card, this.owner))
},
mitosisspell:function(t){
	if (this.card.type == CreatureEnum){
		this.castele = this.card.element;
		this.cast = this.card.cost;
		this.active = mitosis;
	}
},
momentum:function(t){
	t.atk+=1;
	t.buffhp(1);
	t.momentum=true;
},
mutation:function(t){
	var rnd=random();
	if (rnd<.1){
		t.die();
	}else if(rnd<.5){
		Actives.improve.call(this, t);
	}else{
		t.owner.creatures[t.getIndex()] = new Creature(Cards.Abomination, t.owner);
	}
},
neuro:function(t){
	t.poison += 1
	t.neuro = true
},
nightmare:function(t){
	if (!this.owner.sanctuary){
		var dmg=16-this.owner.foe.hand.length*2;
		this.owner.heal(dmg);
		this.owner.foe.dmg(dmg);
		for(var i=this.owner.foe.hand.length; i<8; i++){
			this.owner.foe.hand[i]=t.card;
		}
	}
},
nova:function(t){
	for (var i=1; i<13; i++){
		this.owner.quanta[i]++;
	}
	this.owner.nova++;
	if (this.owner.nova>=3){
		place(this.owner.creatures, new Creature(Cards.Singularity, this.owner));
	}
},
nova2:function(t){
	for (var i=1; i<13; i++){
		this.owner.quanta[i]+=2;
	}
	this.owner.nova+=2;
	if (this.owner.nova>=3){
		place(this.owner.creatures, new Creature(Cards.SingularityUp, this.owner));
	}
},
nymph:function(t){
	var e = t.card.element > 0?t.card.element:Math.ceil(random()*12);
	Actives.destroy.call(this, t);
	place(this.owner.creatures, new Creature(Cards[NymphList[e*2+(t.card.upped?1:0)]], t.owner));
},
overdrive:function(t){
	this.atk+=3;
	this.dmg(1,true);
},
overdrivespell:function(t){
	this.cast=-1;
	this.active=Actives.overdrive;
},
pandemonium:function(t){
	masscc(this.owner.foe, function(x){Actives.cseed.call(this,x)});
},
paradox:function(t){
	if(t.trueatk()>t.truehp())t.die();
},
parallel:function(t){
	var copy=new Creature();
	for(var attr in t){
		if (t.hasOwnProperty(attr))copy[attr]=t[attr];
	}
	copy.owner=this.owner;
	place(this.owner.creatures, copy);
},
phoenix:function(t){
},
photosynthesis:function(t){
	this.owner.spend(Life, -2);
	this.usedactive = false;
},
plague:function(t){
	masscc(this.owner.foe, function(x){x.addpoison(1)});
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
	t.poison=Math.max(t.poison-2,-2);
	t.neuro=false;
	t.sosa=0;
},
queen:function(t){
	place(this.owner.creatures, new Creature(this.upped?Cards.EliteFirefly:Cards.Firefly, this.owner));
},
quint:function(t){
	t.immaterial=true;
	t.frozen=0;
},
rage:function(t){
	var dmg=this.card.upped?6:5;
	t.atk+=dmg;
	t.dmg(dmg);
},
readiness:function(t){
	if (t.cast>0){
		t.cast=0;
	}
},
rebirth:function(t){
	this.owner.creatures[this.getIndex()]=new Creature(this.upped?Cards.MinorPhoenix:Cards.Phoenix, this.owner);
},
regenerate:function(t){
	this.owner.heal(5);
},
relic:function(t){
},
rewind:function(t){
	delete t.owner.creatures[t.getIndex()];
	t.owner.deck.push(t.card);
},
sanctuary:function(t){
	this.owner.sanctuary=true;
	this.owner.heal(4);
},
scarab:function(t){
	place(this.owner.creatures, new Creature(this.upped?Cards.EliteScarab:Cards.Scarab, this.owner));
},
scavange:function(t){
},
scramble:function(t){
	if (!t.sanctuary){
		for (var i=0; i<9; i++){
			if(t.spend(Other, 1)){
				t.spend(Other, -1);
			}
		}
	}
},
serendipity:function(t){
	var cards=[], num=Math.min(8-this.owner.hand.length, 3), anyentro=false;
	for(var i=0; i<num; i++){
		cards[i]=randomcard(this.card.upped);
		if (cards[i].element == Entropy)anyentro=true;
	}
	if (!anyentro){
		while (cards[0].element != Entropy){
			cards[0]=randomcard(this.card.upped);
		}
	}
	for(var i=0; i<num; i++){
		this.owner.hand.push(cards[i]);
	}
},
silence:function(t){
	this.owner.foe.silence = true;
},
skyblitz:function(t){
	for(var i=0; i<23; i++){
		if (this.creatures[i])Actives.dive.call(this.creatures[i]);
	}
},
snipe:function(t){
	t.dmg(3);
},
sosa:function(t){
	t.owner.sosa = 2;
	t.owner.truedmg(this.card.upped?40:48);
},
sskin:function(t){
	this.buffhp(this.quanta[Earth]+this.card.cost);
},
steal:function(t){
	var index=t.getIndex();
	delete t.owner[index];
	t.owner = this.owner;
	for(var i=0; i<23; i++){
		if(!this.owner.permanents[i]){
			this.owner.permanents[i]=t;
			break;
		}
	}
},
steam:function(t){
	this.steamatk += 5;
},
stoneform:function(t){
	this.maxhp += this.quanta[Earth];
},
storm2:function(t){
	masscc(this.owner.foe, function(x){x.dmg(2)});
},
storm3:function(t){
	masscc(this.owner.foe, function(x){x.dmg(3)});
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
	this.owner.heal(this.dmgdone);
},
venom:function(t){
	t.poison += 1
},
void:function(t){
	this.owner.foe.buffhp(this.owner.mark==Darkness?-6:-3);
},
web:function(t){
	t.airborne = false;
},
wisdom:function(t){
	t.atk += 4;
	if (t.immaterial){
		t.spelldamage = true;
	}
},
pillar:function(t){
	this.owner.spend(this.card.element,-this.charges*(this.card.element>0?1:3));
},
pend:function(t){
	this.owner.spend(this.pendstate?this.owner.mark:this.card.element,-this.charges);
	this.pendstate^=true;
},
skull:function(t){
	var thp=t.truehp();
	if (thp <= 0 || random() < .5/thp){
		var index=t.getIndex()
		t.die();
		t.owner[index] = new Creature(t.card.upped?Cards.EliteSkeleton:Cards.Skeleton, t.owner);
	}
},
bones:function(t){
	if (--this.charges <= 0){
		this.owner.shield = undefined;
	}
	return true;
},
weight:function(t){
	return t.truehp()>5;
},
thorn:function(t){
	if (random()<.75){
		t.addpoison(1);
	}
},
reflect:function(t){
},
firewall:function(t){
	t.dmg(1);
},
cold:function(t){
	if (random()<.3){
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
	return random()>.4;
},
wings:function(t){
	return t.airborne || t.passive == "ranged";
},
slow:function(t){
	t.delay = 1;
},
evade50:function(t){
	return random()>.5;
},
evade100:function(t){
	return true;
},
}