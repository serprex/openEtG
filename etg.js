var MersenneTwister = require("./MersenneTwister");
var Actives = require("./Actives");
var Effect = require("./Effect");
var ui = require("./uiutil");
function Game(first, seed){
	this.rng = new MersenneTwister(seed);
	this.phase = MulliganPhase1;
	this.ply = 0;
	this.player1 = new Player(this);
	this.player2 = new Player(this);
	this.player1.foe = this.player2;
	this.player2.foe = this.player1;
	this.turn = first?this.player1:this.player2;
	this.expectedDamage = [0, 0];
	this.time = Date.now();
}
var statuscache = {};
function Card(type, info){
	this.type = type;
	this.element = parseInt(info.Element);
	this.name = info.Name;
	this.code = info.Code;
	if (parseInt(this.code, 32)>6999){
		this.upped = true;
	}
	if (info.Attack){
		this.attack = parseInt(info.Attack);
	}
	if (info.Health){
		this.health = parseInt(info.Health);
	}
	this.readCost("cost", info.Cost||"0");
	if (info.Active){
		if (this.type == SpellEnum){
			this.active = Actives[info.Active];
		}else{
			this.active = {};
			var actives = info.Active.split("+");
			for(var i=0; i<actives.length; i++){
				if (actives[i] == ""){
					continue;
				}
				var active = actives[i].split("=");
				if (active.length == 1){
					this.active.auto = Actives[active[0]];
				}else{
					this.active[this.readCost("cast", active[0])?"cast":active[0]] = Actives[active[1]];
				}
			}
		}
	}
	if (info.Status){
		if (info.Status in statuscache){
			this.status = statuscache[info.Status];
		}else{
			statuscache[info.Status] = this.status = {};
			var statuses = info.Status.split("+");
			for(var i=0; i<statuses.length; i++){
				var status = statuses[i].split("=");
				this.status[status[0]] = status.length==1 || parseInt(status[1]);
			}
		}
	}
	if (info.Text){
		this.text = info.Text;
	}
	if (info.Rarity){
		this.rarity = parseInt(info.Rarity);
	}
}
function Thing(card, owner){
	this.owner = owner;
	this.card = card;
	this.usedactive = true;
	if (this.status){
		for (var key in this.status){
			if (key in passives) delete this.status[key];
		}
		for (var key in card.status){
			this.status[key] = card.status[key];
		}
	}else{
		this.status = clone(card.status)
	}
	this.active = clone(card.active);
	delete this.active.discard;
}
function Player(game){
	this.game = game;
	this.owner = this;
	this.shield = undefined;
	this.weapon = undefined;
	this.status = {poison:0};
	this.neuro = false;
	this.sosa = 0;
	this.silence = false;
	this.sanctuary = false;
	this.precognition = false;
	this.gpull = undefined;
	this.nova = 0;
	this.maxhp = this.hp = 100;
	this.hand = [];
	this.deck = [];
	this.creatures = new Array(23);
	this.permanents = new Array(16);
	this.mark = 0;
	this.quanta = [];
	for(var i=1; i<13; i++)this.quanta[i]=0;
	this.shardgolem = undefined;
}
function Creature(card, owner){
	if (card == Cards.ShardGolem){
		this.card = card;
		this.owner = owner;
		var golem = owner.shardgolem || { stat: 1, cast: 0 };
		this.atk = this.maxhp = this.hp = golem.stat;
		this.cast = golem.cast;
		this.castele = Earth;
		this.active = clone(golem.active);
		this.status = clone(golem.status);
		this.usedactive = true;
	}else this.transform(card, owner);
}
function Permanent(card, owner){
	this.cast = card.cast;
	this.castele = card.castele;
	Thing.apply(this, arguments);
}
function Weapon(card, owner){
	this.atk = card.attack;
	Permanent.apply(this, arguments);
}
function Shield(card, owner){
	this.dr = card.health;
	Permanent.apply(this, arguments);
}
function Pillar(card, owner){
	this.status = {charges: 1};
	this.pendstate = false;
	Thing.apply(this, arguments);
}
function CardInstance(card, owner){
	this.owner = owner;
	this.card = card;
}
Player.prototype = Object.create(Thing.prototype);
Creature.prototype = Object.create(Thing.prototype);
Permanent.prototype = Object.create(Thing.prototype);
Weapon.prototype = Object.create(Permanent.prototype);
Shield.prototype = Object.create(Permanent.prototype);
Pillar.prototype = Object.create(Permanent.prototype);
CardInstance.prototype = Object.create(Thing.prototype);
Card.prototype.rarity = 0;
Card.prototype.attack = 0;
Card.prototype.health = 0;
Card.prototype.upped = false;
Card.prototype.status = {};
Player.prototype.markpower = 1;
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
var passives = { airborne: true, nocturnal: true, voodoo: true, swarm: true, ranged: true, additive: true, stackable: true, salvage: true, token: true, shard: true, poisonous: true, martyr: true, decrsteam: true, beguilestop: true };
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
var AlchemyList = [undefined, undefined,
	"4vn", "6u7",
	"52s", "71c",
	"55v", "74f",
	"595", "77l",
	"5c7", "7an",
	"5fb", "7dr",
	"5ig", "7h0",
	"5lj", "7k3",
	"5om", "7n6",
	"5rr", "7qb",
	"5uu", "7te",
	"621", "80h"];
