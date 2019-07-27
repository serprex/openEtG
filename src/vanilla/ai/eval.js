import * as etg from '../../etg.js';
import Actives from '../Skills.js';

function pillarval(c) {
	return c.type === etg.Spell ? 0.1 : Math.sqrt(c.getStatus('charges'));
}
const ActivesValues = Object.freeze({
	ablaze: 3,
	accelerationspell: 5,
	acceleration: function(c) {
		return c.truehp() - 2;
	},
	accretion: 8,
	adrenaline: 8,
	aflatoxin: 5,
	aggroskele: 2,
	air: 1,
	alphawolf: function(c) {
		return c.type === etg.Spell ? 3 : 0;
	},
	animateweapon: 4,
	antimatter: 12,
	bblood: 7,
	blackhole: function(c) {
		var a = 0,
			fq = c.owner.foe.quanta;
		for (var i = 1; i < 13; i++) {
			a += Math.min(fq[i], 3) / 3;
		}
		return a;
	},
	bless: 4,
	boneyard: 3,
	bounce: function(c) {
		return c.card.cost + (c.card.upped ? 1 : 0);
	},
	bravery: 3,
	burrow: 1,
	butterfly: 12,
	catapult: 6,
	chimera: 4,
	clear: 2,
	corpseexplosion: 1,
	counter: 3,
	countimmbur: 1,
	cpower: 4,
	darkness: 1,
	deadalive: 2,
	deckblast: function(c) {
		return c.owner.deck.length / 2;
	},
	deja: 4,
	deployblobs: function(c) {
		return (
			2 +
			(c.type === etg.Spell
				? Math.min(c.card.attack, c.card.health)
				: Math.min(c.trueatk(), c.truehp())) /
				4
		);
	},
	destroy: 8,
	destroycard: 1,
	devour: function(c) {
		return 2 + (c.type === etg.Spell ? c.card.health : c.truehp());
	},
	drawcopy: 1,
	disarm: function(c) {
		return !c.owner.foe.weapon
			? 0.1
			: c.owner.foe.hand.length === 8
			? 0.5
			: c.owner.foe.weapon.card.cost;
	},
	disfield: 8,
	disshield: 7,
	dive: function(c, ttatk) {
		return c.type === etg.Spell
			? c.card.attack
			: ttatk - (c.getStatus('dive') || 0) / 1.5;
	},
	divinity: 3,
	drainlife: 10,
	draft: 1,
	dryspell: 5,
	dshield: 4,
	duality: 4,
	earth: 1,
	earthquake: 4,
	empathy: function(c) {
		return c.owner.countcreatures();
	},
	enchant: 6,
	endow: 4,
	epidemic: 4,
	evolve: 2,
	feed: 6,
	fire: 1,
	firebolt: 10,
	flyingweapon: 7,
	foedraw: 8,
	forceplay: 2,
	fractal: function(c) {
		return 9 - c.owner.hand.length;
	},
	freeze: [3, 3.5],
	fungusrebirth: 1,
	gas: 5,
	golemhit: function(c) {
		var dmg = 0;
		for (var i = 0; i < 23; i++) {
			var cr = c.owner.creatures[i];
			if (
				cr &&
				cr.getStatus('golem') &&
				!cr.getStatus('delayed') &&
				!cr.getStatus('frozen')
			) {
				var atk = getDamage(cr);
				if (atk > dmg) dmg = atk;
			}
		}
		return dmg;
	},
	gpull: function(c) {
		return c.type === etg.Spell || c.id !== c.owner.gpull ? 2 : 0;
	},
	gpullspell: 3,
	gratitude: function(c) {
		return c.status ? c.getStatus('charges') * 4 : 4;
	},
	'growth 1': 3,
	'growth 2': 5,
	guard: 4,
	halveatk: function(c) {
		var atk;
		return c.type === etg.Spell
			? -c.card.attack / 4
			: ((atk = c.trueatk()) < 0) - (atk > 0);
	},
	hasten: function(c) {
		return Math.min(c.owner.deck.length / 4, 10);
	},
	hatch: 3,
	heal: 8,
	heatmirror: 2,
	holylight: 3,
	hope: 2,
	icebolt: 10,
	ignite: 4,
	immolate: 5,
	improve: 6,
	inertia: 2,
	infect: 4,
	ink: 3,
	innovation: 3,
	integrity: 4,
	light: 1,
	lightning: 7,
	liquid: 5,
	livingweapon: 2,
	lobotomize: 6,
	loot: 2,
	luciferin: 3,
	lycanthropy: 4,
	mend: 3,
	metamorph: 2,
	miracle: function(c) {
		return c.owner.maxhp / 8;
	},
	mitosis: function(c) {
		return 4 + c.card.cost;
	},
	mitosisspell: 6,
	momentum: 2,
	mutation: 4,
	neuro: function(c) {
		return c.owner.foe.neuro ? evalactive(c, Actives.poison) + 0.1 : 6;
	},
	nightmare: function(c) {
		var val = 24 - c.owner.foe.hand.length;
		c.owner.hand.forEach(function(inst) {
			if (inst.card.isOf(inst.game.Cards.Names.Nightmare)) val /= 2;
		});
		return val;
	},
	nova: 4,
	nova2: 6,
	nullspell: 4,
	nymph: 7,
	ouija: 3,
	overdrive: function(c) {
		return c.truehp() - 1;
	},
	overdrivespell: 5,
	pacify: 5,
	pairproduce: 2,
	paleomagnetism: [4, 5],
	pandemonium: 3,
	pandemonium2: 4,
	paradox: 5,
	parallel: 8,
	phoenix: 3,
	photosynthesis: 2,
	plague: 5,
	platearmor: 1,
	poisonfoe: 1.4,
	poison: 2,
	poison2: 3,
	poison3: 4,
	powerdrain: 6,
	precognition: 1,
	predator: function(c, tatk) {
		return !(c.type === etg.Spell) && c.owner.foe.hand.length > 4
			? tatk + Math.max(c.owner.foe.hand.length - 6, 1)
			: 1;
	},
	protectonce: 2,
	protectall: 4,
	purify: 2,
	queen: 7,
	quint: 6,
	quinttog: 7,
	rage: [5, 6],
	readiness: 3,
	rebirth: [5, 2],
	regenerate: 5,
	regeneratespell: 5,
	regrade: 3,
	reinforce: 0.5,
	ren: 5,
	rewind: 6,
	ricochet: 2,
	sadism: 5,
	salvage: 2,
	sanctuary: 6,
	scarab: 4,
	scramble: function(c) {
		var a = 0,
			fq = c.owner.foe.quanta;
		for (var i = 1; i < 13; i++) {
			if (!fq[i]) a++;
		}
		return a;
	},
	serendepity: 4,
	silence: 1,
	singularity: -20,
	sinkhole: 3,
	siphon: 4,
	siphonactive: 3,
	siphonstrength: 4,
	skyblitz: 10,
	snipe: 7,
	sosa: 6,
	soulcatch: 2,
	spores: 4,
	sskin: 5,
	steal: 6,
	steam: 6,
	stoneform: 1,
	storm2: 6,
	storm3: 12,
	swave: 6,
	upkeep: -0.5,
	upload: 3,
	vampire: function(c, ttatk) {
		return (c.type === etg.Spell ? c.card.attack : ttatk) * 0.7;
	},
	virtue: function(c) {
		return c.type === etg.Spell
			? c.owner.foe.shield
				? Math.min(c.owner.foe.shield.dr, c.card.attack)
				: 0
			: (c.trueatk() - getDamage(c)) / 1.5;
	},
	virusplague: 1,
	void: function(c) {
		return c.status ? c.getStatus('charges') * 5 : 5;
	},
	voidshell: function(c) {
		return (c.owner.maxhp - c.owner.hp) / 10;
	},
	quantagift: 4,
	web: 1,
	wind: function(c) {
		return c.type === etg.Spell ? -2 : c.getStatus('storedAtk') / 2 - 2;
	},
	wisdom: 4,
	pillar: pillarval,
	pend: pillarval,
	pillmat: pillarval,
	pillspi: pillarval,
	pillcar: pillarval,
	absorber: 5,
	blockwithcharge: function(c) {
		return c.getStatus('charges') / (1 + c.owner.foe.countcreatures() * 2);
	},
	cold: 7,
	despair: 5,
	evade100: function(c) {
		return c.status
			? c.getStatus('charges') === 0 && c.owner === c.owner.game.turn
				? 0
				: 1
			: 1;
	},
	evade40: 1,
	evade50: 1,
	firewall: 7,
	chaos: [8, 9],
	skull: 5,
	slow: 6,
	solar: function(c) {
		var coq = c.owner.quanta[etg.Light];
		return 5 - (4 * coq) / (4 + coq);
	},
	thorn: 5,
	weight: 5,
	wings: function(c) {
		return c.status
			? c.getStatus('charges') === 0 && c.owner === c.owner.game.turn
				? 0
				: 6
			: 6;
	},
});
var statusValues = Object.freeze({
	airborne: 0.2,
	ranged: 0.2,
	voodoo: 1,
	swarm: 1,
	tunnel: 3,
	cloak: function(c) {
		return c.status
			? c.getStatus('charges') === 0 && c.owner === c.owner.game.turn
				? 0
				: 4
			: 0;
	},
	flooding: function(c) {
		return c.owner.foe.countcreatures() - 3;
	},
	patience: function(c) {
		return 1 + c.owner.countcreatures() * 2;
	},
	freedom: function(c) {
		return Math.min(c.getStatus('charges'), 4) * 5 || 5;
	},
	reflect: 1,
});

