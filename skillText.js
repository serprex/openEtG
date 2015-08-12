"use strict";
var etg = require("./etg");
var Cards = require("./Cards");
var data = {
	ablaze:"Gain 2|0",
	abomination:"Amiable to mutation",
	absorbdmg:"Collect power per reduced damage",
	absorber:"Produce 3:6 per attacker",
	accelerationspell:"Replaces target creature's skills with \"Gain +2|-1 per turn\"",
	accretion:"Destroy target permanent & gain 0|10. Return to owner's hand as a Blackhole if larger than 30",
	accumulation:"Increment damage reduction per stack",
	adrenaline:"Target creature attacks multiple times per turn. Weaker creatures gain more attacks",
	aether:"Produce 1:12 on death",
	aflatoxin:"Apply 2 poison to target. When target dies, it turns into a malignant cell",
	aggroskele:"Summon a Skeleton. All own skeletons attack target creature",
	air:"Produce 1:9 per turn",
	alphawolf:"Summon two 2|1 Pack Wolves on play",
	antimatter:"Invert strength of target",
	appease:"Sacifice own creature & gain 1|1. If not, retaliate",
	atk2hp:"Target's health is changed to match its strength",
	autoburrow:"Until end of turn, creatures with burrow enter play burrowed",
	axedraw:"Increment damage per draw. Reset on attack",
	bblood:"Target creature gains 0|20 & is delayed 6 turns",
	becomearctic:"Become Arctic if frozen",
	beguile:"Steal target creature until next turn",
	beguilestop:"Return to original owner at start of next turn",
	bellweb:"Target creature becomes aquatic & loses airborne",
	blackhole:"Absorb 3 quanta per element from target player. Heal 1 per absorbed quantum",
	bless:"Target gains 3|3",
	blockwithcharge:"Block attack per stack",
	bolsterintodeck:"Push 3 copies of target creature onto own deck. Cannot ricochet",
	boneyard:["When a creature dies, summon a 1|1 Skeleton", "When a creature dies, summon a 2|2 Skeleton"],
	bounce:"Return to owner's hand instead of dying",
	bravery:"Foe draws 2 cards, you draw an equal amount of cards",
	brawl:"Own creatures attack. If a creature exists in opposing slot, they duel instead. Consumes remaining 1:3",
	brew:"Generate a random Alchemy card",
	brokenmirror:["When foe plays a creature from hand, summon a 1|1 Phantom", "When foe plays a creature from hand, summon a 2|1 Phantom"],
	butterfly:"Target something smaller than, or weaker than, 3. Replace target's skills with \"3:1 Destroy target permanent\"",
	burrow:"Burrow. Burrowed creatures attack with half strength",
	catapult:"Sacrifice target creature to deal 100HP/(100+HP) damage foe. Frozen creatures increase damage by 50%. Poisoned creatures transfer poison",
	catlife:"On death, regenerate with 1 fewer life",
	cell:"Become Malignant if poisoned",
	chaos:function(c){return (c.upped?"20% chance to evade. ":"")+"Non-ranged attacking creatures have a 30% chance to have a random effect cast on them"},
	chimera:"Combine all your creatures to form a Chimera with momentum & gravity pull",
	clear:"Remove statuses from target creature, reduce delays by 1, & heal 1",
	cold:"30% chance to freeze non-ranged attackers for 3",
	corpseexplosion:["Sacrifice a creature to deal 1 damage to all creatures. Increment damage per 8 health of sacrifice. Poisonous sacrifices poison foe",
		"Sacrifice a creature to deal 1 damage to all enemy creatures. Increment damage per 8 health of sacrifice. Poisonous sacrifices poison foe"],
	counter:"Attack attacker when attacked & able to attack",
	countimmbur:"Increment attack per immaterial or burrowed instance",
	cpower:"Target gains 1 to 5 strength. Target gains 1 to 5 health",
	creatureupkeep:"All creatures require upkeep",
	cseed:"A random effect is inflicted to target creature",
	darkness:"Produce 1:11 per turn",
	deadalive:{
		hit:"Trigger a death effect on hit",
		cast:"Trigger a death effect",
	},
	deathwish:"Intercepts targeting on allies",
	deckblast:"Damage foe per card in deck. Discard deck",
	decrsteam:"Decrement strength from steam after attack",
	deepdive:"Burrow, replace active with \"2:3 Freeze target permanent\", next turn unburrow into the air & triple strength until next attack",
	deja:"Remove active & summon copy",
	deployblobs:"Summon 3 Blobs & gain -2|-2",
	despair:"Non-ranged attackers have a 40%, plus 5% per 1:11 producing creature possessed, chance to gain -1|-1",
	destroy:"Destroy target permanent",
	destroycard:"Discard target card",
	detain:"Drain 1|1 from target smaller creature, & burrow them",
	devour:"Kill smaller target creature & gain 1|1",
	die:"Sacrifice",
	disarm:"Return foe's weapon to their hand on hit",
	discping:"Deal 1 damage to target creature & return to hand",
	disfield:"Absorb damage. Consume 1:0 per damage absorbed",
	disshield:"Absorb damage. Consume 1:1 per 3 damage absorbed",
	divinity:"Add 24 to maximum health & heal 16",
	dive:"Double strength until next attack. Does not stack",
	draft:"Target airborne creature loses airborne status, or vice versa. Produce 2:9",
	drainlife:"Drains 2HP from target. Increment drain per 5:11 owned",
	drawcopy:"When foe discards a card, generate a copy",
	drawequip:"Draw next weapon or shield",
	drawpillar:"When played, if next draw is a pillar, draw it",
	dryspell:"Deal 1 damage to all creatures. Gain 1:7 per damage dealt. Removes cloak",
	dshield:"Become immaterial until next turn",
	duality:"Generate a copy of foe's next draw",
	earth:"Produce 1:4 per turn",
	earthquake:"Destroy up to 3 stacks from target permanent",
	eatspell:"Absorb next spell, gaining 1|1",
	elf:"Become Fallen if target of Chaos Seed",
	embezzle:"Replaces target creature's skills with \"Defender draws card on hit. On death, foe mills 3\"",
	embezzledeath:"On death, foe mills 3",
	empathy:"Heal owner per creature owned per turn. Consumes 1:5 per 8 creatures",
	enchant:"Target permanent becomes immaterial",
	endow:"Gain attack, skills, & statuses of target weapon. Gain 0|2",
	envenom:"Target weapon or shield gains \"Apply poison on hit. Throttled\" & \"25% chance to poison non-ranged attackers\"",
	epidemic:"When a creature dies, transfer creature's poison counters to foe",
	epoch:"Silence player after playing 2 cards in a turn",
	epochreset:{
		cast:"Reset silence counter",
	},
	evade:function(x){ return x+"% chance to evade"; },
	evade100:"100% chance to evade",
	evadecrea:"Evade creature actives",
	evadespell:"Evades targeting spells",
	evolve:"Become an unburrowed Shrieker",
	feed:"Poison target creature & gain 3|3, but rematerialize",
	fickle:"Swap target card with random affordable card from deck",
	fiery:"Increment damage per 5:6 owned",
	fire:"Produce 1:6 per attack",
	firebolt:"Deals 3 damage to target. Increment damage per 4:6 owned. Thaws target",
	firewall:"Damage non-ranged attackers",
	flatline:"Foe produces no quanta until next turn",
	flyself:"If equiped, cast Flying Weapon on self. Otherwise cast Living Weapon on self",
	flyingweapon:"Target weapon becomes a flying creature",
	foedraw:"Draw from foe's deck",
	forcedraw:"Defender draws card on hit",
	forceplay:"Foe activates target",
	fractal:"Generate 6 copies of target creature's card. Consumes remaining 1:12. Generate another copy per 2:12 consumed",
	freeevade:"Own airborne creatures have a 30% chance to either deal 50% more damage or bypass shields. 20% chance to evade targeting",
	freeze:["Freeze target for 3 turns. Being frozen disables attacking & per turn skills",
		"Freeze target for 4 turns. Being frozen disables attacking & per turn skills"],
	freezeperm:["Freeze target non stacking permanent for 3 turns. Being frozen disables per turn skills",
		"Freeze target non stacking permanent for 4 turns. Being frozen disables per turn skills"],
	fungusrebirth:["Become a Fungus", "Become a Toxic Fungus"],
	gaincharge2:{
		death:"Gain 2 stacks per death",
		destroy:"Gain 2 stacks per other destruction",
	},
	gaintimecharge:"Gain a stack per own non-drawstep draw, up to 4 per turn",
	gas:"Summon an Unstable Gas",
	grave:"Whenever a creature dies, become an unburrowed of its kind",
	give:function(c){return "Give own target to foe. Heal self "+(c.upped?10:5)+". Ignore sanctuary, may target immaterial"},
	golemhit:"Target golem attacks",
	gpull:"Intercept attacks directed to owner",
	gpullspell:"Target creature intercepts attacks directed to its owner",
	gratitude:"Heal owner 4",
	growth:function(x){
		x = x+"|"+x;
		return {
			death:"When a creature dies, gain "+x,
			ownfreeze:"Gains "+x+" instead of freezing",
			cast:"Gain "+x,
		};
	},
	guard:"Delay target creature & attack target if grounded or caster airborne. Delay self",
	halveatk:"Attack is halved after attacking",
	hasten:{
		cast:"Draw",
		owndiscard:"Draw on discard",
	},
	hatch:"Become a random creature",
	heal:"Heal target 20",
	heatmirror:function(c){return "Heat Lightning: When foe plays a creature from hand, summon a " + (c.upped?"Ball Lightning":"Spark")},
	holylight:"Heal target 10. Nocturnal targets are damaged instead",
	hope:"Increment damage reduction per own 1:8 producing creature",
	icebolt:"Deal 2 damage to target. Increment damage per 5:7 owned. May freeze target",
	ignite:"Deal 20 spell damage to foe & 1 damage to all creatures",
	immolate:function(c){return "Sacrifice a creature to produce "+(c.upped?7:5)+":6 & 1 quanta of each other element"},
	improve:"Mutate target creature",
	inertia:"When own is targeted, produce 2:3",
	infect:"Poison target creature",
	inflation:"Increase cost of all actives by 1",
	ink:"Summon a Cloak which lasts 1 turn",
	innovation:"Discard target card, owner draws three cards",
	integrity:"Combine all shards in hand to form a Shard Golem",
	jelly:"Target creature becomes a 7|4 with active Pink Jelly costing 4 of their element",
	jetstream:"Target airborne creature gains 3|-1",
	light:{
		auto:"Produce 1:8 per attack",
		ownplay:"Produce 1:8 on play",
	},
	lightning:"Deal 5 damage to target",
	liquid:"Target creature is poisoned & skills are replaced with \"Heal owner per damage dealt\"",
	livingweapon:"Target creature becomes equipped as a weapon. Heal target's owner for health of target",
	lobotomize:"Remove skills from target creature",
	locket:"Produce quanta of mark",
	locketshift:"Now produces quanta of target's element",
	loot:"Steal a random permanent from foe when own permanent is destroyed",
	losecharge:function(c, inst){
		var charges = c.status.charges;
		return "Lasts " + charges + " turn" + (charges == 1?"":"s");
	},
	luciferin:"All your creatures without skills produce 1:8 per attack. Heal owner 10",
	lycanthropy:"Gain 5|5 & become nocturnal",
	martyr:"Increment strength per damage received",
	mend:"Heal target creature 10",
	metamorph:"Change mark to target's element. Increase mark power by 1",
	midas:"Target permanent becomes a Golden Relic with \"2:0: Sacrifice & draw\"",
	millpillar:"If top of target player's deck is a pillar, mill target",
	mimic:"Mimic: whenever a creature enters play, become its kind. Retain Mimic",
	miracle:"Heal self to one below maximum HP. Consumes remaining 1:8",
	mitosis:"Summon a daughter creature",
	mitosisspell:"Non-weapon creature gains 0|1 & active \"Mitosis: Summon a daughter creature\" costing target's card's cost",
	momentum:"Target ignores shield effects & gains 1|1",
	mummy:"Become a Pharaoh if target of Reverse Time",
	mutation:"Mutate target creature into an abomination, or maybe something more. Slight chance of death",
	mutant:"Enter with mutant abilities",
	neuro:"Apply poison on hit, also inflicting neurotoxin. Neurotoxin applies poison per card played by victim. Throttled",
	neuroify:"Gives foe neurotoxin status if they are already poisoned",
	nightmare:"Fill foe's hand with copies of target creature's card. Drain 2HP per added card",
	nightshade:"Target creatures becomes nocturnal, gains 5|5, & has their active cleared",
	nova:"Produce 1 quanta of each element. Increment singularity danger by 2. Summon singularity if danger exceeds 5",
	nova2:"Produce 2 quanta of each element. Increment singularity danger by 3. Summon singularity if danger exceeds 5",
	nullspell:"Cancel next spell until next turn, gaining 1|1",
	nymph:"Turn target pillar into a Nymph of same element",
	obsession:["spell damage owner 8 on discard", "spell damage owner 10 on discard"],
	ouija:"When a creature dies, generate Ouija Essence in foe's hand",
	overdrivespell:"Replaces target creature's skills with \"Gain +3|-1 per turn\"",
	pacify:"Reduce target's attack to 0",
	pairproduce:"Activate own pillars",
	paleomagnetism:["Summon a pillar matching mark per turn. May summon a random pillar instead", "Summon a tower matching mark per turn. May summon a random tower instead"],
	pandemonium2:"Random effects are inflicted to target player's creatures. Removes cloak",
	pandemonium:"Random effects are inflicted to all creatures. Removes cloak",
	paradox:"Kill target creature which is stronger than it is large",
	parallel:"Duplicate target creature",
	phoenix:["Become an Ash on death", "Become a Minor Ash on death"],
	photosynthesis:"Convert 1:8 to 2:5. May activate multiple times",
	pillar:{
		auto:function(c){return "Produce "+(c.element?1:3)+":"+c.element + " per turn"},
		ownplay:function(c){return "Produce "+(c.element?1:3)+":"+c.element+" on play"}
	},
	pend:function(c){return "Oscilliate between producing "+(c.element?1:3)+":"+c.element + " & quanta of mark"},
	plague:"Poison target player's creatures. Removes cloak",
	platearmor:["Target gains 0|4", "Target gains 0|6"],
	poison:function(x){
		x += "Apply "+(x === "1" ? "" : " ") + "poison "
		return {
			hit:x+"on hit. Throttled",
			cast:x+"to foe",
		};
	},
	poisonfoe:"May apply poison to foe on play",
	powerdrain:"Drain half the target creature's strength & health, adding it to one of your creatures",
	precognition:"Reveal foe's hand until end of their turn. Draw",
	predator:"Attack again if foe holds more than 4 cards, discard their last card if so",
	protectall:"Bubble all own creatures & permanents. Bubbles protect from next targeting of foe or spell damage",
	protectonce:"Evade next targeting, or prevent next source of spell damage",
	purify:"Remove poison & sacrifice. Apply 2 purify",
	quantagift:"Gain 2:7 & 2 quanta of mark. Produce only 3:7 if mark is 1:7",
	quint:"Target creature becomes immaterial. Thaws",
	quinttog:"Target immaterial becomes material. Otherwise material targets become immaterial & thaw",
	rage:["Target creature gains +5|-5. Thaws",
		"Target creature gains +6|-6. Thaws"],
	randomdr:function(c){return "Damage reduction becomes 0 to "+(c.upped?3:2)+" on play"},
	readiness:"Target creature's active becomes costless. Skill can be reactivated",
	reap:"Target creature dies & is reborn a skeleton with same stats",
	rebirth:["Become a Phoenix", "Become a Minor Phoenix"],
	reducemaxhp:"Reduce maximum HP per damage dealt",
	regen:"Apply 1 purify to owner on hit. Throttled",
	regenerate:"Heal owner 5 per attack",
	regeneratespell:"Replace non-stacking target's skills with \"Regenerate: Heal owner 5\"",
	regrade:"Invert upgraded status of target card or creature. Produce 1 quanta of that element",
	reinforce:"Target creature absorbs caster, gaining its stats",
	ren:"Target creature will return to owner's hand instead of dying",
	rewind:"Return target creature to top of owner's deck",
	reveal:{
		ownplay:"Reveal foe's hand",
	},
	ricochet:"Targeting spells affect an additional random non player target. Caster randomised",
	sadism:["Owner is healed however much their creatures are damaged", "Owner is healed however much creatures are damaged"],
	salvage:"Restore a permanent destroyed by foe to hand once per turn. Gain 1|1 if so",
	salvageoff:"Become ready to salvage again at start of next turn",
	sanctify:"Protection during foe's turn from hand & quanta control",
	unsanctify:{
		ownplay:"Prevent foe's sanctification",
	},
	scatterhand:"Target player shuffles their hand, & draws as many cards. Draw a card",
	scramble:{
		hit:"Randomly scramble foe's quanta on hit",
		cast:"Randomly scramble target player's quanta",
	},
	serendipity:["Generate 3 random non-pillar cards in hand. One will be 1:1",
		"Generate 3 random non-pillar upgraded cards in hand. One will be 1:1"],
	shtriga:"Gain -1|-1 & become immaterial at start of turn",
	silence:"foe cannot play cards during their next turn, or target creature gains summoning sickness",
	sing:"Target creature without Sing attacks owner",
	singularity:"Not well behaved",
	sinkhole:["Target creature is burrowed. Replace creature's skills with 1:4: unburrow",
		"Target creature is burrowed. Replace creature's skills with 2:4: unburrow"],
	siphon:"Siphon 1:0 from foe as 1:11. Throttled",
	siphonactive:"Steal target creature's skills",
	siphonstrength:"Absorb 1|0 from target creature",
	skeleton:"Become a random creature if target of Reverse Time",
	skull:"Attacking creatures may die & become skeletons. Smaller creatures are more likely to die",
	skyblitz:"Dive all own airborne creatures. Consumes remaining 1:9",
	slow:"Delay non-ranged attackers",
	snipe:"Deal 3 damage to target creature",
	solar:"Produce 1:8 per attacker",
	sosa:["Sacrifice 48% of maximum health & consume all non 1:2 to invert damage for 2 turns. Sacrifices at least 48HP",
		"Sacrifice 40% of maximum health & consume all non 1:2 to invert damage for 2 turns. Sacrifices at least 40HP"],
	soulcatch:"When a creature dies, produce 3:2",
	spores:["Summon 2 spores on death", "Summon 2 toxic spores on death"],
	sskin:"Increment maximum HP per 1:4 owned. Heal same",
	static:"Deal 1 spell damage to foe per attacker",
	steal:"Steal target permanent",
	steam:"Gain 5|0",
	stoneform:"Gain 0|20 & become a golem",
	storm:function(x){ return "Deals "+x+" damage to target player's creatures. Removes cloak" },
	summon:function(x){
		var card1 = Cards[x], card2 = card1.asUpped(true);
		return card1.name == card2.name ? "Summon a "+card1.name : ["Summon a "+card1.name, "Summon a "+card2.name];
	},
	swarm:"Base health is equal to count of ally scarabs",
	swave:"Deals 4 damage to target. Instantly kill creature or destroy weapon if frozen",
	tempering:["Target weapon deals an additional 3 damage per turn. Thaws",
		"Target weapon deals an additional 5 damage per turn. Thaws"],
	tesseractsummon:["Each player summons a creature from their deck. Freeze summoned creatures by a quarter of their cost, rounded up",
		"Summon a creature from own deck. Freeze summoned creature by a quarter of their cost, rounded up"],
	thorn:"75% chance to poison non-ranged attackers",
	throwrock:["Deal 3 spell damage to target creature, then shuffle Throw Rock into target's deck",
		"Deal 4 spell damage to target creature, then shuffle Throw Rock into target's deck"],
	tick:["Takes 1 damage. If damage results in death, deal 18 damage to foe", "Takes 3 damage. If damage results in death, deal 4 damage to all foe's creatures"],
	tidalhealing:"Own aquatic creatures gain \"Apply 1 purify to owner on hit. Throttled\". Does not stack",
	tornado:["Randomly reshuffle 2 of foe's permanents & one of own into either deck",
		"Randomly reshuffle 2 of foe's permanents into either deck"],
	trick:"Swap target creature with a different creature from deck",
	turngolem:"Become a creature with health equal to collected power & a third as much strength",
	unburrow:"Unburrow",
	unsummon:"Return target creature to owner's hand. If hand full, return to top of deck",
	unvindicate:"Become ready to vindicate again at start of next turn",
	upkeep:function(c){return "Consumes 1:"+c.element},
	upload:"Target gains 2|0 & Byt gains 0|-2",
	vampire:"Heal owner per damage dealt",
	vend:"Sacrifice & draw",
	vengeance:"When ally creature dies during foe's turn, expend a stack & ally creatures attack",
	vindicate:"When ally creature dies, it attacks again. Unready",
	virtue:"Increment owner's maximum health by damge blocked when attacking",
	virusinfect:"Sacrifice self & poison target creature",
	virusplague:"Sacrifice self & poison target player's creatures",
	void:"Reduce foe's maximum HP by 3",
	voidshell:"Absorb damage. Reduce maximum HP per damage absorbed",
	web:"Target creature loses airborne",
	weight:"Evade creatures larger than 5",
	wind:"Restore attack",
	wings:"Evade non-airborne & non-ranged attackers",
	wisdom:"Target gains 3|0. May target immaterial, granting psionic",
	yoink:"Steal target card",
};
[["dagger", "1:2 1:11. Increment damage if cloaked"], ["hammer", "1:3 1:4"], ["bow", "1:8 1:9"], ["staff", "1:5 1:7"], ["disc", "1:1 1:12"], ["axe", "1:6 1:10"]].forEach(function(x){
	data[x[0]] = "Increment damage if mark is "+x[1];
});
[["pillmat", "1:4 1:6 1:7 1:9"], ["pillspi", "1:2 1:5 1:8 1:11"], ["pillcar", "1:1 1:3 1:10 1:12"]].forEach(function(x){
	data[x[0]] = {
		auto:"Produce 1 or 2 " + x[1] + " per turn",
		ownplay:"Produce 1 or 2 " + x[1] + " on play"
	};
});
function auraText(tgts, bufftext, upbufftext){
	return function(c){
		return tgts + " gain " + (c.upped?upbufftext:bufftext) + " while " + c.name + " in play. Unique";
	}
}
var statusData = {
	cloak:"Cloaks own field",
	charges:function(c,inst){return c !== inst || etg.Thing.prototype.hasactive.call(c, "auto", "losecharge") || c.status.charges == 1?"":"Enter with " + c.status.charges + (c.status.stackable?" stacks":" charges")},
	flooding:"Non aquatic creatures past first five creature slots die on turn end. Consumes 1:7. Unique",
	freedom:"",
	nightfall:auraText("Nocturnal creatures", "1|1", "2|1"),
	nothrottle:"Throttling does not apply to any of own creatures while equipped",
	patience:"Each turn delay own creatures. They gain 2|1. 4|1 if burrowed. 5|2 if flooded. Unique",
	poison:function(c,inst){return c == inst ? "Enter with " + c.status.poison + " poison" : inst.status.poison + " poison"},
	stackable:"",
	stasis:"Prevent creatures attacking at end of turn",
	tunnel:"Burrowed creatures bypass shields",
	voodoo:"Repeat to foe negative status effects & non lethal damage",
	whetstone:auraText("Weapons & golems", "1|1", "1|2"),
};
function processEntry(c, event, entry){
	return typeof entry === "string" ? entry :
		entry instanceof Array ? entry[asCard(c).upped?1:0] :
		entry instanceof Function ? entry(asCard(c), c) :
		event in entry ? processEntry(c, event, entry[event]) : "";
}
function asCard(c){
	return c instanceof etg.Card?c:c.card;
}
function pushEntry(list, c, event, entry){
	var x = processEntry(c, event, entry);
	if (x) list.push(x);
}
function getDataFromName(name){
	if (name in data) return data[name];
	var spidx = name.indexOf(" ");
	return ~spidx ? (data[name] = data[name.slice(0,spidx)](name.slice(spidx+1))) : data[name];
}
module.exports = function(c, event){
	if (c instanceof etg.Card && c.type == etg.SpellEnum){
		var entry = getDataFromName(c.active.cast.activename[0]);
		return processEntry(c, "cast", entry);
	}else{
		var ret = [], stext = [];
		for(var key in c.status){
			if (!c.status[key]) continue;
			var entry = statusData[key];
			if (entry === undefined) {
				var text = (c.status[key] === true ? key : c.status[key] + key);
				text = text.charAt(0).toUpperCase() + text.slice(1);
				stext.push(text);
			}
			else pushEntry(ret, c, "", entry);
		}
		if (stext.length) ret.unshift(stext.join(", ") + ".");
		for(var key in c.active){
			c.active[key].activename.forEach(function(name){
				var entry = getDataFromName(name);
				if (entry === undefined) return;
				pushEntry(ret, c, key, entry);
				if (key == "cast") ret[ret.length-1] = etg.casttext(c.cast, c.castele) + " " + ret[ret.length-1];
			});
		}
		return ret.join("\n");
	}
}
