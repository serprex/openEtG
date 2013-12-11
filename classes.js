function Card(type, info){
	this.type = type;
	this.element = parseInt(info.Element);
	this.name = info.Name;
	this.code = info.Code;
	this.upped = parseInt(this.code, 32)>6999;
	this.attack = parseInt(info.Attack||"0");
	this.health = parseInt(info.Health||"0");
	this.readCost("cost", info.Cost||"0", this.element);
	this.readCost("cast", info.Cast||"0", this.element);
	this.active = Actives[info.Active];
	this.passive = info.Passive;
	this.airborne = info.Airborne == "1";
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
function Creature(card, owner, poison){
	Thing.apply(this, arguments);
	this.delayed = 0;
	this.frozen = 0;
	this.dive = 0;
	if(this.poison = poison || 0){
		this.owner.foe.addpoison(this.poison);
	}
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