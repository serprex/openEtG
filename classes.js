function Card(type, info){
	this.type = type;
	this.element = parseInt(info.Element);
	this.name = info.Name;
	this.code = info.Code;
	this.upped = parseInt(this.code, 32)>6999;
	this.attack = parseInt(info.Attack||"0");
	this.health = parseInt(info.Health||"0");
	this.readCost("cost", info.Cost||"0");
	if (info.Active){
		if (this.type == PillarEnum || this.type == SpellEnum){
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
					this.active["auto"] = Actives[active[0]];
				}else{
					this.active[this.readCost("cast", active[0])?"cast":active[0]] = Actives[active[1]];
				}
			}
		}
	}
	if (info.Status){
		this.status = {};
		var statuses = info.Status.split("+");
		for(var i=0; i<statuses.length; i++){
			var status = statuses[i].split("=");
			this.status[status[0]] = status.length==1 || parseInt(status[1]);
		}
	}
	if (info.Passive){
		this.passives = {};
		var passives = info.Passive.split("+");
		for(var i=0; i<passives.length; i++){
			this.passives[passives[i]] = true;
		}
	}
}
function Player(game){
	this.game = game;
	this.owner = this;
	this.shield = null;
	this.weapon = null;
	this.status = {poison:0};
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
		passives: [],
		adrenaline: 0,
		active: Actives.burrow,
		cast: 1
	};

}
function Thing(card, owner){
	if (!card)return;
	this.owner = owner;
	this.card = card;
	this.status = clone(card.status);
	this.passives = clone(card.passives);
	this.active = clone(card.active);
	if (this.active.play){
		this.active.play(this);
		delete this.active.play;
	}
}
function Creature(card, owner){
	this.usedactive = true;
	if (card == Cards.ShardGolem){
		this.card = card;
		this.owner = owner;
		var golem = owner.shardgolem;
		this.maxhp = this.hp = golem.hp;
		this.atk = golem.atk;
		this.active = clone(golem.active);
		this.cast = golem.cast;
		this.castele = Earth;
		this.passives = clone(golem.passives);
		this.status = clone(golem.status);
	}else this.transform(card, owner);
}
function Permanent(card, owner){
	if (!card){
		return;
	}
	this.cast = card.cast;
	this.castele = card.castele;
	this.usedactive = true;
	Thing.apply(this, arguments);
}
function Weapon(card, owner){
	this.frozen = 0;
	this.delayed = 0;
	this.dive = 0;
	this.steamatk = 0;
	this.atk = card.attack;
	Permanent.apply(this, arguments);
}
function Shield(card, owner){
	this.dr = card.health
	Permanent.apply(this, arguments)
}
function Pillar(card, owner){
	this.owner = owner;
	this.card = card;
	this.active = card.active;
	this.status = {charges: 1};
	this.pendstate = false;
}
Player.prototype = new Thing();
Creature.prototype = new Thing();
Permanent.prototype = new Thing();
Weapon.prototype = new Permanent();
Shield.prototype = new Permanent();
Pillar.prototype = new Permanent();