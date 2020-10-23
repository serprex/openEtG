import * as imm from '../immutable.js';
import * as etg from '../etg.js';
import Skill from '../Skill.js';
import parseSkill from '../parseSkill.js';

function vadrenathrottle(f) {
	return function (ctx, c, ...args) {
		if (c.getStatus('adrenaline') < 3) {
			return f(ctx, c, ...args);
		}
	};
}
const targetMap = new WeakMap();
function target(t, f) {
	targetMap.set(f, Skill.parseTargeting(t));
	return f;
}
const Actives = {
	noluci: ctx => {},
	ablaze: (ctx, c, t) => {
		c.incrAtk(2);
	},
	acceleration: (ctx, c, t) => {
		c.incrAtk(2);
		c.dmg(1, true);
	},
	accelerationspell: target('crea', (ctx, c, t) => {
		t.lobo();
		t.setSkill('ownattack', Actives.acceleration);
	}),
	accretion: target('perm+play', (ctx, c, t) => {
		if (t.type !== etg.Player) Actives.destroy.func(ctx, c, t);
		c.buffhp(15);
		if (c.truehp() > 45) {
			c.die();
			c.owner.addCard(ctx.newThing(c.card.as(ctx.Cards.Names.BlackHole)));
		}
	}),
	adrenaline: target('crea', (ctx, c, t) => {
		t.setStatus('adrenaline', 1);
	}),
	aflatoxin: target('crea', (ctx, c, t) => {
		t.addpoison(2);
		if (t.type !== etg.Player) {
			t.setStatus('aflatoxin', 1);
		}
	}),
	antimatter: target('crea', (ctx, c, t) => {
		t.incrAtk(t.trueatk() * -2);
	}),
	bblood: target('crea', (ctx, c, t) => {
		t.buffhp(20);
		t.setStatus('delayed', 6);
		if (t.getStatus('vooodoo') && t.owner.foe.weaponId) {
			t.owner.foe.weapon.setStatus('delayed', 6);
		}
	}),
	blackhole: (ctx, c, t) => {
		if (!c.owner.foe.sanctuary) {
			for (let q = 1; q < 13; q++) {
				c.owner.dmg(-Math.min(c.owner.foe.quanta[q], 3));
				c.owner.foe.setQuanta(q, Math.max(c.owner.foe.quanta[q] - 3, 0));
			}
		}
	},
	bless: target('crea', (ctx, c, t) => {
		t.incrAtk(3);
		t.buffhp(3);
	}),
	boneyard: (ctx, c, t) => {
		if (!t.card.isOf(ctx.Cards.Names.Skeleton)) {
			c.owner.addCrea(c.owner.newThing(c.card.as(ctx.Cards.Names.Skeleton)));
		}
	},
	bow: (ctx, c, t) => {
		return c.owner.mark === etg.Air ? 1 : 0;
	},
	bravery: (ctx, c, t) => {
		if (!c.owner.foe.getStatus('sanctuary')) {
			const n = c.owner.mark === etg.Fire ? 3 : 2;
			for (
				let i = 0;
				i < n && c.owner.hand.length < 8 && c.owner.foe.hand.length < 8;
				i++
			) {
				c.owner.drawcard();
				c.owner.foe.drawcard();
			}
		}
	},
	burrow: (ctx, c, t) => {
		c.setStatus('burrowed', 1);
		c.setSkill('cast', Actives.unburrow);
		c.cast = 0;
		c.atk = Math.floor(c.atk / 2);
	},
	butterfly: target('v_butterfly', (ctx, c, t) => {
		t.lobo();
		t.setSkill('cast', Actives.destroy);
		t.cast = 3;
		t.castele = etg.Entropy;
	}),
	catapult: target('own:crea', (ctx, c, t) => {
		t.die();
		c.owner.foe.dmg(
			Math.ceil(
				(t.truehp() * (t.getStatus('frozen') ? 150 : 100)) / (t.truehp() + 100),
			),
		);
		if (t.getStatus('poison')) {
			c.owner.foe.addpoison(t.getStatus('poison'));
		}
		if (t.getStatus('frozen')) {
			c.owner.foe.freeze(3);
		}
	}),
	chimera: (ctx, c, t) => {
		let atk = 0,
			hp = 0;
		for (const cr of c.owner.creatures) {
			if (cr) {
				atk += cr.trueatk();
				hp += cr.truehp();
			}
		}
		const chim = c.owner.newThing(c.card.as(ctx.Cards.Names.Chimera));
		chim.atk = atk;
		chim.maxhp = hp;
		chim.hp = hp;
		chim.active = imm.emptyMap;
		chim.setStatus('momentum', 1);
		chim.type = etg.Creature;
		const newCreatures = new Uint32Array(23);
		newCreatures[0] = chim.id;
		ctx.set(c.ownerId, 'creatures', newCreatures);
		c.owner.gpull = chim.id;
	},
	cpower: target('crea', (ctx, c, t) => {
		const buff = ctx.upto(25);
		t.buffhp(Math.floor(buff / 5) + 1);
		t.incrAtk((buff % 5) + 1);
	}),
	cseed: target('crea', (ctx, c, t) => {
		return Actives[
			ctx.choose([
				'drainlife',
				'firebolt',
				'freeze',
				'gpullspell',
				'icebolt',
				'infect',
				'lightning',
				'lobotomize',
				'parallel',
				'rewind',
				'snipe',
				'swave',
			])
		].func(ctx, c, t);
	}),
	dagger: (ctx, c, t) => {
		return c.owner.mark === etg.Darkness || c.owner.mark === etg.Death ? 1 : 0;
	},
	darkness: (ctx, c, t) => {
		c.owner.spend(etg.Darkness, -1);
	},
	deadalive: (ctx, c, t) => {
		c.deatheffect(c.getIndex());
	},
	decrsteam: (ctx, c) => {
		if (c.maybeDecrStatus('steam')) {
			c.incrAtk(-1);
		}
	},
	deja: (ctx, c, t) => {
		c.active = imm.delete(c.active, 'cast');
		Actives.parallel.func(ctx, c, c);
	},
	dessication: (ctx, c, t) => {
		function dryeffect(ctx, c, t) {
			c.spend(etg.Water, -t.dmg(2));
		}
		c.owner.foe.masscc(c.owner, dryeffect);
	},
	destroy: target('perm', (ctx, c, t, dontsalvage, donttalk) => {
		if (!donttalk) {
		}
		if (t.getStatus('stackable')) {
			const charges = t.getStatus('charges');
			if (charges <= 1) {
				t.remove();
			} else {
				t.setStatus('charges', charges - 1);
			}
		} else t.remove();
		if (!dontsalvage) {
			t.proc('destroy');
		}
	}),
	devour: target('devour', (ctx, c, t) => {
		c.buffhp(1);
		c.incrAtk(1);
		if (t.getStatus('poisonous')) {
			c.addpoison(1);
		}
		t.die();
	}),
	die: (ctx, c, t) => {
		c.die();
	},
	disfield: (ctx, c, t, dmg) => {
		if (c.owner.sanctuary) return false;
		if (!c.owner.spend(etg.Chroma, dmg)) {
			for (let i = 1; i < 13; i++) {
				c.owner.setQuanta(i, 0);
			}
			c.remove();
		}
		return true;
	},
	disshield: (ctx, c, t, dmg) => {
		if (c.owner.sanctuary) return false;
		if (!c.owner.spend(etg.Entropy, Math.ceil(dmg / 3))) {
			c.owner.setQuanta(etg.Entropy, 0);
			c.remove();
		}
		return true;
	},
	dive: (ctx, c, t) => {
		c.setStatus('dive', c.getStatus('dive') + c.trueatk());
	},
	divinity: (ctx, c, t) => {
		c.owner.buffhp(c.owner.mark === etg.Light ? 24 : 16);
	},
	drainlife: target('crea+play', (ctx, c, t) => {
		c.owner.dmg(
			-t.spelldmg(2 + Math.floor(c.owner.quanta[etg.Darkness] / 10) * 2),
		);
	}),
	dryspell: (ctx, c, t) => {
		function dryeffect(ctx, c, t) {
			c.spend(etg.Water, -t.dmg(1));
		}
		c.owner.foe.masscc(c.owner, dryeffect, true);
	},
	dshield: (ctx, c, t) => {
		c.setStatus('immaterial', 1);
	},
	duality: (ctx, c, t) => {
		if (c.owner.foe.deck.length > 0 && c.owner.hand.length < 8) {
			c.owner.addCard(
				c.owner.foe.deck[c.owner.foe.deckIds.length - 1].clone(c.ownerId),
			);
		}
	},
	earthquake: target('pill', (ctx, c, t) => {
		if (t.getStatus('charges') > 3) {
			t.setStatus('charges', t.getStatus('charges') - 3);
		} else {
			t.remove();
		}
		t.proc('destroy');
	}),
	empathy: (ctx, c, t) => {
		c.owner.dmg(-c.owner.countcreatures());
	},
	enchant: target('perm', (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Enchant', id: t.id });
		t.setStatus('immaterial', 1);
	}),
	endow: target('weap', (ctx, c, t) => {
		if (t.getStatus('momentum')) c.setStatus('momentum', 1);
		if (t.getStatus('ranged')) c.setStatus('ranged', 1);
		c.active = t.active;
		c.cast = t.cast;
		c.castele = t.castele;
		c.incrAtk(t.trueatk() - t.trigger('buff'));
		c.buffhp(2);
	}),
	evolve: (ctx, c, t) => {
		c.transform(c.card.as(ctx.Cards.Names.Shrieker));
		c.setStatus('burrowed', 0);
	},
	extract: (ctx, c, t) => {
		c.owner.spend(etg.Water, -c.truehp());
		c.die();
	},
	fiery: (ctx, c, t) => {
		return Math.floor(c.owner.quanta[etg.Fire] / 5);
	},
	firebolt: target('crea+play', (ctx, c, t) => {
		t.spelldmg(3 + 3 * Math.floor(c.owner.quanta[etg.Fire] / 10));
	}),
	flyingweapon: (ctx, c, t) => {
		const wp = c.owner.weapon;
		if (wp) {
			wp.remove();
			const cr = c.owner.newThing(wp.card);
			cr.atk = wp.atk;
			cr.active = wp.active;
			cr.cast = wp.cast;
			cr.castele = wp.castele;
			cr.setStatus('airborne', 1);
			c.owner.addCrea(cr);
		}
	},
	fractal: target('crea', (ctx, c, t) => {
		for (let i = 8; i > 0; i--) {
			const inst = t.owner.newThing(t.card);
			ctx.effect({ x: 'StartPos', id: inst.id, src: t.id });
			c.owner.addCard(inst);
		}
		c.owner.setQuanta(etg.Aether, 0);
	}),
	freeze: target('crea', (ctx, c, t) => {
		t.freeze(
			c.card.upped && c.card !== ctx.Cards.Names.Pandemonium.asUpped(true)
				? 4
				: 3,
		);
	}),
	gaincharge2: (ctx, c, t) => {
		c.incrStatus('charges', 2);
	},
	gas: (ctx, c, t) => {
		c.owner.addPerm(c.owner.newThing(c.card.as(ctx.Cards.Names.UnstableGas)));
	},
	gpull: (ctx, c, t) => {
		c.owner.gpull = c.id;
	},
	gpullspell: target('crea', (ctx, c, t) => {
		Actives.gpull.func(ctx, t);
	}),
	gratitude: (ctx, c, t) => {
		c.owner.dmg((c.owner.mark === etg.Life ? -5 : -3) * c.getStatus('charges'));
	},
	growth: (ctx, c, t) => {
		c.buffhp(2);
		c.incrAtk(2);
	},
	growth1: (ctx, c, t) => {
		c.incrAtk(1);
		c.buffhp(1);
	},
	guard: target('crea', (ctx, c, t) => {
		c.delay(1);
		t.delay(1);
		if (!t.getStatus('airborne')) {
			t.dmg(c.trueatk());
		}
	}),
	hammer: (ctx, c, t) => {
		return c.owner.mark === etg.Gravity || c.owner.mark === etg.Earth ? 1 : 0;
	},
	hasten: (ctx, c, t) => {
		c.owner.drawcard();
	},
	hatch: (ctx, c, t) => {
		const bans = [
			ctx.Cards.Names.ShardofFocus,
			ctx.Cards.Names.FateEgg,
			ctx.Cards.Names.Immortal,
			ctx.Cards.Names.Scarab,
			ctx.Cards.Names.DevonianDragon,
			ctx.Cards.Names.Chimera,
		];
		c.transform(
			ctx.randomcard(
				c.card.upped,
				x => x.type === etg.Creature && !bans.some(ban => x.isOf(ban)),
			),
		);
		if (c.getStatus('ready')) Actives.parallel.func(ctx, c, c);
	},
	heal: (ctx, c, t) => {
		c.owner.dmg(-20);
	},
	holylight: target('crea+play', (ctx, c, t) => {
		t.dmg(t.type !== etg.Player && t.getStatus('nocturnal') ? 10 : -10);
	}),
	hope: (ctx, c, t) => {
		let dr = 0;
		for (let i = 0; i < 23; i++) {
			if (
				c.owner.creatures[i] &&
				c.owner.creatures[i].hasactive('ownattack', 'quanta 8')
			) {
				dr++;
			}
		}
		c.setStatus('hope', dr);
	},
	hopedr: (ctx, c, t) => {
		return c.getStatus('hope');
	},
	icebolt: target('crea+play', (ctx, c, t) => {
		const bolts = Math.floor(c.owner.quanta[etg.Water] / 10);
		t.spelldmg(2 + bolts * 2);
		if (ctx.rng() < 0.35 + bolts / 10) {
			t.freeze(c.card.upped ? 4 : 3);
		}
	}),
	ignite: (ctx, c, t) => {
		c.die();
		c.owner.foe.spelldmg(20);
		c.owner.foe.masscc(
			c,
			function (ctx, c, x) {
				x.dmg(1);
			},
			true,
			true,
		);
	},
	immolate: target('own:crea', (ctx, c, t) => {
		t.die();
		if (!t.hasactive('ownattack', 'v_singularity')) {
			for (let i = 1; i < 13; i++) c.owner.spend(i, -1);
			c.owner.spend(etg.Fire, c.card.upped ? -7 : -5);
		}
	}),
	improve: target('crea', (ctx, c, t) => {
		const bans = [
			ctx.Cards.Names.ShardofFocus,
			ctx.Cards.Names.FateEgg,
			ctx.Cards.Names.Immortal,
			ctx.Cards.Names.Scarab,
			ctx.Cards.Names.DevonianDragon,
			ctx.Cards.Names.Chimera,
		];
		t.transform(
			ctx.randomcard(false, x => x.type === etg.Creature && !~bans.indexOf(x)),
		);
		t.buffhp(ctx.upto(5));
		t.incrAtk(ctx.upto(5));
		t.setStatus('mutant', 1);
		t.mutantactive();
	}),
	infect: target('crea', (ctx, c, t) => {
		t.addpoison(1);
	}),
	integrity: (ctx, c, t) => {
		const activeType = ['ownattack', 'hit', 'buff', 'death'];
		const shardTally = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
		const shardSkills = [
			[],
			['deadalive', 'mutation', 'paradox', 'improve', 'scramble', 'antimatter'],
			['infect', 'growth1', 'growth1', 'poison', 'aflatoxin', 'poison2'],
			['devour', 'devour', 'devour', 'devour', 'devour', 'blackhole'],
			['burrow', 'stoneform', 'guard', 'guard', 'bblood', 'bblood'],
			[
				'growth',
				'adrenaline',
				'adrenaline',
				'adrenaline',
				'adrenaline',
				'mitosis',
			],
			['ablaze', 'ablaze', 'fiery', 'destroy', 'destroy', 'rage'],
			['steam', 'steam', 'freeze', 'freeze', 'nymph', 'nymph'],
			['heal', 'endow', 'endow', 'luciferin', 'luciferin', 'luciferin'],
			['queen', 'queen', 'snipe', 'dive', 'gas', 'gas'],
			['scarab', 'scarab', 'deja', 'neuro', 'precognition', 'precognition'],
			['vampire', 'vampire', 'vampire', 'vampire', 'liquid', 'steal'],
			['lobotomize', 'lobotomize', 'lobotomize', 'quint', 'quint', 'quint'],
		];
		const shardCosts = {
			burrow: 1,
			stoneform: 1,
			guard: 1,
			petrify: 2,
			deadalive: 1,
			mutation: 2,
			paradox: 2,
			improve: 2,
			scramble: -2,
			antimatter: 4,
			infection: 1,
			growth1: -4,
			poison: -2,
			aflatoxin: 2,
			poison2: -2,
			devour: 3,
			blackhole: 4,
			growth: 2,
			adrenaline: 2,
			mitosis: 4,
			ablaze: 1,
			fiery: -3,
			destroy: 3,
			rage: 2,
			steam: 2,
			freeze: 2,
			nymph: 4,
			heal: 1,
			endow: 2,
			luciferin: 4,
			queen: 2,
			snipe: 2,
			dive: 2,
			gas: 2,
			scarab: 2,
			deja: 4,
			neuro: -2,
			precognition: 2,
			siphon: -1,
			vampire: -2,
			liquid: 2,
			steal: 3,
			lobotomize: 2,
			quint: 2,
		};
		const atkBuff = new Map([
				[etg.Earth, 1],
				[etg.Gravity, 0],
				[etg.Fire, 3],
			]),
			hpBuff = new Map([
				[etg.Earth, 4],
				[etg.Gravity, 6],
				[etg.Fire, 0],
			]);
		let hpStat = c.card.upped ? 2 : 1,
			atkStat = hpStat + 3,
			handIds = c.owner.handIds;
		for (let i = handIds.length - 1; i >= 0; i--) {
			const card = ctx.get(handIds[i]).get('card');
			if (etg.ShardList.some(x => x && card.isOf(ctx.Cards.Codes[x]))) {
				atkStat += (atkBuff.get(e) ?? 2) + card.upped;
				hpStat += (hpBuff.get(e) ?? 2) + card.upped;
				shardTally[card.element]++;
				handIds.splice(i, 1);
			}
		}
		c.owner.handIds = handIds;
		let active = 'burrow',
			num = 0;
		for (let i = 1; i < 13; i++) {
			const e = i === 1 ? etg.Earth : i - (i < etg.Earth);
			if (shardTally[i] > num) {
				num = shardTally[i];
				active = shardSkills[i][num - 1];
			}
		}
		let actives = new Map([
				[cost < 0 ? activeType[~cost] : 'cast', Actives[active]],
			]),
			cost = shardCosts[active],
			status = imm.emptyMap;
		if (shardTally[etg.Air] > 0) {
			status = new Map(status).set('airborne', 1);
		}
		if (shardTally[etg.Darkness] > 1) {
			status = new Map(status).set('voodoo', 1);
		} else if (shardTally[etg.Darkness] > 0) {
			actives = new Map(actives).set('ownattack', Actives.siphon);
		}
		if (shardTally[etg.Aether] > 1) {
			status = new Map(status).set('immaterial', 1);
		}
		if (shardTally[etg.Gravity] > 1) {
			status = new Map(status).set('momentum', 1);
		}
		if (shardTally[etg.Life] > 1) {
			status = new Map(status).set('adrenaline', 1);
		}
		c.owner.shardgolem = {
			hpStat: hpStat,
			atkStat: atkStat,
			status: status,
			active: actives,
			cast: cost,
		};
		c.owner.addCrea(c.owner.newThing(ctx.Cards.Names.ShardGolem));
	},
	lightning: target('crea+play', (ctx, c, t) => {
		t.spelldmg(5);
	}),
	liquid: target('crea', (ctx, c, t) => {
		t.lobo();
		t.setSkill('hit', Actives.vampire);
		t.addpoison(1);
	}),
	lobotomize: target('crea', (ctx, c, t) => {
		t.lobo();
		t.setStatus('momentum', 0);
		t.setStatus('psionic', 0);
		t.setStatus('mutant', 0);
		t.casts = 0;
	}),
	losecharge: (ctx, c, t) => {
		if (!c.maybeDecrStatus('charges')) {
			c.remove();
		}
	},
	luciferin: (ctx, c, t) => {
		c.owner.dmg(-10);
		for (const cr of c.owner.creatures) {
			if (!cr) continue;
			let givelight = true;
			for (const [key, skill] of cr.active) {
				if (
					key !== 'ownplay' &&
					key !== 'owndiscard' &&
					!skill.name.every(name => parseSkill(name).passive)
				) {
					givelight = false;
					break;
				}
			}
			if (givelight) cr.addactive('ownattack', parseSkill('quanta 8'));
		}
	},
	lycanthropy: (ctx, c, t) => {
		c.buffhp(5);
		c.incrAtk(5);
		c.rmactive('cast', 'v_lycanthropy');
	},
	mend: target('crea', (ctx, c, t) => {
		t.dmg(-5);
	}),
	miracle: (ctx, c, t) => {
		c.owner.setQuanta(etg.Light);
		if (c.owner.sosa) {
			c.owner.hp = 1;
		} else {
			c.owner.hp = c.owner.maxhp - 1;
		}
	},
	mitosis: (ctx, c, t) => {
		c.owner.addCrea(c.owner.newThing(c.card));
	},
	mitosisspell: target('creacrea', (ctx, c, t) => {
		t.lobo();
		t.setSkill('cast', Actives.mitosis);
		t.castele = t.card.element;
		t.cast = t.card.cost;
	}),
	momentum: target('crea', (ctx, c, t) => {
		t.incrAtk(1);
		t.buffhp(1);
		t.setStatus('momentum', 1);
	}),
	mutation: target('crea', (ctx, c, t) => {
		const rnd = ctx.rng();
		if (rnd < 0.1) {
			t.die();
		} else if (rnd < 0.5) {
			Actives.improve.func(ctx, c, t);
		} else {
			t.transform(ctx.Cards.Names.Abomination);
		}
	}),
	neuro: vadrenathrottle((ctx, c, t) => {
		t.addpoison(1);
		if (t.type === etg.Player) t.setStatus('neuro', 1);
	}),
	nightmare: target('crea', (ctx, c, t) => {
		if (!c.owner.foe.sanctuary) {
			c.owner.dmg(-c.owner.foe.dmg(16 - c.owner.foe.hand.length * 2));
			for (let i = c.owner.foe.hand.length; i < 8; i++) {
				c.owner.foe.addCard(c.owner.foe.newThing(t.card));
			}
		}
	}),
	nova: (ctx, c, t) => {
		for (let i = 1; i < 13; i++) {
			c.owner.spend(i, -1);
		}
		c.owner.incrStatus('nova', 1);
		if (c.owner.getStatus('nova') >= 3) {
			c.owner.addCrea(c.owner.newThing(ctx.Cards.Names.Singularity));
		}
	},
	nova2: (ctx, c, t) => {
		for (let i = 1; i < 13; i++) {
			c.owner.spend(i, -2);
		}
		c.owner.incrStatus('nova2', 1);
		if (c.owner.getStatus('nova2') >= 2) {
			c.owner.addCrea(
				c.owner.newThing(ctx.Cards.Names.Singularity.asUpped(true)),
			);
		}
	},
	nymph: target('pill', (ctx, c, t) => {
		const e =
			(!t.card.name.match(/^Mark of /) && t.card.element) || ctx.upto(12) + 1;
		Actives.destroy.func(ctx, c, t, false, true);
		const nymph = t.owner.newThing(
			t.card.as(ctx.Cards.Codes[etg.NymphList[e] - 4000]),
		);
		ctx.effect({ x: 'StartPos', id: nymph.id, src: t.id });
		t.owner.addCrea(nymph);
	}),
	obsession: (ctx, c, t) => {
		c.owner.dmg(c.card.upped ? 13 : 10);
	},
	overdrive: (ctx, c, t) => {
		c.incrAtk(3);
		c.dmg(1, true);
	},
	overdrivespell: target('crea', (ctx, c, t) => {
		t.lobo();
		t.setSkill('ownattack', Actives.overdrive);
	}),
	pandemonium: (ctx, c, t) => {
		c.owner.foe.masscc(c, Actives.cseed.func, !c.card.upped);
	},
	paradox: target('paradox', (ctx, c, t) => {
		t.die();
	}),
	parallel: target('crea', (ctx, c, t) => {
		if (t.card.isOf(ctx.Cards.Names.Chimera)) {
			Actives.chimera(ctx, c);
			return;
		}
		const copy = t.clone(c.owner);
		c.owner.addCrea(copy);
		copy.setStatus('airborne', copy.card.getStatus('airborne'));
		if (copy.getStatus('mutant')) {
			const buff = ctx.upto(25);
			t.buffhp(Math.floor(buff / 5));
			t.incrAtk(buff % 5);
			t.mutantactive();
		}
		if (copy.getStatus('voodoo')) {
			copy.owner.foe.dmg(copy.maxhp - copy.hp);
		}
		copy.casts = 0;
	}),
	phoenix: (ctx, c, t, data) => {
		if (!c.owner.creatures[data.index]) {
			const ash = c.owner.newThing(c.card.as(ctx.Cards.Names.Ash));
			ash.type = etg.Creature;
			const creatures = new Uint32Array(c.owner.creatureIds);
			creatures[data.index] = ash.id;
			c.owner.creatureIds = creatures;
		}
	},
	photosynthesis: (ctx, c, t) => {
		c.owner.spend(etg.Life, -2);
		if (c.cast > 0) c.casts = 1;
	},
	plague: (ctx, c, t) => {
		c.owner.foe.masscc(c, Actives.infect.func);
	},
	platearmor: target('crea', (ctx, c, t) => {
		t.buffhp(c.card.upped ? 6 : 3);
	}),
	poison: vadrenathrottle((ctx, c, t) => {
		(t || c.owner.foe).addpoison(1);
	}),
	poison2: vadrenathrottle((ctx, c, t) => {
		(t || c.owner.foe).addpoison(2);
	}),
	poison3: (ctx, c, t) => {
		(t || c.owner.foe).addpoison(3);
	},
	precognition: (ctx, c, t) => {
		c.owner.precognition = true;
		c.owner.drawcard();
	},
	purify: target('crea+play', (ctx, c, t) => {
		t.setStatus('poison', Math.min(t.getStatus('poison') - 2, -2));
		if (t.type === etg.Player) {
			t.setStatus('neuro', 0);
			t.sosa = 0;
		} else {
			t.setStatus('aflatoxin', 0);
		}
	}),
	queen: (ctx, c, t) => {
		c.owner.addCrea(c.owner.newThing(c.card.as(ctx.Cards.Names.Firefly)));
	},
	quint: target('crea', (ctx, c, t) => {
		t.setStatus('immaterial', true);
		t.setStatus('frozen', 0);
	}),
	rage: target('crea', (ctx, c, t) => {
		const dmg = c.card.upped ? 6 : 5;
		t.incrAtk(dmg);
		t.dmg(dmg);
	}),
	readiness: target('crea', (ctx, c, t) => {
		if (t.getSkill('cast')) {
			t.cast = 0;
			if (t.card.element === etg.Time && !t.getStatus('ready')) {
				t.setStatus('ready', 1);
				t.casts = 2;
				t.addactive('ownspell', Actives.ready);
			}
		}
	}),
	ready: (ctx, c, t) => {
		if (c.maybeDecrStatus('ready') > 1) {
			c.casts++;
		}
	},
	rebirth: (ctx, c, t) => {
		c.transform(c.card.as(ctx.Cards.Names.Phoenix));
	},
	regenerate: (ctx, c, t) => {
		if (!c.getStatus('delayed')) {
			c.owner.dmg(-5);
		}
	},
	relic: (ctx, c, t) => {
		c.owner.addCard(c);
	},
	rewind: target('crea', (ctx, c, t) => {
		if (t.card.isOf(ctx.Cards.Names.Skeleton)) {
			Actives.hatch.func(ctx, t);
		} else if (t.card.isOf(ctx.Cards.Names.Mummy)) {
			t.transform(t.card.as(ctx.Cards.Names.Pharaoh));
		} else {
			if (t.getStatus('voodoo') && t.getStatus('poison') < 0) {
				t.owner.foe.addpoison(-t.getStatus('poison'));
			}
			t.remove();
			t.owner.deckpush(t.owner.newThing(t.card).id);
		}
	}),
	salvage: (ctx, c, t) => {
		if (
			c.owner !== t.owner &&
			!c.getStatus('salvaged') &&
			!t.getStatus('salvaged') &&
			c.owner.game.turn !== c.owner
		) {
			c.setStatus('salvaged', 1);
			t.setStatus('salvaged', 1);
			c.owner.addCard(c.owner.newThing(t.card));
		}
	},
	sanctuary: (ctx, c, t) => {
		c.owner.sanctuary = true;
		c.owner.dmg(-4);
	},
	scarab: (ctx, c, t) => {
		c.owner.addCrea(c.owner.newThing(c.card.as(ctx.Cards.Names.Scarab)));
	},
	scramble: (ctx, c, t) => {
		if (t.type === etg.Player && !t.sanctuary) {
			let n = 0;
			for (let i = 0; i < 9; i++) {
				if (t.spend(etg.Chroma, 1)) {
					n++;
				} else break;
			}
			while (n--) {
				t.spend(etg.Chroma, -1);
			}
		}
	},
	serendipity: (ctx, c, t) => {
		const num = Math.min(8 - c.owner.hand.length, 3);
		let anyentro = false;
		for (let i = num - 1; ~i; i--) {
			const card = ctx.randomcard(
				c.card.upped,
				x =>
					(!x.getStatus('pillar') || !x.name.match(/^Mark/)) &&
					!x.isOf(ctx.Cards.Names.Relic) &&
					!x.isOf(ctx.Cards.Names.Miracle) &&
					!etg.ShardList.some(
						shard => shard && x.isOf(ctx.Cards.Codes[shard - 4000]),
					) &&
					!etg.NymphList.some(
						nymph => nymph && x.isOf(ctx.Cards.Codes[nymph - 4000]),
					) &&
					(i > 0 || anyentro || x.element === etg.Entropy),
			);
			anyentro |= card.element === etg.Entropy;
			const inst = c.owner.newThing(card);
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
			c.owner.addCard(inst);
		}
	},
	silence: (ctx, c, t) => {
		if (!c.owner.foe.sanctuary) {
			c.owner.foe.casts = 0;
		}
	},
	singularity: (ctx, c, t) => {
		if (c.trueatk() > 0) {
			Actives.antimatter.func(ctx, c, c);
			return;
		}
		const r = ctx.upto(12);
		if (r === 0) {
			Actives.nova.func(ctx, c.owner.foe);
			c.owner.foe.nova = 0;
		} else if (r < 3) {
			c.setSkill('hit', Actives.vampire);
		} else if (r < 5) {
			Actives.quint.func(ctx, c, c);
		} else if (r < 7) {
			const buff = ctx.upto(25);
			c.buffhp(Math.floor(buff / 5) + 1);
			c.incrAtk(-(buff % 5) - 1);
		} else if (r < 9) {
			c.setStatus('adrenaline', 1);
		} else if (r < 11) {
			Actives.parallel.func(ctx, c, c);
		}
	},
	siphon: vadrenathrottle((ctx, c, t) => {
		if (
			!c.owner.foe.getStatus('sanctuary') &&
			c.owner.foe.spend(etg.Chroma, 1)
		) {
			c.owner.spend(etg.Darkness, -1);
		}
	}),
	skyblitz: (ctx, c, t) => {
		c.owner.setQuanta(etg.Air, 0);
		for (let i = 0; i < 23; i++) {
			const cr = c.owner.creatures[i];
			if (cr && cr.getStatus('airborne') && cr.isMaterial(etg.Creature)) {
				cr.incrStatus('dive', cr.trueatk());
				const dive = cr.getStatus('dive');
				cr.setStatus('dive', dive + cr.trueatk());
			}
		}
	},
	snipe: target('crea', (ctx, c, t) => {
		t.dmg(3);
	}),
	sosa: (ctx, c, t) => {
		const sosa = c.owner.getStatus('sosa');
		const quanta = new Int8Array(13);
		quanta[etg.Death] = c.owner.quanta[etg.Death];
		ctx.set(c.ownerId, 'quanta', quanta);
		c.owner.setStatus('sosa', 0);
		c.owner.dmg(c.card.upped ? 40 : 48);
		c.owner.setStatus('sosa', sosa + 2);
	},
	soulcatch: (ctx, c, t) => {
		c.owner.spend(etg.Death, c.card.upped ? -3 : -2);
	},
	sskin: (ctx, c, t) => {
		c.owner.buffhp(c.owner.quanta[etg.Earth] - c.card.cost);
	},
	steal: target('foe:perm', (ctx, c, t) => {
		if (t.getStatus('stackable')) {
			Actives.destroy.func(ctx, c, t, true);
			if (t.type === etg.Shield) {
				if (c.owner.shield && c.owner.shield.card === t.card) {
					c.owner.shield.setStatus(
						'charges',
						c.owner.shield.getStatus('charges') + 1,
					);
				} else {
					const inst = c.owner.newThing(t.card);
					ctx.effect({ x: 'StartPos', id: inst.id, src: t.id });
					c.owner.setShield(inst);
					c.owner.shield.setStatus('charges', 1);
				}
			} else {
				const inst = c.owner.newThing(t.card);
				ctx.effect({ x: 'StartPos', id: inst.id, src: t.id });
				c.owner.addPerm(inst);
			}
		} else {
			t.remove();
			t.casts = 0;
			if (t.card.isOf(ctx.Cards.Names.Sundial))
				t.setStatus('charges', t.getStatus('charges') + 1);
			if (t.type === etg.Permanent) c.owner.addPerm(t);
			else if (t.type === etg.Weapon) c.owner.setWeapon(t);
			else c.owner.setShield(t);
		}
	}),
	steam: (ctx, c, t) => {
		c.incrStatus('steam', 5);
		c.incrAtk(5);
		if (!c.hasactive('postauto', 'v_decrsteam'))
			c.addactive('postauto', Actives.decrsteam);
	},
	stoneform: (ctx, c, t) => {
		c.buffhp(20);
		c.active = imm.delete(c.active, 'cast');
	},
	storm2: (ctx, c, t) => {
		c.owner.foe.masscc(c, function (ctx, c, x) {
			x.dmg(2);
		});
	},
	storm3: (ctx, c, t) => {
		c.owner.foe.masscc(c, Actives.snipe.func);
	},
	swarm: (ctx, c, t) => {
		let hp = -1;
		for (let i = 0; i < 23; i++) {
			if (
				c.owner.creatures[i] &&
				c.owner.creatures[i].hasactive('ownattack', 'v_swarm')
			) {
				hp++;
			}
		}
		c.setStatus('swarmhp', hp);
	},
	swarmhp: (ctx, c, t) => {
		return c.getStatus('swarmhp');
	},
	swave: target('crea+play', (ctx, c, t) => {
		if (t.getStatus('frozen')) {
			t.die();
		} else {
			if (t.type === etg.Player && t.weapon && t.weapon.getStatus('frozen')) {
				Actives.destroy.func(ctx, c, t.weapon);
			}
			t.spelldmg(4);
		}
	}),
	unburrow: (ctx, c, t) => {
		c.setStatus('burrowed', 0);
		c.setSkill('cast', Actives.burrow);
		c.cast = 1;
		c.atk *= 2;
	},
	upkeep: (ctx, c, t) => {
		if (!c.owner.spend(c.card.element, 1)) {
			c.die();
		}
	},
	vampire: (ctx, c, t, dmg) => {
		c.owner.dmg(-dmg);
	},
	virusinfect: target('crea', (ctx, c, t) => {
		Actives.infect.func(ctx, c, t);
		c.die();
	}),
	virusplague: (ctx, c, t) => {
		Actives.plague.func(ctx, c, t);
		c.die();
	},
	void: (ctx, c, t) => {
		c.owner.foe.maxhp = Math.max(
			c.owner.foe.maxhp -
				(c.owner.mark === etg.Darkness ? 3 : 2) * c.getStatus('charges'),
			1,
		);
		if (c.owner.foe.hp > c.owner.foe.maxhp) {
			c.owner.foe.hp = c.owner.foe.maxhp;
		}
	},
	web: target('crea', (ctx, c, t) => {
		t.setStatus('airborne', 0);
	}),
	wisdom: target('quinttog', (ctx, c, t) => {
		t.incrAtk(4);
		if (t.getStatus('immaterial')) {
			t.setStatus('psionic', 1);
		}
	}),
	pillar: (ctx, c, t) => {
		if (!t)
			c.owner.spend(
				c.card.element,
				c.getStatus('charges') * (c.card.element > 0 ? -1 : -3),
			);
		else if (c === t)
			c.owner.spend(c.card.element, c.card.element > 0 ? -1 : -3);
	},
	pend: (ctx, c, t) => {
		const ele = c.getStatus('pendstate') ? c.owner.mark : c.card.element;
		c.owner.spend(ele, -c.getStatus('charges') * (ele > 0 ? 1 : 3));
		c.setStatus('pendstate', +!c.getStatus('pendstate'));
	},
	blockwithcharge: (ctx, c, t) => {
		if (c.maybeDecrStatus('charges') < 2) {
			c.remove();
		}
		return true;
	},
	cold: (ctx, c, t) => {
		if (t.type === etg.Creature && ctx.rng() < 0.3) {
			t.freeze(3);
		}
	},
	evade100: (ctx, c, t) => true,
	evade40: (ctx, c, t) => ctx.rng() < 0.4,
	evade50: (ctx, c, t) => ctx.rng() < 0.5,
	firewall: (ctx, c, t) => {
		if (t.type === etg.Creature) {
			t.dmg(1);
		}
	},
	skull: (ctx, c, t) => {
		if (t.type === etg.Creature && !t.card.isOf(ctx.Cards.Names.Skeleton)) {
			const thp = t.truehp();
			if (thp === 0 || (thp > 0 && ctx.rng() < 0.5 / thp)) {
				const index = t.getIndex();
				t.die();
				if (
					!t.owner.creatures[index] ||
					t.owner.creatures[index].card !== ctx.Cards.Names.MalignantCell
				) {
					const skele = t.owner.newThing(t.card.as(ctx.Cards.Names.Skeleton));
					t.owner.setCrea(index, skele.id);
				}
			}
		}
	},
	slow: (ctx, c, t) => {
		if (t.type === etg.Creature) {
			t.delay(2);
		}
	},
	solar: (ctx, c, t) => {
		if (!c.owner.sanctuary) c.owner.spend(etg.Light, -1);
	},
	thorn: (ctx, c, t) => {
		if (t.type === etg.Creature && ctx.rng() < 0.75) {
			t.addpoison(1);
		}
	},
	weight: (ctx, c, t) => t.type === etg.Creature && t.truehp() > 5,
	wings: (ctx, c, t) => !t.getStatus('airborne') && !t.getStatus('ranged'),
};
const passives = new Set([
	'decrsteam',
	'obsession',
	'salvage',
	'siphon',
	'swarm',
]);
for (const key in Actives) {
	const f = Actives[key];
	Actives[key] = new Skill(
		['v_' + key],
		f,
		passives.has(key),
		targetMap.get(f),
	);
}
export default Actives;
