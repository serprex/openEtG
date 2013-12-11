var rng = new MersenneTwister(0);
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
					var nospacename = carddata[1].replace(" ","");
					Cards[nospacename in Cards?nospacename+"Up":nospacename] = Cards[cardcode] = new Card(_i, cardinfo);
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
function shuffle(array) {
	var counter = array.length, temp, index;
	while (counter--) {
		index = (rng.real() * counter) | 0;
		temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
}
function etgReadCost(card, attr, cost, e){
	if (~cost.indexOf("+")){
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
Card.prototype.info = function(){
	return this.cost+":"+this.element+" "+this.attack+"|"+this.health+(this.airborne?" airborne ":" ")+(this.passive||"");
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
	this.permanents = new Array(16);
	this.mark = 0;
	this.quanta = [];
	for(var i=1; i<13; i++)this.quanta[i]=0;
	this.shardgolem = {
		atk: 0,
		hp: 0,
		adrenaline: 0,
		active: Actives.burrow,
		cast: 1
	};

}
function Thing(card, owner){
	if (!card)return;
	this.owner = owner;
	this.card = card;
}
function Creature(card, owner){
	Thing.apply(this, arguments);
	this.delayed = 0;
	this.frozen = 0;
	this.dive = 0;
	this.poison = 0;
	this.steamatk = 0;
	this.adrenaline = 0;
	this.aflatoxin = false;
	this.usedactive = true;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.airborne = card.airborne;
	this.active = card.active;
	this.passive = card.passive;
	this.cast = card.cast;
	this.castele = card.castele;
	this.psion = card.passive == "psion";
	this.momentum = card.passive == "momentum";
	this.burrowed = card.passive == "burrowed";
	this.immaterial = card.passive == "immaterial";
	if (card == Cards.ShardGolem){
		var golem = this.owner.shardgolem;
		this.maxhp = this.hp = golem.hp;
		this.atk = golem.atk;
		this.active = golem.active;
		this.cast = golem.cast;
		this.airborne = golem.airborne;
		this.adrenaline = golem.adrenaline;
		this.passive = golem.passive;
		this.momentum = golem.momentum;
		this.immaterial = golem.immaterial;
	}
}
function Permanent(card, owner){
	if (!card){
		return;
	}
	Thing.apply(this, arguments);
	this.cast = card.cast;
	this.castele = card.castele;
	this.active = card.active;
	this.passive = card.passive;
	this.charges = 0;
	this.usedactive = true;
	this.immaterial = card.passive == "immaterial" || card == Cards.Hope || card == Cards.HopeUp || this.active == Actives.reflect;
}
function Weapon(card, owner){
	Permanent.apply(this, arguments);
	this.psion = false;
	this.frozen = 0;
	this.delayed = 0;
	this.momentum = card.passive == "momentum";
	this.atk = card.attack;
	this.dive = 0;
	this.steamatk = 0;
	this.adrenaline = 0;
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
Creature.prototype = new Thing();
Permanent.prototype = new Thing();
Weapon.prototype = new Permanent();
Shield.prototype = new Permanent();
Pillar.prototype = new Permanent();
Player.prototype.randomquanta = function() {
	var nonzero = 0
	for(var i=1; i<13; i++){
		nonzero += this.quanta[i];
	}
	if (nonzero == 0){
		return -1;
	}
	nonzero = Math.ceil(rng.real()*nonzero);
	for(var i=1; i<13; i++){
		if ((nonzero -= this.quanta[i])<=0){
			return i;
		}
	}
}
Player.prototype.canspend = function(qtype, x) {
	if (x <= 0)return true;
	if (qtype == Other){
		for (var i=1; i<13; i++){
			x -= this.quanta[i];
		}
		return x<= 0;
	}else return this.quanta[qtype] >= x;
}
Player.prototype.spend = function(qtype, x) {
	if (x == 0)return true;
	if (!this.canspend(qtype, x))return false;
	if (qtype == Other){
		var b = x<0?-1:1;
		for (var i=x*b; i>0; i--){
			this.quanta[b==-1?Math.ceil(rng.real()*12):this.randomquanta()] -= b
		}
	}else this.quanta[qtype] -= x;
	for (var i=1; i<13; i++){
		if (this.quanta[qtype]>75){
			this.quanta[qtype]=75;
		}
	}
	return true;
}
Player.prototype.discard = function(index) {
	var card=this.hand[index];
	if (card.passive == "obsession"){
		player1.dmg(card.upped?13:10);
	}
	this.hand.splice(index, 1);
}
Player.prototype.endturn = function() {
	this.precognition = this.sanctuary = this.silence = false;
	this.spend(this.mark, -1);
	this.foe.dmg(this.foe.poison);
	var patienceFlag = false, floodingFlag = false, stasisFlag = false, floodingPaidFlag = false, freedomChance = 0;
	for(var i=0; i<16; i++){
		var p;
		if ((p=this.permanents[i])){
			if (p instanceof Pillar || p.cast == -1){
				p.active();
			}
			p.usedactive = false;
			if (p.active == Actives.cloak || p.passive == "stasis"){
				if (--p.charges < 0){
					delete this.permanents[i];
				}else if (p.passive == "stasis"){
					stasisFlag = true;
				}
			}else if (p.passive == "flooding" && !floodingPaidFlag){
				floodingPaidFlag = true;
				floodingFlag = true;
				if (!this.spend(Water, 1)){
					delete this.permanents[i];
				}
			}else if (p.passive == "sopa"){
				patienceFlag = true;
			}else if (p.passive == "freedom"){
				freedomChance += .25;
			}
		}
		if ((p=this.foe.permanents[i])){
			if (p.passive == "stasis"){
				if (--p.charges < 0){
					delete this.foe.permanents[i];
				}
				stasisFlag = true;
			}else if (p.passive == "flooding"){
				floodingFlag = true;
			}
		}
	}
	if (patienceFlag){
		for(var i=0; i<23; i++){
			var c;
			if ((c = this.creatures[i])){
				let floodbuff = floodingFlag&&j>5&&c.card.element==Water;
				c.atk += floodbuff?5:c.burrowed?4:2;
				c.buffhp(floodbuff?5:2);
				c.delay(1);
			}
		}
	}
	var cr;
	for (var i=0; i<23; i++){
		if ((cr = this.creatures[i])){
			cr.attack(stasisFlag, freedomChance);
			if (cr.adrenaline>0){
				cr.adrenaline=1;
			}
			if (i>5 && floodingFlag && (cr.card.element != Water || cr.card.element != Other) && ~cr.getIndex()){
				cr.die();
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
		}else if (!winner){
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
Creature.prototype.info = function(){
	var info=this.trueatk()+"|"+this.truehp()+"/"+this.maxhp;
	if (this.active)info+=" "+casttext(this.cast, this.castele)+":"+activename(this.active);
	if (this.frozen)info+=" "+this.frozen+"frozen";
	if (this.delayed)info+=" "+this.delayed+"delay";
	if (this.poison)info+=" "+this.poison+"psn";
	if (this.aflatoxin)info+=" aflatoxin";
	if (this.airborne)info+=" airborne";
	if (this.owner.gpull == this)info += " gpull";
	if (this.adrenaline)info += " adrenaline";
	if (this.momentum)info+=" momentum";
	if (this.psion)info+=" psion";
	if (this.burrowed)info+=" burrowed";
	if (this.immaterial)info+=" immaterial";
	if (this.passive && this.passive != "momentum" && this.passive != "burrowed" && this.passive != "immaterial" && this.passive != "psion")info+=" "+this.passive;
	return info;
}
Permanent.prototype.info = function(){
	var info = this.charges?"x"+this.charges:"";
	if (this.active)info+=" "+casttext(this.cast, this.castele)+":"+activename(this.active);
	if (this.immaterial)info += " immaterial";
	if (this.passive)info += " " + this.passive;
	return info;
}
Weapon.prototype.info = function(){
	var info = this.trueatk().toString();
	if (this.active)info+=" "+casttext(this.cast, this.castele)+":"+activename(this.active);
	if (this.frozen)info += " "+this.frozen+"frozen";
	if (this.delayed)info += " "+this.delayed+"delay";
	if (this.momentum)info += " momentum";
	if (this.immaterial)info += " immaterial";
	return info;
}
Shield.prototype.info = function(){
	var info = this.dr + "DR ";
	if (this.active)info+=" "+activename(this.active);
	if (this.charges)info += " x"+this.charges;
	if (this.immaterial)info += " immaterial";
	return info;
}
Pillar.prototype.info = function(){
	return this.charges + " " + (this.pendstate?this.owner.mark:this.card.element);
}
Player.prototype.delay = function(x) {
	if (this.weapon)this.weapon.delay(x);
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
Player.prototype.dmg = function(x, ignoresosa) {
	var sosa = this.sosa && !ignoresosa;
	if (sosa){
		x *= -1;
	}
	if (x<0){
		var heal = Math.max(this.hp-this.maxhp, x);
		this.hp = Math.min(this.maxhp, this.hp-x);
		return sosa?-x:heal;
	}else{
		this.hp -= x;
		if (this.hp <= 0 && !winner){
			setWinner(this.foe);
		}
		return sosa?-x:x;
	}
}
Player.prototype.spelldmg = function(x) {
	return (!this.shield || this.shield.active != Actives.reflect?this:this.foe).dmg(x);
}
Creature.prototype.getIndex = function() { return this.owner.creatures.indexOf(this); }
Player.prototype.addpoison = Creature.prototype.addpoison = function(x) {
	this.poison += x;
	if (this.passive == "voodoo"){
		this.owner.foe.poison += x;
	}
}
Player.prototype.buffhp = Creature.prototype.buffhp = function(x){
	this.maxhp += x;
	this.dmg(-x);
}
Weapon.prototype.delay = Creature.prototype.delay = function(x){
	this.delayed += x;
	if (this.passive == "voodoo")this.owner.foe.delay(x);
}
Weapon.prototype.freeze = Creature.prototype.freeze = function(x){
	this.frozen = x;
	if (this.passive == "voodoo")this.owner.foe.freeze(x);
}
Creature.prototype.spelldmg = Creature.prototype.dmg = function(x, dontdie){
	var dmg = x<0 ? Math.max(this.hp-this.maxhp, x) : Math.min(this.hp, x);
	this.hp -= dmg;
	if (this.truehp() <= 0){
		if (!dontdie)this.die();
	}else if (dmg>0 && this.passive == "voodoo")this.owner.foe.dmg(x);
	return dmg;
}
Creature.prototype.remove = function(index) {
	index = index || this.getIndex();
	delete this.owner.creatures[index];
	if (this.owner.gpull == this)this.owner.gpull = null;
	return index;
}
function deatheffect() {
	for(var i=0; i<2; i++){
		var pl = players[i];
		for(var j=0; j<23; j++){
			var c = pl.creatures[j];
			if (c && c.active == Actives.scavenger){
				c.atk += 1;
				c.buffhp(1);
			}
		}
		for(var j=0; j<16; j++){
			var p = pl.permanents[j];
			if (p){
				if (p.passive == "boneyard" && this.card != Cards.Skeleton && this.card != Cards.EliteSkeleton){
					place(p.owner.creatures, new Creature(p.card.upped?Cards.EliteSkeleton:Cards.Skeleton, p.owner));
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
Creature.prototype.die = function() {
	var index = this.remove();
	if (this.aflatoxin){
		this.owner.creatures[index] = new Creature(Cards.MalignantCell, this.owner);
	}else if (this.active == Actives.phoenix){
		this.owner.creatures[index] = new Creature(this.card.upped?Cards.AshUp:Cards.Ash, this.owner);
	}
	deatheffect();
}
Creature.prototype.evade = function(sender) {
	if (sender != this.owner && this.airborne && this.card.element == Air){
		var freedomChance = 0;
		for(var i=0; i<16; i++){
			if (this.owner.permanents[i] && this.owner.permanents[i].passive == "freedom"){
				freedomChance += .25;
			}
		}
		return freedomChance && rng.real() < freedomChance;
	}
}
Weapon.prototype.trueatk = Creature.prototype.trueatk = function(adrenaline){
	var dmg = this.atk+this.steamatk+this.dive;
	if (this.cast == -3)dmg += this.active();
	dmg = this.burrowed?Math.ceil(dmg/2):dmg;
	if (this instanceof Creature && (this.card.element == Death || this.card.element == Darkness)){
		dmg+= calcEclipse();
	}
	return calcAdrenaline(dmg, adrenaline||this.adrenaline);
}
Player.prototype.truehp = function(){ return this.hp; }
Creature.prototype.truehp = function(){
	var hp = this.hp;
	if ((this.card.element == Darkness || this.card.element == Death) && calcEclipse() != 0){
		hp++;
	}
	if (this.passive == "swarm"){
		for (var i=0; i<23; i++){
			if (this.owner.creatures[i] && this.owner.creatures[i].passive == "swarm" && this.owner.creatures[i] != this){
				hp++;
			}
		}
	}
	return hp;
}
Permanent.prototype.getIndex = function() { return this.owner.permanents.indexOf(this); }
Permanent.prototype.die = function(){ delete this.owner.permanents[this.getIndex()]; }
Weapon.prototype.die = function() { this.owner.weapon = undefined; }
Shield.prototype.die = function() { this.owner.shield = undefined; }
Thing.prototype.canactive = function() {
	return myturn && this.active && !this.usedactive && this.cast >= 0 && !this.delayed && !this.frozen && this.owner.canspend(this.castele, this.cast);
}
Thing.prototype.useactive = function(t) {
	this.usedactive = true;
	if (!t.evade(this.owner)){
		this.active(t);
	}
	this.owner.spend(this.castele, this.cast);
	if (this.passive == "sacrifice"){
		this.die();
	}
}
function countAdrenaline(x){
	return 5-Math.floor(Math.sqrt(Math.abs(x)));
}
function calcAdrenaline(x,y){
	if (y<2)return x;
	var f1 = calcAdrenaline(x,y-1);
	return f1-Math.ceil((4-countAdrenaline(x))*f1*(y-1)/3);
}
Weapon.prototype.attack = Creature.prototype.attack = function(stasis, freedomChance){
	var isCreature = this instanceof Creature;
	if (isCreature){
		this.dmg(this.poison, true);
	}
	var target = this.owner.foe;
	if (this.frozen == 0 && this.adrenaline<3){
		if (this.cast == -1 && this.active){
			this.active();
		}
		if (this.passive == "devour" && target.spend(Other, 1)){
			this.owner.spend(Darkness, -1);
		}
	}
	var trueatk, momentum = this.momentum;
	if (!(stasis || this.frozen>0 || this.delayed>0) && (trueatk = this.trueatk()) != 0){
		if (this.airborne && freedomChance && rng.real() < freedomChance){
			trueatk = Math.ceil(trueatk * 1.5);
			momentum = true;
		}
		if (this.psion){
			target.spelldmg(trueatk);
		}else if (momentum || trueatk < 0){
			target.dmg(trueatk);
			if (this.adrenaline < 3 && this.cast == -2){
				this.dmgdone = trueatk;
				this.active(target);
			}
		}else if (target.gpull){
			var dmg = target.gpull.dmg(trueatk);
			if (this.adrenaline < 3 && this.cast == -2){
				this.dmgdone = dmg;
				this.active(target);
			}
		}else if (!target.shield || (trueatk > target.shield.dr && (!target.shield.active || !target.shield.active(this)))){
			var dmg = trueatk - (target.shield?target.shield.dr:0);
			target.dmg(dmg);
			if (this.adrenaline < 3 && this.cast == -2){
				this.dmgdone = dmg;
				this.active(target);
			}
		}
	}
	if (this.frozen > 0){
		this.frozen -= 1;
	}
	if (this.delayed > 0){
		this.delayed -= 1;
	}
	this.usedactive = false;
	this.dive = 0;
	if (this.active == Actives.dshield){
		this.immaterial = false;
	}
	if (this.steamatk>0){
		this.steamatk--;
	}
	if (~this.getIndex()){
		if (this instanceof Creature && this.truehp() <= 0){
			this.die();
		}else if (this.adrenaline > 0 && this.adrenaline < countAdrenaline(this.trueatk(0))){
			this.adrenaline++;
			this.attack(stasis, freedomChance);
		}
	}
}
function place(array, item){
	for (var i=0; i<array.length; i++){
		if (!array[i]){
			return array[i] = item;
		}
	}
}
Player.prototype.summon = function(index, target){
	var card = this.hand[index];
	this.hand.splice(index, 1);
	this.spend(card.costele, card.cost);
	if (this.neuro){
		this.poison += 1;
	}
	if (card.type <= PermanentEnum){
		if (card.type == PillarEnum){
			if (card.upped){
				this.spend(card.element, card.element>0?-1:-3);
			}
			for (var i=0; i<16; i++){
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
			var p = new Permanent(card, this);
			if (card == Cards.Sundial || card == Cards.SundialUp){
				p.charges = 2;
			}else if(card == Cards.Cloak || card == Cards.CloakUp){
				p.charges = 3;
			}
			return place(this.permanents, p);
		}
	}else if (card.type == SpellEnum){
		if (!target || !target.evade(this)){
			this.card = card
			card.active.call(this, target)
		}
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
var ShardList = [undefined, undefined,
	"50a", "6uq",
	"53e", "71u",
	"56i", "752",
	"59m", "786",
	"5cq", "7ba",
	"5fu", "7ee",
	"5j2", "7hi",
	"5m6", "7km",
	"5pa", "7nq",
	"5se", "7qu",
	"5vi", "7u2",
	"62m", "816"];
function calcEclipse(){
	var bonus = 0;
	for (var j=0; j<2; j++){
		for (var i=0; i<16; i++){
			if (players[j].permanents[i]){
				if (players[j].permanents[i].card == Cards.Nightfall){
					bonus = 1;
				}else if (players[j].permanents[i].card == Cards.Eclipse){
					return 2;
				}
			}
		}
	}
	return bonus;
}
function randomcard(upped, filter){
	var keys = [];
	for(var key in Cards) {
		if (key.length == 3 && Cards[key].upped == upped && (!filter || filter(Cards[key]))) {
			var intKey = parseInt(key, 32);
			// Skip marks
			if (!((intKey>=5011&&intKey<=5022)||(intKey>=7011&&intKey<=7022))){
				keys.push(key);
			}
		}
	}
	keys.sort();
	return Cards[keys[Math.floor(rng.real() * keys.length)]];
}
function activename(active){
	for(var key in Actives){
		if (Actives[key] == active){
			return key;
		}
	}
}
function casttext(cast, castele){
	if (cast > 0){
		return cast + ":" + castele;
	}else if (cast == 0){
		return "0";
	}else if (cast == -1){
		return "per hit";
	}else if (cast == -2){
		return "on hit";
	}else if (cast == -3){
		return "buff";
	}else console.log("Unknown cost: " + cast);
}
function masscc(player, caster, func){
	for (var i=0; i<23; i++){
		if (player.creatures[i] && !player.creatures[i].immaterial && !player.creatures[i].burrowed){
			func.call(caster, player.creatures[i]);
		}
	}
}
function isMaterialInstance(type,t){
	return t instanceof type && !t.immaterial && !t.burrowed;
}
var TargetFilters = {
	pill:function(c, t){
		return isMaterialInstance(Pillar, t);
	},
	weap:function(c, t){
		return isMaterialInstance(Weapon, t);
	},
	perm:function(c, t){
		return isMaterialInstance(Permanent, t);
	},
	crea:function(c, t){
		return isMaterialInstance(Creature, t);
	},
	creaonly:function(c, t){
		return isMaterialInstance(Creature, t) && t.card.type == CreatureEnum;
	},
	creanonspell:function(c, t){
		return isMaterialInstance(Creature, t) && t.card.type != SpellEnum;
	},
	play:function(c, t){
		return t instanceof Player;
	},
	creaorplay:function(c, t){
		return t instanceof Player || isMaterialInstance(Creature, t);
	},
	foeperm:function(c, t){
		return c.owner != t.owner && isMaterialInstance(Permanent, t);
	},
	butterfly:function(c, t){
		return isMaterialInstance(Creature, t) && t.trueatk()<3;
	},
	devour:function(c, t){
		return isMaterialInstance(Creature, t) && t.truehp()<c.truehp();
	},
	paradox:function(c, t){
		return isMaterialInstance(Creature, t) && t.truehp()<t.trueatk();
	},
	airbornecrea:function(c, t){
		return isMaterialInstance(Creature, t) && t.airborne;
	},
	wisdom:function(c, t){
		return isMaterialInstance(Creature, t) && !t.burrowed;
	}

}
var Actives = {
ablaze:function(t){
	this.atk += 2;
},
acceleration:function(t){
	this.atk += 2;
	this.dmg(1,true);
},
accelerationspell:function(t){
	this.cast = -1;
	this.active = Actives.acceleration;
},
accretion:function(t){
	Actives.destroy.call(this, t);
	this.buffhp(15);
	if (this.truehp() > 45){
		this.die();
		this.owner.hand.append(this.card.upped?Cards.BlackHoleUp:Cards.BlackHole);
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
cloak:function(t){
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
destroy:function(t){
	if ((t instanceof Pillar || t.card == Cards.BoneWall || t.card == Cards.BoneWallUp) && t.charges>1){
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
	if (t.cast == -3){
		this.atk -= t.active();
	}
	this.buffhp(2);
},
evolve:function(t){
	var shrieker = this.owner.creatures[this.remove()] = new Creature(this.card.upped?Cards.EliteShrieker:Cards.Shrieker, this.owner);
	shrieker.poison = this.poison;
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
	this.owner.creatures[this.remove()] = new Creature(randomcard(this.card.upped, function(x){return x.type == CreatureEnum}), this.owner);
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
	var cr = new Creature(randomcard(false, function(x){return x.type == CreatureEnum}), t.owner);
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
integrity:function(t){
	var shardTally = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
	var shardSkills = [
		[],
		["deadalive", "mutation", "paradox", "improve", "scramble", "antimatter"],
		["infection", "scavenger", "poison", "poison", "aflatoxin", "poison2"],
		["devour", "devour", "devour", "devour", "devour", "blackhole"],
		["burrow", "stoneform", "guard", "guard", "petrify", "petrify"],
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
			active = shardSkills[i][shardTally[i]];
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
	this.castele = this.card.element;
	this.cast = this.card.cost;
	this.active = Actives.Mitosis;
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
		t.owner.creatures[t.remove()] = new Creature(Cards.Abomination, t.owner);
	}
},
neuro:function(t){
	t.poison += 1
	t.neuro = true
},
nightmare:function(t){
	if (!this.owner.sanctuary){
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
	this.cast = -1;
	this.active = Actives.overdrive;
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
	this.owner.creatures[this.remove()] = new Creature(this.card.upped?Cards.MinorPhoenix:Cards.Phoenix, this.owner);
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
		Actives.destroy.call(this, t);
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
		Actives.destroy.call(this, t);
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