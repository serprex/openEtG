'use strict';
function adrenathrottle(f) {
	return function(c, ...args) {
		if (c.getStatus('adrenaline') < 3) {
			return f(c, ...args);
		}
	};
}
function quadpillarFactory(ele) {
	return function(c, t) {
		const n = c == t ? 1 : c.status.get('charges');
		for (let i = 0; i < n; i++) {
			const r = c.owner.upto(16);
			c.owner.spend((ele >> ((r & 3) << 2)) & 15, -1);
			c.owner.spend((ele >> (r & 12)) & 15, -1);
		}
	};
}
const adjacent = new Uint8Array([
	3 | (1 << 5),
	4 | (1 << 5),
	3 | (3 << 5),
	2 << 5,
	1 << 5,
	1,
	2,
	15 | (1 << 5),
	16 | (1 << 5),
	17 | (1 << 5),
	18,
	19,
	19 | (1 << 5),
	20 | (1 << 5),
	21 | (1 << 5),
	7,
	7 | (1 << 5),
	8 | (1 << 5),
	9 | (1 << 5),
	11 | (2 << 5),
	12 | (1 << 5),
	13 | (1 << 5),
	14,
]);
const Actives = {
	noluci: function() {},
	ablaze: function(c, t) {
		Effect.mkText('2|0', c);
		c.atk += 2;
	},
	acceleration: function(c, t) {
		Effect.mkText('2|-1', c);
		c.atk += 2;
		c.dmg(1, true);
	},
	accelerationspell: function(c, t) {
		t.lobo();
		t.active = t.active.set('auto', Actives.acceleration);
	},
	accretion: function(c, t) {
		Actives.destroy.func(c, t);
		c.buffhp(15);
		if (c.truehp() > 45) {
			c.die();
			if (c.owner.hand.length < 8) {
				new smth.CardInstance(
					Cards.BlackHole.asUpped(c.card.upped),
					c.owner,
				).place();
			}
		}
	},
	adrenaline: function(c, t) {
		Effect.mkText('Adrenaline', t);
		t.status = t.status.set('adrenaline', 1);
	},
	affinity: function(c, t) {
		var res = 0;
		for (var i = 0; i < 16; i++) {
			if (
				c.owner.permanents[i] &&
				c.card.element == c.owner.permanents[i].card.element &&
				c.owner.permanents[i].card.type === etg.Pillar
			)
				res += c.owner.permanents[i].status.get('charges');
		}
		return res;
	},
	aflatoxin: function(c, t) {
		Effect.mkText('Aflatoxin', t);
		t.addpoison(2);
		if (t.type != etg.Player) {
			t.setStatus('aflatoxin', 1);
		}
	},
	air: function(c, t) {
		Effect.mkText('1:9', c);
		c.owner.spend(etg.Air, -1);
	},
	antimatter: function(c, t) {
		Effect.mkText('Antimatter', t);
		t.atk -= t.trueatk() * 2;
	},
	arclightning: function(c, t) {
		Effect.mkText('Arc Lightning', t);
		var validTargets = [];
		for (;;) {
			t.spelldmg(1);
			if (t == t.owner ? t.hp <= 0 : !~t.getIndex()) return;
			validTargets.length = 0;
			for (var i = 0; i < 23; i++) {
				var cr = t.owner.creatures[i];
				if (cr && cr != t && cr.isMaterial(smth.Creature)) {
					validTargets.push(i);
				}
			}
			if (t != t.owner && (!t.owner.shield || !t.owner.shield.status.get('reflect'))) {
				validTargets.push(-1);
			}
			if (!validTargets.length) return;
			var vtr = c.owner.choose(validTargets);
			t = ~vtr ? t.owner.creatures[vtr] : t.owner;
		}
	},
	bblood: function(c, t) {
		Effect.mkText('0|20', t);
		t.buffhp(20);
		t.status = t.status.set('delayed', 6);
	},
	becomeweapon: function(c, t) {
		c.remove();
		c.owner.weapon = new smth.Weapon(Cards.GadgetSword, c.owner);
	},
	becomeshield: function(c, t) {
		c.remove();
		c.owner.shield = new smth.Shield(Cards.GadgetSword.asUpped(true), c.owner);
	},
	blackhole: function(c, t) {
		if (!c.owner.foe.sanctuary) {
			for (var q = 1; q < 13; q++) {
				c.owner.dmg(-Math.min(c.owner.foe.quanta[q], 3));
				c.owner.foe.quanta[q] = Math.max(c.owner.foe.quanta[q] - 3, 0);
			}
		}
	},
	bless: function(c, t) {
		Effect.mkText('3|3', t);
		t.atk += 3;
		t.buffhp(3);
	},
	bloodletting: function(c, t) {
		var count = 0;
		function bloodeffect(c, t) {
			t.dmg(1);
			count++;
		}
		c.owner.foe.masscc(c.owner, bloodeffect, true);
		t.dmg(count);
	},
	bounce: function(c, t) {
		Actives.unsummon.func(c, c);
		return true;
	},
	boneyard: function(c, t) {
		if (!t.card.isOf(Cards.Skeleton)) {
			new smth.Creature(Cards.Skeleton.asUpped(c.card.upped), c.owner).place();
		}
	},
	bow: function(c, t) {
		return c.owner.mark == etg.Air ? 1 : 0;
	},
	bravery: function(c, t) {
		if (!c.owner.foe.sanctuary) {
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
	burrow: function(c, t) {
		c.status = c.status.set('burrowed', true);
		c.active = c.active.set('cast', Actives.unburrow);
		c.cast = 0;
		c.atk = Math.floor(c.atk / 2);
	},
	butterfly: function(c, t) {
		t.lobo();
		t.active = t.active.set('cast', Actives.destroy);
		t.cast = 3;
		t.castele = etg.Entropy;
	},
	catapult: function(c, t) {
		Effect.mkText('Catapult', t);
		t.die();
		c.owner.foe.dmg(
			Math.ceil(
				t.truehp() * (t.status.get('frozen') ? 150 : 100) / (t.truehp() + 100),
			),
		);
		if (t.status.get('poison')) {
			c.owner.foe.addpoison(t.status.get('poison'));
		}
		if (t.status.get('frozen')) {
			c.owner.foe.freeze(3);
		}
	},
	charge: function(c, t) {
		Effect.mkText('Charge', c);
		c.defstatus('dive', 0);
		c.status = c.status.set('dive', c.status.get('dive') + 2);
		if (!c.status.get('momentum')) {
			c.status = c.status.set('momentum', true);
			c.addactive('postauto', Actives.removemomentum);
		}
	},
	chimera: function(c, t) {
		var atk = 0,
			hp = 0;
		for (var i = 0; i < 23; i++) {
			if (c.owner.creatures[i]) {
				atk += c.owner.creatures[i].trueatk();
				hp += c.owner.creatures[i].truehp();
			}
		}
		var chim = new smth.Creature(c.card, c.owner);
		chim.atk = atk;
		chim.maxhp = hp;
		chim.hp = hp;
		chim.active = new imm.Map();
		chim.status = chim.status.set('momentum', true);
		c.owner.creatures[0] = chim;
		c.owner.creatures.length = 1;
		c.owner.creatures.length = 23;
		c.owner.gpull = chim;
	},
	collide: function(c, t) {
		var validTargets = [];
		for (var i = 0; i < 23; i++) {
			var cr = t.owner.creatures[i];
			if (cr && cr != t && cr.isMaterial(smth.Creature)) {
				validTargets.push(cr);
			}
		}
		if (validTargets.length > 0) {
			var vtr = c.owner.choose(validTargets);
			vtr.dmg(t.trueatk());
		}
		t.owner.deck.splice(t.owner.upto(t.owner.deck.length), 0, t.card);
		t.remove();
	},
	cpower: function(c, t) {
		var buff = t.owner.upto(25);
		t.buffhp(Math.floor(buff / 5) + 1);
		t.atk += buff % 5 + 1;
	},
	cseed: function(c, t) {
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
			][c.owner.upto(12)]
		].func(c, t);
	},
	dagger: function(c, t) {
		return c.owner.mark == etg.Darkness || c.owner.mark == etg.Death ? 1 : 0;
	},
	darkness: function(c, t) {
		c.owner.spend(etg.Darkness, -1);
	},
	deadalive: function(c, t) {
		c.deatheffect(c.getIndex());
	},
	decrsteam: function(c) {
		const steam = c.defstatus('steam', 0);
		if (steam > 0) {
			c.atk--;
			c.status = c.status.set('steam', steam-1);
		}
	},
	deja: function(c, t) {
		c.active = c.active.delete('cast');
		Actives.parallel.func(c, c);
	},
	dessication: function(c, t) {
		function dryeffect(c, t) {
			c.spend(etg.Water, -t.dmg(2));
		}
		c.owner.foe.masscc(c.owner, dryeffect);
	},
	destroy: function(c, t, dontsalvage, donttalk) {
		if (!donttalk) {
			Effect.mkText('Destroy', t);
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
	devour: function(c, t) {
		Effect.mkText('1|1', c);
		c.buffhp(1);
		c.atk += 1;
		if (t.status.get('poisonous')) {
			c.addpoison(1);
		}
		t.die();
	},
	die: function(c, t) {
		c.die();
	},
	disfield: function(c, t, dmg) {
		if (c.owner.sanctuary) return false;
		if (!c.owner.spend(etg.Other, dmg)) {
			for (var i = 1; i < 13; i++) {
				c.owner.quanta[i] = 0;
			}
			c.owner.shield = undefined;
		}
		return true;
	},
	disshield: function(c, t, dmg) {
		if (c.owner.sanctuary) return false;
		if (!c.owner.spend(etg.Entropy, Math.ceil(dmg / 3))) {
			c.owner.quanta[etg.Entropy] = 0;
			c.owner.shield = undefined;
		}
		return true;
	},
	dive: function(c, t) {
		Effect.mkText('Dive', c);
		c.defstatus('dive', 0);
		c.status = c.status.set('dive', c.status.get('dive') + c.trueatk());
	},
	divinity: function(c, t) {
		c.owner.buffhp(c.owner.mark == etg.Light ? 24 : 16);
	},
	downgrade: function(c, t) {
		if (t.card == Cards.GadgetSword.asUpped(true)) Actives.becomeweapon.func(t);
		else t.transform(t.card.asUpped(false));
	},
	drainlife: function(c, t) {
		c.owner.dmg(
			-t.spelldmg(2 + Math.floor(c.owner.quanta[etg.Darkness] / 10) * 2),
		);
	},
	drawpower: function(c, t) {
		Actives.destroy.func(c, t, false, true);
		var healsum = 0;
		for (var i = 0; i < 16; i++) {
			if (c.owner.permanents[i] && c.owner.permanents[i].card.type === etg.Pillar)
				healsum += c.owner.permanents[i].status.get('charges');
		}
		Effect.mkText('+' + healsum, c);
		c.owner.dmg(-healsum);
	},
	drawpower2: function(c, t) {
		Actives.destroy.func(c, t, false, true);
		var healsum = 0;
		for (var i = 0; i < 16; i++) {
			if (c.owner.permanents[i] && c.owner.permanents[i].card.type === etg.Pillar)
				healsum += c.owner.permanents[i].status.get('charges');
		}
		healsum = healsum * 2;
		Effect.mkText('+' + healsum, c);
		c.owner.dmg(-healsum);
	},
	dreambreaker: adrenathrottle(function(c, t) {
		for (var i = 0; i < 2; i++) {
			c.owner.foe.deck.splice(c.owner.upto(c.owner.foe.deck.length), 1);
		}
	}),
	dryspell: function(c, t) {
		function dryeffect(c, t) {
			c.spend(etg.Water, -t.dmg(1));
		}
		c.owner.foe.masscc(c.owner, dryeffect, true);
	},
	dshield: function(c, t) {
		c.status = c.status.set('immaterial', true);
	},
	duality: function(c, t) {
		if (c.owner.foe.deck.length > 0 && c.owner.hand.length < 8) {
			new smth.CardInstance(
				c.owner.foe.deck[c.owner.foe.deck.length - 1],
				c.owner,
			).place();
		}
	},
	durability: function(c, t) {
		if (!c.owner.shield || c.owner.shield.status.get('durability') == 'used') return;
		c.owner.shield.status = c.owner.shield.status.set('durability', 'usable');
	},
	earth: function(c, t) {
		Effect.mkText('1:4', c);
		c.owner.spend(etg.Earth, -1);
	},
	earthquake: function(c, t) {
		Effect.mkText('Earthquake', t);
		if (t.status.get('charges') > 3) {
			t.status = t.status.set('charges', t.status.get('charges') - 3);
		} else {
			t.remove();
		}
		t.proc('destroy');
	},
	empathy: function(c, t) {
		var healsum = c.owner.countcreatures();
		Effect.mkText('+' + healsum, c);
		c.owner.dmg(-healsum);
	},
	enchant: function(c, t) {
		Effect.mkText('Enchant', t);
		t.status = t.status.set('immaterial', true);
	},
	endow: function(c, t) {
		Effect.mkText('Endow', t);
		if (t.status.get('momentum')) c.status = c.status.set('momentum', true);
		if (t.status.get('ranged')) c.status = c.status.set('ranged', true);
		c.active = t.active;
		c.cast = t.cast;
		c.castele = t.castele;
		c.atk += t.trueatk() - t.trigger('buff');
		c.buffhp(2);
	},
	evolve: function(c, t) {
		c.transform(Cards.Shrieker.asUpped(c.card.upped));
		c.status = c.status.delete('burrowed');
	},
	extract: function(c, t) {
		c.owner.spend(etg.Water, -c.truehp());
		c.die();
	},
	fiery: function(c, t) {
		return Math.floor(c.owner.quanta[etg.Fire] / 5);
	},
	fire: function(c, t) {
		Effect.mkText('1:6', c);
		c.owner.spend(etg.Fire, -1);
	},
	firebolt: function(c, t) {
		t.spelldmg(3 + 3 * Math.floor(c.owner.quanta[etg.Fire] / 10));
	},
	flyingweapon: function(c, t) {
		var wp = c.owner.weapon;
		if (wp) {
			var cr = new smth.Creature(wp.card, c.owner);
			cr.atk = wp.atk;
			cr.active = wp.active;
			cr.cast = wp.cast;
			cr.castele = wp.castele;
			cr.status = wp.status;
			cr.status = cr.status.set('airborne', true);
			cr.place();
			c.owner.weapon = undefined;
		}
	},
	fractal: function(c, t) {
		Effect.mkText('Fractal', t);
		for (var i = 8; i > 0; i--) {
			new smth.CardInstance(t.card, c.owner).place();
		}
		c.owner.quanta[etg.Aether] = 0;
	},
	freeze: function(c, t) {
		t.freeze(c.card.upped && c.card != Cards.Pandemonium.asUpped(true) ? 4 : 3);
	},
	frightened: function(c, t) {
		if (t.type === etg.Creature) {
			c.status = c.status.set('frightened', true);
		}
	},
	frightener: function(c, t) {
		t.addactive('play', Actives.frightened);
	},
	fungusrebirth: function(c, t) {
		c.transform(Cards.Fungus.asUpped(c.card.upped));
	},
	gaincharge2: function(c, t) {
		c.status = c.status.set('charges', c.status.get('charges') + 2);
	},
	gas: function(c, t) {
		new smth.Permanent(Cards.UnstableGas.asUpped(c.card.upped), c.owner).place();
	},
	gpull: function(c, t) {
		Effect.mkText('Pull', c);
		c.owner.gpull = c;
	},
	gpullspell: function(c, t) {
		Actives.gpull.func(t);
	},
	gratitude: function(c, t) {
		var b = (c.owner.mark == etg.Life ? -5 : -3) * c.status.get('charges');
		Effect.mkText('+' + b, c);
		c.owner.dmg(b);
	},
	growth: function(c, t) {
		Effect.mkText('2|2', c);
		c.buffhp(2);
		c.atk += 2;
	},
	growth1: function(c, t) {
		Effect.mkText('1|1', c);
		c.atk += 1;
		c.buffhp(1);
	},
	guard: function(c, t) {
		Effect.mkText('Guard', t);
		c.delay(1);
		t.delay(1);
		if (!t.status.get('airborne')) {
			t.dmg(c.trueatk());
		}
	},
	hammer: function(c, t) {
		return c.owner.mark == etg.Gravity || c.owner.mark == etg.Earth ? 1 : 0;
	},
	hasten: function(c, t) {
		c.owner.drawcard();
	},
	hatch: function(c, t) {
		Effect.mkText('Hatch', c);
		var bans = [
			Cards.ShardofFocus,
			Cards.FateEgg,
			Cards.Immortal,
			Cards.Scarab,
			Cards.DevonianDragon,
			Cards.Chimera,
		];
		c.transform(
			c.owner.randomcard(c.card.upped, function(x) {
				return (
					x.type == etg.CreatureEnum &&
					!bans.some(function(ban) {
						return x.isOf(ban);
					})
				);
			}),
		);
		if (c.status.get('ready')) Actives.parallel.func(c, c);
	},
	heal: function(c, t) {
		c.owner.dmg(-20);
	},
	holylight: function(c, t) {
		t.dmg(t.type != etg.Player && t.status.get('nocturnal') ? 10 : -10);
	},
	hope: function(c, t) {
		var dr = c.card.upped ? 1 : 0;
		for (var i = 0; i < 23; i++) {
			if (
				c.owner.creatures[i] &&
				c.owner.creatures[i].hasactive('auto', 'light')
			) {
				dr++;
			}
		}
		c.dr = dr;
	},
	hunt: function(c, t) {
		c.delay(1);
		t.dmg(c.trueatk());
	},
	hydra: function(c, t) {
		new smth.Creature(Cards.HydraHead.asUpped(c.card.upped), c.owner).place();
	},
	hydrahead: function(c, t) {
		var ownshydra = false;
		for (var i = 0; i < 23; i++) {
			if (c.owner.creatures[i] && c.owner.creatures[i].card.isOf(Cards.Hydra)) {
				ownshydra = true;
				break;
			}
		}
		if (!ownshydra) c.die();
		return 0;
	},
	icebolt: function(c, t) {
		var bolts = Math.floor(c.owner.quanta[etg.Water] / 10);
		t.spelldmg(2 + bolts * 2);
		if (c.owner.rng() < 0.35 + bolts / 10) {
			t.freeze(c.card.upped ? 4 : 3);
		}
	},
	ignite: function(c, t) {
		c.die();
		c.owner.foe.spelldmg(20);
		c.owner.foe.masscc(
			c,
			function(c, x) {
				x.dmg(1);
			},
			true,
			true,
		);
	},
	immolate: function(c, t) {
		t.die();
		if (!t.hasactive('auto', 'singularity')) {
			for (var i = 1; i < 13; i++) c.owner.spend(i, -1);
			c.owner.spend(etg.Fire, c.card.upped ? -7 : -5);
		}
	},
	improve: function(c, t) {
		Effect.mkText('Improve', t);
		var bans = [
			Cards.ShardofFocus,
			Cards.FateEgg,
			Cards.Immortal,
			Cards.Scarab,
			Cards.DevonianDragon,
			Cards.Chimera,
		];
		t.transform(
			c.owner.randomcard(false, function(x) {
				return x.type == etg.CreatureEnum && !~bans.indexOf(x);
			}),
		);
		t.buffhp(c.owner.upto(5));
		t.atk += c.owner.upto(5);
		t.status = t.status.set('mutant', true);
		t.mutantactive();
	},
	infect: function(c, t) {
		Effect.mkText('Infect', t);
		t.addpoison(1);
	},
	infest: function(c, t) {
		if (c.owner.spend(c.card.element, c.card.cost)) Actives.mitosis.func(c, c);
		else c.die();
	},
	infestspell: function(c, t) {
		t.addactive('auto', Actives.infest);
	},
	insight: function(c, t) {
		t.mutantactive();
		t.castele = etg.Light;
	},
	integrity: function(c, t) {
		var activeType = ['auto', 'hit', 'buff', 'death'];
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
		atkBuff[etg.Focus] = 0;
		hpBuff[etg.Focus] = 6;
		atkBuff[etg.Fire] = 3;
		hpBuff[etg.Fire] = 0;
		var hpStat = c.card.upped ? 2 : 1,
			atkStat = hpStat + 3;
		for (var i = c.owner.hand.length - 1; i >= 0; i--) {
			var card = c.owner.hand[i].card;
			if (
				etg.ShardList.some(function(x) {
					return x && card.isOf(Cards.Codes[x]);
				})
			) {
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
		var actives = new imm.Map().set(cost < 0 ? activeType[~cost] : 'cast', Actives[active]),
			cost = shardCosts[active];
		var status = new imm.Map();
		if (shardTally[etg.Air] > 0) {
			status = status.set('airborne', true);
		}
		if (shardTally[etg.Darkness] > 1) {
			status = status.set('voodoo', true);
		} else if (shardTally[etg.Darkness] > 0) {
			actives = actives.set('auto', Actives.siphon);
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
		new smth.Creature(Cards.ShardGolem, c.owner).place();
	},
	intensity: function(c, t, ele, amount) {
		if (ele != 8 || amount <= 0) return;
		const dive = c.defstatus('dive', 0);
		c.status = c.status.set('dive', dive + amount);
	},
	law: function(c, t) {
		var lawNumber = 1;
		if (t.status.get('law')) {
			lawNumber = t.status.get('law');
		} else {
			for (var i = 0; i < 23; i++) {
				var cr = t.owner.creatures[i];
				if (cr && cr.status.get('law') > lawNumber) lawNumber = cr.status.get('law') + 1;
			}
			for (var i = 0; i < 16; i++) {
				var pr = c.owner.permanents[i];
				if (pr && pr.status.get('law') > lawNumber) lawNumber = pr.status.get('law') + 1;
			}
			t.status = t.status.set('law', lawNumber);
			t.addactive('hp', Actives.lawfree);
		}
		var lawPerm = new smth.Permanent(Cards.Law, c.owner);
		lawPerm.active = new imm.Map();
		lawPerm.status = new imm.Map({ law: lawNumber });
		lawPerm.place();
	},
	lawfree: function(c, t) {
		for (var i = 0; i < 16; i++) {
			var pr = c.owner.foe.permanents[i];
			if (pr && pr.status.get('law') == c.status.get('law')) {
				return 0;
			}
		}
		c.status = c.status.delete('law');
		c.rmactive('hp', 'lawfree');
		return 0;
	},
	legislate: function(c, t) {
		var validTargets = [];
		for (var i = 0; i < 23; i++) {
			var cr = c.owner.foe.creatures[i];
			if (
				cr &&
				cr.isMaterial(smth.Creature) &&
				!cr.status.get('law') &&
				cr.truehp() < 5
			) {
				validTargets.push(cr);
			}
		}
		if (validTargets.length > 0) {
			Actives.law.func(c, c.owner.choose(validTargets));
			c.owner.deck.splice(
				c.owner.upto(c.owner.deck.length),
				0,
				Cards.Law.asUpped(true),
			);
		}
	},
	light: function(c, t) {
		Effect.mkText('1:8', c);
		c.owner.spend(etg.Light, -1);
	},
	lightning: function(c, t) {
		Effect.mkText('-5', t);
		t.spelldmg(5);
	},
	liquid: function(c, t) {
		Effect.mkText('Liquid', t);
		t.lobo();
		t.active = t.active.set('hit', Actives.vampire);
		t.addpoison(1);
	},
	lobotomize: function(c, t) {
		Effect.mkText('Lobotomize', t);
		t.lobo();
		t.status = t.status.delete('momentum').delete('psion').delete('mutant');
	},
	locket: function(c, t) {
		var ele = c.status.get('mode') === undefined ? c.owner.mark : c.status.get('mode');
		c.owner.spend(ele, ele > 0 ? -1 : -3);
	},
	locketshift: function(c, t) {
		c.status.set('mode', t.type == etg.Player ? t.mark : t.card.element);
	},
	losecharge: function(c, t) {
		if (!c.maybeDecrStatus('charges')) {
			c.remove();
		}
	},
	luciferin: function(c, t) {
		c.owner.dmg(-10);
		// TODO Fix salvagers & other passive-active-still-luciable
		c.owner.masscc(c, function(c, x) {
			for (var key of x.active.keys()) {
				if (
					key != 'ownplay' &&
					key != 'owndiscard' &&
					!x.active.get(key).name.every(name =>
						Actives[name].passive
					)
				)
					return;
			}
			x.addactive('auto', Actives.light);
		});
	},
	lycanthropy: function(c, t) {
		Effect.mkText('5|5', c);
		c.buffhp(5);
		c.atk += 5;
		c.rmactive('cast', 'lycanthropy');
	},
	mend: function(c, t) {
		var target = t || c;
		target.dmg(-5);
	},
	meteorite: function(c, t) {
		function craterdmg(idx) {
			var tgt = t.owner.creatures[idx];
			if (tgt) {
				tgt.dmg(3);
				if (!~tgt.getIndex()) t.owner.creatureslots[idx] = 'crater';
			}
		}
		var tidx = t.getIndex(),
			adj = adjacent[tidx],
			t1 = adj & 31,
			t2off = adj >> 5;
		craterdmg(tidx);
		craterdmg(t1);
		if (t2off) craterdmg(t1 + t2off);
	},
	miracle: function(c, t) {
		c.owner.quanta[etg.Light] = 0;
		if (c.owner.sosa) {
			c.owner.hp = 1;
		}
		c.owner.hp = c.owner.maxhp - 1;
	},
	mitosis: function(c, t) {
		new smth.Creature(c.card, c.owner).place();
	},
	mitosisspell: function(c, t) {
		t.lobo();
		t.active = t.active.set('cast', Actives.mitosis);
		t.castele = t.card.element;
		t.cast = t.card.cost;
	},
	momentum: function(c, t) {
		Effect.mkText('Momentum', t);
		t.atk += 1;
		t.buffhp(1);
		t.setStatus('momentum', 1);
	},
	mutate: function(c, t) {
		Effect.mkText('Mutate', c);
		if (!c.mutantactive()) {
			const bans = new Set([
				Cards.ShardofFocus,
				Cards.FateEgg,
				Cards.Immortal,
				Cards.Scarab,
				Cards.DevonianDragon,
				Cards.Chimera,
			]);
			var rnd = c.owner.randomcard(false, function(x) {
				return x.type == etg.Creature && !bans.has(x);
			});
			while (!rnd.active.get('cast')) {
				rnd = c.owner.randomcard(false, function(x) {
					return x.type == etg.Creature && !bans.has(x);
				});
			}
			c.active = c.active.set('cast', rnd.active.get('cast'));
			c.cast = c.owner.upto(2) + 1;
		}
		c.castele = c.owner.upto(13);
		c.setStatus('mutant', 1);
	},
	mutation: function(c, t) {
		var rnd = c.owner.rng();
		if (rnd < 0.1) {
			Effect.mkText('Death', t);
			t.die();
		} else if (rnd < 0.5) {
			Actives.improve.func(c, t);
		} else {
			Effect.mkText('Abomination', t);
			t.transform(Cards.Abomination);
		}
	},
	neuro: adrenathrottle(function(c, t) {
		t.addpoison(1);
		if (t.type === etg.Player) t.setStatus('neuro', 1);
	}),
	nightmare: function(c, t) {
		if (!c.owner.foe.sanctuary) {
			Effect.mkText('Nightmare', t);
			c.owner.dmg(-c.owner.foe.dmg(16 - c.owner.foe.hand.length * 2));
			for (var i = c.owner.foe.hand.length; i < 8; i++) {
				c.owner.foe.hand[i] = new smth.CardInstance(t.card, c.owner.foe);
			}
		}
	},
	nova: function(c, t) {
		for (var i = 1; i < 13; i++) {
			c.owner.spend(i, -1);
		}
		if (++c.owner.nova > 2) {
			new smth.Creature(Cards.Singularity, c.owner).place();
		}
	},
	nova2: function(c, t) {
		for (var i = 1; i < 13; i++) {
			c.owner.spend(i, -2);
		}
		if (++c.owner.nova2 > 1) {
			new smth.Creature(Cards.Singularity.asUpped(true), c.owner).place();
		}
	},
	nymph: function(c, t) {
		Effect.mkText('Nymph', t);
		var e =
			(!t.card.name.match(/^Mark of /) && t.card.element) ||
			c.owner.upto(12) + 1;
		Actives.destroy.func(c, t, false, true);
		new smth.Creature(
			Cards.Codes[etg.NymphList[e]].asUpped(t.card.upped),
			t.owner,
		).place();
	},
	obsession: function(c, t) {
		t.dmg(c.card.upped ? 13 : 10);
	},
	overdrive: function(c, t) {
		Effect.mkText('3|-1', c);
		c.atk += 3;
		c.dmg(1, true);
	},
	overdrivespell: function(c, t) {
		t.lobo();
		t.active = t.active.set('auto', Actives.overdrive);
	},
	pandemonium: function(c, t) {
		c.owner.foe.masscc(c, Actives.cseed.func, !c.card.upped);
	},
	paradox: function(c, t) {
		Effect.mkText('Paradox', t);
		t.die();
	},
	parallel: function(c, t) {
		Effect.mkText('Parallel', t);
		const copy = t.clone(c.owner);
		copy.place();
		copy.setStatus('airborne', copy.card.status.get('airborne'));
		if (copy.status.get('mutant')) {
			const buff = t.owner.upto(25);
			t.buffhp(Math.floor(buff / 5));
			t.atk += buff % 5;
			t.mutantactive();
		}
		if (copy.status.get('voodoo')) {
			copy.owner.foe.dmg(copy.maxhp - copy.hp);
		}
		copy.casts = 0;
	},
	phoenix: function(c, t, index) {
		if (!c.owner.creatures[index]) {
			c.owner.creatures[index] = new smth.Creature(
				Cards.Ash.asUpped(c.card.upped),
				c.owner,
			);
		}
	},
	photosynthesis: function(c, t) {
		Effect.mkText('2:5', c);
		c.owner.spend(etg.Life, -2);
		if (c.cast > 0) {
			c.casts = 1;
		}
	},
	plague: function(c, t) {
		c.owner.foe.masscc(c, Actives.infect.func);
	},
	platearmor: function(c, t) {
		var buff = c.card.upped ? 6 : 3;
		Effect.mkText('0|' + buff, t);
		t.buffhp(buff);
	},
	poison: adrenathrottle(function(c, t) {
		(t || c.owner.foe).addpoison(1);
	}),
	poison2: adrenathrottle(function(c, t) {
		(t || c.owner.foe).addpoison(2);
	}),
	poison3: function(c, t) {
		(t || c.owner.foe).addpoison(3);
	},
	precognition: function(c, t) {
		c.owner.precognition = true;
		c.owner.drawcard();
	},
	purify: function(c, t) {
		t.status = t.status.set('poison', Math.min(t.getStatus('poison') - 2, -2));
		if (t.type == etg.Player) {
			t.setStatus('neuro', 0);
			t.sosa = 0;
		} else {
			t.status = t.status.delete('aflatoxin');
		}
	},
	queen: function(c, t) {
		new smth.Creature(Cards.Firefly.asUpped(c.card.upped), c.owner).place();
	},
	quint: function(c, t) {
		Effect.mkText('Immaterial', t);
		t.setStatus('immaterial', true);
		t.setStatus('frozen', 0);
	},
	rage: function(c, t) {
		var dmg = c.card.upped ? 6 : 5;
		Effect.mkText(dmg + '|-' + dmg, t);
		t.atk += dmg;
		t.dmg(dmg);
	},
	readiness: function(c, t) {
		Effect.mkText('Ready', t);
		if (t.active.get('cast')) {
			t.cast = 0;
			if (t.card.element == etg.Time && !t.status.get('ready')) {
				t.setStatus('ready', 1);
				t.casts = 2;
				t.addactive('ownspell', Actives.ready);
			}
		}
	},
	ready: function(c, t) {
		if (c.status.get('ready') > 1) {
			c.setStatus('ready', c.status.get('ready')-1);
			c.casts++;
		}
	},
	rebirth: function(c, t) {
		c.transform(Cards.Phoenix.asUpped(c.card.upped));
	},
	regenerate: function(c, t) {
		if (!c.status.get('delayed')) {
			Effect.mkText('+5', c);
			c.owner.dmg(-5);
		}
	},
	regeneratespell: function(c, t) {
		t.lobo();
		t.active = t.active.set('auto', Actives.regenerate);
		t.status = t.status.delete('stasis');
	},
	removemomentum: function(c, t) {
		c.setStatus('momentum', 0);
	},
	ren: function(c, t) {
		if (!t.hasactive('predeath', 'bounce')) {
			Effect.mkText('Ren', t);
			t.addactive('predeath', Actives.bounce);
		}
	},
	relic: function(c, t) {
		c.place();
	},
	rewind: function(c, t) {
		if (t.card.isOf(Cards.Skeleton)) {
			Actives.hatch.func(t);
		} else if (t.card.isOf(Cards.Mummy)) {
			t.transform(Cards.Pharaoh.asUpped(t.card.upped));
		} else {
			Effect.mkText('Rewind', t);
			if (t.status.get('voodoo') && t.status.get('poison') < 0) {
				t.owner.foe.addpoison(-t.status.get('poison'));
			}
			t.remove();
			t.owner.deck.push(t.card);
		}
	},
	salvage: function(c, t) {
		if (
			c.owner != t.owner &&
			!c.status.get('salvaged') &&
			!t.status.get('salvaged') &&
			c.owner.game.turn != c.owner
		) {
			Effect.mkText('Salvage', c);
			c.status = c.status.set('salvaged', 1);
			t.status = t.status.set('salvaged', 1);
			new smth.CardInstance(t.card, c.owner).place();
		}
	},
	sanctuary: function(c, t) {
		c.owner.sanctuary = true;
		Effect.mkText('+4', c);
		c.owner.dmg(-4);
	},
	sandstorm: function(c, t) {
		Effect.mkText('-1', t);
		t.spelldmg(1);
		if (c.cast > 0) {
			c.casts = 1;
		}
	},
	scarab: function(c, t) {
		new smth.Creature(Cards.Scarab.asUpped(c.card.upped), c.owner).place();
	},
	scramble: function(c, t) {
		if (t.type == etg.Player && !t.sanctuary) {
			let n = 0;
			for (let i = 0; i < 9; i++) {
				if (t.spend(etg.Other, 1)) {
					n++;
				} else break;
			}
			while (n--) {
				t.spend(etg.Other, -1);
			}
		}
	},
	serendipity: function(c, t) {
		var cards = [],
			num = Math.min(8 - c.owner.hand.length, 3),
			anyentro = false;
		for (var i = num - 1; i >= 0; i--) {
			// Don't accept Marks/Nymphs
			cards[i] = c.owner.randomcard(c.card.upped, function(x) {
				return (
					(x.type != etg.Pillar || !x.name.match(/^Mark/)) &&
					!x.isOf(Cards.Relic) &&
					!x.isOf(Cards.Miracle) &&
					!etg.ShardList.some(function(shard) {
						shard && x.isOf(shard);
					}) &&
					!etg.NymphList.some(function(nymph) {
						nymph && x.isOf(nymph);
					}) &&
					(i > 0 || anyentro || x.element == etg.Entropy)
				);
			});
			anyentro |= cards[i].element == etg.Entropy;
		}
		for (var i = 0; i < num; i++) {
			new smth.CardInstance(cards[i], c.owner).place();
		}
	},
	silence: function(c, t) {
		if (!c.owner.foe.sanctuary) {
			c.owner.foe.silence = true;
		}
	},
	singularity: function(c, t) {
		if (c.trueatk() > 0) {
			Actives.antimatter.func(c, c);
			return;
		}
		const r = c.owner.upto(12);
		if (r === 0) {
			Actives.nova.func(c.owner.foe);
			c.owner.foe.nova = 0;
		} else if (r < 3) {
			c.active = c.active.set('hit', Actives.vampire);
		} else if (r < 5) {
			Actives.quint.func(c, c);
		} else if (r < 7) {
			const buff = c.owner.upto(25);
			c.buffhp(Math.floor(buff / 5) + 1);
			c.atk -= buff % 5 + 1;
		} else if (r < 9) {
			c.status = c.status.set('adrenaline', 1);
		} else if (r < 11) {
			Actives.parallel.func(c, c);
		}
	},
	siphon: adrenathrottle(function(c, t) {
		if (!c.owner.foe.sanctuary && c.owner.foe.spend(etg.Other, 1)) {
			Effect.mkText('1:11', c);
			c.owner.spend(etg.Darkness, -1);
		}
	}),
	skyblitz: function(c, t) {
		c.owner.quanta[etg.Air] = 0;
		for (var i = 0; i < 23; i++) {
			var cr = c.owner.creatures[i];
			if (cr && cr.status.get('airborne') && cr.isMaterial(etg.Creature)) {
				Effect.mkText('Dive', cr);
				const dive = cr.defstatus('dive', 0);
				cr.status = cr.status.set('dive', dive + cr.trueatk());
			}
		}
	},
	snipe: function(c, t) {
		Effect.mkText('-3', t);
		t.dmg(3);
	},
	sosa: function(c, t) {
		c.owner.sosa += 2;
		for (var i = 1; i < 13; i++) {
			if (i != etg.Death) {
				c.owner.quanta[i] = 0;
			}
		}
		c.owner.dmg(c.card.upped ? 40 : 48, true);
	},
	soulcatch: function(c, t) {
		Effect.mkText('Soul', c);
		c.owner.spend(etg.Death, c.card.upped ? -3 : -2);
	},
	spongegrow: function(c, t) {
		var submerged = false;
		if (~c.getIndex() && c.getIndex() < 5) {
			for (var i = 0; i < 16; i++) {
				if (
					(c.owner.permanents[i] && c.owner.permanents[i].status.get('flooding')) ||
					(c.owner.foe.permanents[i] &&
						c.owner.foe.permanents[i].status.get('flooding'))
				) {
					submerged = true;
					break;
				}
			}
		}
		c.buffhp(submerged ? (c.card.upped ? 5 : 4) : 2);
	},
	spores: function(c, t) {
		for (var i = 0; i < 3; i++) {
			new smth.Creature(Cards.Spore.asUpped(c.card.upped), c.owner).place();
		}
	},
	sskin: function(c, t) {
		c.owner.buffhp(c.owner.quanta[etg.Earth] - c.card.cost);
	},
	steal: function(c, t) {
		if (t.status.get('stackable')) {
			Actives.destroy.func(c, t, true);
			if (t.type === etg.Shield) {
				if (c.owner.shield && c.owner.shield.card == t.card) {
					c.owner.shield.status = c.owner.shield.status.set('charges', c.owner.shield.status.get('charges') + 1);
				} else {
					c.owner.shield = new smth.Shield(t.card, c.owner);
					c.owner.shield.status = c.owner.shield.status.set('charges', 1);
				}
			} else if (t.type === etg.Weapon) {
				if (c.owner.weapon && c.owner.weapon.card == t.card) {
					c.owner.shield.status = c.owner.shield.status.set('charges', c.owner.shield.status.get('charges') + 1);
				} else {
					c.owner.weapon = new smth.Weapon(t.card, c.owner);
					c.owner.shield.status = c.owner.shield.status.set('charges', 1);
				}
			} else {
				new smth.Permanent(t.card, c.owner).place();
			}
		} else {
			t.remove();
			t.owner = c.owner;
			t.casts = 0;
			if (t.card.isOf(Cards.Sundial)) t.status = t.status.set('charges', t.status.get('charges')+1);
			t.place();
		}
	},
	steam: function(c, t) {
		Effect.mkText('5|0', c);
		c.incrStatus('steam', 5);
		c.atk += 5;
		if (!c.hasactive('postauto', 'decrsteam'))
			c.addactive('postauto', Actives.decrsteam);
	},
	stoneform: function(c, t) {
		Effect.mkText('0|20', c);
		c.buffhp(20);
		c.active = c.active.delete('cast');
	},
	storm2: function(c, t) {
		c.owner.foe.masscc(c, function(c, x) {
			x.dmg(2);
		});
	},
	storm3: function(c, t) {
		c.owner.foe.masscc(c, Actives.snipe.func);
	},
	survivaltrait: function(c, t) {
		var possible = [];
		for (var i = 0; i < 23; i++) {
			var cr = c.owner.creatures[i];
			if (!cr) continue;
			if (!possible[0]) possible.push(cr);
			else if (
				possible[0].trueatk() + possible[0].truehp() >
				cr.trueatk() + cr.truehp()
			)
				possible = [cr];
			else if (
				possible[0].trueatk() + possible[0].truehp() ==
				cr.trueatk() + cr.truehp()
			)
				possible.push(cr);
		}
		if (possible.length == 0) return;
		var selected = null;
		for (var i = 0; i < possible.length; i++) {
			if (
				possible[i].status.get('delayed') ||
				possible[i].status.get('poison') > 0 ||
				possible[i].status.get('frozen')
			) {
				selected = possible[i];
				break;
			}
		}
		if (!selected) selected = possible[0];
		selected.die();
		for (var i = 0; i < c.owner.creatures.length; i++) {
			var cr = c.owner.creatures[i];
			if (!cr) continue;
			cr.buffhp(1);
			cr.atk += c.card.upped ? 2 : 1;
		}
	},
	swarm: function(c, t) {
		let hp = -1;
		for (let i = 0; i < 23; i++) {
			if (
				c.owner.creatures[i] &&
				c.owner.creatures[i].hasactive('auto', 'swarm')
			) {
				hp++;
			}
		}
		c.setStatus('swarmhp', hp);
	},
	swarmhp: function(c, t) {
		return c.getStatus('swarmhp');
	},
	swave: function(c, t) {
		if (t.status.get('frozen')) {
			Effect.mkText('Death', t);
			t.die();
		} else {
			if (t.type == etg.Player && t.weapon && t.weapon.status.get('frozen')) {
				Actives.destroy.func(c, t.weapon);
			}
			Effect.mkText('-4', t);
			t.spelldmg(4);
		}
	},
	swift: function(c, t) {
		Effect.mkText('Ready', c);
		c.casts = 1;
	},
	tremors: function(c, t) {
		function tremor(c, t) {
			var dmg = t.status.get('burrowed') ? 4 : 2;
			t.dmg(dmg);
		}
		tremor.affectBurrowed = true;
		c.owner.foe.masscc(c, tremor, !c.card.upped);
	},
	unburrow: function(c, t) {
		c.status = c.status.set('burrowed', false);
		c.active = c.active.set('cast', Actives.burrow);
		c.cast = 1;
		c.atk *= 2;
	},
	unsummon: function(c, t) {
		if (t.owner.hand.length < 8) {
			new smth.CardInstance(t.card, t.owner).place();
			t.remove();
		}
		//note: CIA Unsummon does nothing if hand is full.
	},
	upgrade: function(c, t) {
		if (t.card == Cards.GadgetSword) Actives.becomeshield.func(t);
		else t.transform(t.card.asUpped(true));
	},
	upkeep: function(c, t) {
		if (!c.owner.spend(c.card.element, 1)) {
			c.owner.quanta[c.card.element] = 0;
			c.die();
		}
	},
	vampire: function(c, t, dmg) {
		c.owner.dmg(-dmg);
	},
	virusinfect: function(c, t) {
		Actives.infect.func(c, t);
		c.die();
	},
	virusplague: function(c, t) {
		Actives.plague.func(c, t);
		c.die();
	},
	void: function(c, t) {
		c.owner.foe.maxhp = Math.max(
			c.owner.foe.maxhp -
				(c.owner.mark == etg.Darkness ? 3 : 2) * c.status.get('charges'),
			1,
		);
		if (c.owner.foe.hp > c.owner.foe.maxhp) {
			c.owner.foe.hp = c.owner.foe.maxhp;
		}
	},
	web: function(c, t) {
		Effect.mkText('Web', t);
		t.status = t.status.delete('airborne');
	},
	windsweep: function(c, t) {
		if (t == undefined) t = c.owner.foe;
		while (t.hand.length > 0) {
			t.deck.unshift(t.hand.pop());
		}
	},
	wisdom: function(c, t) {
		Effect.mkText('4|0', t);
		t.atk += 4;
		if (t.status.get('immaterial')) {
			t.setStatus('psion', 1);
		}
	},
	pillar: function(c, t) {
		if (!t)
			c.owner.spend(
				c.card.element,
				c.status.get('charges') * (c.card.element > 0 ? -1 : -3),
			);
		else if (c == t)
			c.owner.spend(c.card.element, (c.card.element > 0 ? -1 : -3));
	},
	pend: function(c, t) {
		var ele = c.getStatus('pendstate') ? c.owner.mark : c.card.element;
		c.owner.spend(ele, -c.status.get('charges') * (ele > 0 ? 1 : 3));
		c.setStatus('pendstate', +!c.getStatus('pendstate'));
	},
	pendvoid: function(c, t) {
		if (c.getStatus('pendstate')) {
			c.owner.spend(c.owner.mark, -c.status.get('charges'));
		} else {
			c.owner.foe.spend(etg.Other, c.status.get('charges'));
		}
		c.setStatus('pendstate', +!c.getStatus('pendstate'));
	},
	pendvoiddestroy: function(c, t) {
		if (!t) c.owner.foe.spend(etg.Other, c.status.get('charges'));
		else if (c == t) c.owner.foe.spend(etg.Other, 1);
	},
	pillmat: quadpillarFactory(18041), //4,6,7,9
	pillspi: quadpillarFactory(9611), //2,5,8,11
	pillcar: quadpillarFactory(5036), //1,3,10,12
	pillhar: function(c, t) {
		var qty = c == t ? -1 : -c.status.get('charges');
		for (var i = 0; i < 16; i++) {
			if (
				c.owner.permanents[i] &&
				c.owner.permanents[i].card.type === etg.Pillar &&
				!c.owner.permanents[i].card.isOf(Cards.HarmonicPillar)
			) {
				c.owner.spend(c.owner.permanents[i].card.element, qty);
			}
		}
		if (c.card.upped) {
			c.owner.spend(c.owner.mark, qty);
		}
	},
	blockwithcharge: function(c, t) {
		const charges = c.getStatus('charges');
		if (charges <= 1) {
			c.owner.shield = undefined;
		} else {
			c.status = c.status.set('charges', charges - 1);
		}
		return true;
	},
	cold: function(c, t) {
		if (t.type === etg.Creature && c.owner.rng() < 0.3) {
			t.freeze(3);
		}
	},
	evade100: function(c, t) {
		return true;
	},
	evade40: function(c, t) {
		return c.owner.rng() < 0.4;
	},
	evade50: function(c, t) {
		return c.owner.rng() < 0.5;
	},
	firewall: function(c, t) {
		if (t.type === etg.Creature) {
			t.dmg(1);
		}
	},
	skull: function(c, t) {
		if (t.type === etg.Creature && !t.card.isOf(Cards.Skeleton)) {
			var thp = t.truehp();
			if (thp == 0 || (thp > 0 && c.owner.rng() < 0.5 / thp)) {
				var index = t.getIndex();
				t.die();
				if (
					!t.owner.creatures[index] ||
					t.owner.creatures[index].card != Cards.MalignantCell
				) {
					t.owner.creatures[index] = new smth.Creature(
						Cards.Skeleton.asUpped(t.card.upped),
						t.owner,
					);
				}
			}
		}
	},
	slow: function(c, t) {
		if (t.type === etg.Creature) {
			t.delay(2);
		}
	},
	solar: function(c, t) {
		if (!c.owner.sanctuary) c.owner.spend(etg.Light, -1);
	},
	thorn: function(c, t) {
		if (t.type === etg.Creature && c.owner.rng() < 0.75) {
			t.addpoison(1);
		}
	},
	weight: function(c, t) {
		return t.type === etg.Creature && t.truehp() > 5;
	},
	wings: function(c, t) {
		return !t.status.get('airborne') && !t.status.get('ranged');
	},
};
for (const key in Actives) {
	Actives[key] = { name: [key], func: Actives[key], passive: false };
}
Actives.bounce.passive = Actives.decrsteam.passive = Actives.obsession.passive = Actives.salvage.passive = Actives.siphon.passive = Actives.swarm.passive = true;
module.exports = Actives;

var Effect = require('./Effect');
var etg = require('./etg');
var util = require('../util');
var Cards = require('./Cards');
var imm = require('immutable');
var smth = require('./Thing');
