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
					this.active["auto"] = Actives[active[0]];
				}else{
					this.active[this.readCost("cast", active[0])?"cast":active[0]] = Actives[active[1]];
				}
			}
		}
	}
	this.passives = {};
	if (info.Passive){
		var passives = info.Passive.split("+");
		for(var i=0; i<passives.length; i++){
			var passive = passives[i].split("=");
			this.passives[passive[0]] = passive.length==1 || parseInt(passive[1]);
		}
	}
	if (!this.passives.rare) this.passives.rare = 0;
	if (info.Status){
		this.status = {};
		var statuses = info.Status.split("+");
		for(var i=0; i<statuses.length; i++){
			var status = statuses[i].split("=");
			this.status[status[0]] = status.length==1 || parseInt(status[1]);
		}
	}
	if (info.Text){
		this.text = info.Text;
	}
}
function Thing(card, owner){
	this.owner = owner;
	this.card = card;
	this.usedactive = true;
	if (this.status){
		for(var key in card.status){
			this.status[key] = card.status[key];
		}
	}else{
		this.status = clone(card.status)
	}
	this.passives = clone(card.passives);
	this.active = clone(card.active);
	if (this.active.play){
		this.active.play(this);
		delete this.active.play;
	}
	delete this.active.discard;
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
	this.maxhp = this.hp = 100;
	this.hand = [];
	this.deck = [];
	this.creatures = new Array(23);
	this.permanents = new Array(16);
	this.mark = 0;
	this.quanta = [];
	for(var i=1; i<13; i++)this.quanta[i]=0;
	this.shardgolem = {
		stat: 1,
		passives: {},
		status: {},
		active: {cast: Actives.burrow},
		cast: 1
	};
}
function Creature(card, owner){
	if (card == Cards.ShardGolem){
		this.card = card;
		this.owner = owner;
		var golem = owner.shardgolem;
		this.atk = this.maxhp = this.hp = golem.stat;
		this.cast = golem.cast;
		this.castele = Earth;
		this.active = clone(golem.active);
		this.passives = clone(golem.passives);
		this.status = clone(golem.status);
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
Card.prototype.attack = 0;
Card.prototype.health = 0;
Card.prototype.upped = false;