function getDamage(c) {
	return damageHash.get(c.hash()) || 0;
}
function estimateDamage(c, freedomChance, wallCharges, wallIndex) {
	if (!c || c.getStatus('frozen') || c.getStatus('delayed')) {
		return 0;
	}
	function estimateAttack(tatk) {
		if (momentum) {
			return tatk;
		} else if (
			(fshactive === Actives.weight || fshactive === Actives.wings) &&
			fshactive.func(c.owner.foe.shield, c)
		) {
			return 0;
		} else if (wallCharges[wallIndex]) {
			wallCharges[wallIndex]--;
			return 0;
		} else return Math.max(tatk - dr, 0);
	}
	var tatk = c.trueatk(),
		fsh = c.owner.foe.shield,
		fshactive = fsh && fsh.active.shield;
	var momentum =
		!fsh ||
		tatk <= 0 ||
		c.getStatus('momentum') ||
		c.getStatus('psionic') ||
		(c.getStatus('burrowed') &&
			c.owner.permanents.some(function(pr) {
				return pr && pr.getStatus('tunnel');
			}));
	var dr = momentum ? 0 : fsh.dr,
		atk = estimateAttack(tatk);
	if (c.getStatus('adrenaline')) {
		var attacks = etg.countAdrenaline(tatk);
		while (c.getStatus('adrenaline') < attacks) {
			c.incrStatus('adrenaline', 1);
			atk += estimateAttack(c.trueatk());
		}
		c.setStatus('adrenaline', 1);
	}
	if (!momentum) {
		atk *=
			fshactive === Actives.evade100
				? 0
				: fshactive === Actives.evade50
				? 0.5
				: fshactive === Actives.evade40
				? 0.6
				: fshactive === Actives.chaos && fsh.card.upped
				? 0.8
				: 1;
	}
	if (!fsh && freedomChance && c.getStatus('airborne')) {
		atk += Math.ceil(atk / 2) * freedomChance;
	}
	if (c.owner.foe.sosa) atk *= -1;
	damageHash.set(c.hash(), atk);
	return atk;
}
function calcExpectedDamage(pl, wallCharges, wallIndex) {
	var totalDamage = 0,
		stasisFlag = false,
		freedomChance = 0;
	for (var i = 0; i < 16; i++) {
		var p;
		if ((p = pl.permanents[i]) && p.getStatus('charges') !== 0) {
			if (p.getStatus('stasis') || p.getStatus('patience')) {
				stasisFlag = true;
			} else if (p.getStatus('freedom')) {
				freedomChance++;
			}
		}
		if ((p = pl.foe.permanents[i]) && p.getStatus('stasis')) {
			stasisFlag = true;
		}
	}
	if (freedomChance) {
		freedomChance = 1 - Math.pow(0.7, freedomChance);
	}
	if (pl.foe.shield && pl.foe.shield.hasactive('shield', 'blockwithcharge')) {
		wallCharges[wallIndex] = pl.foe.shield.getStatus('charges');
	}
	if (!stasisFlag) {
		pl.creatures.forEach(function(c) {
			var dmg = estimateDamage(c, freedomChance, wallCharges, wallIndex);
			if (
				dmg &&
				!(
					c.getStatus('psionic') &&
					pl.foe.shield &&
					pl.foe.shield.getStatus('reflect')
				)
			) {
				totalDamage += dmg;
			}
		});
	}
	totalDamage += estimateDamage(
		pl.weapon,
		freedomChance,
		wallCharges,
		wallIndex,
	);
	if (pl.foe.getStatus('poison')) totalDamage += pl.foe.getStatus('poison');
	return totalDamage;
}

