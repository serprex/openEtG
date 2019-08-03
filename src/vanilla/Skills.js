import * as imm from '../immutable.js';
import Skill from '../Skill.js';
import * as etg from '../etg.js';

function vadrenathrottle(f) {
	return function(ctx, c, ...args) {
		if (c.getStatus('adrenaline') < 3) {
			return f(c, ...args);
		}
	};
}
const Actives = {
	noluci: ctx => {},
	ablaze: (ctx, c, t) => {
		c.atk += 2;
	},
	acceleration: (ctx, c, t) => {
		c.atk += 2;
		c.dmg(1, true);
	},
	accelerationspell: (ctx, c, t) => {
		t.lobo();
		t.active = t.active.set('ownattack', Actives.acceleration);
	},
	accretion: (ctx, c, t) => {
		Actives.destroy.func(ctx, ctx, c, t);
		c.buffhp(15);
		if (c.truehp() > 45) {
			c.die();
			c.remove();
			c.transform(c.card.as(ctx.Cards.Names.BlackHole));
			c.owner.addCard(c);
		}
	},
	adrenaline: (ctx, c, t) => {
		t.setStatus('adrenaline', 1);
	},
	aflatoxin: (ctx, c, t) => {
		t.addpoison(2);
		if (t.type != etg.Player) {
			t.setStatus('aflatoxin', 1);
		}
	},
	air: (ctx, c, t) => {
		c.owner.spend(etg.Air, -1);
	},
	antimatter: (ctx, c, t) => {
		t.atk -= t.trueatk() * 2;
	},
	bblood: (ctx, c, t) => {
		t.buffhp(20);
		t.setStatus('delayed', 6);
	},
	blackhole: (ctx, c, t) => {
		if (!c.owner.foe.sanctuary) {
			for (var q = 1; q < 13; q++) {
				c.owner.dmg(-Math.min(c.owner.foe.quanta[q], 3));
				c.owner.foe.setQuanta(q, Math.max(c.owner.foe.quanta[q] - 3, 0));
			}
		}
	},
	bless: (ctx, c, t) => {
		t.atk += 3;
		t.buffhp(3);
	},
	boneyard: (ctx, c, t) => {
		if (!t.card.isOf(ctx.Cards.Names.Skeleton)) {
			c.owner.addCrea(c.owner.newThing(c.card.as(ctx.Cards.Names.Skeleton)));
		}
	},
	bow: (ctx, c, t) => {
		return c.owner.mark == etg.Air ? 1 : 0;
	},
	bravery: (ctx, c, t) => {
		if (!c.owner.foe.getStatus('sanctuary')) {
			var n = c.owner.mark == etg.Fire ? 3 : 2;
			for (
				var i = 0;
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
		c.active = c.active.set('cast', Actives.unburrow);
		c.cast = 0;
		c.atk = Math.floor(c.atk / 2);
	},
	butterfly: (ctx, c, t) => {
		t.lobo();
		t.active = t.active.set('cast', Actives.destroy);
		t.cast = 3;
		t.castele = etg.Entropy;
	},
	catapult: (ctx, c, t) => {
		t.die();
		c.owner.foe.dmg(
			Math.ceil(
				(t.truehp() * (t.status.get('frozen') ? 150 : 100)) /
					(t.truehp() + 100),
			),
		);
		if (t.status.get('poison')) {
			c.owner.foe.addpoison(t.status.get('poison'));
		}
		if (t.status.get('frozen')) {
			c.owner.foe.freeze(3);
		}
	},
	chimera: (ctx, c, t) => {
		var atk = 0,
			hp = 0;
		for (var i = 0; i < 23; i++) {
			if (c.owner.creatures[i]) {
				atk += c.owner.creatures[i].trueatk();
				hp += c.owner.creatures[i].truehp();
			}
		}
		const chim = c.owner.newThing(c.card.as(ctx.Cards.Names.Chimera));
		chim.atk = atk;
		chim.maxhp = hp;
		chim.hp = hp;
		chim.active = new imm.Map();
		chim.setStatus('momentum', 1);
		const newCreatures = new Uint32Array(23);
		newCreatures[0] = chim.id;
		ctx.set(c.ownerId, 'creatures', newCreatures);
		c.owner.gpull = chim.id;
	},
	cpower: (ctx, c, t) => {
		var buff = ctx.upto(25);
		t.buffhp(Math.floor(buff / 5) + 1);
		t.atk += (buff % 5) + 1;
	},
	cseed: (ctx, c, t) => {
		return Actives[
			[
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
			][ctx.upto(12)]
		].func(ctx, c, t);
	},
	dagger: (ctx, c, t) => {
		return c.owner.mark == etg.Darkness || c.owner.mark == etg.Death ? 1 : 0;
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
		c.active = c.active.delete('cast');
		Actives.parallel.func(ctx, c, c);
	},
	dessication: (ctx, c, t) => {
		function dryeffect(ctx, c, t) {
			c.spend(etg.Water, -t.dmg(2));
		}
		c.owner.foe.masscc(c.owner, dryeffect);
	},
	destroy: (ctx, c, t, dontsalvage, donttalk) => {
		if (!donttalk) {
		}
		if (t.status.get('stackable')) {
			const charges = t.status.get('charges');
			if (charges <= 1) {
				t.remove();
			} else {
				t.status = t.status.set('charges', charges - 1);
			}
		} else t.remove();
		if (!dontsalvage) {
			t.proc('destroy');
		}
	},
	devour: (ctx, c, t) => {
		c.buffhp(1);
		c.atk += 1;
		if (t.status.get('poisonous')) {
			c.addpoison(1);
		}
		t.die();
	},
	die: (ctx, c, t) => {
		c.die();
	},
	disfield: (ctx, c, t, dmg) => {
		if (c.owner.sanctuary) return false;
		if (!c.owner.spend(etg.Chroma, dmg)) {
			for (var i = 1; i < 13; i++) {
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
		c.owner.buffhp(c.owner.mark == etg.Light ? 24 : 16);
	},
	drainlife: (ctx, c, t) => {
		c.owner.dmg(
			-t.spelldmg(2 + Math.floor(c.owner.quanta[etg.Darkness] / 10) * 2),
		);
	},
	dryspell: (ctx, c, t) => {
		function dryeffect(ctx, c, t) {
			c.spend(etg.Water, -t.dmg(1));
		}
		c.owner.foe.masscc(c.owner, dryeffect, true);
	},
	dshield: (ctx, c, t) => {
		c.status = c.status.set('immaterial', true);
	},
	duality: (ctx, c, t) => {
		if (c.owner.foe.deck.length > 0 && c.owner.hand.length < 8) {
			c.owner.addCard(
				c.owner.foe.deck[c.owner.foe.deckIds.length - 1].clone(c.ownerId),
			);
		}
	},
	durability: (ctx, c, t) => {
		if (!c.owner.shield || c.owner.shield.status.get('durability') == 'used')
			return;
		c.owner.shield.status = c.owner.shield.status.set('durability', 'usable');
	},
	earth: (ctx, c, t) => {
		c.owner.spend(etg.Earth, -1);
	},
	earthquake: (ctx, c, t) => {
		if (t.status.get('charges') > 3) {
			t.status = t.status.set('charges', t.status.get('charges') - 3);
		} else {
			t.remove();
		}
		t.proc('destroy');
	},
	empathy: (ctx, c, t) => {
		var healsum = c.owner.countcreatures();
		c.owner.dmg(-healsum);
	},
	enchant: (ctx, c, t) => {
		t.status = t.status.set('immaterial', true);
	},
	endow: (ctx, c, t) => {
		if (t.status.get('momentum')) c.status = c.status.set('momentum', true);
		if (t.status.get('ranged')) c.status = c.status.set('ranged', true);
		c.active = t.active;
		c.cast = t.cast;
		c.castele = t.castele;
		c.atk += t.trueatk() - t.trigger('buff');
		c.buffhp(2);
	},
	evolve: (ctx, c, t) => {
		c.transform(ctx.Cards.Names.Shrieker.asUpped(c.card.upped));
		c.status = c.status.delete('burrowed');
	},
	extract: (ctx, c, t) => {
		c.owner.spend(etg.Water, -c.truehp());
		c.die();
	},
	fiery: (ctx, c, t) => {
		return Math.floor(c.owner.quanta[etg.Fire] / 5);
	},
	fire: (ctx, c, t) => {
		c.owner.spend(etg.Fire, -1);
	},
	firebolt: (ctx, c, t) => {
		t.spelldmg(3 + 3 * Math.floor(c.owner.quanta[etg.Fire] / 10));
	},
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
			cr.place();
		}
	},
	fractal: (ctx, c, t) => {
		for (var i = 8; i > 0; i--) {
			const inst = t.owner.newThing(t.card);
			ctx.effect({ x: 'StartPos', id: inst.id, src: t.id });
			c.owner.addCard(inst);
		}
		c.owner.setQuanta(etg.Aether, 0);
	},
	freeze: (ctx, c, t) => {
		t.freeze(
			c.card.upped && c.card != ctx.Cards.Names.Pandemonium.asUpped(true)
				? 4
				: 3,
		);
	},
	gaincharge2: (ctx, c, t) => {
		c.incrStatus('charges', 2);
	},
	gas: (ctx, c, t) => {
		c.owner.addPerm(c.owner.newThing(c.card.as(ctx.Cards.Names.UnstableGas)));
	},
	gpull: (ctx, c, t) => {
		c.owner.gpull = c.id;
	},
	gpullspell: (ctx, c, t) => {
		Actives.gpull.func(ctx, t);
	},
	gratitude: (ctx, c, t) => {
		var b = (c.owner.mark == etg.Life ? -5 : -3) * c.status.get('charges');
		c.owner.dmg(b);
	},
	growth: (ctx, c, t) => {
		c.buffhp(2);
		c.atk += 2;
	},
	growth1: (ctx, c, t) => {
		c.atk += 1;
		c.buffhp(1);
	},
	guard: (ctx, c, t) => {
		c.delay(1);
		t.delay(1);
		if (!t.status.get('airborne')) {
			t.dmg(c.trueatk());
		}
	},
	hammer: (ctx, c, t) => {
		return c.owner.mark == etg.Gravity || c.owner.mark == etg.Earth ? 1 : 0;
	},
	hasten: (ctx, c, t) => {
		c.owner.drawcard();
	},
	hatch: (ctx, c, t) => {
		var bans = [
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
				x => x.type == etg.Creature && !bans.some(ban => x.isOf(ban)),
			),
		);
		if (c.status.get('ready')) Actives.parallel.func(ctx, c, c);
	},
	heal: (ctx, c, t) => {
		c.owner.dmg(-20);
	},
	holylight: (ctx, c, t) => {
		t.dmg(t.type != etg.Player && t.status.get('nocturnal') ? 10 : -10);
	},
	hope: (ctx, c, t) => {
		let dr = 0;
		for (let i = 0; i < 23; i++) {
			if (
				c.owner.creatures[i] &&
				c.owner.creatures[i].hasactive('ownattack', 'v_light')
			) {
				dr++;
			}
		}
		c.setStatus('hope', dr);
	},
	hopedr: (ctx, c, t) => {
		return c.getStatus('hope');
	},
	icebolt: (ctx, c, t) => {
		var bolts = Math.floor(c.owner.quanta[etg.Water] / 10);
		t.spelldmg(2 + bolts * 2);
		if (ctx.rng() < 0.35 + bolts / 10) {
			t.freeze(c.card.upped ? 4 : 3);
		}
	},
	ignite: (ctx, c, t) => {
		c.die();
		c.owner.foe.spelldmg(20);
		c.owner.foe.masscc(
			c,
			function(ctx, c, x) {
				x.dmg(1);
			},
			true,
			true,
		);
	},
	immolate: (ctx, c, t) => {
		t.die();
		if (!t.hasactive('ownattack', 'v_singularity')) {
			for (var i = 1; i < 13; i++) c.owner.spend(i, -1);
			c.owner.spend(etg.Fire, c.card.upped ? -7 : -5);
		}
	},
	improve: (ctx, c, t) => {
		var bans = [
			ctx.Cards.Names.ShardofFocus,
			ctx.Cards.Names.FateEgg,
			ctx.Cards.Names.Immortal,
			ctx.Cards.Names.Scarab,
			ctx.Cards.Names.DevonianDragon,
			ctx.Cards.Names.Chimera,
		];
		t.transform(
			ctx.randomcard(false, x => x.type == etg.Creature && !~bans.indexOf(x)),
		);
		t.buffhp(ctx.upto(5));
		t.atk += ctx.upto(5);
		t.status = t.status.set('mutant', true);
		t.mutantactive();
	},
	infect: (ctx, c, t) => {
		t.addpoison(1);
	},
	integrity: (ctx, c, t) => {
		var activeType = ['ownattack', 'hit', 'buff', 'death'];
		var shardTally = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
		var shardSkills = [
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
		var shardCosts = {
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
		var atkBuff = [],
			hpBuff = [];
		atkBuff[etg.Earth] = 1;
		hpBuff[etg.Earth] = 4;
		atkBuff[etg.Gravity] = 0;
		hpBuff[etg.Gravity] = 6;
		atkBuff[etg.Fire] = 3;
		hpBuff[etg.Fire] = 0;
		var hpStat = c.card.upped ? 2 : 1,
			atkStat = hpStat + 3;
		for (var i = c.owner.hand.length - 1; i >= 0; i--) {
			var card = c.owner.hand[i].card;
			if (etg.ShardList.some(x => x && card.isOf(ctx.Cards.Codes[x]))) {
				atkStat += (atkBuff[e] || 2) + card.upped;
				hpStat += (hpBuff[e] || 2) + card.upped;
				shardTally[card.element]++;
				c.owner.hand.splice(i, 1);
			}
		}
		var active = 'burrow',
			num = 0;
		for (var i = 1; i < 13; i++) {
			var e = i == 1 ? etg.Earth : i - (i < etg.Earth);
			if (shardTally[i] > num) {
				num = shardTally[i];
				active = shardSkills[i][num - 1];
			}
		}
		var actives = new imm.Map().set(
				cost < 0 ? activeType[~cost] : 'cast',
				Actives[active],
			),
			cost = shardCosts[active];
		var status = new imm.Map();
		if (shardTally[etg.Air] > 0) {
			status = status.set('airborne', true);
		}
		if (shardTally[etg.Darkness] > 1) {
			status = status.set('voodoo', true);
		} else if (shardTally[etg.Darkness] > 0) {
			actives = actives.set('ownattack', Actives.siphon);
		}
		if (shardTally[etg.Aether] > 1) {
			status = status.set('immaterial', true);
		}
		if (shardTally[etg.Gravity] > 1) {
			status = status.set('momentum', true);
		}
		if (shardTally[etg.Life] > 1) {
			status = status.set(adrenaline, 1);
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
	light: (ctx, c, t) => {
		c.owner.spend(etg.Light, -1);
	},
	lightning: (ctx, c, t) => {
		t.spelldmg(5);
	},
	liquid: (ctx, c, t) => {
		t.lobo();
		t.active = t.active.set('hit', Actives.vampire);
		t.addpoison(1);
	},
	lobotomize: (ctx, c, t) => {
		t.lobo();
		t.setStatus('momentum', 0);
		t.setStatus('psion', 0);
		t.setStatus('mutant', 0);
		t.casts = 0;
	},
	locket: (ctx, c, t) => {
		var ele =
			c.status.get('mode') === undefined ? c.owner.mark : c.status.get('mode');
		c.owner.spend(ele, ele > 0 ? -1 : -3);
	},
	locketshift: (ctx, c, t) => {
		c.status.set('mode', t.type == etg.Player ? t.mark : t.card.element);
	},
	losecharge: (ctx, c, t) => {
		if (!c.maybeDecrStatus('charges')) {
			c.remove();
		}
	},
	luciferin: (ctx, c, t) => {
		c.owner.dmg(-10);
		// TODO Fix salvagers & other passive-active-still-luciable
		c.owner.masscc(c, function(ctx, c, x) {
			for (var key of x.active.keys()) {
				if (
					key != 'ownplay' &&
					key != 'owndiscard' &&
					!x.active.get(key).name.every(name => Actives[name].passive)
				)
					return;
			}
			x.addactive('ownattack', Actives.light);
		});
	},
	lycanthropy: (ctx, c, t) => {
		c.buffhp(5);
		c.atk += 5;
		c.rmactive('cast', 'lycanthropy');
	},
	mend: (ctx, c, t) => {
		var target = t || c;
		target.dmg(-5);
	},
	miracle: (ctx, c, t) => {
		c.owner.setQuanta(etg.Light);
		if (c.owner.sosa) {
			c.owner.hp = 1;
		}
		c.owner.hp = c.owner.maxhp - 1;
	},
	mitosis: (ctx, c, t) => {
		c.owner.addCrea(c.owner.newThing(c.card));
	},
	mitosisspell: (ctx, c, t) => {
		t.lobo();
		t.active = t.active.set('cast', Actives.mitosis);
		t.castele = t.card.element;
		t.cast = t.card.cost;
	},
	momentum: (ctx, c, t) => {
		t.atk += 1;
		t.buffhp(1);
		t.setStatus('momentum', 1);
	},
	mutate: (ctx, c, t) => {
		if (!c.mutantactive()) {
			const bans = new Set([
				ctx.Cards.Names.ShardofFocus,
				ctx.Cards.Names.FateEgg,
				ctx.Cards.Names.Immortal,
				ctx.Cards.Names.Scarab,
				ctx.Cards.Names.DevonianDragon,
				ctx.Cards.Names.Chimera,
			]);
			var rnd = ctx.randomcard(
				false,
				x => x.type == etg.Creature && !bans.has(x),
			);
			while (!rnd.active.get('cast')) {
				rnd = ctx.randomcard(
					false,
					x => x.type == etg.Creature && !bans.has(x),
				);
			}
			c.active = c.active.set('cast', rnd.active.get('cast'));
			c.cast = ctx.upto(2) + 1;
		}
		c.castele = ctx.upto(13);
		c.setStatus('mutant', 1);
	},
	mutation: (ctx, c, t) => {
		var rnd = ctx.rng();
		if (rnd < 0.1) {
			t.die();
		} else if (rnd < 0.5) {
			Actives.improve.func(ctx, c, t);
		} else {
			t.transform(ctx.Cards.Names.Abomination);
		}
	},
	neuro: vadrenathrottle((ctx, c, t) => {
		t.addpoison(1);
		if (t.type === etg.Player) t.setStatus('neuro', 1);
	}),
	nightmare: (ctx, c, t) => {
		if (!c.owner.foe.sanctuary) {
			c.owner.dmg(-c.owner.foe.dmg(16 - c.owner.foe.hand.length * 2));
			for (var i = c.owner.foe.hand.length; i < 8; i++) {
				c.owner.foe.addCard(c.owner.foe.newThing(t.card));
			}
		}
	},
	nova: (ctx, c, t) => {
		for (var i = 1; i < 13; i++) {
			c.owner.spend(i, -1);
		}
		if (++c.owner.nova > 2) {
			c.owner.addCrea(c.owner.newThing(ctx.Cards.Names.Singularity));
		}
	},
	nova2: (ctx, c, t) => {
		for (var i = 1; i < 13; i++) {
			c.owner.spend(i, -2);
		}
		if (++c.owner.nova2 > 1) {
			c.owner.addCrea(
				c.owner.newThing(ctx.Cards.Names.Singularity.asUpped(true)),
			);
		}
	},
	nymph: (ctx, c, t) => {
		var e =
			(!t.card.name.match(/^Mark of /) && t.card.element) || ctx.upto(12) + 1;
		Actives.destroy.func(ctx, c, t, false, true);
		const nymph = t.owner.newThing(
			t.card.as(ctx.Cards.Codes[etg.NymphList[e]]),
		);
		ctx.effect({ x: 'StartPos', id: nymph.id, src: t.id });
		t.owner.addCrea(nymph);
	},
	obsession: (ctx, c, t) => {
		c.owner.dmg(c.card.upped ? 13 : 10);
	},
	overdrive: (ctx, c, t) => {
		c.atk += 3;
		c.dmg(1, true);
	},
	overdrivespell: (ctx, c, t) => {
		t.lobo();
		t.active = t.active.set('ownattack', Actives.overdrive);
	},
	pandemonium: (ctx, c, t) => {
		c.owner.foe.masscc(c, Actives.cseed.func, !c.card.upped);
	},
	paradox: (ctx, c, t) => {
		t.die();
	},
	parallel: (ctx, c, t) => {
		if (t.card.isOf(ctx.Cards.Names.Chimera)) {
			Actives.chimera(ctx, c);
			return;
		}
		const copy = t.clone(c.owner);
		c.owner.addCrea(copy);
		copy.setStatus('airborne', copy.card.status.get('airborne'));
		if (copy.status.get('mutant')) {
			const buff = ctx.upto(25);
			t.buffhp(Math.floor(buff / 5));
			t.atk += buff % 5;
			t.mutantactive();
		}
		if (copy.status.get('voodoo')) {
			copy.owner.foe.dmg(copy.maxhp - copy.hp);
		}
		copy.casts = 0;
	},
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
		if (c.cast > 0) {
			c.casts = 1;
		}
	},
	plague: (ctx, c, t) => {
		c.owner.foe.masscc(c, Actives.infect.func);
	},
	platearmor: (ctx, c, t) => {
		t.buffhp(c.card.upped ? 6 : 3);
	},
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
	purify: (ctx, c, t) => {
		t.status = t.status.set('poison', Math.min(t.getStatus('poison') - 2, -2));
		if (t.type == etg.Player) {
			t.setStatus('neuro', 0);
			t.sosa = 0;
		} else {
			t.status = t.status.delete('aflatoxin');
		}
	},
	queen: (ctx, c, t) => {
		c.owner.addCrea(
			c.owner.newThing(ctx.Cards.Names.Firefly.asUpped(c.card.upped)),
		);
	},
	quint: (ctx, c, t) => {
		t.setStatus('immaterial', true);
		t.setStatus('frozen', 0);
	},
	rage: (ctx, c, t) => {
		const dmg = c.card.upped ? 6 : 5;
		t.incrAtk(dmg);
		t.dmg(dmg);
	},
	readiness: (ctx, c, t) => {
		if (t.active.get('cast')) {
			t.cast = 0;
			if (t.card.element == etg.Time && !t.status.get('ready')) {
				t.setStatus('ready', 1);
				t.casts = 2;
				t.addactive('ownspell', Actives.ready);
			}
		}
	},
	ready: (ctx, c, t) => {
		if (c.status.get('ready') > 1) {
			c.setStatus('ready', c.status.get('ready') - 1);
			c.casts++;
		}
	},
	rebirth: (ctx, c, t) => {
		c.transform(ctx.Cards.Names.Phoenix.asUpped(c.card.upped));
	},
	regenerate: (ctx, c, t) => {
		if (!c.status.get('delayed')) {
			c.owner.dmg(-5);
		}
	},
	regeneratespell: (ctx, c, t) => {
		t.lobo();
		t.active = t.active.set('ownattack', Actives.regenerate);
		t.status = t.status.delete('stasis');
	},
	relic: (ctx, c, t) => {
		c.place();
	},
	rewind: (ctx, c, t) => {
		if (t.card.isOf(ctx.Cards.Names.Skeleton)) {
			Actives.hatch.func(ctx, t);
		} else if (t.card.isOf(ctx.Cards.Names.Mummy)) {
			t.transform(ctx.Cards.Names.Pharaoh.asUpped(t.card.upped));
		} else {
			if (t.status.get('voodoo') && t.status.get('poison') < 0) {
				t.owner.foe.addpoison(-t.status.get('poison'));
			}
			t.remove();
			t.owner.deck.push(t.card);
		}
	},
	salvage: (ctx, c, t) => {
		if (
			c.owner != t.owner &&
			!c.status.get('salvaged') &&
			!t.status.get('salvaged') &&
			c.owner.game.turn != c.owner
		) {
			c.status = c.status.set('salvaged', 1);
			t.status = t.status.set('salvaged', 1);
			c.owner.addCard(c.owner.newThing(t.card));
		}
	},
	sanctuary: (ctx, c, t) => {
		c.owner.sanctuary = true;
		c.owner.dmg(-4);
	},
	scarab: (ctx, c, t) => {
		c.owner.addCard(
			c.owner.newThing(ctx.Cards.Names.Scarab.asUpped(c.card.upped)),
		);
	},
	scramble: (ctx, c, t) => {
		if (t.type == etg.Player && !t.sanctuary) {
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
			// Don't accept Marks/Nymphs
			const card = ctx.randomcard(
				c.card.upped,
				x =>
					(x.type != etg.Pillar || !x.name.match(/^Mark/)) &&
					!x.isOf(ctx.Cards.Names.Relic) &&
					!x.isOf(ctx.Cards.Names.Miracle) &&
					!etg.ShardList.some(shard => shard && x.isOf(shard)) &&
					!etg.NymphList.some(nymph => nymph && x.isOf(nymph)) &&
					(i > 0 || anyentro || x.element == etg.Entropy),
			);
			anyentro |= card.element === etg.Entropy;
			const inst = c.owner.newThing(card);
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
			c.owner.addCard(inst);
		}
	},
	silence: (ctx, c, t) => {
		if (!c.owner.foe.sanctuary) {
			c.owner.foe.silence = true;
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
			c.active = c.active.set('hit', Actives.vampire);
		} else if (r < 5) {
			Actives.quint.func(ctx, c, c);
		} else if (r < 7) {
			const buff = ctx.upto(25);
			c.buffhp(Math.floor(buff / 5) + 1);
			c.atk -= (buff % 5) + 1;
		} else if (r < 9) {
			c.status = c.status.set('adrenaline', 1);
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
		for (var i = 0; i < 23; i++) {
			var cr = c.owner.creatures[i];
			if (cr && cr.status.get('airborne') && cr.isMaterial(etg.Creature)) {
				cr.incrStatus('dive', cr.trueatk());
				const dive = cr.getStatus('dive');
				cr.setStatus('dive', dive + cr.trueatk());
			}
		}
	},
	snipe: (ctx, c, t) => {
		t.dmg(3);
	},
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
	steal: (ctx, c, t) => {
		if (t.status.get('stackable')) {
			Actives.destroy.func(ctx, c, t, true);
			if (t.type === etg.Shield) {
				if (c.owner.shield && c.owner.shield.card == t.card) {
					c.owner.shield.status = c.owner.shield.status.set(
						'charges',
						c.owner.shield.status.get('charges') + 1,
					);
				} else {
					c.owner.setShield(c.owner.newThing(t.card));
					c.owner.shield.status = c.owner.shield.status.set('charges', 1);
				}
			} else {
				c.owner.addPerm(c.owner.newThing(t.card));
			}
		} else {
			t.remove();
			t.owner = c.owner;
			t.casts = 0;
			if (t.card.isOf(ctx.Cards.Names.Sundial))
				t.setStatus('charges', t.status.get('charges') + 1);
			t.place();
		}
	},
	steam: (ctx, c, t) => {
		c.incrStatus('steam', 5);
		c.incrAtk(5);
		if (!c.hasactive('postauto', 'v_decrsteam'))
			c.addactive('postauto', Actives.decrsteam);
	},
	stoneform: (ctx, c, t) => {
		c.buffhp(20);
		c.active = c.active.delete('cast');
	},
	storm2: (ctx, c, t) => {
		c.owner.foe.masscc(c, function(ctx, c, x) {
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
	swave: (ctx, c, t) => {
		if (t.status.get('frozen')) {
			t.die();
		} else {
			if (t.type == etg.Player && t.weapon && t.weapon.status.get('frozen')) {
				Actives.destroy.func(ctx, c, t.weapon);
			}
			t.spelldmg(4);
		}
	},
	unburrow: (ctx, c, t) => {
		c.status = c.status.set('burrowed', false);
		c.active = c.active.set('cast', Actives.burrow);
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
	virusinfect: (ctx, c, t) => {
		Actives.infect.func(ctx, c, t);
		c.die();
	},
	virusplague: (ctx, c, t) => {
		Actives.plague.func(ctx, c, t);
		c.die();
	},
	void: (ctx, c, t) => {
		c.owner.foe.maxhp = Math.max(
			c.owner.foe.maxhp -
				(c.owner.mark == etg.Darkness ? 3 : 2) * c.status.get('charges'),
			1,
		);
		if (c.owner.foe.hp > c.owner.foe.maxhp) {
			c.owner.foe.hp = c.owner.foe.maxhp;
		}
	},
	web: (ctx, c, t) => {
		t.status = t.status.delete('airborne');
	},
	wisdom: (ctx, c, t) => {
		t.atk += 4;
		if (t.status.get('immaterial')) {
			t.setStatus('psion', 1);
		}
	},
	pillar: (ctx, c, t) => {
		if (!t)
			c.owner.spend(
				c.card.element,
				c.status.get('charges') * (c.card.element > 0 ? -1 : -3),
			);
		else if (c == t)
			c.owner.spend(c.card.element, c.card.element > 0 ? -1 : -3);
	},
	pend: (ctx, c, t) => {
		var ele = c.getStatus('pendstate') ? c.owner.mark : c.card.element;
		c.owner.spend(ele, -c.status.get('charges') * (ele > 0 ? 1 : 3));
		c.setStatus('pendstate', +!c.getStatus('pendstate'));
	},
	blockwithcharge: (ctx, c, t) => {
		const charges = c.getStatus('charges');
		if (charges <= 1) {
			c.owner.shield = undefined;
		} else {
			c.status = c.status.set('charges', charges - 1);
		}
		return true;
	},
	cold: (ctx, c, t) => {
		if (t.type === etg.Creature && ctx.rng() < 0.3) {
			t.freeze(3);
		}
	},
	evade100: (ctx, c, t) => {
		return true;
	},
	evade40: (ctx, c, t) => {
		return ctx.rng() < 0.4;
	},
	evade50: (ctx, c, t) => {
		return ctx.rng() < 0.5;
	},
	firewall: (ctx, c, t) => {
		if (t.type === etg.Creature) {
			t.dmg(1);
		}
	},
	skull: (ctx, c, t) => {
		if (t.type === etg.Creature && !t.card.isOf(ctx.Cards.Names.Skeleton)) {
			var thp = t.truehp();
			if (thp == 0 || (thp > 0 && ctx.rng() < 0.5 / thp)) {
				var index = t.getIndex();
				t.die();
				if (
					!t.owner.creatures[index] ||
					t.owner.creatures[index].card != ctx.Cards.Names.MalignantCell
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
	weight: (ctx, c, t) => {
		return t.type === etg.Creature && t.truehp() > 5;
	},
	wings: (ctx, c, t) => {
		return !t.status.get('airborne') && !t.status.get('ranged');
	},
};
const passives = new Set([
	'decrsteam',
	'obsession',
	'salvage',
	'siphon',
	'swarm',
]);
for (const key in Actives) {
	Actives[key] = new Skill(['v_' + key], Actives[key], passives.has(key));
}
export default Actives;
