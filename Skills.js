"use strict";
function adrenathrottle(f){
	return function(c, t, data){
		if (c.status.get("adrenaline")<3 || (c.type == etg.Creature && c.owner.weapon && c.owner.weapon.status.get("nothrottle"))){
			return f(c, t, data);
		}
	}
}
function quadpillarFactory(ele){
	return function(c, t){
		var n = c == t ? 1 : c.status.get("charges");
		for(var i=0; i<n; i++){
			var r = c.owner.upto(16);
			c.owner.spend((ele>>((r&3)<<2))&15, -1);
			if (c.rng()<.6){
				c.owner.spend((ele>>(r&12))&15, -1);
			}
		}
	}
}
var Skills = module.exports = {
ablaze:function(c,t){
	Effect.mkText("2|0", c);
	c.atk += 2;
},
abomination:function(c,t,data){
	if (data.tgt == c && data.active == Skills.mutation){
		Skills.improve.func(c, c);
		data.evade = true;
	}
},
acceleration:function(c,t){
	Effect.mkText("2|-1", c);
	c.atk += 2;
	c.dmg(1, true);
},
accelerationspell:function(c,t){
	t.lobo();
	t.active.auto = Skills.acceleration;
},
accretion:function(c,t){
	Skills.destroy.func(c, t);
	c.buffhp(10);
	if (c.truehp() > 30){
		c.die();
		if (c.owner.hand.length < 8){
			c.owner.addCard(c.card.as(Cards.BlackHole));
		}
	}
},
accumulation:function(c,t){
	return c.status.get("charges");
},
adrenaline:function(c,t){
	Effect.mkText("Adrenaline", t);
	t.status.set("adrenaline", 1);
},
aether:function(c,t){
	Effect.mkText("1:12", c);
	c.owner.spend(etg.Aether, -1);
},
aflatoxin:function(c,t){
	Effect.mkText("Aflatoxin", t);
	t.addpoison(2);
	t.status.set("aflatoxin", 1);
},
aggroskele:function(c,t){
	c.owner.addCrea(new Thing(c.card.as(Cards.Skeleton)));
	var dmg = c.owner.creatures.reduce(function(dmg, cr){
		return cr && cr.card.isOf(Cards.Skeleton) ?
			dmg + cr.trueatk() : dmg;
	}, 0);
	Effect.mkText("-"+dmg, t);
	t.dmg(dmg);
},
air:function(c,t){
	Effect.mkText("1:9", c);
	c.owner.spend(etg.Air, -1);
},
alphawolf:function(c,t){
	var pwolf = c.card.as(Cards.PackWolf);
	c.owner.addCrea(new Thing(pwolf));
	c.owner.addCrea(new Thing(pwolf));
},
antimatter:function(c,t){
	Effect.mkText("Antimatter", t);
	t.atk -= t.trueatk()*2;
},
appease:function(c,t){
	Skills.devour.func(c, t);
	c.status.set("appeased", 1);
},
atk2hp:function(c,t){
	t.buffhp(t.trueatk()-t.hp);
},
autoburrow:function(c,t){
	c.addactive("play", Skills.autoburrowproc);
},
autoburrowoff:function(c,t){
	c.rmactive("play", "autoburrowproc");
},
autoburrowproc:function(c,t){
	if (t.active.cast == Skills.burrow) Skills.burrow.func(t);
},
axe:function(c,t){
	return c.owner.mark == etg.Fire || c.owner.mark == etg.Time?1:0;
},
axedraw:function(c,t){
	c.status.incr("dive", 1);
},
bblood:function(c,t){
	Effect.mkText("0|20", t);
	t.buffhp(20);
	t.delay(5);
},
becomearctic:function(c,t){
	c.transform(c.card.as(Cards.ArcticSquid));
},
beguile:function(c,t){
	t.remove();
	t.owner = t.owner.foe;
	t.owner.addCrea(t);
	if (c != t) t.addactive("turnstart", Skills.beguilestop);
},
beguilestop:function(c,t){
	if (t == c.owner){
		c.rmactive("turnstart", "beguilestop");
		Skills.beguile.func(c, c);
	}
},
bellweb:function(c,t){
	Skills.web.func(c,t);
	t.status.set("aquatic", 1);
},
blackhole:function(c,t){
	if (!t.sanctuary){
		for (var q=1; q<13; q++){
			c.owner.dmg(-Math.min(t.quanta[q],3));
			t.quanta[q] = Math.max(t.quanta[q]-3,0);
		}
	}
},
bless:function(c,t){
	Effect.mkText("3|3", t);
	t.atk += 3;
	t.buffhp(3);
},
bolsterintodeck:function(c,t){
	c.owner.deck.push(t.card, t.card, t.card);
},
boneyard:function(c,t){
	if (!t.card.isOf(Cards.Skeleton)){
		c.owner.addCrea(new Thing(c.card.as(Cards.Skeleton)));
	}
},
bow:function(c,t){
	return c.owner.mark == etg.Air || c.owner.mark == etg.Light?1:0;
},
bounce:function(c,t){
	Skills.unsummon.func(c, c);
	return true;
},
bravery:function(c,t){
	if (!c.owner.foe.sanctuary){
		for(var i=0; i<2 && c.owner.hand.length<8 && c.owner.foe.hand.length<8; i++){
			c.owner.drawcard();
			c.owner.foe.drawcard();
		}
	}
},
brawl:function(c,t){
	c.owner.creatures.forEach(function(cr, i){
		if (cr){
			var fcr = c.owner.foe.creatures[i];
			if (fcr){
				fcr.attackCreature(cr);
				cr.attackCreature(fcr);
			}else{
				cr.attack(false, 0);
			}
		}
	});
	c.owner.quanta[etg.Gravity] = 0;
},
brew:function(c,t){
	Effect.mkText("Brew", c);
	c.owner.addCard(c.card.as(Cards.Codes[etg.AlchemyList[c.owner.upto(12)+1]]));
},
brokenmirror:function(c,t, fromhand){
	if (fromhand && t.type == etg.Creature && c.owner != t.owner){
		c.owner.addCrea(new Thing(c.card.as(Cards.Phantom)));
	}
},
burrow:function(c,t){
	c.status.set("burrowed", 1);
	c.status.set("airborne", 0);
	c.active.cast = Skills.unburrow;
	c.cast = 0;
},
butterfly:function(c,t){
	t.lobo();
	t.active.cast = Skills.destroy;
	t.cast = 3;
	t.castele = etg.Entropy;
},
catapult:function(c,t){
	Effect.mkText("Catapult", t);
	t.die();
	c.owner.foe.dmg(Math.ceil(t.truehp()*(t.status.get("frozen")?150:100)/(t.truehp()+100)));
	var poison = t.status.get("poison");
	if (poison) c.owner.foe.addpoison(poison);
	var frozen = t.status.get("frozen");
	if (frozen) c.owner.foe.freeze(frozen);
},
catlife:function(c,t, data){
	if (!c.owner.creatures[data.index]){
		var lives = c.status.maybeDecr("lives");
		if (!lives) return;
		Effect.mkText((lives-1) + " lives", c);
		var cl = c.clone(c.owner);
		cl.hp = cl.maxhp = c.card.health;
		cl.atk = c.card.attack;
		c.owner.creatures[data.index] = cl;
	}
},
cell:function(c,t){
	c.transform(c.card.as(Cards.MalignantCell));
},
chimera:function(c,t){
	var atk=0, hp=0;
	c.owner.creatures.forEach(function(cr){
		if (cr){
			atk += cr.trueatk();
			hp += cr.truehp();
		}
	});
	var chim = new Thing(c.card);
	chim.owner = c.owner;
	chim.atk = atk;
	chim.maxhp = chim.hp = hp;
	chim.status.set("momentum", 1);
	chim.type = etg.Creature;
	c.owner.creatures[0] = chim;
	c.owner.creatures.length = 1;
	c.owner.creatures.length = 23;
	c.owner.gpull = chim;
},
chromastat:function(c,t){
	var n = c.truehp() + c.trueatk();
	Effect.mkText(n+":0", c);
	c.owner.spend(0, -n);
},
clear:function(c,t){
	Effect.mkText("Clear", t);
	t.status.set("poison", 0);
	t.status.set("adrenaline", 0);
	t.status.set("aflatoxin", 0);
	t.status.set("momentum", 0);
	t.status.set("psionic", 0);
	t.status.maybeDecr("delayed");
	t.status.maybeDecr("frozen");
	t.dmg(-1);
	if (t.hasactive("turnstart", "beguilestop")){
		Skills.beguilestop.func(t, t.owner);
	}
},
corpseexplosion:function(c,t){
	var dmg = 1 + Math.floor(t.truehp()/8);
	t.die();
	c.owner.foe.masscc(c, function(c,t){ t.spelldmg(dmg) }, !c.card.upped);
	var poison = t.status.get("poison") + t.status.get("poisonous");
	if (poison) c.owner.foe.addpoison(poison);
},
counter:function(c,t, dmg){
	if (!c.status.get("frozen") && !c.status.get("delayed") && dmg>0 && ~c.getIndex()){
		c.attackCreature(t);
	}
},
countimmbur:function(c){
	var n = 0;
	function test(x){
		if (x && (x.status.get("immaterial") || x.status.get("burrowed"))) n++;
	}
	c.owner.forEach(test);
	c.owner.foe.forEach(test);
	return n;
},
cpower:function(c,t){
	var buff = t.owner.upto(25);
	t.buffhp(Math.floor(buff/5)+1);
	t.atk += buff%5+1;
},
creatureupkeep:function(c,t){
	c.owner.masscc(c, function(c, t){
		Skills.upkeep.func(t);
	}, true);
},
cseed:function(c,t){
	Skills[c.choose(["drainlife", "firebolt", "freeze", "gpullspell", "icebolt", "infect", "lightning", "lobotomize", "parallel", "rewind", "snipe", "swave"])].func(c, t);
},
cseed2:function(c,t){
	var choice = c.choose(Cards.filter(c.owner.upto(2), function(c){
		if (c.type != etg.Spell) return false;
		var tgting = Cards.Targeting[c.active.cast.name[0]];
		return tgting && tgting(c, t);
	}));
	Effect.mkText(choice.name, t);
	c.castSpell(t, choice.active.cast);
},
dagger:function(c){
	return (c.owner.mark == etg.Darkness||c.owner.mark == etg.Death) + c.owner.isCloaked();
},
deadalive:function(c){
	c.deatheffect(c.getIndex());
},
deathwish:function(c,t, data){
	var tgt = data.tgt;
	if (!tgt || c.status.get("frozen") || c.status.get("delayed") || c.owner == t.owner || tgt.owner != c.owner || tgt.type != etg.Creature || !Cards.Targeting[data.active.name[0]](t, c)) return;
	if (!tgt.hasactive("prespell", "deathwish")) return data.tgt = c;
	var totaldw = 0;
	c.owner.creatures.forEach(function(cr){
		if (cr && cr.hasactive("prespell", "deathwish"))totaldw++;
	});
	if (c.rng() < 1/totaldw){
		return data.tgt = c;
	}
},
decrsteam:function(c){
	if (c.status.maybeDecr("steam")){
		c.atk--;
	}
},
deckblast:function(c,t){
	c.owner.foe.spelldmg(Math.ceil(c.owner.deck.length/c.owner.deckpower));
	c.owner.deck.length = 0;
},
deepdive:function(c,t){
	c.active.cast = Skills.freezeperm;
	c.castele = etg.Gravity;
	c.status.set("airborne", 0);
	c.status.set("burrowed", 1);
	c.addactive("turnstart", Skills.deepdiveproc);
},
deepdiveproc:function(c,t){
	if (t == c.owner){
		c.rmactive("turnstart", "deepdiveproc");
		c.addactive("turnstart", Skills.deepdiveproc2);
		c.status.set("airborne", 1);
		c.status.set("burrowed", 0);
		c.status.set("dive", c.trueatk()*2);
	}
},
deepdiveproc2:function(c,t){
	c.rmactive("turnstart", "deepdiveproc2");
	c.active.cast = Skills.deepdive;
	c.castele = etg.Water;
	c.status.set("airborne", false);
},
deja:function(c,t){
	delete c.active.cast;
	Skills.parallel.func(c, c);
},
deployblobs:function(c,t){
	var blob = c.card.as(Cards.Blob);
	for(var i=0; i<3; i++){
		c.owner.addCrea(new Thing(blob));
	}
	c.atk -= 2;
	c.dmg(2);
},
destroy:function(c,t, dontsalvage, donttalk){
	if (!donttalk){
		Effect.mkText("Destroy", t);
	}
	if (t.status.get("stackable")){
		if (t.status.maybeDecr("charges") < 2){
			t.remove();
		}
	}else t.remove();
	if (!dontsalvage){
		t.proc("destroy", {});
	}
},
destroycard:function(c,t){
	if (t.type == etg.Player){
		if (!t.deck.length) t.game.setWinner(t.foe);
		else t.deck.length--;
	}else if (!t.owner.sanctuary){
		t.die();
	}
},
detain:function(c,t){
	t.dmg(1);
	t.atk--;
	Skills["growth 1"].func(c);
	t.status.set("airborne", 0);
	t.status.set("burrowed", 1);
},
devour:function(c,t){
	Effect.mkText("1|1", c);
	c.buffhp(1);
	c.atk += 1;
	if (t.status.get("poisonous")) c.addpoison(1);
	t.die();
},
die:function(c,t){
	c.die();
},
disarm:function(c,t){
	if (t.type == etg.Player && t.weapon){
		Skills.unsummon.func(c, t.weapon);
	}
},
disc:function(c,t){
	return c.owner.mark == etg.Entropy || c.owner.mark == etg.Aether?1:0;
},
discping:function(c,t){
	t.dmg(1);
	c.remove();
	c.owner.addCard(c.card);
},
disfield:function(c,t, dmg){
	if (!c.owner.spend(etg.Chroma, dmg)){
		for(var i=1; i<13; i++){
			c.owner.quanta[i] = 0;
		}
		c.owner.shield = undefined;
	}
	return true;
},
disshield:function(c,t, dmg){
	if (!c.owner.spend(etg.Entropy, Math.ceil(dmg/3))){
		c.owner.quanta[etg.Entropy] = 0;
		c.remove();
	}
	return true;
},
dive:function(c,t){
	Effect.mkText("Dive", c);
	c.status.set("dive", c.trueatk());
},
divinity:function(c,t){
	if (c.owner.maxhp < 500){
		c.owner.maxhp = Math.min(c.owner.maxhp + 24, 500);
	}
	c.owner.dmg(-16);
},
dmgproduce:function(c,t, dmg){
	c.owner.spend(0, -dmg);
},
drainlife:function(c,t){
	c.owner.dmg(-t.spelldmg(2+Math.floor(c.owner.quanta[etg.Darkness]/5)));
},
draft:function(c,t){
	Effect.mkText("Draft", t);
	c.owner.spend(etg.Air, -2);
	var isborne = !t.status.get("airborne");
	t.status.set("airborne", isborne);
	if (isborne && t.active.cast == Skills.burrow) delete t.active.cast;
},
drawcopy:function(c,t){
	if (c.owner != t.owner) c.owner.addCard(t.card);
},
drawequip:function(c,t){
	for(var i=c.owner.deck.length-1; i>-1; i--){
		var card = c.owner.deck[i];
		if (card.type == etg.Weapon || card.type == etg.Shield){
			if (~c.owner.addCard(card)){
				c.owner.deck.splice(i, 1);
				c.owner.proc("draw");
			}
			return;
		}
	}
},
drawpillar:function(c,t){
	var deck = c.owner.deck;
	if (deck.length && deck[deck.length-1].type == etg.Pillar) Skills.hasten.func(c, t);
},
dryspell:function(c,t){
	function dryeffect(c,t){
		c.spend(etg.Water, -t.spelldmg(1));
	}
	c.owner.foe.masscc(c.owner, dryeffect, true);
},
dshield:function(c,t){
	c.status.set("immaterial", 1);
	c.addactive("turnstart", Skills.dshieldoff);
},
dshieldoff:function(c,t){
	if (c.owner == t){
		c.status.set("immaterial", 0);
		c.rmactive("turnstart", "dshieldoff");
	}
},
duality:function(c,t){
	if (c.owner.foe.deck.length && c.owner.hand.length < 8){
		c.owner.addCard(c.owner.foe.deck[c.owner.foe.deck.length-1]);
	}
},
earth:function(c,t){
	Effect.mkText("1:4", c);
	c.owner.spend(etg.Earth, -1);
},
earthquake:function(c,t){
	Effect.mkText("Earthquake", t);
	if (t.status.get("charges")>3){
		t.status.incr("charges", -3);
	}else{
		t.remove();
	}
	t.proc("destroy", {});
},
elf:function(c,t,data){
	if (data.tgt == c && data.active == Skills.cseed){
		c.transform(c.card.as(Cards.FallenElf));
		data.evade = true;
	}
},
embezzle:function(c,t){
	Effect.mkText("Embezzle", t);
	t.lobo();
	t.active.hit = Skills.forcedraw;
	t.active.owndeath = Skills.embezzledeath;
},
embezzledeath:function(c,t){
	if (c.owner.foe.deck.length < 3){
		c.owner.foe.deck.length = 0;
		c.owner.game.setWinner(c.owner);
	}else{
		c.owner.foe.deck.length -= 3;
	}
},
empathy:function(c,t){
	var healsum = c.owner.countcreatures();
	Effect.mkText("+"+healsum, c);
	c.owner.dmg(-healsum);
	if (!c.owner.spend(etg.Life, Math.floor(healsum/8))){
		c.owner.quanta[etg.Life] = 0;
		c.die();
	}
},
enchant:function(c,t){
	Effect.mkText("Enchant", t);
	t.status.set("immaterial", 1);
},
endow:function(c,t){
	Effect.mkText("Endow", t);
	for (var i=0; i<t.status.keys.length; i++){
		var key = t.status.keys[i], val = t.status.vals[i];
		if (key == "adrenaline" && val > 1) val = 1;
		c.status.incr(key, val);
	}
	c.active = util.clone(t.active);
	if (c.active.cast == Skills.endow) {
		delete c.active.cast;
	}else{
		c.cast = t.cast;
		c.castele = t.castele;
	}
	c.atk += t.trueatk() - t.trigger("buff");
	c.buffhp(2);
},
envenom:function(c,t){
	t.addactive("hit", parseSkill("poison 1"));
	t.addactive("shield", Skills.thornweak);
},
epidemic:function(c,t){
	var poison = t.status.get("poison");
	if (poison) c.owner.foe.addpoison(poison);
},
epoch:function(c,t){

	if (c.status.incr("epoch", 1) > 1) Skills.silence.func(c, t.owner);
},
epochreset:function(c,t){
	c.status.set("epoch", 0);
},
evolve:function(c,t){
	c.transform(c.card.as(Cards.Shrieker));
	c.status.set("burrowed", 0);
},
feed:function(c,t){
	t.addpoison(1);
	parseSkill("growth 3")(c);
	c.status.set("immaterial", 0);
},
fickle:function(c,t){
	if (t.owner != c.owner && t.owner.sanctuary){
		return;
	}
	var cards = [];
	t.owner.deck.forEach(function(card, i){
		var cost = card.cost;
		if (!card.element || card.element == c.castele) cost += c.cast;
		if (t.owner.canspend(card.costele, cost)){
			cards.push(i);
		}
	});
	if (cards.length){
		var pick = t.choose(cards);
		(t.owner.hand[t.getIndex()] = new Thing(t.owner.deck[pick])).type = etg.Spell;
		t.owner.deck[pick] = t.card;
	}
},
fiery:function(c,t){
	return Math.floor(c.owner.quanta[etg.Fire]/5);
},
fire:function(c,t){
	Effect.mkText("1:6", c);
	c.owner.spend(etg.Fire, -1);
},
firebolt:function(c,t){
	t.spelldmg(3+Math.floor(c.owner.quanta[etg.Fire]/4));
	if (t.type == etg.Player){
		if (t.weapon){
			t.weapon.status.set("frozen", 0);
		}
	}else{
		t.status.set("frozen", 0);
	}
},
firebrand:function(c,t, data){
	if (data.tgt == c && data.active == Skills.tempering){
		c.status.incr("charges", 1);
	}
},
flatline:function(c,t){
	if (!c.owner.foe.sanctuary){
		c.owner.foe.flatline = true;
	}
},
flyself:function(c,t){
	Skills[c.type == etg.Weapon ? "flyingweapon" : "livingweapon"].func(c, c);
},
flyingweapon:function(c,t){
	t.owner.weapon = undefined;
	t.type = etg.Creature;
	t.status.set("airborne", 1);
	t.owner.addCrea(t);
},
foedraw:function(c,t){
	if (c.owner.hand.length < 8){
		if (!c.owner.foe.deck.length) c.owner.game.setWinner(c.owner);
		else{
			c.owner.deck.push(c.owner.foe.deck.pop());
			c.owner.drawcard();
		}
	}
},
forcedraw:function(c,t){
	if (!t.owner.sanctuary){
		t.owner.drawcard();
	}
},
forceplay:function(c,t){
	function findtgt(tgting){
		function tgttest(x){
			if (x && tgting(t.owner, x)) {
				tgts.push(x);
			}
		}
		var tgts = [];
		for(var i=0; i<2; i++){
			var pl=i==0?c.owner:c.owner.foe;
			tgttest(pl);
			pl.forEach(tgttest, true);
		}
		return tgts.length == 0 ? undefined : c.choose(tgts);
	}
	var tgting, tgt;
	if (t.type == etg.Spell){
		var card = t.card;
		Effect.mkSpriteFadeHandImage(t.card, t, {x:t.owner == t.owner.game.player2 ? -1 : 1, y:0});
		if (t.owner.sanctuary) return;
		if (card.type == etg.Spell){
			tgting = Cards.Targeting[card.active.cast.name[0]];
		}
	}else if (t.active.cast){
		tgting = Cards.Targeting[t.active.cast.name[0]];
	}
	if (tgting && !(tgt = findtgt(tgting))) return;
	var realturn = t.owner.game.turn;
	t.owner.game.turn = t.owner;
	t.useactive(tgt);
	t.owner.game.turn = realturn;
},
fractal:function(c,t){
	Effect.mkText("Fractal", t);
	for(var i=6+Math.floor((c.owner.quanta[etg.Aether])/2); i>0; i--){
		c.owner.addCard(t.card);
	}
	c.owner.quanta[etg.Aether] = 0;
},
freeevade:function(c,t, data){
	var tgt = data.tgt;
	if (tgt && tgt.type == etg.Creature && tgt.owner == c.owner && tgt.owner != t.owner && tgt.status.get("airborne") && !tgt.status.get("frozen") && c.rng() > .8){
		data.evade = true;
	}
},
freeze:function(c,t){
	t.freeze(c.card.upped ? 4 : 3);
},
freezeperm:function(c,t){
	Skills.freeze.func(c, t);
},
fungusrebirth:function(c,t){
	c.transform(c.card.as(Cards.Fungus));
},
gaincharge2:function(c,t){
	if (c != t){
		c.status.incr("charges", 2);
	}
},
gaintimecharge:function(c,t, drawstep){
	if (!drawstep && c.owner == t){
		if (c.status.get("chargecap", 4)){
			c.status.incr("chargecap", 1);
			c.status.incr("charges", 1);
		}
	}
},
gas:function(c,t){
	c.owner.addPerm(new Thing(c.card.as(Cards.UnstableGas)));
},
give:function(c,t){
	c.owner.dmg(c.card.upped?-10:-5);
	if (t.type == etg.Spell){
		t.remove();
		c.owner.foe.addCard(t.card);
	}else if (t.hasactive("auto", "singularity")){
		t.die();
	}else if (t.type <= etg.Permanent){
		Skills.steal.func(c.owner.foe, t);
	}else{
		t.remove();
		c.owner.foe.addCrea(t);
	}
},
golemhit:function(c,t){
	t.attack(false, 0);
},
gpull:function(c,t){
	Skills.gpullspell.func(c, c);
},
gpullspell:function(c,t){
	if (t.type == etg.Creature){
		t.owner.gpull = t;
	}else{
		t = t.owner;
		t.gpull = undefined;
	}
	Effect.mkText("Pull", t);
},
gratitude:function(c,t){
	Effect.mkText("+4", c);
	c.owner.dmg(-4);
},
grave:function(c,t){
	if (!t.card.isOf(Cards.Singularity)){
		c.status.set("burrowed", 0);
		c.transform(t.card);
	}
},
growth:function(x){
	var n = parseInt(x);
	return function(c,t) {
		Effect.mkText(n+"|"+n, c)
		c.buffhp(n);
		c.atk += n;
	}
},
guard:function(c,t){
	Effect.mkText("Guard", t);
	c.delay(1);
	t.delay(1);
	if (c.status.get("airborne") || !t.status.get("airborne")){
		c.attackCreature(t);
	}
},
halveatk: function(c, t) {
	t = t || c;
	var storedatk = Math.ceil(t.atk / 2);
	t.status.incr("storedAtk", storedatk);
	t.atk -= storedatk;
},
hammer:function(c,t){
	return c.owner.mark == etg.Gravity||c.owner.mark == etg.Earth?1:0;
},
hasten:function(c,t){
	c.owner.drawcard();
},
hatch:function(c,t){
	Effect.mkText("Hatch", c);
	c.transform(c.randomcard(c.card.upped, function(x){return x.type == etg.Creature}));
},
heal:function(c,t){
	t.dmg(-20);
},
heatmirror:function(c,t, fromhand){
	if (fromhand && t.type == etg.Creature && c.owner != t.owner) {
		c.owner.addCrea(new Thing(c.card.as(Cards.Spark)));
	}
},
hitownertwice:function(c,t){
	if (!c.hasactive("turnstart", "predatoroff")){
		c.addactive("turnstart", Skills.predatoroff);
		c.attack(false, 0, c.owner);
		c.attack(false, 0, c.owner);
	}
},
holylight:function(c,t){
	if (t.status.get("nocturnal")) t.spelldmg(10);
	else t.dmg(-10);
},
hope:function(c,t){
	return c.owner.creatures.reduce(function(dr, cr){
		return cr && cr.hasactive("auto", "light") ? dr+1 : dr;
	}, 0);
},
icebolt:function(c,t){
	var bolts = Math.floor(c.owner.quanta[etg.Water]/5);
	if (c.rng() < .35+bolts/20){
		t.freeze(c.card.upped?4:3);
	}
	t.spelldmg(2+bolts);
},
ignite:function(c,t){
	c.die();
	c.owner.foe.spelldmg(20);
	c.owner.foe.masscc(c, function(c,x){x.spelldmg(1)}, true);
},
immolate:function(c,t){
	t.die();
	if (!t.hasactive("auto", "singularity")){
		for(var i=1; i<13; i++)
			c.owner.spend(i, -1);
		c.owner.spend(etg.Fire, c.card.upped?-7:-5);
	}
},
improve:function(c,t){
	Effect.mkText("Improve", t);
	t.status.set("mutant", 1);
	t.transform(t.randomcard(false, function(x){return x.type == etg.Creature}));
},
inertia:function(c,t, data){
	if (data.tgt && c.owner == data.tgt.owner){
		c.owner.spend(etg.Gravity, -2);
	}
},
infect:function(c,t){
	Effect.mkText("Infect", t);
	t.addpoison(1);
},
inflation:function(c,t){
	function inflate(p){
		if (p && p.isMaterial() && p.active.cast){
			if (!p.cast)p.castele = 0;
			p.cast++;
		}
	}
	c.owner.forEach(inflate);
	c.owner.foe.forEach(inflate);
},
ink:function(c,t){
	var p=new Thing(c.card.as(Cards.Cloak));
	p.status.set("charges", 1);
	c.owner.addPerm(p);
},
innovation:function(c,t){
	if (!t.owner.sanctuary){
		t.die();
		for(var i=0; i<3; i++){
			t.owner.drawcard();
		}
	}
},
integrity:function(c,t){
	var Thing = require("./Thing");
	var tally = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
	var shardSkills = [
		["deadalive", "mutation", "paradox", "improve", "improve", "antimatter"],
		["infect", "infect", "infect", "infect", "aflatoxin", "aflatoxin"],
		["devour", "devour", "devour", "devour", "devour", "blackhole"],
		["burrow", "stoneform", "guard", "guard", "bblood", "bblood"],
		["growth 2", "adrenaline", "adrenaline", "adrenaline", "adrenaline", "mitosis"],
		["ablaze", "ablaze", "tempering", "destroy", "destroy", "rage"],
		["steam", "steam", "freeze", "freeze", "nymph", "nymph"],
		["mend", "endow", "endow", "luciferin", "luciferin", "luciferin"],
		["summon Firefly", "summon Firefly", "snipe", "dive", "gas", "gas"],
		["summon Scarab", "summon Scarab", "deja", "deja", "precognition", "precognition"],
		["siphonstrength", "siphonstrength", "yoink", "liquid", "liquid", "steal"],
		["lobotomize", "lobotomize", "lobotomize", "quint", "quint", "quint"],
	];
	var shardCosts = {
		burrow:1, stoneform:1, guard:1, bblood:2,
		deadalive:1, mutation:2, paradox:2, improve:2, antimatter:3,
		infect:1, aflatoxin:2,
		devour:3, blackhole:3,
		"growth 2":2, adrenaline:2, mitosis:3,
		ablaze:1, tempering:(c.card.upped?2:1), destroy:3, rage:2,
		steam:2, freeze:2, nymph:3,
		mend:1, endow:2, luciferin:3,
		"summon Firefly":2, snipe:2, dive:2, gas:2,
		"summon Scarab":2, deja:4, precognition:2,
		siphonstrength:2, yoink:2, liquid:2, steal:3,
		lobotomize:2, quint:2,
	};
	var stat=c.card.upped?.5:0;
	for(var i=c.owner.hand.length-1; ~i; i--){
		var card = c.owner.hand[i].card;
		if (util.typedSome(etg.ShardList, function(x) { return x && card.isOf(Cards.Codes[x]); })){
			if (card.upped){
				stat += .5;
			}
			tally[card.element]++;
			c.owner.hand.splice(i, 1);
		}
	}
	var num=0, shlist=[];
	for(var i=1; i<13; i++){
		stat += tally[i]*2;
		if (tally[i]>num){
			num = tally[i];
			shlist.length = 0;
			shlist[0] = i;
		}else if (num != 0 && tally[i] == num){
			shlist.push(i);
		}
	}
	var active = shardSkills[c.choose(shlist)-1][Math.min(num-1,5)];
	var shardgolem = c.owner.shardgolem = {
		stat: Math.floor(stat),
		status: new Status(),
		active: {cast:parseSkill(active)},
		cast: shardCosts[active]
	};
	shardgolem.status.set("golem", 1);
	function addSkill(event, active){
		Thing.prototype.addactive.call(shardgolem, event, parseSkill(active));
	}
	[	[[2, "hit", "scramble"]],
		[[0, "death", "growth 1"], [0, "", "nocturnal"]],
		[[1, "", "momentum"]],
		[],
		[[0, "", "poisonous"], [0, "", "adrenaline", 1], [2, "auto", "regenerate"]],
		[[0, "buff", "fiery"]],
		[[0, "", "aquatic"], [2, "hit", "regen"]],
		[[0, "auto", "light"], [1, "blocked", "virtue"], [2, "owndmg", "martyr"], [3, "ownfreeze", "growth 2"], [4, "hit", "disarm"], [5, "auto", "sanctuary"]],
		[[0, "", "airborne"]],
		[[1, "hit", "neuro"]],
		[[0, "", "nocturnal"], [0, "", "voodoo"], [1, "auto", "siphon"], [2, "hit", "vampire"], [3, "hit", "reducemaxhp"], [4, "destroy", "loot"], [5, "owndeath", "catlife"], [5, "", "lives", 69105]],
		[[2, "", "immaterial"]],
	].forEach(function(slist, i){
		var ishards = tally[i+1];
		for(var j=0; j<slist.length; j++){
			var data = slist[j];
			if (ishards <= data[0]) return;
			if (!data[1]){
				shardgolem.status.set(data[2], data[3] === undefined ? 1 : data[3]);
			}else{
				addSkill(data[1], data[2]);
			}
		}
	});
	if (tally[etg.Death] > 0){
		addSkill("hit", "poison " + tally[etg.Death]);
	}
	c.owner.addCrea(new Thing(c.card.as(Cards.ShardGolem)), true);
},
jelly:function(c,t){
	var tcard = t.card;
	t.transform(tcard.as(Cards.PinkJelly));
	t.active = {cast: Skills.jelly};
	t.castele = tcard.element;
	t.cast = 4;
	t.atk = 7;
	t.maxhp = t.hp = 4;
},
jetstream:function(c,t){
	t.dmg(1);
	t.atk += 3;
},
light:function(c,t){
	Effect.mkText("1:8", c);
	c.owner.spend(etg.Light, -1);
},
lightning:function(c,t){
	Effect.mkText("-5", t);
	t.spelldmg(5);
},
liquid:function(c,t){
	Effect.mkText("Liquid", t);
	t.lobo();
	t.active.hit = Skills.vampire;
	t.addpoison(1);
},
livingweapon:function(c,t){
	if (t.owner.weapon) Skills.unsummon.func(c, t.owner.weapon);
	t.owner.dmg(-t.truehp());
	t.remove();
	t.owner.setWeapon(t);
},
lobotomize:function(c,t){
	Effect.mkText("Lobotomize", t);
	t.lobo();
	t.status.set("psionic", 0);
},
locket: function(c, t) {
	var ele = c.status.get("mode") || c.owner.mark;
	c.owner.spend(ele, ele > 0 ? -1 : -3);
},
locketshift:function(c,t){
	c.status.set("mode", t.type == etg.Player ? t.mark : t.card.element);
},
loot:function(c,t){
	if (c.owner == t.owner && !c.hasactive("turnstart", "salvageoff")){
		var foe = c.owner.foe, perms = foe.permanents.filter(function(x){return x && x.isMaterial()});
		if (foe.weapon && foe.weapon.isMaterial()) perms.push(foe.weapon);
		if (foe.shield && foe.shield.isMaterial()) perms.push(foe.shield);
		if (perms.length){
			Effect.mkText("Looted", c);
			Skills.steal.func(c, foe.choose(perms));
			c.addactive("turnstart", Skills.salvageoff);
		}
	}
},
losecharge:function(c,t){
	if(!c.status.maybeDecr("charges")){
		if (c.type == etg.Creature) c.die();
		else c.remove();
	}
},
luciferin:function(c,t){
	c.owner.dmg(-10);
	c.owner.masscc(c, function(c,x){
		for (var key in x.active){
			if (key != "ownplay" && key != "owndiscard" && !x.active[key].name.every(function(name){return parseSkill(name).passive})) return;
		}
		x.addactive("auto", Skills.light);
	});
},
lycanthropy:function(c,t){
	Effect.mkText("5|5", c);
	c.buffhp(5);
	c.atk += 5;
	delete c.active.cast;
	c.status.set("nocturnal", 1);
},
martyr:function(c,t, dmg){
	if (dmg>0) c.atk += dmg;
},
mend:function(c,t){
	t.dmg(-10);
},
metamorph:function(c,t){
	c.owner.mark = t.type == etg.Player ? t.mark : t.card.element;
	c.owner.markpower++;
},
midas:function(c,t){
	if (t.status.get("stackable") && t.status.get("charges") > 1){
		Skills.destroy.func(c, t, true);
		var relic = new Thing(t.card.as(Cards.GoldenRelic));
		relic.usedactive = false;
		c.owner.addPerm(relic);
	}else{
		t.status.clear();
		t.transform(t.card.as(Cards.GoldenRelic));
		t.atk = t.maxhp = t.hp = 1;
	}
},
millpillar:function(c,t){
	if (t.deck.length && t.deck[t.deck.length-1].type == etg.Pillar) t.deck.length--;
},
mimic:function(c,t){
	if (c != t && t.type == etg.Creature) {
		c.transform(t.card);
		c.addactive("play", Skills.mimic);
	}
},
miracle:function(c,t){
	c.owner.quanta[etg.Light] = 0;
	if (c.owner.sosa){
		c.owner.hp = 1;
	}else if (c.owner.hp<c.owner.maxhp){
		c.owner.hp = c.owner.maxhp-1;
	}
},
mitosis:function(c,t){
	c.card.play(c.owner, c, t);
},
mitosisspell:function(c,t){
	t.active.cast = Skills.mitosis;
	t.castele = t.card.costele;
	t.cast = t.card.cost;
	t.buffhp(1);
},
momentum:function(c,t){
	Effect.mkText("Momentum", t);
	t.atk += 1;
	t.buffhp(1);
	t.status.set("momentum", 1);
},
mummy:function(c,t,data){
	if (data.tgt == c && data.active == Skills.rewind){
		c.transform(c.card.as(Cards.Pharaoh));
		data.evade = true;
	}
},
mutant:function(c,t){
	if (!c.mutantactive()){
		c.active.cast = Skills.web;
		c.cast = c.owner.upto(2)+1;
	}
	c.castele = c.owner.upto(13);
	c.status.set("mutant", 1);
},
mutation:function(c,t){
	var rnd = c.rng();
	if (rnd<.1){
		Effect.mkText("Death", t);
		t.die();
	}else if (rnd<.5){
		Skills.improve.func(c, t);
	}else{
		Effect.mkText("Abomination", t);
		t.transform(Cards.Abomination.asShiny(t.card.shiny));
	}
},
neuro:adrenathrottle(function(c,t){
	t.addpoison(1);
	t.status.set("neuro", 1);
}),
neuroify:function(c,t){
	if (t.status.get("poison") > 0){
		t.status.set("neuro", 1);
	}
},
nightmare:function(c,t){
	if (!c.owner.foe.sanctuary){
		Effect.mkText("Nightmare", t);
		c.owner.dmg(-c.owner.foe.spelldmg(16-c.owner.foe.hand.length*2));
		for(var i = c.owner.foe.hand.length; i<8; i++){
			c.owner.foe.addCard(t.card);
		}
	}
},
nightshade:function(c,t){
	Skills.lycanthropy.func(t);
},
nova:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.spend(i, -1);
	}
	c.owner.nova += 2;
	if (c.owner.nova >= 6){
		c.owner.addCrea(new Thing(Cards.Singularity.asShiny(c.card.shiny)));
	}
},
nova2:function(c,t){
	for (var i=1; i<13; i++){
		c.owner.spend(i, -2);
	}
	c.owner.nova += 3;
	if (c.owner.nova >= 6){
		c.owner.addCrea(new Thing(Cards.Singularity.asUpped(true).asShiny(c.card.shiny)));
	}
},
nullspell:function(c,t){
	if (!c.hasactive("prespell", "eatspell")){
		c.addactive("prespell", Skills.eatspell);
		c.addactive("turnstart", Skills.noeatspell);
	}
},
eatspell:function(c,t, data){
	if (t.type == etg.Spell){
		Skills["growth 1"].func(c);
		c.rmactive("prespell", "eatspell");
		data.evade = true;
	}
},
noeatspell:function(c,t){
	if (t == c.owner){
		c.rmactive("prespell", "eatspell");
	}
},
nymph:function(c,t){
	Effect.mkText("Nymph", t);
	var e = t.card.element || (
		t.active.auto == Skills.pillmat ? c.choose([etg.Earth, etg.Fire, etg.Water, etg.Air]) :
		t.active.auto == Skills.pillspi ? c.choose([etg.Death, etg.Life, etg.Light, etg.Darkness]) :
		t.active.auto == Skills.pillcar ? c.choose([etg.Entropy, etg.Gravity, etg.Time, etg.Aether]) :
		c.owner.upto(12)+1);
	Skills.destroy.func(c, t, true, true);
	t.owner.addCrea(new Thing(t.card.as(Cards.Codes[etg.NymphList[e]])));
},
obsession:function(c,t){
	c.owner.spelldmg(c.card.upped?10:8);
},
ouija:function(c,t){
	if(!c.owner.foe.sanctuary && c.owner.foe.hand.length<8){
		c.owner.foe.addCard(Cards.OuijaEssence);
	}
},
overdrive:function(c,t){
	Effect.mkText("3|-1", c);
	c.atk += 3;
	c.dmg(1, true);
},
overdrivespell:function(c,t){
	t.lobo();
	t.active.auto = Skills.overdrive;
},
pacify:function(c,t){
	t.atk -= t.trueatk();
},
pairproduce:function(c,t){
	c.owner.permanents.forEach(function(p){
		if (p && p.card.type == etg.Pillar) p.trigger("auto");
	});
},
paleomagnetism:function(c,t){
	var e = c.owner.upto(58);
	c.owner.addPerm(new Thing(c.card.as(Cards.Codes[e >= 29 ? etg.PillarList[c.owner.mark] : e >= 26 ? 5012+e : e >= 13 ? etg.PendList[e-13] : etg.PillarList[e]])));
},
pandemonium:function(c,t){
	c.owner.foe.masscc(c, Skills.cseed.func, true);
},
pandemonium2:function(c,t){
	t.masscc(c, Skills.cseed.func);
},
pandemonium3:function(c,t){
	function cs2(x){
		if (x) { Skills.cseed2.func(c, x) }
	}
	for(var i=0; i<2; i++){
		var pl = i ? c.owner.foe : c.owner;
		pl.creatures.forEach(cs2);
		pl.permanents.forEach(cs2);
		cs2(pl.weapon);
		cs2(pl.shield);
		pl.hand.forEach(cs2);
		cs2(pl);
	}
},
paradox:function(c,t){
	Effect.mkText("Paradox", t);
	t.die();
},
parallel:function(c,t){
	Effect.mkText("Parallel", t);
	if (t.card.isOf(Cards.Chimera)){
		Skills.chimera.func(c, t);
		return;
	}
	var copy = t.clone(c.owner);
	c.owner.addCrea(copy);
	if (copy.status.get("mutant")){
		var buff = c.owner.upto(25);
		copy.buffhp(Math.floor(buff/5));
		copy.atk += buff%5;
		copy.mutantactive();
	}
	if (copy.status.get("voodoo")){
		c.owner.foe.dmg(copy.maxhp-copy.hp);
		var poison = copy.status.get("poison");
		if (poison) c.owner.foe.addpoison(poison);
		if (c.owner.foe.weapon){
			var delayed = copy.status.get("delayed");
			var frozen = copy.status.get("frozen");
			if (delayed) c.owner.foe.delay(delayed);
			if (frozen) c.owner.foe.freeze(frozen);
		}
	}
},
phoenix:function(c,t, data){
	if (!c.owner.creatures[data.index]){
		var ash =c.owner.creatures[data.index] = new Thing(c.card.as(Cards.Ash));
		ash.owner = c.owner;
		ash.type = etg.Creature;
	}
},
photosynthesis:function(c,t){
	Effect.mkText("2:5", c);
	c.owner.spend(etg.Life, -2);
	if (c.cast > 0){
		c.usedactive = false;
	}
},
plague:function(c,t){
	t.masscc(c, Skills.infect.func);
},
platearmor:function(c,t){
	var buff = c.card.upped?6:4;
	Effect.mkText("0|"+buff, t);
	t.buffhp(buff);
},
poison:function(x){
	var n = parseInt(x);
	return adrenathrottle(function(c,t){
		(t || c.owner.foe).addpoison(n);
	});
},
poisonfoe:function(c){
	if (c.rng() < .7) c.owner.foe.addpoison(1);
},
powerdrain:function(c,t){
	var ti = [];
	for(var i=0; i<23; i++){
		if (c.owner.creatures[i]) ti.push(i);
	}
	if (!ti.length)return;
	var tgt = c.owner.creatures[c.choose(ti)], halfatk = Math.floor(t.trueatk()/2), halfhp = Math.floor(t.truehp()/2);
	t.atk -= halfatk;
	t.buffhp(-halfhp);
	tgt.atk += halfatk;
	tgt.buffhp(halfhp);
},
precognition:function(c,t){
	c.owner.drawcard();
	c.owner.precognition = true;
},
predator:function(c,t){
	var fhand = c.owner.foe.hand;
	if (fhand.length > 4 && !c.hasactive("turnstart", "predatoroff")){
		c.addactive("turnstart", Skills.predatoroff);
		c.attack(false, 0);
		if (fhand.length) Skills.destroycard.func(c, fhand[fhand.length-1]);
	}
},
predatoroff:function(c,t){
	c.rmactive("turnstart", "predatoroff");
},
protectall:function(c,t){
	function protect(p){
		if (p && p.isMaterial()){
			p.addactive("prespell", Skills.protectonce);
			p.addactive("spelldmg", Skills.protectoncedmg);
		}
	}
	c.owner.creatures.forEach(protect);
	c.owner.permanents.forEach(protect);
},
protectonce:function(c,t, data){
	if (data.tgt == c && c.owner != t.owner){
		c.rmactive("prespell", "protectonce");
		c.rmactive("spelldmg", "protectoncedmg");
		data.evade = true;
	}
},
protectoncedmg:function(c,t){
	c.rmactive("prespell", "protectonce");
	c.rmactive("spelldmg", "protectoncedmg");
	return true;
},
purify:function(c,t){
	var poison = t.status.get("poison");
	t.status.set("poison", poison<0 ? poison-2 : -2);
	t.status.set("aflatoxin", 0);
	t.status.set("neuro", 0);
	if (t.type == etg.Player) t.sosa = 0;
},
quint:function(c,t){
	Effect.mkText("Immaterial", t);
	t.status.set("immaterial", 1);
	t.status.set("frozen", 0);
},
quinttog:function(c,t){
	if (t.status.immaterial){
		Effect.mkText("Materialize", t);
		t.status.set("immaterial", 0);
	}else Skills.quint.func(c,t);
},
randomdr:function(c, t){
	if (c==t)
		c.maxhp = c.hp = c.owner.upto(c.card.upped?4:3);
},
rage:function(c,t){
	var dmg = c.card.upped?6:5;
	Effect.mkText(dmg+"|-"+dmg, t);
	t.atk += dmg;
	t.spelldmg(dmg);
	t.status.set("frozen", 0);
},
readiness:function(c,t){
	Effect.mkText("Ready", t);
	if (t.active.cast){
		t.cast = 0;
		t.usedactive = false;
	}
},
reap:function(c,t){
	if (t.card.isOf(Cards.Skeleton)) return;
	var atk = t.trueatk(), hp = t.truehp();
	var index = t.getIndex();
	t.die();
	if (!t.owner.creatures[index] || t.owner.creatures[index].card != Cards.MalignantCell){
		var skele = t.owner.creatures[index] = new Thing(t.card.as(Cards.Skeleton));
		skele.owner = t.owner;
		skele.type = etg.Creature;
		skele.atk = atk;
		skele.maxhp = skele.hp = hp;
	}
},
rebirth:function(c,t){
	c.transform(c.card.as(Cards.Phoenix));
},
reducemaxhp:function(c,t, dmg){
	t.maxhp = Math.max(t.maxhp-dmg, 1);
	if (t.maxhp > 500 && t.type == etg.Player) t.maxhp = 500;
	if (t.hp > t.maxhp) t.dmg(t.hp-t.maxhp);
},
regen:adrenathrottle(function(c,t){
	c.owner.status.incr("poison", -1);
}),
regenerate:function(c,t){
	Effect.mkText("+5", c);
	c.owner.dmg(-5);
},
regeneratespell:function(c,t){
	t.lobo();
	t.active.auto = Skills.regenerate;
	if (t.type == etg.Permanent || t.type == etg.Shield){
		t.status.clear();
	}
},
regrade:function(c,t){
	t.transform(t.card.asUpped(!t.card.upped));
	c.owner.spend(t.card.element, -1);
},
reinforce:function(c,t){
	var atk = c.trueatk(), hp = c.truehp()
	Effect.mkText(atk+"|"+hp, t);
	t.atk += atk;
	t.buffhp(hp);
	c.remove();
},
ren:function(c,t){
	if (!t.hasactive("predeath", "bounce")){
		Effect.mkText("Ren", t);
		t.addactive("predeath", Skills.bounce);
	}
},
resetcap:function(c,t){
	c.status.set("chargecap", 0);
},
reveal:function(c,t){
	c.owner.precognition = true;
},
rewind:function(c,t){
	Effect.mkText("Rewind", t);
	t.remove();
	t.owner.deck.push(t.card);
},
ricochet:function(c,t, data){
	if (t.type != etg.Spell) return;
	var tgting = Cards.Targeting[data.active.name[0]];
	function tgttest(x){
		if (x) {
			if (tgting(t.owner, x)) tgts.push([x, t.owner]);
			if (tgting(t.owner.foe, x)) tgts.push([x, t.owner.foe]);
		}
	}
	if (tgting){
		var tgts = [];
		for(var i=0; i<2; i++){
			var pl=i==0?c.owner:c.owner.foe;
			pl.forEach(tgttest, true);
		}
		if (tgts.length){
			var tgt = c.choose(tgts), town = t.owner;
			t.owner = tgt[1];
			t.castSpell(tgt[0], data.active, true);
			t.owner = town;
		}
	}
},
sadism:function(c, t, dmg){
	if (dmg > 0 && (!c.card.upped || c.owner == t.owner)){
		c.owner.dmg(-dmg);
	}
},
salvage:function(c, t, data){
	Skills["growth 1"].func(c);
	if (!data.salvaged && !c.hasactive("turnstart", "salvageoff") && c.owner.game.turn != c.owner){
		Effect.mkText("Salvage", c);
		data.salvaged = true;
		c.owner.addCard(t.card);
		c.addactive("turnstart", Skills.salvageoff);
	}
},
salvageoff:function(c, t){
	c.rmactive("turnstart", "salvageoff");
},
sanctify:function(c,t){
	c.owner.sanctuary = true;
},
unsanctify:function(c,t){
	c.owner.foe.sanctuary = false;
},
scatterhand:function(c,t){
	if (!t.sanctuary){
		t.drawhand(t.hand.length);
		c.owner.drawcard();
	}
},
scramble:function(c,t){
	if (t.type == etg.Player && !t.sanctuary){
		for (var i=0; i<9; i++){
			if (t.spend(etg.Chroma, 1)){
				t.spend(etg.Chroma, -1);
			}
		}
	}
},
serendipity:function(c){
	var num = Math.min(8-c.owner.hand.length, 3), anyentro = false;
	for(var i=num-1; ~i; i--){
		var card = c.randomcard(c.card.upped, function(x){return x.type != etg.Pillar && x.rarity < 4 && (i>0 || anyentro || x.element == etg.Entropy)});
		anyentro |= card.element == etg.Entropy;
		c.owner.addCard(card.asShiny(c.card.shiny));
	}
},
shardgolem:function(c,t){
	if (!c.maxhp){
		var golem = c.owner.shardgolem || { stat: 1, cast: 0 };
		c.cast = golem.cast;
		c.castele = etg.Earth;
		c.atk = c.maxhp = c.hp = golem.stat;
		c.status = golem.status.clone();
		c.active = util.clone(golem.active);
	}
},
shtriga:function(c,t){
	if (c.owner == t) c.status.set("immaterial", 1);
},
silence:function(c,t){
	if (t.type != etg.Player || !t.sanctuary) t.usedactive = true;
},
singularity:function(c,t){
	if (c.trueatk() > 0){
		Skills.antimatter.func(c, c);
		return;
	}
	var r = c.rng();
	if (r > .9){
		c.status.set("adrenaline", 1);
	}else if (r > .8){
		c.active.hit = Skills.vampire;
	}else if (r > .7){
		Skills.quint.func(c, c);
	}else if (r > .6){
		Skills.scramble.func(c, c.owner);
	}else if (r > .5){
		Skills.blackhole.func(c.owner.foe, c.owner);
	}else if (r > .4){
		var buff = c.owner.upto(25);
		c.buffhp(Math.floor(buff/5)+1);
		c.atk -= buff%5+1;
	}else if (r > .3){
		Skills.nova.func(c.owner.foe);
		c.owner.foe.nova = 0;
	}else if (r > .2){
		Skills.parallel.func(c, c);
	}else if (r > .1){
		c.owner.setWeapon(new Thing(Cards.Dagger.asShiny(c.card.shiny)));
	}
},
sing:function(c,t){
	t.attack(false, 0, t.owner);
},
sinkhole:function(c,t){
	Effect.mkText("Sinkhole", t);
	t.status.set("burrowed", 1);
	t.status.set("airborne", 0);
	t.lobo();
	t.active.cast = Skills.unburrow;
	t.cast = c.card.upped?2:1;
	t.castele = etg.Earth;
	t.usedactive = true;
},
siphon:adrenathrottle(function(c, t) {
	if (!c.owner.foe.sanctuary && c.owner.foe.spend(etg.Chroma, 1)) {
		Effect.mkText("1:11", c);
		c.owner.spend(etg.Darkness, -1);
	}
}),
siphonactive:function(c,t){
	Effect.mkText("Siphon", t);
	c.lobo();
	//TODO handle multiple actives
	for(var key in t.active){
		if (!t.active[key].passive) c.active[key] = t.active[key];
	}
	c.cast = t.cast;
	c.castele = t.castele;
	t.lobo();
},
siphonstrength:function(c,t){
	Effect.mkText("+1|0", c);
	Effect.mkText("-1|0", t);
	t.atk--;
	c.atk++;
},
skeleton:function(c,t,data){
	if (data.tgt == c && data.active == Skills.rewind){
		Skills.hatch.func(c);
		data.evade = true;
	}
},
skyblitz:function(c,t){
	c.owner.quanta[etg.Air] = 0;
	c.owner.creatures.forEach(function(cr){
		if (cr && cr.status.get("airborne")){
			Effect.mkText("Dive", cr);
			cr.status.incr("dive", cr.trueatk());
		}
	});
},
snipe:function(c,t){
	Effect.mkText("-3", t);
	t.dmg(3);
},
sosa:function(c,t){
	c.owner.sosa = 2;
	for(var i=1; i<13; i++){
		if (i != etg.Death){
			c.owner.quanta[i] = 0;
		}
	}
	var n = c.card.upped?40:48;
	c.owner.dmg(Math.max(Math.ceil(c.owner.maxhp*n/100), n), true);
},
soulcatch:function(c,t){
	Effect.mkText("Soul", c);
	c.owner.spend(etg.Death, -3);
},
spores:function(c,t){
	var spore = c.card.as(Cards.Spore);
	c.owner.addCrea(new Thing(spore));
	c.owner.addCrea(new Thing(spore));
},
sskin:function(c,t){
	c.owner.buffhp(c.owner.quanta[etg.Earth]);
},
staff:function(c,t){
	return c.owner.mark == etg.Life||c.owner.mark == etg.Water?1:0;
},
static:function(c){
	c.owner.foe.spelldmg(1);
},
steal:function(c,t){
	if (t.status.get("stackable")){
		Skills.destroy.func(c, t, true);
		if (t.type == etg.Shield){
			if (c.owner.shield && c.owner.shield.card == t.card){
				c.owner.shield.status.incr("charges", 1);
			}else{
				c.owner.setShield(new Thing(t.card));
				c.owner.shield.status.set("charges", 1);
			}
		}else if (t.type == etg.Weapon){
			if (c.owner.weapon && c.owner.weapon.card == t.card){
				c.owner.weapon.status.incr("charges", 1);
			}else{
				c.owner.setWeapon(new Thing(t.card));
				c.owner.weapon.status.set("charges", 1);
			}
		}else{
			c.owner.addPerm(new Thing(t.card));
		}
	}else{
		t.remove();
		t.usedactive = true;
		if (t.type == etg.Permanent) c.owner.addPerm(t);
		else if (t.type == etg.Weapon) c.owner.setWeapon(t);
		else c.owner.setShield(t);
	}
},
steam:function(c,t){
	Effect.mkText("5|0", c);
	c.status.incr("steam", 5);
	c.atk += 5;
	if (!c.hasactive("postauto", "decrsteam")) c.addactive("postauto", Skills.decrsteam);
},
stoneform:function(c,t){
	Effect.mkText("0|20", c);
	c.buffhp(20);
	delete c.active.cast;
	c.status.set("golem", 1);
},
storm:function(x){
	var n = parseInt(x);
	return function(c,t){
		t.masscc(c, function(c,x){x.spelldmg(n)});
	}
},
summon:function(name){
	return function(c,t){
		c.owner.addCrea(new Thing(c.card.as(Cards[name])));
	}
},
swarm:function(c,t){
	return c.owner.creatures.reduce(function(hp, cr){
		return cr && cr.active.hp == Skills.swarm ? hp+1 : hp;
	}, 0);
},
swave:function(c,t){
	if (t.status.get("frozen")){
		Effect.mkText("Death", t);
		t.die();
	}else{
		if (t.type == etg.Player && t.weapon && t.weapon.status.get("frozen")){
			Skills.destroy.func(c, t.weapon);
		}
		Effect.mkText("-4", t);
		t.spelldmg(4);
	}
},
tempering:function(c,t){
	var atk = c.card.upped?5:3;
	Effect.mkText(atk+"|0", t);
	t.atk += atk;
	t.status.set("frozen", 0);
},
tesseractsummon:function(c,t){
	for(var i=0; i<(c.card.upped?1:2); i++){
		var pl = i?c.owner.foe:c.owner;
		var candidates = [];
		for(var j=0; j<pl.deck.length; j++){
			if (pl.deck[j].type == etg.Creature) candidates.push(j);
		}
		if (candidates.length){
			var idx = pl.choose(candidates), crcard = pl.deck.splice(idx, 1)[0], cr = new Thing(crcard);
			pl.addCrea(cr);
			cr.freeze(Math.ceil(crcard.cost/4));
		}
	}
},
throwrock:function(c,t){
	var dmg = c.card.upped?4:3;
	Effect.mkText("-"+dmg, t);
	t.dmg(dmg);
	t.owner.deck.splice(c.owner.upto(t.owner.deck.length), 0, c.card.as(Cards.ThrowRock));
},
tick:function(c,t){
	c.dmg(c.card.upped?3:1);
	if (c.hp <= 0) {
		if (c.card.upped) c.owner.foe.masscc(c, function(c,x){ x.dmg(4) });
		else c.owner.foe.spelldmg(18);
	}
},
tidalhealing:function(c,t){
	c.owner.masscc(c, function(c, t){
		if (t.status.get("poison") > 0) t.status.set("poison", 0);
		if (t.status.get("frozen")) t.status.set("frozen", 0);
		if (t.status.get("aquatic") && !t.hasactive("hit", "regen")) t.addactive("hit", Skills.regen);
	});
},
tornado:function(c,t){
	var pl = c.owner.foe;
	for(var i=0; i<3; i++){
		if (i == 2){
			if (c.card.upped) return;
			else pl = c.owner;
		}
		var perms = pl.permanents.filter(function(x){return x && x.isMaterial()});
		if (pl.weapon && pl.weapon.isMaterial()) perms.push(pl.weapon);
		if (pl.shield && pl.shield.isMaterial()) perms.push(pl.shield);
		if (perms.length){
			var pr = pl.choose(perms);
			var newpl = pl.upto(2) ? pl : pl.foe;
			newpl.deck.splice(newpl.upto(newpl.deck.length), 0, pr.card);
			Effect.mkText("Shuffled", pr);
			Skills.destroy.func(c, pr, true, true);
		}
	}
},
trick:function(c,t){
	var cards = [];
	t.owner.deck.forEach(function(card, i){
		if (card.type == etg.Creature && card.asShiny(false) != t.card.asShiny(false)){
			cards.push(i);
		}
	});
	if (cards.length){
		var pick = t.choose(cards);
		t.owner.setCrea(t.getIndex(), new Thing(t.owner.deck[pick]));
		t.owner.deck[pick] = t.card;
	}
},
turngolem:function(c,t){
	c.remove();
	var storedpower = c.status.get("storedpower");
	c.atk = Math.floor(storedpower / 3);
	c.maxhp = c.hp = storedpower;
	c.status.set("storedpower", 0);
	delete c.active.cast;
	c.owner.addCrea(c);
	c.owner.gpull = c;
},
unappease:function(c,t){
	c.status.set("appeased", 0);
},
unburrow:function(c,t){
	c.status.set("burrowed", 0);
	c.active.cast = Skills.burrow;
	c.cast = 1;
},
unsummon:function(c,t){
	if (t.owner.hand.length < 8){
		t.remove();
		t.owner.addCard(t.card);
	}else{
		Skills.rewind.func(c, t);
	}
},
upkeep:function(c,t){
	if (!c.owner.spend(c.card.element, 1)) c.die();
},
upload:function(c,t){
	Effect.mkText("2|0", t);
	t.atk += c.dmg(2);
},
vampire:function(c,t, dmg){
	c.owner.dmg(-dmg);
},
vend:function(c){
	c.owner.drawcard();
	c.die();
},
vengeance:function(c,t){
	if (c.owner == t.owner && c.owner == c.owner.game.turn.foe){
		if (c.status.maybeDecr("charges") < 2) c.remove();
		c.owner.creatures.forEach(function(cr){
			if (cr && cr != t){
				cr.attack(false, 0);
			}
		});
	}
},
vindicate:function(c,t, data){
	if (c.owner == t.owner && !c.status.get("vindicated") && !data.vindicated){
		c.status.set("vindicated", 1);
		data.vindicated = true;
		t.attack(false, 0);
	}
},
unvindicate:function(c,t){
	c.status.set("vindicated", 0);
},
virtue:function(c,t,blocked){
	c.owner.buffhp(blocked);
},
virusinfect:function(c,t){
	c.die();
	Skills.infect.func(c, t);
},
virusplague:function(c,t){
	c.die();
	Skills.plague.func(c, t);
},
void:function(c,t){
	c.owner.foe.maxhp = Math.max(c.owner.foe.maxhp-3, 1);
	if (c.owner.foe.hp > c.owner.foe.maxhp){
		c.owner.foe.hp = c.owner.foe.maxhp;
	}
},
voidshell:function(c,t, dmg){
	c.owner.maxhp -= dmg;
	if (c.owner.maxhp < 1){
		c.owner.maxhp = 1;
		c.remove();
	}
	if (c.owner.hp > c.owner.maxhp){
		c.owner.hp = c.owner.maxhp;
	}
	return true;
},
quantagift:function(c,t){
	if (c.owner.mark != etg.Water){
		c.owner.spend(etg.Water, -2);
		c.owner.spend(c.owner.mark, c.owner.mark ? -2 : -6);
	}else c.owner.spend(etg.Water, -3);
},
web:function(c,t){
	Effect.mkText("Web", t);
	t.status.set("airborne", 0);
},
wind:function(c,t){
	c.atk += c.status.get("storedAtk");
	c.status.set("storedAtk", 0);
},
wisdom:function(c,t){
	Effect.mkText("3|0", t);
	t.atk += 3;
	if (t.status.get("immaterial")){
		t.status.set("psionic", 1);
	}
},
yoink:function(c,t){
	if (t.type == etg.Player){
		Skills.foedraw.func(c);
	}else if (!t.owner.sanctuary){
		t.remove();
		if (c.owner.hand.length < 8){
			t.owner = c.owner;
			c.owner.hand.push(t);
		}
	}
},
pillar:function(c,t){
	if (!t)
		c.owner.spend(c.card.element, c.status.get("charges") * (c.card.element > 0 ? -1 : -3));
	else if (c == t)
		c.owner.spend(c.card.element, (c.card.element > 0 ? -1 : -3))
},
pend:function(c,t){
	var pendstate = c.status.get("pendstate");
	var ele = pendstate ? c.owner.mark : c.card.element;
	c.owner.spend(ele, c.status.get("charges") * (ele > 0 ? -1 : -3));
	c.status.set("pendstate", pendstate?0:1);
},
pillmat:quadpillarFactory(18041), //4,6,7,9
pillspi:quadpillarFactory(9611), //2,5,8,11
pillcar:quadpillarFactory(5036), //1,3,10,12
absorbdmg:function(c,t, dmg, blocked){
	c.status.incr("storedpower", blocked);
},
absorber:function(c,t){
	c.owner.spend(etg.Fire, -3);
},
blockwithcharge:function(c,t){
	if (c.status.maybeDecr("charges") < 2){
		c.die();
	}
	return true;
},
chaos:function(c,t){
	var randomchance = c.rng();
	if (randomchance < .3) {
		if (t.type == etg.Creature && !t.status.get("ranged")){
			Skills.cseed.func(c, t);
		}
	}else return c.card.upped && randomchance < .5;
},
cold:function(c,t){
	if (!t.status.get("ranged") && c.rng()<.3){
		t.freeze(3);
	}
},
despair:function(c,t){
	if (!t.status.get("ranged")){
		var chance = c.owner.creatures.reduce(function(chance, cr){
			return cr && cr.hasactive("auto", "siphon") ? chance+1 : chance;
		}, 0);
		if (c.rng() < 1.4-Math.pow(.95, chance)){
			Effect.mkText("-1|-1", t);
			t.atk--;
			t.dmg(1);
		}
	}
},
evade100:function(c,t){
	return true;
},
evade:function(x){
	var n = parseInt(x)/100;
	return function(c){
		return c.rng() < n;
	};
},
evadespell:function(c,t, data){
	if (data.tgt == c && c.owner != t.owner && t.type == etg.Spell) data.evade = true;
},
evadecrea:function(c,t, data){
	if (data.tgt == c && c.owner != t.owner && t.type == etg.Spell) data.evade = true;
},
firewall:function(c,t){
	if (!t.status.get("ranged")){
		Effect.mkText("-1", t);
		t.dmg(1);
	}
},
skull:function(c,t){
	if (t.type == etg.Creature && !t.card.isOf(Cards.Skeleton)) {
		var thp = t.truehp();
		if (thp <= 0 || c.rng() < .5/thp){
			var index = t.getIndex();
			t.die();
			if (!t.owner.creatures[index] || t.owner.creatures[index].card != Cards.MalignantCell){
				var skele = t.owner.creatures[index] = new Thing(t.card.as(Cards.Skeleton));
				skele.owner = t.owner;
				skele.type = etg.Creature;
			}
		}
	}
},
slow:function(c,t){
	if (!t.status.get("ranged")) t.delay(2);
},
solar:function(c,t){
	c.owner.spend(etg.Light, -1);
},
thorn:function(c,t){
	if (!t.status.get("ranged") && c.rng() < .75){
		t.addpoison(1);
	}
},
thornweak:function(c,t){
	if (!t.status.get("ranged") && c.rng() < .25){
		t.addpoison(1);
	}
},
weight:function(c,t){
	return t.type == etg.Creature && t.truehp()>5;
},
wings:function(c,t){
	return !t.status.get("airborne") && !t.status.get("ranged");
},
};
for(var key in Skills){
	Skills[key] = {name: [key], func:Skills[key]};
}
Skills.abomination.passive=
Skills.becomearctic.passive=
Skills.beguilestop.passive=
Skills.bounce.passive=
Skills.cell.passive=
Skills.counter.passive=
Skills.decrsteam.passive=
Skills.deepdiveproc.passive=
Skills.deepdiveproc2.passive=
Skills.dshieldoff.passive=
Skills.elf.passive=
Skills.firebrand.passive=
Skills.hitownertwice.passive=
Skills.mummy.passive=
Skills.obsession.passive=
Skills.predatoroff.passive=
Skills.protectonce.passive=
Skills.protectoncedmg.passive=
Skills.salvage.passive=
Skills.skeleton.passive=
Skills.swarm.passive=
Skills.virtue.passive=true;
var etg = require("./etg");
var util = require("./util");
var Cards = require("./Cards");
var Thing = require("./Thing");
var Effect = require("./Effect");
var Status = require("./Status");
var parseSkill = require("./parseSkill");