function evalactive(c, active, extra) {
	if (!active) return 0;
	var sum = 0;
	for (var i = 0; i < active.name.length; i++) {
		var aval = ActivesValues[active.name[i]];
		sum +=
			aval === undefined
				? 0
				: aval instanceof Function
				? aval(c, extra)
				: aval instanceof Array
				? aval[c.card.upped ? 1 : 0]
				: aval;
	}
	return sum;
}

function checkpassives(c) {
	let score = 0;
	for (const [status, val] of c.status) {
		if (uniqueStatuses[status] && !(c.type === etg.Spell)) {
			if (!uniquesActive.has(status)) {
				uniquesActive.add(status);
			} else {
				continue;
			}
		}
		var sval = statusValues[status];
		score += sval === undefined ? 0 : sval instanceof Function ? sval(c) : sval;
	}
	return score;
}

var throttled = Object.freeze(
	new Set(['poison1', 'poison2', 'poison3', 'neuro', 'siphon']),
);
function evalthing(c) {
	if (!c) return 0;
	var ttatk,
		hp,
		poison,
		score = 0;
	var isCreature = c.type === etg.Creature,
		isWeapon = c.type === etg.Weapon;
	var adrenalinefactor = c.getStatus('adrenaline')
		? etg.countAdrenaline(c.trueatk())
		: 1;
	if (isWeapon || isCreature) {
		var delaymix =
				Math.max(c.getStatus('frozen'), c.getStatus('delayed')) /
				adrenalinefactor,
			delayfactor = delaymix ? 1 - Math.min(delaymix / 5, 0.6) : 1;
	} else {
		var delaymix = 0,
			delayfactor = 1;
	}
	if (isCreature) {
		hp = Math.max(c.truehp(), 0);
		poison = c.getStatus('poison');
		if (poison > 0) {
			hp = Math.max(hp - poison * 2, 0);
			if (c.getStatus('aflatoxin')) score -= 2;
		} else if (poison < 0) {
			hp += Math.min(-poison, c.maxhp - c.hp);
		}
	}
	if (isWeapon || isCreature) {
		ttatk = getDamage(c);
		if (
			c.getStatus('psionic') &&
			c.owner.foe.shield &&
			c.owner.foe.shield.getStatus('reflect')
		)
			ttatk *= -1;
		score += c.trueatk() / 20;
		score += ttatk * delayfactor;
	} else ttatk = 0;
	var throttlefactor =
		adrenalinefactor < 3 ||
		(isCreature && c.owner.weapon && c.owner.weapon.getStatus('nothrottle'))
			? adrenalinefactor
			: 2;
	for (const [key, act] of c.active) {
		var adrfactor = throttled.has(key) ? throttlefactor : adrenalinefactor;
		if (key === 'hit') {
			score +=
				evalactive(c, c.active.get('hit'), ttatk) *
				(ttatk ? 1 : c.getStatus('immaterial') ? 0 : 0.3) *
				adrfactor *
				delayfactor;
		} else if (key === 'auto') {
			if (!c.getStatus('frozen')) {
				score += evalactive(c, c.active.get('auto'), ttatk) * adrfactor;
			}
		} else if (key === 'cast') {
			if (caneventuallyactive(c.castele, c.cast, c.owner)) {
				score += evalactive(c, c.active.get('cast'), ttatk) * delayfactor;
			}
		} else if (key !== (isCreature ? 'shield' : 'owndeath')) {
			score += evalactive(c, act);
		}
	}
	score += checkpassives(c);
	if (isCreature) {
		if (hp && c.owner.gpull === c) {
			score = ((score + hp) * Math.log(hp)) / 4;
			if (c.getStatus('voodoo')) score += hp;
			if (c.active.shield && !delaymix) {
				score += evalactive(c, c.active.get('shield'));
			}
		} else
			score *= hp
				? c.getStatus('immaterial') || c.getStatus('burrowed')
					? 1.3
					: 1 + Math.log(Math.min(hp, 33)) / 7
				: 0.2;
	} else {
		score *= c.getStatus('immaterial') ? 1.35 : 1.25;
	}
	if (delaymix) {
		// TODO this is redundant alongside delayfactor
		var delayed = Math.min(
			delaymix * (c.getStatus('adrenaline') ? 0.5 : 1),
			12,
		);
		score *= 1 - (12 * delayed) / (12 + delayed) / 16;
	}
	return score;
}

