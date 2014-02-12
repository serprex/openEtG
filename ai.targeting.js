function evalPickTarget(c, active, targeting){
	var eval = ActivesEval[active.activename];
	if (!eval)return;
	var candidates = [0];
	function evalIter(t){
		if (t && targeting(t)){
			var v = eval(c, t);
			console.log("\t" + c.card.name+ "\t" + (t.owner == c.owner) + (t instanceof Player || t.card.name) + ": "+v);
			if (v){
				if (v>candidates[0]){
					candidates = [v, t];
				}else if(v == candidates[0]){
					candidates.push(t);
				}
			}
		}
	}
	for(var j=0; j<2; j++){
		var pl = j==0?c.owner:c.owner.foe;
		evalIter(pl);
		evalIter(pl.weapon);
		evalIter(pl.shield);
		for(var i=0; i<23; i++){
			evalIter(pl.creatures[i]);
		}
		for(var i=0; i<16; i++){
			evalIter(pl.permanents[i]);
		}
		for(var i=0; i<pl.hand.length; i++){
			evalIter(pl.hand[i]);
		}
	}
	if (candidates.length > 1){
		return candidates[1+Math.floor(Math.random()*(candidates.length-1))];
	}
}
function ActivesEvalMassCC(c,t){
	if (c.owner == t)return false;
	var a=0;
	for (var i=0; i<23; i++){
		var cr = c.owner.foe.creatures[i];
		if (cr && !cr.status.burrowed && !cr.status.immaterial)a++;
	}
	return a>2;
}
function ActivesEvalFlatCC(c,t, dmg){
	return c.owner != t.owner && (t instanceof Player?t.hp < 10 && 99:t.trueatk()/(Math.ceil(t.truehp()/dmg) || 5));
}
var ActivesEval = {
ablaze:function(c,t){
	return true;
},
accelerationspell:function(c,t){
	return c.owner == t.owner && !t.hasactive("auto", "acceleration") && t.truehp();
},
accretion:function(c,t){
	return c.owner != t.owner && t.card.cost+1;
},
adrenaline:function(c,t){
	var atk = t.trueatk();
	return c.owner == t.owner && !t.status.adrenaline && atk>0 && atk<15 && [0, 3, 6, 9, 5, 6, 6, 8, 9, 3, 4, 4, 4, 5, 5, 5][atk];
},
aflatoxin:function(c,t){
	return c.owner != t.owner && 20-t.truehp();
},
aggroskele:function(c,t){
	if (c.owner == t.owner)return false;
	var dmg = 0;
	for (var i=0; i<23; i++){
		if (c.owner.creatures[i] && c.owner.creatures[i].card.isOf(Cards.Skeleton)){
			dmg += c.owner.creatures[i].trueatk();
		}
	}
	return dmg>t.truehp()?t.trueatk():-1;
},
antimatter:function(c,t){
	return c.owner != t.owner && t.trueatk(0, true);
},
bblood:function(c,t){
	return c.owner != t.owner && !t.status.delayed && t.trueatk();
},
blackhole:function(c,t){
	if (c.owner == t || t.sanctuary)return false;
	var sum;
	for(var i=1; i<13; i++){
		sum += t.quanta[i];
	}
	return sum>3;
},
bless:function(c,t){
	return c.owner == t.owner && (t.truehp() == 0 || (t.active.hit && t.trueatk() == 0) ?99:t.trueatk()/t.truehp())
},
bravery:function(c,t){
	return c.owner.hand.length < 6 && c.owner.foe.hand.length < 7;
},
burrow:function(c,t){
	return (c.truehp()<3 && !c.status.poison) || c.trueatk()<2;
},
butterfly:function(c,t){
	return c.owner == t.owner && t.active.cast != Actives.destroy && (t.active.cast?t.cast:10)+t.truehp();
},
catapult:function(c,t){
	return t.truehp() > 10 && Math.ceil(t.truehp()*(t.frozen?150:100)/(t.truehp()+100))+(t.status.poison || 0)-t.trueatk();
},
chimera:function(c,t){
	if (c.owner.hp<10){
		return true;
	}
	var atk=0;
	for(var i=0; i<23; i++){
		if (c.owner.creatures[i]){
			atk += c.owner.creatures[i].trueatk();
		}
	}
	return atk >= c.owner.foe.hp;
},
clear:function(c,t){
	return c.owner != t.owner? (c.owner.shield && t.status.momentum) || t.status.adrenaline : t.status.delayed || t.status.frozen || t.status.poison>0;
},
corpseexplosion:function(c,t){
	return t.trueatk()<3 && (t.status.poison || 0) + (t.passives.poisonous?5:3) - t.card.cost;
},
cpower:function(c,t){
	return c.owner == t.owner && (t.truehp() == 0 || (t.active.hit && t.trueatk() == 0)?99:t.trueatk()/t.truehp());
},
cseed:function(c,t){
	var atk;
	return c.owner != t.owner && (atk=t.trueatk())>-1 && 10-t.truehp()+atk;
},
deadalive:function(c,t){
	return true;
},
deja:function(c,t){
	return true;
},
deployblobs:function(c,t){
	return c.truehp() > 2;
},
destroy:function(c,t, dontsalvage){
	return c.owner != t.owner && t.card.cost;
},
destroycard:function(c,t){
	return c.owner != t.owner && !t.owner.sanctuary;
},
devour:function(c,t){
	return c.owner != t.owner?(3+t.trueatk()-(t.passives.poisonous?2:0)):(!t.passives.poisonous && t.trueatk()<2);
},
die:function(c,t){
	return true;
},
dive:function(c,t){
	return true;
},
divinity:function(c,t){
	return true;
},
drainlife:function(c,t){
	return c.owner != t.owner && t.truehp() <= 2+Math.floor(c.owner.quanta[Darkness]/5) && (t instanceof Player?99:t.trueatk());
},
draft:function(c,t){
	return (c.owner == t.owner) ^ (!!t.passives.airborne);
},
dryspell:ActivesEvalMassCC,
dshield:function(c,t){
	return true;
},
duality:function(c,t){
	return c.owner.hand.length < 7;
},
earthquake:function(c,t){
	return t.status.charges>1;
},
enchant:function(c,t){
	return c.owner == t.owner && t.card.cost;
},
endow:function(c,t){
	return t.trueatk();
},
atk2hp:function(c,t){
	return c.owner == t.owner && t.trueatk()-t.hp;
},
evolve:function(c,t){
	return true;
},
fickle:function(c,t){
	return c.owner == t.owner && !t.canactive();
},
firebolt:function(c,t){
	return c.owner != t.owner && t.truehp() <= 3+Math.floor(c.owner.quanta[Fire]/4) && (t instanceof Player?99:t.trueatk());
},
flatline:function(c,t){
	return !c.owner.foe.sanctuary && !c.owner.foe.flatline;
},
flyingweapon:function(c,t){
	return c.owner == t;
},
fractal:function(c,t){
	return c.owner == t.owner && c.owner.hand.length < 4;
},
freeze:function(c,t){
	return c.owner != t.owner && !t.status.frozen && t.trueatk();
},
fungusrebirth:function(c,t){
	return true;
},
gas:function(c,t){
	return true;
},
give:function(c,t){
	return (t instanceof Shield && c.owner.shield && t.card.cost-c.owner.shield.card.cost) || (t instanceof Weapon && c.owner.weapon && t.card.cost-c.owner.weapon.card.cost);
},
gpull:function(c,t){
	return !c.owner.gpull;
},
gpullspell:function(c,t){
	return c.owner == t.owner && !t.owner.gpull && !(t instanceof Player) && t.truehp();
},
growth:function(c,t){
	return true;
},
guard:function(c,t){
	return c.owner != t.owner && !t.status.delayed && t.trueatk();
},
hasten:function(c,t){
	return c.owner.hand.length < 7 && c.owner.deck.length > 5;
},
hatch:function(c,t){
	return true;
},
heal:function(c,t){
	return c.owner == t.owner && t.hp < t.maxhp;
},
heal20:function(c,t){
	return t == c.owner && c.owner.hp <= c.owner.maxhp-20;
},
holylight:function(c,t){
	return t == c.owner && c.owner.hp <= c.owner.maxhp-10;
},
icebolt:function(c,t){
	return c.owner != t.owner && t.truehp() <= 2+Math.floor(c.owner.quanta[Water]/5) && (t instanceof Player?99:t.trueatk());
},
ignite:function(c,t){
	return true;
},
immolate:function(c,t){
	return t.card.cost < 3 && t.owner.quanta[Fire]<15 && 3 - t.card.cost + t.card.isOf(Cards.Phoenix);
},
improve:function(c,t){
	return c.owner == t.owner && t.card.cost < 4 && t.trueatk()<5;
},
infect:function(c,t){
	return c.owner != t.owner && t.trueatk();
},
ink:function(c,t){
	var perm = c.owner.permanents;
	for(var i=0; i<16; i++){
		if (perm[i] && perm[i].passives.cloak && perm[i].status.charges){
			return false;
		}
	}
	return true;
},
innovation:function(c,t){
	return c.owner == t.owner && t.card.cost > t.owner.quanta[t.card.castele];
},
integrity:function(c,t){
	return true;
},
layegg:function(c,t){
	return true;
},
lightning:function(c,t){ return ActivesEvalFlatCC(c, t, 5); },
liquid:function(c,t){
	var hp;
	return c.owner == t.owner && t.active.hit != Actives.vampire && (hp=t.truehp())>5 && hp*t.trueatk();
},
livingweapon:function(c,t){
	return c.owner == t.owner && (t.truehp()<3 || t.status.poison>0) && t.trueatk();
},
lobotomize:function(c,t){
	return c.owner != t.owner && (!isEmpty(t.active) || t.status.momentum || t.status.psion);
},
luciferin:function(c,t){
	return c.owner.hp <= c.owner.maxhp-10;
},
lycanthropy:function(c,t){
	return true;
},
metamorph:function(c,t){
	return c.owner == t;
},
miracle:function(c,t){
	return c.owner.hp < 30;
},
mitosis:function(c,t){
	return true;
},
mitosisspell:function(c,t){
	return c.owner == t.owner && t.active.cast != Actives.mitosis && t.truehp();
},
momentum:function(c,t){
	return c.owner == t.owner && (t.truehp() == 0 || (t.active.hit && t.trueatk() == 0) ?99:(t.trueatk()-(t.status.momentum?2:0))/t.truehp());
},
mutation:function(c,t){
	return c.owner == t.owner?(t.card.cost<3 && 3-t.card.cost+t.card.isOf(Cards.Abomination)):(t.card.cost>8 && t.trueatk());
},
neuroify:function(c,t){
	return c.owner.foe.status.poison && !c.owner.foe.neuro;
},
nightmare:function(c,t){
	return !c.owner.foe.sanctuary && c.owner.foe.hand.length<8 && c.owner == t.owner && (t.card.isOf(Cards.GhostofthePast) && c.owner.foe.quanta[Time]<t.card.cost?99:t.card.cost-c.owner.foe.quanta[t.card.costele]);
},
nova:function(c,t){
	return c.owner.nova < 2;
},
nova2:function(c,t){
	return c.owner.nova < 1;
},
nymph:function(c,t){
	return c.owner == t.owner;
},
overdrivespell:function(c,t){
	return c.owner == t.owner && !t.hasactive("auto", "overdrive") && t.truehp();
},
pandemonium:ActivesEvalMassCC,
pandemonium2:ActivesEvalMassCC,
paradox:function(c,t){
	return c.owner != t.owner && t.trueatk();
},
parallel:function(c,t){
	return t.card.cost;
},
photosynthesis:function(c,t){
	return true;
},
plague:ActivesEvalMassCC,
platearmor:function(c,t){
	return c.owner == t.owner && 10-t.truehp();
},
poison:function(c,t){
	return true;
},
poison2:function(c,t){
	return true;
},
poison3:function(c,t){
	return true;
},
precognition:function(c,t){
	return true;
},
purify:function(c,t){
	return c.owner == t.owner && t.status.poison>0;
},
queen:function(c,t){
	return true;
},
quint:function(c,t){
	return c.owner == t.owner && t.trueatk();
},
rage:function(c,t){
	var dmg = c.card.upped?6:5;
	return c.owner == t.owner?(t.truehp()>dmg && t.truehp()):(t.truehp()<=dmg && t.trueatk());
},
readiness:function(c,t){
	return c.owner == t.owner && t.active.cast && t.cast;
},
rebirth:function(c,t){
	return true;
},
reinforce:function(c,t){
	return c.owner == t.owner && (t.card.isOf(Cards.GravitonDeployer) || t.card.isOf(Cards.Otyugh));
},
regeneratespell:function(c,t){
	return c.owner == t.owner && isEmpty(t.active);
},
regrade:function(c,t){
	return (c.owner == t.owner) ^ t.card.upped;
},
ren:function(c,t){
	return c.owner == t.owner && !t.hasactive("predeath", "bounce") && t.trueatk();
},
rewind:function(c,t){
	return c.owner != t.owner && t.card.cost;
},
scarab:function(c,t){
	return true;
},
serendipity:function(c,t){
	return c.owner.hand.length < 5;
},
silence:function(c,t){
	return t == c.owner.foe && !t.sanctuary && !t.silence;
},
sinkhole:function(c,t){
	var atk;
	return c.owner != t.owner && (!t.status.adrenaline || (atk = t.trueatk()) < 4) && (atk || t.trueatk()) + (t.active.cast?(t.active.cast == Actives.burrow?-1:1):0);
},
siphonactive:function(c,t){
	return c.owner != t.owner && !isEmpty(t.active);
},
siphonstrength:function(c,t){
	return c.owner != t.owner && t.truehp();
},
skyblitz:function(c,t){
	return true;
},
snipe:function(c,t){ return ActivesEvalFlatCC(c, t, 3); },
sosa:function(c,t){
	var n = c.card.upped?40:48;
	return c.owner.hp > Math.max(Math.ceil(c.owner.maxhp*n/100), n);
},
sskin:function(c,t){
	return c.owner.hp < 30 || c.owner.quanta[Earth] > 80;
},
steal:function(c,t){
	return t.card.cost;
},
steam:function(c,t){
	return true;
},
stoneform:function(c,t){
	return true;
},
storm2:ActivesEvalMassCC,
storm3:ActivesEvalMassCC,
swave:function(c,t){
	return t.status.frozen?t.trueatk():ActivesEvalFlatCC(c, t, 4);
},
tempering:function(c,t){
	return c.owner == t.owner;
},
throwrock:function(c,t){
	return c.owner != t.owner && 10-t.truehp();
},
unburrow:function(c,t){
	return !ActivesEval.burrow(c, t);
},
virusinfect:function(c,t){
	return ActivesEval.infect(c, t);
},
virusplague:ActivesEvalMassCC,
quantagift:function(c,t){
	return true;
},
web:function(c,t){
	return c.owner != t.owner && t.passives.airborne;
},
wisdom:function(c,t){
	return c.owner == t.owner && t.truehp() + (t.status.immaterial?(t.status.psion?98:99):0);
},
yoink:function(c,t){
	return !t.owner.sanctuary && c.owner.hand.length < 8 && (!c.owner.precognition || t.owner.quanta[t.card.costele] >= t.card.cost);
},
}