Game.prototype.clone = function(){
	var obj = Object.create(Game.prototype);
	obj.rng = this.rng.clone();
	obj.phase = this.phase;
	obj.ply = this.ply;
	obj.player1 = this.player1.clone(obj);
	obj.player2 = this.player2.clone(obj);
	obj.player1.foe = obj.player2;
	obj.player2.foe = obj.player1;
	obj.turn = this.turn == this.player1?obj.player1:obj.player2;
	return obj;
}
Game.prototype.players = function(n){
	return n ? this.player2 : this.player1;
}
Game.prototype.setWinner = function(play){
	if (!this.winner){
		this.winner = play;
		this.phase = EndPhase;
		if (this.time) this.time = Date.now() - this.time;
	}
}
Game.prototype.progressMulligan = function(){
	if (this.phase == MulliganPhase1){
		this.phase = MulliganPhase2;
	}else if(this.phase == MulliganPhase2){
		this.phase = PlayPhase;
	}else{
		console.log("Not mulligan phase: " + game.phase);
		return;
	}
	this.turn = this.turn.foe;
}
Game.prototype.updateExpectedDamage = function(){
	if (this.expectedDamage){
		Effect.disable = true;
		this.expectedDamage[0] = this.expectedDamage[1] = 0;
		for(var i = 0; i<3; i++){
			var gclone = this.clone();
			gclone.rng.seed(gclone.rng.mt[0]^(i*997));
			gclone.turn.endturn();
			if (!gclone.winner) gclone.turn.endturn();
			this.expectedDamage[0] += this.player1.hp - gclone.player1.hp;
			this.expectedDamage[1] += this.player2.hp - gclone.player2.hp;
		}
		this.expectedDamage[0] = Math.round(this.expectedDamage[0]/3);
		this.expectedDamage[1] = Math.round(this.expectedDamage[1]/3);
		Effect.disable = false;
	}
}
Game.prototype.tgtToBits = function(x) {
	var bits;
	if (x == undefined) {
		return 0;
	} else if (x instanceof Player) {
		bits = 1;
	} else if (x instanceof Weapon) {
		bits = 17;
	} else if (x instanceof Shield) {
		bits = 33;
	} else {
		bits = (x instanceof Creature ? 2 : x instanceof Permanent ? 4 : 5) | x.getIndex() << 4;
	}
	if (x.owner == this.player2) {
		bits |= 8;
	}
	return bits;
}
Game.prototype.bitsToTgt = function(x) {
	var tgtop = x & 7, player = this.players(!(x & 8));
	if (tgtop == 0) {
		return undefined;
	} else if (tgtop == 1) {
		return player[["owner", "weapon", "shield"][x >> 4]];
	} else if (tgtop == 2) {
		return player.creatures[x >> 4];
	} else if (tgtop == 4) {
		return player.permanents[x >> 4];
	} else if (tgtop == 5) {
		return player.hand[x >> 4];
	} else console.log("Unknown tgtop: " + tgtop + ", " + x);
}
Game.prototype.getTarget = function(src, active, cb) {
	var targetingFilter = Targeting[active.activename];
	if (targetingFilter) {
		this.targetingMode = function(t) { return (t instanceof Player || t instanceof CardInstance || t.owner == this.turn || t.status.cloak || !t.owner.isCloaked()) && targetingFilter(src, t); }
		this.targetingModeCb = cb;
		this.targetingText = active.activename;
	} else {
		cb();
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
function fromTrueMark(x){
	var code = parseInt(x, 32);
	return code >= 9010 && code <= 9022 ? code-9010 : -1;
}
function toTrueMark(n){
	return (n+9010).toString(32);
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
	function maybeClone(x){
		return x && x.clone(obj);
	}
	obj.status = clone(this.status);
	obj.shield = maybeClone(this.shield);
	obj.weapon = maybeClone(this.weapon);
	obj.creatures = this.creatures.map(maybeClone);
	obj.permanents = this.permanents.map(maybeClone);
	if (this.gpull){
		obj.gpull = obj.creatures[this.gpull.getIndex()];
	}
	obj.hand = this.hand.map(maybeClone);
	obj.game = game;
	obj.owner = obj;
	for(var attr in this){
		if (!(attr in obj) && this.hasOwnProperty(attr)){
			obj[attr] =  this[attr] instanceof Array ? this[attr].slice() : this[attr];
		}
	}
	return obj;
}
CardInstance.prototype.clone = function(owner){
	return new CardInstance(this.card, owner);
}
var thingtypes = [Creature, Permanent, Weapon, Shield, Pillar];
thingtypes.forEach(function(type){
	var proto = type.prototype;
	type.prototype.clone = function(owner){
		var obj = Object.create(proto);
		obj.active = clone(this.active);
		obj.status = clone(this.status);
		obj.owner = owner;
		for(var attr in this){
			if (!(attr in obj) && this.hasOwnProperty(attr))obj[attr] = this[attr];
		}
		return obj;
	}
});
CardInstance.prototype.hash = function(){
	return parseInt(this.card.code, 32) << 1 | (this.owner == this.owner.game.player1?1:0);
}
function hashString(str){
	var hash = 0;
	for (var i=0; i<str.length; i++){
		hash = hash*31 + str.charCodeAt(i) & 0x7FFFFFFF;
	}
	return hash;
}
function hashObj(obj){
	var hash = 0;
	for (var key in obj){
		hash ^= hashString(key) ^ obj[key];
	}
	return hash;
}
Creature.prototype.hash = function(){
	var hash = this.owner == this.owner.game.player1 ? 17 : 19;
	hash ^= hashObj(this.status) ^ (this.hp*17 + this.atk*31 - this.maxhp - this.usedactive * 3);
	hash ^= parseInt(this.card.code, 32);
	for (var key in this.active){
		hash ^= hashString(key + ":" + this.active[key].activename);
	}
	if (this.active.cast){
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7FFFFFFF;
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
	}else{
		var dmgtype = "";
		if (this.type == WeaponEnum){
			if (this.status && this.status.ranged) dmgtype = " ranged";
			if (this.status && this.status.psion) dmgtype += " spell";
		}
		var prefix = this.type == WeaponEnum?"Deal " + this.attack + dmgtype + " damage. ":
			this.type == ShieldEnum?""+(this.health?"Reduce damage by "+this.health+" ":""):
			this.type == CreatureEnum?this.attack+"|"+this.health+" ":"";
		return prefix + (this.text || (this.type == SpellEnum ? activename(this.active) : Thing.prototype.activetext.call(this) + objinfo(this.status)));
	}
}
Thing.prototype.toString = function(){ return this.card.name; }
CardInstance.prototype.toString = function() { return "::" + this.card.name; }
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
		if (this.permanents[i] && this.permanents[i].status.cloak){
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
Creature.prototype.estimateDamage = Weapon.prototype.estimateDamage = function(freedomChance) {
	var fsh = this.owner.foe.shield;
	if (this.status.frozen || this.status.delayed){
		return 0;
	}
	var tatk = this.trueatk(), fshactive = fsh && fsh.active.shield;
	var momentum = atk < 0 || this.status.momentum || this.status.psion;
	var dr = 0, atk;
	if (momentum) {
		atk = tatk;
	} else {
		if (fsh) dr = fsh.truedr();
		atk = Math.max(tatk - dr, 0);
		if ((fshactive == Actives.weight || fshactive == Actives.wings) && fshactive(this.owner.foe.shield, this, atk)) {
			atk = 0;
		}
	}
	if (atk > 0 && this.status.adrenaline) {
		var attacks = countAdrenaline(tatk);
		while (this.status.adrenaline < attacks) {
			this.status.adrenaline++;
			atk += momentum ? this.trueatk() : Math.max(this.trueatk() - dr, 0);
		}
		this.status.adrenaline = 1;
	}
	if (!momentum){
		atk *= (fshactive == Actives.evade100 ? 0 : fshactive == Actives.evade50 ? .5 : fshactive == Actives.evade40 ? .6 : fshactive == Actives.chaos ? .75 : 1);
	}
	if (!fsh && freedomChance && this.status.airborne){
		atk = Math.ceil(atk * 1.5) * freedomChance;
	}
	if (this.owner.foe.sosa) atk *= -1;
	return atk;
}
Player.prototype.expectedDamage = function() {
	var totalDamage = 0, stasisFlag = false, freedomChance = 0;
	for(var i=0; i<16; i++){
		var p;
		if ((p=this.permanents[i])){
			if (p.status.stasis || p.status.patience){
				stasisFlag = true;
			}else if (p.status.freedom){
				freedomChance++;
			}
		}
		if ((p=this.foe.permanents[i]) && p.status.stasis){
			stasisFlag = true;
		}
	}
	if (freedomChance){
		freedomChance = 1-Math.pow(.7,freedomChance);
	}
	if (!stasisFlag){
		for (var i = 0; i < 23; i++) {
			if (this.creatures[i])
				totalDamage += this.creatures[i].estimateDamage(freedomChance);
		}
	}
	if (this.weapon) totalDamage += this.weapon.estimateDamage();
	if (this.foe.status.poison) totalDamage += this.foe.status.poison;
	return Math.round(totalDamage);
}
Player.prototype.countcreatures = function() {
	var res = 0;
	for (var i = 0;i < this.creatures.length;i++) {
		if (this.creatures[i])
			res++;
	}
	return res;
}
Player.prototype.countpermanents = function() {
	var res = 0;
	for (var i = 0;i < this.permanents.length;i++) {
		if (this.permanents[i])
			res++;
	}
	return res;
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
	this.spend(this.mark, this.markpower * (this.mark > 0 ? -1 : -3));
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
			if (~p.getIndex()){
				p.usedactive = false;
				if (p.status.stasis){
					stasisFlag = true;
				}else if (p.status.flooding && !floodingPaidFlag){
					floodingPaidFlag = true;
					floodingFlag = true;
					if (!this.spend(Water, 1)){
						delete this.permanents[i];
					}
				}else if (p.status.patience){
					patienceFlag = true;
				}else if (p.status.freedom){
					freedomChance++;
				}
			}
		}
		if ((p=this.foe.permanents[i])){
			if (p.status.stasis){
				stasisFlag = true;
			}else if (p.status.flooding){
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
				var floodbuff = floodingFlag && i>4 && cr.card.element==Water;
				cr.atk += floodbuff?5:cr.status.burrowed?4:2;
				cr.buffhp(floodbuff?2:1);
				cr.delay(1);
			}
			cr.attack(stasisFlag, freedomChance);
			if (i>4 && floodingFlag && cr.card.element != Water && cr.card.element != Other && !cr.status.immaterial && !cr.status.burrowed && ~cr.getIndex()){
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
	if (this.foe.sosa > 0){
		this.foe.sosa--;
	}
	this.nova = 0;
	for (var i = this.foe.drawpower !== undefined ? this.foe.drawpower : 1; i > 0; i--) {
		this.foe.drawcard();
	}

	this.flatline = this.silence = false;
	this.foe.precognition = this.foe.sanctuary = false;
	this.game.turn = this.foe;
	this.foe.procactive("turnstart");
	this.game.updateExpectedDamage();
}
Thing.prototype.procactive = function(name, params) {
	function proc(c){
		var a;
		if (c && (a = c.active[name])){
			params[0] = c;
			a.apply(null, params);
		}
	}
	if (params === undefined) params = [this, this];
	else params.unshift(this, this);
	if (this.active && this.active["own" + name]){
		this.active["own" + name].apply(null, params);
	}
	for(var i=0; i<2; i++){
		var pl = i==0?this.owner:this.owner.foe;
		pl.creatures.forEach(proc);
		pl.permanents.forEach(proc);
		proc(pl.shield);
		proc(pl.weapon);
	}
}
Player.prototype.drawcard = function() {
	if (this.hand.length<8){
		if (this.deck.length>0){
			this.hand[this.hand.length] = new CardInstance(this.deck.pop(), this);
			this.procactive("draw");
			if (this.deck.length == 0 && this.game.player1 == this)
				Effect.mkSpriteFade(getTextImage("This was your last card!", ui.mkFont(32, "white"), 0));
		}else this.game.setWinner(this.foe);
	}
}
Player.prototype.drawhand = function(x) {
	if (x >= 0){
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
		if (pr && pr.status.cloak){
			Actives.destroy(this, pr);
		}
		if (massmass){
			pr = this.foe.permanents[i];
			if (pr && pr.status.cloak){
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
	return info + objinfo(this.status);
}
Permanent.prototype.info = function(){
	var info = this.status.charges?"x"+this.status.charges:"";
	return info + this.activetext() + objinfo(this.status);
}
Weapon.prototype.info = function(){
	var info = this.trueatk().toString();
	return info + this.activetext() + objinfo(this.status);
}
Shield.prototype.info = function(){
	var info = this.truedr() + "DR" + this.activetext();
	if (this.status.charges)info += " x"+this.status.charges + objinfo(this.status);
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
Thing.prototype.place = function(fromhand){
	this.procactive("play", [fromhand]);
}
Creature.prototype.place = function(fromhand){
	place(this.owner.creatures, this);
	Thing.prototype.place.call(this, fromhand);
}
Permanent.prototype.place = function(fromhand){
	if (this.status.additive){
		for(var i=0; i<16; i++){
			if (this.owner.permanents[i] && this.owner.permanents[i].card == this.card){
				this.owner.permanents[i].status.charges += this.status.charges;
				Thing.prototype.place.call(this.owner.permanents[i], fromhand);
				return;
			}
		}
	}
	place(this.owner.permanents, this);
	Thing.prototype.place.call(this);
}
Weapon.prototype.place = function(fromhand){
	this.owner.weapon = this;
	Thing.prototype.place.call(this, fromhand);
}
Shield.prototype.place = function(fromhand){
	if (this.status.additive && this.owner.shield && this.owner.shield.card.asUpped(this.card.upped) == this.card){
		this.owner.shield.status.charges += this.status.charges;
		Thing.prototype.place.call(this, fromhand);
		return;
	}
	this.owner.shield = this;
	Thing.prototype.place.call(this, fromhand);
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
			this.game.setWinner(this.foe);
		}
		return sosa?-x:x;
	}
}
Player.prototype.spelldmg = function(x) {
	return (!this.shield || !this.shield.status.reflect?this:this.foe).dmg(x);
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
		if (this.status.voodoo){
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
	if (this.status.voodoo)this.owner.foe.delay(x);
}
Weapon.prototype.freeze = Creature.prototype.freeze = function(x){
	if (this.card.isOf(Cards.Squid)){
		this.transform(Cards.ArcticSquid.asUpped(this.card.upped));
	}else{
		this.defstatus("frozen", 0);
		this.status.frozen = x;
		if (this.status.voodoo)this.owner.foe.freeze(x);
	}
}
Creature.prototype.spelldmg = Creature.prototype.dmg = function(x, dontdie){
	if (!x)return 0;
	var dmg = x<0 ? Math.max(this.hp-this.maxhp, x) : Math.min(this.truehp(), x);
	this.hp -= dmg;
	this.procactive("dmg", [dmg]);
	if (this.truehp() <= 0){
		if (!dontdie)this.die();
	}else if (dmg>0 && this.status.voodoo)this.owner.foe.dmg(x);
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
Creature.prototype.deatheffect = Weapon.prototype.deatheffect = function(index) {
	if (this.active.death){
		this.active.death(this, this, index);
	}
	this.procactive("death", [index]);
	if (index>=0) Effect.mkDeath(ui.creaturePos(this.owner == this.owner.game.player1?0:1, index));
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
Creature.prototype.transform = Weapon.prototype.transform = function(card, owner){
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.cast = card.cast;
	this.castele = card.castele;
	Thing.call(this, card, owner || this.owner);
}
Thing.prototype.evade = function(sender) { return false; }
Creature.prototype.evade = function(sender) {
	if (this.status.frozen)return false;
	if (sender != this.owner && this.status.airborne){
		var freedomChance = 0;
		for(var i=0; i<16; i++){
			if (this.owner.permanents[i] && this.owner.permanents[i].freedom){
				freedomChance++;
			}
		}
		return freedomChance && this.owner.rng() > Math.pow(.8, freedomChance);
	}
}
Creature.prototype.calcEclipse = function(){
	if (!this.status.nocturnal){
		return 0;
	}
	var bonus = 0;
	for (var j=0; j<2; j++){
		for (var i=0; i<16; i++){
			var pl = j == 0 ? this.owner : this.owner.foe;
			if (pl.permanents[i]){
				if (pl.permanents[i].card == Cards.Nightfall){
					bonus = 1;
				}else if (pl.permanents[i].card == Cards.Eclipse){
					return 2;
				}
			}
		}
	}
	return bonus;
}
Weapon.prototype.trueatk = Creature.prototype.trueatk = function(adrenaline, nobuff){
	var dmg = this.atk;
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
	if (this.active.hp) hp += this.active.hp(this);
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
	}else Effect.mkText("Evade", t);
	this.owner.spend(castele, cast);
	this.owner.game.updateExpectedDamage();
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
	var target = this.active.cast == Actives.appease && !this.status.appeased ? this.owner : this.owner.foe;
	if (this.active.auto && !this.status.frozen && (!this.status.adrenaline || this.status.adrenaline<3)){
		this.active.auto(this);
	}
	this.usedactive = false;
	var trueatk;
	if (!(stasis || this.status.frozen || this.status.delayed) && (trueatk = this.trueatk()) != 0){
		var momentum = this.status.momentum;
		if (!momentum && this.status.burrowed){
			for (var i=0; i<16; i++){
				if (this.owner.permanents[i] && this.owner.permanents[i].status.tunnel){
					momentum = true;
					break;
				}
			}
		}else if (this.status.airborne && freedomChance && this.owner.rng() < freedomChance){
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
		}else{
			var truedr = target.shield ? target.shield.truedr() : 0;
			var tryDmg = Math.max(trueatk - truedr, 0);
			if (!target.shield || !target.shield.active.shield || !target.shield.active.shield(target.shield, this, tryDmg)){
				if (tryDmg > 0){
					var dmg = target.dmg(tryDmg);
					if (this.active.hit && (!this.status.adrenaline || this.status.adrenaline < 3)){
						this.active.hit(this, target, dmg);
					}
				}
			}
		}
	}
	if (this.status.frozen){
		this.status.frozen--;
	}
	if (this.status.delayed){
		this.status.delayed--;
	}
	if (this.active.postauto && !this.status.frozen && (!this.status.adrenaline || this.status.adrenaline < 3)) {
		this.active.postauto(this);
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
		console.log((this.owner==this.owner.game.player1?"1":"2") + " cannot cast " + (this.card?this.card.name:"nil"));
		return;
	}
	var owner = this.owner, card = this.card;
	this.remove();
	if (owner.neuro){
		owner.addpoison(1);
	}
	owner.spend(card.costele, card.cost);
	if (card.type <= PermanentEnum){
		var cons = [Pillar, Weapon, Shield, Permanent][card.type];
		new cons(card, owner).place(true);
	}else if (card.type == SpellEnum){
		if (!target || !target.evade(owner)){
			card.active(this, target);
			this.procactive("spell", [target]);
		}
	}else if (card.type == CreatureEnum){
		new Creature(card, owner).place(true);
	} else console.log("Unknown card type: " + card.type);
	owner.game.updateExpectedDamage();
}
function countAdrenaline(x){
	return 5-Math.floor(Math.sqrt(Math.abs(x)));
}
function filtercards(upped, filter, cmp){
	var keys = [];
	for(var key in CardCodes) {
		var card = CardCodes[key];
		if (card.upped == upped && !card.status.token && (!filter || filter(card))) {
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
			if (cr && cr.status.salvage && !cr.status.salvaged){
				Effect.mkText("Salvage", cr);
				cr.status.salvaged = true;
				t.owner.hand.push(new CardInstance(t.card, t.owner));
				return;
			}
		}
	}
}
function getTargetFilter(str){
	if (str in TargetFilters){
		return TargetFilters[str];
	}else{
		var prefixes = str.split(":"), filters = prefixes.pop().split("+");
		for(var i=0; i<prefixes.length; i++){
			prefixes[i] = TargetFilters[prefixes[i]];
		}
		for(var i=0; i<filters.length; i++){
			filters[i] = TargetFilters[filters[i]];
		}
		return TargetFilters[str] = function(c, t){
			return prefixes.every(function(x){return x(c, t);}) && filters.some(function(x){return x(c, t);});
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
		return c != t && t instanceof CardInstance;
	},
	pill:function(c, t){
		return t.isMaterialInstance(Pillar);
	},
	weap:function(c, t){
		return (t instanceof Weapon || (t instanceof Creature && t.card.type == WeaponEnum)) && !t.status.immaterial && !t.status.burrowed;
	},
	playerweap:function(c,t){
		return t instanceof Weapon && t == t.owner.weapon;
	},
	perm:function(c, t){
		return t.isMaterialInstance(Permanent);
	},
	permnonstack:function(c,t){
		return t.isMaterialInstance(Permanent) && !t.status.stackable;
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
		return (t instanceof Creature || t instanceof Permanent) && !t.status.immaterial && !t.status.burrowed && ((t.trueatk && t.trueatk()<3) || (t instanceof Creature && t.truehp()<3));
	},
	devour:function(c, t){
		return t.isMaterialInstance(Creature) && t.truehp()<c.truehp();
	},
	paradox:function(c, t){
		return t.isMaterialInstance(Creature) && t.truehp()<t.trueatk();
	},
	airbornecrea:function(c, t){
		return t.isMaterialInstance(Creature) && t.status.airborne;
	},
	groundcrea:function(c, t){
		return t.isMaterialInstance(Creature) && !t.status.airborne;
	},
	wisdom:function(c, t){
		return (t instanceof Creature || t instanceof Weapon) && !t.status.burrowed;
	}
};

exports.Game = Game;
exports.Thing = Thing;
exports.Card = Card;
exports.Player = Player;
exports.CardInstance = CardInstance;
exports.Pillar = Pillar;
exports.Weapon = Weapon;
exports.Shield = Shield;
exports.Permanent = Permanent;
exports.Creature = Creature;
exports.passives = passives;
exports.isEmpty = isEmpty;
exports.salvageScan = salvageScan;
exports.filtercards = filtercards;
exports.countAdrenaline = countAdrenaline;
exports.clone = clone;
exports.casttext = casttext;
exports.getTargetFilter = getTargetFilter;
exports.NymphList = NymphList;
exports.AlchemyList = AlchemyList;
exports.fromTrueMark = fromTrueMark;
exports.toTrueMark = toTrueMark;
exports.PlayerRng = PlayerRng;
exports.Other = 0;
exports.Entropy = 1;
exports.Death = 2;
exports.Gravity = 3;
exports.Earth = 4;
exports.Life = 5;
exports.Fire = 6;
exports.Water = 7;
exports.Light = 8;
exports.Air = 9;
exports.Time = 10;
exports.Darkness = 11;
exports.Aether = 12;
exports.PillarEnum = 0;
exports.WeaponEnum = 1;
exports.ShieldEnum = 2;
exports.PermanentEnum = 3;
exports.SpellEnum = 4;
exports.CreatureEnum = 5;
exports.MulliganPhase1 = 0;
exports.MulliganPhase2 = 1;
exports.PlayPhase = 2;
exports.EndPhase = 3;
exports.eleNames = ["Chroma", "Entropy", "Death", "Gravity", "Earth", "Life", "Fire", "Water", "Light", "Air", "Time", "Darkness", "Aether", "Random"];