function evalcardinstance(cardInst) {
	if (!cardInst) return 0;
	var c = cardInst.card;
	if (!caneventuallyactive(c.costele, c.cost, cardInst.owner)) {
		return c.active.discard === Actives.obsession ? (c.upped ? -7 : -6) : 0;
	}
	var score = 0;
	if (c.type === etg.Spell) {
		score += evalactive(cardInst, c.active.get('cast'));
	} else {
		for (const act of c.active.data.values()) {
			score += evalactive(cardInst, act);
		}
		score += checkpassives(cardInst);
		if (c.type === etg.Creature) {
			score += c.attack;
			var hp = Math.max(c.health, 0),
				poison = c.getStatus('poison');
			if (poison > 0) {
				hp = Math.max(hp - poison * 2, 0);
				if (c.getStatus('aflatoxin')) score -= 2;
			} else if (poison < 0) {
				hp += Math.min(-poison, c.maxhp - c.hp);
			}
			score *= hp
				? c.getStatus('immaterial') || c.getStatus('burrowed')
					? 1.3
					: 1 + Math.log(Math.min(hp, 33)) / 7
				: 0.5;
		} else if (c.type === etg.Weapon) {
			score += c.attack;
			if (
				cardInst.owner.weapon ||
				cardInst.owner.hand.some(function(cinst) {
					return cinst.card.type === etg.Weapon;
				})
			)
				score /= 2;
		} else if (c.type === etg.Shield) {
			score += c.health * c.health;
			if (
				cardInst.owner.shield ||
				cardInst.owner.hand.some(function(cinst) {
					return cinst.card.type === etg.Shield;
				})
			)
				score /= 2;
		}
	}
	score *= !cardInst.card.cost
		? 0.8
		: (cardInst.canactive() ? 0.6 : 0.5) *
		  (!cardInst.card.costele
				? 1
				: 0.9 +
				  Math.log(1 + cardInst.owner.quanta[cardInst.card.costele]) / 50);
	return score;
}

