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
var MulliganPhase1 = 0;
var MulliganPhase2 = 1;
var PlayPhase = 2;
var EndPhase = 3;
var TrueMarks = ["8pi", "8pj", "8pk", "8pl", "8pm", "8pn", "8po", "8pp", "8pq", "8pr", "8ps", "8pt", "8pu"];
var PlayerRng = Object.create(Player.prototype);
PlayerRng.rng = Math.random;
PlayerRng.upto = function(x){ return Math.floor(Math.random()*x); }
PlayerRng.uptoceil = function(x){ return Math.ceil((1-Math.random())*x); }
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
function mkGame(first, seed){
	var game = { rng: new MersenneTwister(seed), phase: MulliganPhase1, ply: 0 };
	game.player1 = new Player(game);
	game.player2 = new Player(game);
	game.player1.foe = game.player2;
	game.player2.foe = game.player1;
	game.players = [game.player1, game.player2];
	game.turn = first?game.player1:game.player2;
	return game;
}
function cloneRng(rng){
	var obj = new MersenneTwister(0);
	obj.mti = rng.mti;
	obj.mt = rng.mt.slice();
	return obj;
}
function cloneGame(game){
	var obj = {
		rng: cloneRng(game.rng),
		ply: game.ply,
		phase: game.phase
	};
	obj.player1 = game.player1.clone(obj),
	obj.player2 = game.player2.clone(obj),
	obj.player1.foe = obj.player2;
	obj.player2.foe = obj.player1;
	obj.players = [obj.player1, obj.player2];
	obj.turn = game.turn == game.player1?obj.player1:obj.player2;
	return obj;
}
function setWinner(game, play){
	if (!game.winner){
		game.winner=play;
		game.phase=EndPhase;
	}
}
Player.prototype.shuffle = function(array) {
	var counter = array.length, temp, index;
	while (counter--) {
		index = this.upto(counter)|0;
		temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
}
function place(array, item){
	for (var i=0; i<array.length; i++){
		if (!array[i]){
			return array[i] = item;
		}
	}
}
function clone(obj){
	var result = {};
	if (obj){
		for(var key in obj){
			result[key] = obj[key];
		}
	}
	return result;
}
function objinfo(obj){
	var info = "";
	for (var key in obj){
		var val = obj[key]
		if (val===true)info += " " + key;
		else if (val){
			info += " " + val + key;
		}
	}
	return info;
}
function combineactive(a1, a2){
	if (!a1){
		return a2;
	}
	var combine = function(){
		return (a1.apply(null, arguments) || 0) + (a2.apply(null, arguments) || 0);
	}
	combine.activename = a1.activename + " " + a2.activename;
	return combine;
}
function isEmpty(obj){
	for(var key in obj){
		if (obj[key] !== undefined){
			return false;
		}
	}
	return true;
}
Player.prototype.clone = function(game){
	var obj = Object.create(Player.prototype);
	for(var key in this){
		if (key == "status" || key == "shardgolem"){
			obj[key] = clone(this[key]);
		}else{
			var val = this[key];
			if (Array.isArray(val)){
				var arr = obj[key] = val.slice();
				if (key == "creatures" || key == "permanents" || key == "hand"){
					for(var i=0; i<arr.length; i++){
						if (arr[i]){
							arr[i] = arr[i].clone(obj);
						}
					}
				}
			}else if(key == "shield" || key == "weapon"){
				if (val){
					obj[key] = val.clone(obj);
				}
			}else{
				obj[key] = val;
			}
		}
	}
	obj.game = game;
	obj.owner = obj;
	return obj;
}
CardInstance.prototype.clone = function(owner){
	return new CardInstance(this.card, owner);
}
Creature.prototype.clone = function(owner){
	var obj = Object.create(Creature.prototype);
	for(var attr in this){
		if (this.hasOwnProperty(attr))obj[attr] = this[attr];
	}
	obj.passives = clone(this.passives);
	obj.active = clone(this.active);
	obj.status = clone(this.status);
	obj.owner = owner;
	return obj;
}
Permanent.prototype.clone = function(owner){
	var obj = Object.create(Permanent.prototype);
	for(var attr in this){
		if (this.hasOwnProperty(attr))obj[attr] = this[attr];
	}
	obj.passives = clone(this.passives);
	obj.active = clone(this.active);
	obj.status = clone(this.status);
	obj.owner = owner;
	return obj;
}
Weapon.prototype.clone = function(owner){
	var obj = Object.create(Weapon.prototype);
	for(var attr in this){
		if (this.hasOwnProperty(attr))obj[attr] = this[attr];
	}
	obj.passives = clone(this.passives);
	obj.active = clone(this.active);
	obj.status = clone(this.status);
	obj.owner = owner;
	return obj;
}
Shield.prototype.clone = function(owner){
	var obj = Object.create(Shield.prototype);
	for(var attr in this){
		if (this.hasOwnProperty(attr))obj[attr] = this[attr];
	}
	obj.passives = clone(this.passives);
	obj.active = clone(this.active);
	obj.status = clone(this.status);
	obj.owner = owner;
	return obj;
}
Pillar.prototype.clone = function(owner){
	var obj = Object.create(Pillar.prototype);
	for(var attr in this){
		if (this.hasOwnProperty(attr))obj[attr] = this[attr];
	}
	obj.passives = clone(this.passives);
	obj.active = clone(this.active);
	obj.status = clone(this.status);
	obj.owner = owner;
	return obj;
}
Card.prototype.readCost = function(attr, cost){
	var c=cost.split(":");
	c = [parseInt(c[0]), (c.length==1?this.element:parseInt(c[1]))]
	if (isNaN(c[0]))return;
	this[attr]=c[0];
	this[attr+"ele"]=c[1];
	return true;
}
Card.prototype.info = function(){
	if (this.type == PillarEnum){
		return "1:" + this.element + " " + activename(this.active.auto);
	}else if (this.text){
		var prefix = this.type == WeaponEnum?"Weapon: deal " + this.attack + " damage each turn. ":
			this.type == ShieldEnum?"Shield: "+(this.health?"reduce damage by "+this.health+" ":""):
			this.type == CreatureEnum?this.attack+"|"+this.health+" ":"";
		return prefix + this.text;
	}else{
		var info = ["", "Weapon", "Shield", "", "Spell", ""][this.type];
		if (this.type == SpellEnum){
			return info + " " + activename(this.active);
		}
		if (this.type == ShieldEnum)info += ": reduce damage by " + this.health;
		else if (this.type == WeaponEnum)info += ": deal " + this.attack + " damage each turn.";
		else if (this.type == CreatureEnum)info += this.attack+"|"+this.health;
		return info + Thing.prototype.activetext.call(this) + objinfo(this.status) + objinfo(this.passives);
	}
}
Thing.prototype.toString = function(){ return this.card.name; }
Player.prototype.toString = function(){ return this == this.game.player1?"1":"2"; }
Card.prototype.toString = function(){ return this.code; }
Card.prototype.asUpped = function(upped){
	return this.upped == upped ? this : CardCodes[(this.upped?parseInt(this.code, 32)-2000:parseInt(this.code, 32)+2000).toString(32)];
}
Card.prototype.isOf = function(card){
	return card.code == (this.upped ? (parseInt(this.code, 32)-2000).toString(32) : this.code);
}
Player.prototype.rng = function(){
	return this.game.rng.real();
}
Player.prototype.upto = function(x){
	return Math.floor(this.game.rng.rnd()*x);
}
Player.prototype.uptoceil = function(x){
	return Math.ceil((1-this.game.rng.rnd())*x);
}
Player.prototype.isCloaked = function(){
	for(var i=0; i<16; i++){
		if (this.permanents[i] && this.permanents[i].passives.cloak){
			return true;
		}
	}
	return false;
}
Player.prototype.info = function(){
	var info = this.hp + "/" + this.maxhp + " " + this.deck.length + "cards";
	if (this.nova)info += " " + this.nova + "nova";
	info += objinfo(this.status);
	if (this.neuro)info += " neuro";
	if (this.sosa)info += " " + this.sosa + "sosa";
	if (this.silence)info += " silence";
	if (this.sanctuary)info += " sanctuary";
	if (this.precognition)info += " precognition";
	if (this.gpull)info += " gpull";
	return info;
}
Player.prototype.randomquanta = function() {
	var nonzero = 0;
	for(var i=1; i<13; i++){
		nonzero += this.quanta[i];
	}
	if (nonzero == 0){
		return -1;
	}
	nonzero = this.uptoceil(nonzero);
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
			if (x <= 0){
				return true;
			}
		}
		return false;
	}else return this.quanta[qtype] >= x;
}
Player.prototype.spend = function(qtype, x) {
	if (x == 0)return true;
	if (x<0 && this.flatline)return true;
	if (!this.canspend(qtype, x))return false;
	if (qtype == Other){
		var b = x<0?-1:1;
		for (var i=x*b; i>0; i--){
			this.quanta[b==-1?this.uptoceil(12):this.randomquanta()] -= b;
		}
	}else this.quanta[qtype] -= x;
	for (var i=1; i<13; i++){
		if (this.quanta[i]>99){
			this.quanta[i]=99;
		}
	}
	return true;
}
Player.prototype.endturn = function(discard) {
	this.game.ply++;
	if (discard != undefined){
		var cardinst = this.hand[discard];
		var card = cardinst.card;
		this.hand.splice(discard, 1);
		if (card.active && card.active.discard){
			card.active.discard(cardinst, this);
		}
	}
	var markpower = this.markpower ? this.markpower : 1;
	this.spend(this.mark, -markpower * (this.mark > 0 ? 1 : 3));
	if (this.foe.status.poison){
		this.foe.dmg(this.foe.status.poison);
	}
	var patienceFlag = false, floodingFlag = false, stasisFlag = false, floodingPaidFlag = false, freedomChance = 0;
	for(var i=0; i<16; i++){
		var p;
		if ((p=this.permanents[i])){
			if(p.active.auto){
				p.active.auto(p);
			}
			p.usedactive = false;
			if (p.passives.stasis){
				stasisFlag = true;
			}else if (p.passives.flooding && !floodingPaidFlag){
				floodingPaidFlag = true;
				floodingFlag = true;
				if (!this.spend(Water, 1)){
					delete this.permanents[i];
				}
			}else if (p.passives.patience){
				patienceFlag = true;
			}else if (p.passives.freedom){
				freedomChance++;
			}
		}
		if ((p=this.foe.permanents[i])){
			if (p.passives.stasis){
				stasisFlag = true;
			}else if (p.passives.flooding){
				floodingFlag = true;
			}
		}
	}
	if (freedomChance){
		freedomChance = (1-Math.pow(.7,freedomChance));
	}
	var cr, crs = this.creatures.slice();
	for (var i=0; i<23; i++){
		if ((cr = crs[i])){
			if (patienceFlag){
				var floodbuff = floodingFlag && i>4 && c.card.element==Water;
				cr.atk += floodbuff?5:cr.status.burrowed?4:2;
				cr.buffhp(floodbuff?2:1);
				cr.delay(1);
			}
			cr.attack(stasisFlag, freedomChance);
			if (i>5 && floodingFlag && cr.card.element != Water && cr.card.element != Other && !cr.status.immaterial && !cr.status.burrowed && ~cr.getIndex()){
				cr.die();
			}
		}
		if ((cr = this.foe.creatures[i])){
			if (cr.status.salvaged){
				delete cr.status.salvaged;
			}
			if (cr.active.cast == Actives.dshield){
				delete cr.status.immaterial;
			}
		}
	}
	if (this.shield){
		this.shield.usedactive = false;
		if(this.shield.active.auto)this.shield.active.auto(this.shield);
	}
	if (this.weapon)this.weapon.attack();
	if (this.sosa > 0){
		this.sosa--;
	}
	this.nova = 0;
	this.foe.drawcard();
	this.flatline = this.silence = false;
	this.foe.precognition = this.foe.sanctuary = false;
	this.game.turn = this.foe;
}
Player.prototype.procactive = function(name, func) {
	if (!func){
		func = function(c,t){ c.active[name](c, t) };
	}
	for(var i=0; i<2; i++){
		var pl = i==0?this:this.foe;
		for(var j=0; j<23; j++){
			var c = pl.creatures[j];
			if (c && c.active[name]){
				func(c, this);
			}
		}
		for(var j=0; j<16; j++){
			var p = pl.permanents[j];
			if (p && p.active[name]){
				func(p, this);
			}
		}
		if (pl.shield && pl.shield.active[name]){
			func(pl.shield, this);
		}
		if (pl.weapon && pl.weapon.active[name]){
			func(pl.weapon, this);
		}
	}
}
Player.prototype.drawcard = function() {
	if (this.hand.length<8){
		if (this.deck.length>0){
			this.hand[this.hand.length] = new CardInstance(this.deck.pop(), this);
			this.procactive("draw");
		}else setWinner(this.game, this.foe);
	}
}
Player.prototype.drawhand = function(x) {
	if (x > 0){
		while (this.hand.length > 0){
			this.deck.push(this.hand.pop().card);
		}
		this.shuffle(this.deck);
		for(var i=0; i<x; i++){
			this.hand.push(new CardInstance(this.deck.pop(), this));
		}
	}
}
Player.prototype.masscc = function(caster, func, massmass){
	for(var i=0; i<16; i++){
		var pr = this.permanents[i];
		if (pr && pr.passives.cloak){
			Actives.destroy(this, pr);
		}
		if (massmass){
			pr = this.foe.permanents[i];
			if (pr && pr.passives.cloak){
				Actives.destroy(this, pr);
			}
		}
	}
	var crs = this.creatures.slice(), crsfoe;
	if (massmass){
		crsfoe = this.foe.creatures.slice();
	}
	for(var i=0; i<23; i++){
		if (crs[i] && !crs[i].status.immaterial && !crs[i].status.burrowed){
			func(caster, crs[i]);
		}
		if (crsfoe && crsfoe[i] && !crsfoe[i].status.immaterial && !crsfoe[i].status.burrowed){
			func(caster, crsfoe[i]);
		}
	}
}
Creature.prototype.info = function(){
	var info=this.trueatk()+"|"+this.truehp()+"/"+this.maxhp;
	info += this.activetext();
	if (this.owner.gpull == this)info += " gpull";
	info += objinfo(this.status) + objinfo(this.passives);
	return info;
}
Permanent.prototype.info = function(){
	var info = this.status.charges?"x"+this.status.charges:"";
	info += this.activetext() + objinfo(this.status) + objinfo(this.passives);
	return info;
}
Weapon.prototype.info = function(){
	var info = this.trueatk().toString();
	info += this.activetext() + objinfo(this.status) + objinfo(this.passives);
	return info;
}
Shield.prototype.info = function(){
	var info = this.truedr() + "DR" + this.activetext();
	if (this.status.charges)info += " x"+this.status.charges + objinfo(this.status) + objinfo(this.passives);
	return info;
}
Pillar.prototype.info = function(){
	return this.status.charges + " 1:" + (this.pendstate?this.owner.mark:this.card.element) + (this.status.immaterial?" immaterial":"");
}
Thing.prototype.activetext = function(){
	var info = "";
	for(var key in this.active){
		if (this.active[key])info += (key != "auto"?" " + (key == "cast"?casttext(this.cast, this.castele):key):"") + " " + activename(this.active[key]);
	}
	return info;
}
Thing.prototype.place = function(){
	var self = this;
	this.owner.procactive("play", function (c, p) { c.active.play(c, self) });
}
Creature.prototype.place = function(){
	place(this.owner.creatures, this);
	Thing.prototype.place.call(this);
	
}
Permanent.prototype.place = function(){
	if (this.passives.additive){
		for(var i=0; i<16; i++){
			if (this.owner.permanents[i] && this.owner.permanents[i].card == this.card){
				this.owner.permanents[i].status.charges += this.status.charges;
				Thing.prototype.place.call(this.owner.permanents[i]);
				return;
			}
		}
	}
	place(this.owner.permanents, this);
	Thing.prototype.place.call(this);
}
Weapon.prototype.place = function(){
	this.owner.weapon = this;
	Thing.prototype.place.call(this);
}
Shield.prototype.place = function(){
	if (this.passives.additive && this.owner.shield && this.owner.shield.card.asUpped(this.card.upped) == this.card){
		this.owner.shield.status.charges += this.status.charges;
		Thing.prototype.place.call(this);
		return;
	}
	this.owner.shield = this;
	Thing.prototype.place.call(this);
}
CardInstance.prototype.place = function(){
	if (this.owner.hand.length < 8){
		this.owner.hand.push(this);
	}
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
	if (!x)return 0;
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
		if (this.hp <= 0 && !this.game.winner){
			setWinner(this.game, this.foe);
		}
		return sosa?-x:x;
	}
}
Player.prototype.spelldmg = function(x) {
	return (!this.shield || !this.shield.passives.reflect?this:this.foe).dmg(x);
}
CardInstance.prototype.getIndex = function() { return this.owner.hand.indexOf(this); }
Creature.prototype.getIndex = function() { return this.owner.creatures.indexOf(this); }
Player.prototype.addpoison = function(x) {
	this.defstatus("poison", 0);
	this.status.poison += x;
}
Creature.prototype.addpoison = function(x) {
	if (this.card.isOf(Cards.Cell)){
		this.transform(Cards.MalignantCell);
	}else{
		this.defstatus("poison", 0);
		this.status.poison += x;
		if (this.passives.voodoo){
			this.owner.foe.addpoison(x);
		}
	}
}
Weapon.prototype.buffhp = function(){}
Player.prototype.buffhp = Creature.prototype.buffhp = function(x){
	this.maxhp += x;
	if (this instanceof Player && this.maxhp>500){
		this.maxhp = 500;
	}
	this.dmg(-x);
}
Weapon.prototype.delay = Creature.prototype.delay = function(x){
	this.defstatus("delayed", 0);
	this.status.delayed += x;
	if (this.passives.voodoo)this.owner.foe.delay(x);
}
Weapon.prototype.freeze = Creature.prototype.freeze = function(x){
	if (this.card.isOf(Cards.Squid)){
		this.transform(Cards.ArcticSquid.asUpped(this.card.upped));
	}else{
		this.defstatus("frozen", 0);
		this.status.frozen = x;
		if (this.passives.voodoo)this.owner.foe.freeze(x);
	}
}
Creature.prototype.spelldmg = Creature.prototype.dmg = function(x, dontdie){
	if (!x)return 0;
	var dmg = x<0 ? Math.max(this.hp-this.maxhp, x) : Math.min(this.truehp(), x);
	this.hp -= dmg;
	if (this.truehp() <= 0){
		if (!dontdie)this.die();
	}else if (dmg>0 && this.passives.voodoo)this.owner.foe.dmg(x);
	return dmg;
}
Creature.prototype.remove = function(index) {
	if (this.owner.gpull == this)delete this.owner.gpull;
	if (index === undefined)index=this.getIndex();
	if (~index){
		delete this.owner.creatures[index];
	}
	return index;
}
CardInstance.prototype.remove = function(index) {
	if (index === undefined)index=this.getIndex();
	if (~index){
		this.owner.hand.splice(index, 1);
	}
	return index;
}
Creature.prototype.deatheffect = function(index) {
	var self = this;
	if (this.active.death){
		this.active.death(this, this, index)
	}
	this.owner.procactive("death", function(c, p) { c.active.death(c, self, index) });
	new DeathEffect(creaturePos(this.owner == this.owner.game.player1?0:1, index));
}
Creature.prototype.die = function() {
	var index = this.remove();
	if (~index){
		if (this.status.aflatoxin){
			this.owner.creatures[index] = new Creature(Cards.MalignantCell, this.owner);
		}
		if (!(this.active.predeath && this.active.predeath(this))){
			this.deatheffect(index);
		}
	}
}
Creature.prototype.transform = function(card, owner){
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.cast = card.cast;
	this.castele = card.castele;
	Thing.call(this, card, owner || this.owner);
}
Thing.prototype.evade = function(sender) { return false; }
Creature.prototype.evade = function(sender) {
	if (this.status.frozen)return false;
	if (sender != this.owner && this.passives.airborne){
		var freedomChance = 0;
		for(var i=0; i<16; i++){
			if (this.owner.permanents[i] && this.owner.permanents[i].freedom){
				freedomChance++;
			}
		}
		return freedomChance && this.owner.rng() < 1-Math.pow(.8, freedomChance);
	}
}
Creature.prototype.calcEclipse = function(){
	if (this.card.element != Darkness && this.card.element != Death && !this.passives.nocturnal){
		return 0;
	}
	var players = this.owner.game.players;
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
Weapon.prototype.trueatk = Creature.prototype.trueatk = function(adrenaline, nobuff){
	var dmg = this.atk;
	if (this.status.steamatk)dmg += this.status.steamatk;
	if (this.status.dive)dmg += this.status.dive;
	if (this.active.buff && !nobuff)dmg += this.active.buff(this);
	if (this instanceof Creature){
		dmg += this.calcEclipse();
	}
	if (this.status.burrowed)dmg = Math.ceil(dmg/2);
	var y=adrenaline || this.status.adrenaline;
	if (!y || y<2)return dmg;
	var attackCoefficient = 4-countAdrenaline(dmg);
	for(var i=1; i<y; i++){
		dmg -= Math.ceil(attackCoefficient*dmg*i/3);
	}
	return dmg;
}
Shield.prototype.truedr = function(){
	var dr = this.dr;
	if (this.active.buff){
		dr += this.active.buff(this);
	}
	return dr;
}
Player.prototype.truehp = function(){ return this.hp; }
Weapon.prototype.truehp = function(){ return this.card.health; }
Creature.prototype.truehp = function(){
	var hp = this.hp;
	if (this.calcEclipse(this.owner.game) != 0){
		hp++;
	}
	if (this.passives.swarm){
		for (var i=0; i<23; i++){
			if (this.owner.creatures[i] && this.owner.creatures[i].passives.swarm){
				hp++;
			}
		}
	}
	return hp;
}
Permanent.prototype.getIndex = function() { return this.owner.permanents.indexOf(this); }
Permanent.prototype.die = function(){ delete this.owner.permanents[this.getIndex()]; }
Weapon.prototype.die = function() { delete this.owner.weapon; }
Shield.prototype.die = function() { delete this.owner.shield; }
Thing.prototype.isMaterialInstance = function(type) {
	return this instanceof type && !this.status.immaterial && !this.status.burrowed;
}
Thing.prototype.addactive = function(type, active){
	this.active[type] = combineactive(this.active[type], active);
}
Thing.prototype.hasactive = function(type, activename) {
	if (!this.active[type])return false;
	return ~this.active[type].activename.split(" ").indexOf(activename);
}
Thing.prototype.canactive = function() {
	return this.owner.game.turn == this.owner && this.active.cast && !this.usedactive && !this.status.delayed && !this.status.frozen && this.owner.canspend(this.castele, this.cast);
}
Thing.prototype.useactive = function(t) {
	this.usedactive = true;
	var castele = this.castele, cast = this.cast;
	if (!t || !t.evade(this.owner)){
		this.active.cast(this, t);
	}else new TextEffect("Evade", tgtToPos(t));
	this.owner.spend(castele, cast);
}
Player.prototype.defstatus = Thing.prototype.defstatus = function(key, def){
	if (!(key in this.status)){
		this.status[key] = def;
	}
}
Weapon.prototype.attack = Creature.prototype.attack = function(stasis, freedomChance){
	var isCreature = this instanceof Creature;
	if (isCreature){
		this.dmg(this.status.poison, true);
	}
	var target = this.owner.foe;
	if (this.active.auto && !this.status.frozen && (!this.status.adrenaline || this.status.adrenaline<3)){
		this.active.auto(this);
	}
	this.usedactive = false;
	var trueatk;
	if (!(stasis || this.status.frozen || this.status.delayed) && (trueatk = this.trueatk()) != 0){
		var momentum = this.status.momentum, truedr = 0;
		if (!momentum && this.status.burrowed){
			for (var i=0; i<16; i++){
				if (this.owner.permanents[i] && this.owner.permanents[i].passives.tunnel){
					momentum = true;
					break;
				}
			}
		}else if (this.passives.airborne && freedomChance && this.owner.rng() < freedomChance){
			if (!momentum && !target.shield && !target.gpull && !this.status.psion){
				trueatk = Math.ceil(trueatk * 1.5);
			}else{
				momentum = true;
			}
		}
		if (this.status.psion){
			target.spelldmg(trueatk);
		}else if (momentum || trueatk < 0){
			target.dmg(trueatk);
			if (this.active.hit && (!this.status.adrenaline || this.status.adrenaline < 3)){
				this.active.hit(this, target, trueatk);
			}
		}else if (target.gpull){
			var gpull = target.gpull;
			var dmg = gpull.dmg(trueatk);
			if (this.active.hit && (!this.status.adrenaline || this.status.adrenaline < 3)){
				this.active.hit(this, gpull, dmg);
			}
			if (target.gpull == gpull && gpull.active.shield){
				gpull.active.shield(gpull, isCreature?this:this.owner, dmg);
			}
		}else if (!target.shield || ((trueatk > (truedr = target.shield.truedr()) && (!target.shield.active.shield || !target.shield.active.shield(target.shield, this, trueatk - truedr))))){
			var dmg = target.dmg(trueatk - truedr);
			if (this.active.hit && (!this.status.adrenaline || this.status.adrenaline < 3)){
				this.active.hit(this, target, dmg);
			}
		}
	}
	if (this.status.frozen){
		this.status.frozen--;
	}
	if (this.status.delayed){
		this.status.delayed--;
	}
	if (this.status.steamatk){
		this.status.steamatk--;
	}
	delete this.status.dive;
	if (isCreature && ~this.getIndex() && this.truehp() <= 0){
		this.die();
	}else if (this.status.adrenaline && (!isCreature || ~this.getIndex())){
		if(this.status.adrenaline < countAdrenaline(this.trueatk(1))){
			this.status.adrenaline++;
			this.attack(stasis, freedomChance);
		}else{
			this.status.adrenaline = 1;
		}
	}
}
CardInstance.prototype.canactive = function(){
	if (this.owner.silence || this.owner.game.turn != this.owner)return false;
	if (!this.card){
		console.log("wtf cardless card");
		return false;
	}
	return this.owner.canspend(this.card.costele, this.card.cost);
}
CardInstance.prototype.useactive = function(target){
	if (!this.canactive()){
		console.log((this.owner==this.game.player1?"1":"2") + " cannot cast " + (this.card?this.card.name:"nil"));
		return;
	}
	var owner = this.owner, card = this.card;
	this.remove();
	if (owner.neuro){
		owner.addpoison(1);
	}
	owner.spend(card.costele, card.cost);
	var self = this;	
	if (card.type <= PermanentEnum){
		if (card.type == PillarEnum){
			new Pillar(card, owner).place();
		}else if (card.type == WeaponEnum){
			new Weapon(card, owner).place();
		}else if (card.type == ShieldEnum){
			new Shield(card, owner).place();
		}else{
			new Permanent(card, owner).place();
		}
	}else if (card.type == SpellEnum){
		if (!target || !target.evade(owner)){
			card.active(this, target);
			owner.procactive("spell", function(c, t) { c.active.spell(c, self, target); });
		}
	}else if (card.type == CreatureEnum){
		new Creature(card, owner).place();
	}else console.log("Unknown card type: "+card.type);
}
function countAdrenaline(x){
	return 5-Math.floor(Math.sqrt(Math.abs(x)));
}
function filtercards(upped, filter, cmp){
	var keys = [];
	for(var key in CardCodes) {
		var card = CardCodes[key];
		if (card.upped == upped && !card.passives.token && (!filter || filter(card))) {
			keys.push(key);
		}
	}
	keys.sort(cmp);
	return keys;
}
Player.prototype.randomcard = function(upped, filter){
	var keys = filtercards(upped, filter);
	return CardCodes[keys[this.upto(keys.length)]];
}
function progressMulligan(game){
	if (game.phase == MulliganPhase1){
		game.phase = MulliganPhase2;
	}else if(game.phase == MulliganPhase2){
		game.phase = PlayPhase;
	}else{
		console.log("Not mulligan phase: " + game.phase);
		return;
	}
	game.turn = game.turn.foe;
}
function activename(active){
	return active?active.activename:"";
}
function casttext(cast, castele){
	return cast == 0?"0":cast + ":" + castele;
}
function salvageScan(from, t){
	if (t.owner.hand.length<8 && t.owner != from){
		for (var i=0; i<23; i++){
			var cr = t.owner.creatures[i];
			if (cr && cr.passives.salvage && !cr.status.salvaged){
				new TextEffect("Salvage", tgtToPos(cr));
				cr.status.salvaged = true;
				t.owner.hand.push(t.card);
				return;
			}
		}
	}
}
function getTargetFilter(str){
	if (str in TargetFilters){
		return TargetFilters[str];
	}else{
		var colonIndex = str.indexOf(":"), prefixFunc, filterStr;
		if (~colonIndex){
			prefixFunc = TargetFilters[str.substring(0, colonIndex)];
			filterStr = str.substring(colonIndex+1);
		}else filterStr = str;
		var filters = filterStr.split("+");
		for(var i=0; i<filters.length; i++){
			filters[i] = TargetFilters[filters[i]];
		}
		return TargetFilters[str] = function(c, t){
			if (prefixFunc && !prefixFunc(c, t)){
				return false;
			}
			for(var i=0; i<filters.length; i++){
				if (filters[i](c, t)){
					return true;
				}
			}
			return false;
		}
	}
}
var TargetFilters = {
	own:function(c, t){
		return c.owner == t.owner;
	},
	foe:function(c, t){
		return c.owner != t.owner
	},
	notself:function(c, t){
		return c != t;
	},
	all:function(c, t){
		return true;
	},
	card:function(c, t){
		return t instanceof CardInstance;
	},
	pill:function(c, t){
		return t.isMaterialInstance(Pillar);
	},
	weap:function(c, t){
		return (t instanceof Weapon || (t instanceof Creature && t.card.type == WeaponEnum)) && !t.status.immaterial && !t.status.burrowed;
	},
	perm:function(c, t){
		return t.isMaterialInstance(Permanent);
	},
	permnonstack:function(c,t){
		return t.isMaterialInstance(Permanent) && !t.passives.stackable;
	},
	crea:function(c, t){
		return t.isMaterialInstance(Creature);
	},
	creaonly:function(c, t){
		return t.isMaterialInstance(Creature) && t.card.type == CreatureEnum;
	},
	creanonspell:function(c, t){
		return t.isMaterialInstance(Creature) && t.card.type != SpellEnum;
	},
	play:function(c, t){
		return t instanceof Player;
	},
	butterfly:function(c, t){
		return (t instanceof Creature || t instanceof Permanent) && !t.status.immaterial && !t.status.burrowed && ((t.trueatk && t.trueatk()<3) || (t.truehp && t.truehp()<3));
	},
	devour:function(c, t){
		return t.isMaterialInstance(Creature) && t.truehp()<c.truehp();
	},
	paradox:function(c, t){
		return t.isMaterialInstance(Creature) && t.truehp()<t.trueatk();
	},
	airbornecrea:function(c, t){
		return t.isMaterialInstance(Creature) && t.passives.airborne;
	},
	groundcrea:function(c, t){
		return t.isMaterialInstance(Creature) && !t.passives.airborne;
	},
	wisdom:function(c, t){
		return (t instanceof Creature || t instanceof Weapon) && !t.status.burrowed;
	}
};