function caneventuallyactive(element, cost, pl) {
	if (
		!cost ||
		!element ||
		pl.quanta[element] ||
		!pl.mark ||
		pl.mark === element
	)
		return true;
	return pl.permanents.some(function(pr) {
		return (
			pr &&
			(pr.card.type === etg.Pillar &&
				(!pr.card.element || pr.card.element === element))
		);
	});
}

var uniqueStatuses = Object.freeze({
	flooding: 'all',
	nightfall: 'all',
	tunnel: 'self',
	patience: 'self',
	cloak: 'self',
});
var uniquesActive, damageHash;

export default function(game) {
	if (game.winner) {
		return game.winner === game.player1 ? 99999999 : -99999999;
	}
	if (game.player1.deck.length === 0 && game.player1.hand.length < 8) {
		return -99999990;
	}
	var wallCharges = new Int32Array([0, 0]);
	damageHash = new Map();
	uniquesActive = new Set();
	var expectedDamage = calcExpectedDamage(game.player2, wallCharges, 0);
	if (expectedDamage > game.player1.hp) {
		return Math.min(expectedDamage - game.player1.hp, 500) * -999;
	}
	if (game.player2.deck.length === 0) {
		return 99999980;
	}
	expectedDamage = calcExpectedDamage(game.player1, wallCharges, 1); // Call to fill damageHash
	var gamevalue = expectedDamage > game.player2.hp ? 999 : 0;
	for (var j = 0; j < 2; j++) {
		for (var key in uniqueStatuses) {
			if (uniqueStatuses[key] === 'self') uniquesActive.delete(key);
		}
		var pscore = wallCharges[j] * 4,
			player = game.players(j);
		pscore += evalthing(player.weapon);
		pscore += evalthing(player.shield);
		for (var i = 0; i < 23; i++) {
			pscore += evalthing(player.creatures[i]);
		}
		for (var i = 0; i < 16; i++) {
			pscore += evalthing(player.permanents[i]);
		}
		for (var i = 0; i < player.hand.length; i++) {
			pscore += evalcardinstance(player.hand[i]);
		}
		pscore += Math.min(8 - player.hand.length, player.drawpower) * 2;
		pscore += Math.sqrt(player.hp) * 4;
		if (player.getStatus('poison')) pscore -= player.getStatus('poison');
		if (player.precognition) pscore += 0.5;
		if (!player.weapon) pscore += 1;
		if (!player.shield) pscore += 1;
		if (player.silence)
			pscore -= (player.hand.length + (player.hand.length > 6 ? 7 : 4)) / 4;
		if (player.flatline) pscore -= 1;
		if (player.neuro) pscore -= 5;
		gamevalue += pscore * (j ? -1 : 1);
	}
	damageHash = uniquesActive = null;
	return gamevalue;
}
