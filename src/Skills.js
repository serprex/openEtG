const imm = require('immutable'),
	sfx = require('./audio');
function adrenathrottle(f) {
	return (ctx, c, ...rest) => {
		if (
			c.getStatus('adrenaline') < 3 ||
			(c.type == etg.Creature &&
				c.owner.weapon &&
				c.owner.weapon.getStatus('nothrottle'))
		) {
			return f(ctx, c, ...rest);
		}
	};
}
function quadpillarFactory(ele) {
	return (ctx, c, t) => {
		const n = c.getStatus('charges');
		for (let i = 0; i < n; i++) {
			const r = ctx.upto(16);
			c.owner.spend((ele >> ((r & 3) << 2)) & 15, -1);
			if (c.rng() < 2 / 3) {
				c.owner.spend((ele >> (r & 12)) & 15, -1);
			}
		}
	};
}
const defaultShardGolem = new imm.Map({
	stat: 1,
	cast: 0,
	status: new imm.Map(),
	active: new imm.Map(),
});
const passiveSet = new Set();
function passive(f) {
	passiveSet.add(f);
	return f;
}
const Skills = {
	ablaze: x => {
		const n = +x;
		return (ctx, c, t) => {
			Effect.mkText(n + '|0', c);
			c.atk += n;
		};
	},
	abomination: passive((ctx, c, t, data) => {
		if (data.tgt == c && data.active == Skills.mutation) {
			Skills.improve.func(ctx, c, c);
			data.evade = true;
		}
	}),
	acceleration: x => {
		const n = +x;
		return (ctx, c, t) => {
			Effect.mkText(`${n}|-1`, c);
			c.atk += n;
			c.dmg(1, true);
		};
	},
	accelerationspell: (ctx, c, t) => {
		t.lobo();
		t.setSkill('ownattack', parseSkill(`acceleration ${c.card.upped ? 3 : 2}`));
	},
	accretion: (ctx, c, t) => {
		Skills.destroy.func(ctx, c, t);
		c.buffhp(10);
		if (c.truehp() > 30) {
			c.die();
			if (c.owner.handIds.length < 8) {
				c.owner.addCard(c.card.as(Cards.BlackHole));
			}
		}
	},
	accumulation: (ctx, c, t) => {
		return c.getStatus('charges');
	},
	adrenaline: (ctx, c, t) => {
		Effect.mkText('Adrenaline', t);
		t.setStatus('adrenaline', 1);
	},
	aether: (ctx, c, t) => {
		Effect.mkText('1:12', c);
		c.owner.spend(etg.Aether, -1);
	},
	aflatoxin: (ctx, c, t) => {
		Effect.mkText('Aflatoxin', t);
		t.addpoison(2);
		t.setStatus('aflatoxin', 1);
	},
	aggroskele: (ctx, c, t) => {
		c.owner.addCrea(c.owner.newThing(c.card.as(Cards.Skeleton)));
		const dmg = c.owner.creatures.reduce(
			(dmg, cr) =>
				cr && cr.card.isOf(Cards.Skeleton) ? dmg + cr.trueatk() : dmg,
			0,
		);
		Effect.mkText(`-${dmg}`, t);
		t.dmg(dmg);
	},
	air: (ctx, c, t) => {
		Effect.mkText('1:9', c);
		c.owner.spend(etg.Air, -1);
	},
	alphawolf: (ctx, c, t) => {
		const pwolf = c.card.as(Cards.PackWolf);
		c.owner.addCrea(c.owner.newThing(pwolf));
		c.owner.addCrea(c.owner.newThing(pwolf));
	},
	antimatter: (ctx, c, t) => {
		Effect.mkText('Antimatter', t);
		t.atk -= t.trueatk() * 2;
	},
	appease: (ctx, c, t) => {
		Skills.devour.func(ctx, c, t);
		c.setStatus('appeased', 1);
	},
	atk2hp: (ctx, c, t) => {
		t.buffhp(t.trueatk() - t.hp);
	},
	autoburrow: (ctx, c, t) => {
		c.addactive('play', Skills.autoburrowproc);
	},
	autoburrowoff: (ctx, c, t) => {
		c.rmactive('play', 'autoburrowproc');
	},
	autoburrowproc: (ctx, c, t) => {
		if (t.getSkill('cast') === Skills.burrow) Skills.burrow.func(ctx, t);
	},
	axe: (ctx, c, t) => {
		return c.owner.mark == etg.Fire || c.owner.mark == etg.Time ? 1 : 0;
	},
	axedraw: (ctx, c, t) => {
		c.incrStatus('dive', 1);
	},
	bblood: (ctx, c, t) => {
		Effect.mkText('0|20', t);
		t.buffhp(20);
		t.delay(5);
	},
	becomearctic: passive((ctx, c, t) => {
		c.transform(c.card.as(Cards.ArcticSquid));
	}),
	beguile: (ctx, c, t) => {
		t.remove();
		t.ownerId = t.owner.foeId;
		t.owner.addCrea(t);
		if (c != t) t.addactive('turnstart', Skills.beguilestop);
	},
	beguilestop: passive((ctx, c, t) => {
		if (t.id == c.ownerId) {
			c.rmactive('turnstart', 'beguilestop');
			Skills.beguile.func(ctx, c, c);
		}
	}),
	bellweb: (ctx, c, t) => {
		Skills.web.func(ctx, c, t);
		t.setStatus('aquatic', 1);
	},
	blackhole: (ctx, c, t) => {
		if (!t.getStatus('sanctuary')) {
			const quanta = new Int8Array(ctx.get(t.id, 'quanta'));
			for (let q = 1; q < 13; q++) {
				c.owner.dmg(-Math.min(t.quanta[q], 3));
				quanta[q] = Math.max(quanta[q] - 3, 0);
			}
			ctx.set(t.id, 'quanta', quanta);
		}
	},
	bless: (ctx, c, t) => {
		Effect.mkText('3|3', t);
		t.atk += 3;
		t.buffhp(3);
	},
	bolsterintodeck: (ctx, c, t) => {
		c.owner.deckpush(
			c.owner.newThing(t.card).id,
			c.owner.newThing(t.card).id,
			c.owner.newThing(t.card).id,
		);
	},
	boneyard: (ctx, c, t) => {
		c.owner.addCrea(c.owner.newThing(c.card.as(Cards.Skeleton)));
	},
	bow: (ctx, c, t) => {
		return c.owner.mark == etg.Air || c.owner.mark == etg.Light ? 1 : 0;
	},
	bounce: passive((ctx, c, t) => {
		c.hp = c.maxhp;
		unsummon(c);
		return true;
	}),
	bravery: (ctx, c, t) => {
		if (!c.owner.foe.getStatus('sanctuary')) {
			for (
				let i = 0;
				i < 2 && c.owner.handIds.length < 8 && c.owner.foe.handIds.length < 8;
				i++
			) {
				c.owner.drawcard();
				c.owner.foe.drawcard();
			}
		}
	},
	brawl: (ctx, c, t) => {
		c.owner.creatures.slice().forEach((cr, i) => {
			if (cr) {
				const fcr = c.owner.foe.creatures[i];
				if (fcr) {
					fcr.attackCreature(cr);
					cr.attackCreature(fcr);
				} else {
					cr.attack();
				}
			}
		});
		c.owner.setQuanta(etg.Gravity);
	},
	brew: (ctx, c, t) => {
		Effect.mkText('Brew', c);
		c.owner.addCard(c.card.as(Cards.Codes[etg.AlchemyList[ctx.upto(12) + 1]]));
	},
	brokenmirror: (ctx, c, t, fromhand) => {
		if (fromhand && t.type == etg.Creature && c.ownerId != t.ownerId) {
			c.owner.addCrea(c.owner.newThing(c.card.as(Cards.Phantom)));
		}
	},
	burrow: (ctx, c, t) => {
		c.setStatus('burrowed', 1);
		c.setStatus('airborne', 0);
		c.setSkill('cast', Skills.unburrow);
		c.cast = 0;
	},
	butterfly: (ctx, c, t) => {
		t.lobo();
		t.setSkill('cast', Skills.destroy);
		t.cast = 3;
		t.castele = etg.Entropy;
	},
	catapult: (ctx, c, t) => {
		Effect.mkText('Catapult', t);
		t.die();
		c.owner.foe.dmg(
			Math.ceil(
				(t.truehp() * (t.getStatus('frozen') ? 150 : 100)) / (t.truehp() + 100),
			),
		);
		const poison = t.getStatus('poison');
		if (poison) c.owner.foe.addpoison(poison);
		const frozen = t.getStatus('frozen');
		if (frozen) c.owner.foe.freeze(frozen);
	},
	catlife: passive((ctx, c, t, data) => {
		if (!c.owner.creatures[data.index]) {
			const lives = c.maybeDecrStatus('lives');
			if (!lives) return;
			Effect.mkText(`${lives - 1} lives`, c);
			const cl = c.clone(c.ownerId);
			cl.hp = cl.maxhp = c.card.health;
			cl.atk = c.card.attack;
			const creatures = new Uint32Array(c.owner.creatureIds);
			creatures[data.index] = cl.id;
			c.owner.creatureIds = creatures;
		}
	}),
	cell: passive((ctx, c, t) => {
		c.transform(c.card.as(Cards.MalignantCell));
	}),
	chimera: (ctx, c, t) => {
		let atk = 0,
			hp = 0;
		c.owner.creatures.forEach(cr => {
			if (cr) {
				atk += cr.trueatk();
				hp += cr.truehp();
			}
		});
		const chim = c.owner.newThing(c.card.as(Cards.Chimera));
		chim.atk = atk;
		chim.maxhp = chim.hp = hp;
		chim.setStatus('momentum', 1);
		chim.setStatus('airborne', 1);
		chim.type = etg.Creature;
		const newCreatures = new Uint32Array(23);
		newCreatures[0] = chim.id;
		ctx.set(c.ownerId, 'creatures', newCreatures);
		c.owner.gpull = chim.id;
	},
	chromastat: (ctx, c, t) => {
		const n = c.truehp() + c.trueatk();
		Effect.mkText(n + ':0', c);
		c.owner.spend(0, -n);
	},
	clear: (ctx, c, t) => {
		Effect.mkText('Clear', t);
		t.setStatus('poison', 0);
		t.setStatus('adrenaline', 0);
		t.setStatus('aflatoxin', 0);
		t.setStatus('momentum', 0);
		t.setStatus('psionic', 0);
		t.maybeDecrStatus('delayed');
		t.maybeDecrStatus('frozen');
		t.dmg(-1);
		if (t.hasactive('turnstart', 'beguilestop')) {
			Skills.beguilestop.func(ctx, t, t.owner);
		}
	},
	corpseexplosion: (ctx, c, t) => {
		const dmg = 1 + Math.floor(t.truehp() / 8);
		t.die();
		c.owner.foe.masscc(c, (ctx, c, t) => t.spelldmg(dmg), !c.card.upped);
		const poison = t.getStatus('poison') + t.getStatus('poisonous');
		if (poison) c.owner.foe.addpoison(poison);
	},
	counter: passive((ctx, c, t, data) => {
		if (
			!c.getStatus('frozen') &&
			!c.getStatus('delayed') &&
			data.dmg > 0 &&
			~c.getIndex()
		) {
			c.attackCreature(t);
		}
	}),
	countimmbur: (ctx, c) => {
		let n = 0;
		function test(x) {
			if (x && (x.getStatus('immaterial') || x.getStatus('burrowed'))) n++;
		}
		c.owner.forEach(test);
		c.owner.foe.forEach(test);
		return n;
	},
	cpower: (ctx, c, t) => {
		const buff = ctx.upto(25),
			bh = ((buff / 5) | 0) + 1,
			ba = (buff % 5) + 1;
		Effect.mkText(ba + '|' + bh, t);
		t.buffhp(bh);
		t.atk += ba;
	},
	creatureupkeep: (ctx, c, t) => {
		if (t.type === etg.Creature) Skills.upkeep.func(ctx, t);
	},
	cseed: (ctx, c, t) => {
		Skills[
			c.choose([
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
	},
	cseed2: (ctx, c, t) => {
		const choice = c.choose(
			Cards.filter(ctx.upto(2), c => {
				if (c.type != etg.Spell) return false;
				const tgting = Cards.Targeting[c.active.get('cast').name[0]];
				return tgting && tgting(c, t);
			}),
		);
		Effect.mkText(choice.name, t);
		c.castSpell(t, choice.active.get('cast'));
	},
	dagger: (ctx, c) => {
		let buff = c.owner.mark == etg.Darkness || c.owner.mark == etg.Death;
		c.owner.permanents.forEach(p => {
			if (p && p.getStatus('cloak')) buff++;
		});
		return buff;
	},
	deadalive: (ctx, c) => {
		c.deatheffect(c.getIndex());
	},
	deathwish: (ctx, c, t, data) => {
		const tgt = data.tgt;
		if (
			!tgt ||
			c.getStatus('frozen') ||
			c.getStatus('delayed') ||
			c.ownerId == t.ownerId ||
			tgt.ownerId != c.ownerId ||
			tgt.type != etg.Creature ||
			!Cards.Targeting[data.active.name[0]](t, c)
		)
			return;
		if (!tgt.hasactive('prespell', 'deathwish')) return (data.tgt = c);
		let totaldw = 0;
		c.owner.creatures.forEach(cr => {
			if (cr && cr.hasactive('prespell', 'deathwish')) totaldw++;
		});
		if (c.rng() < 1 / totaldw) {
			return (data.tgt = c);
		}
	},
	decrsteam: passive((ctx, c) => {
		if (c.maybeDecrStatus('steam')) {
			c.atk--;
		}
	}),
	deckblast: (ctx, c, t) => {
		c.owner.foe.spelldmg(Math.ceil(c.owner.deckIds.length / c.owner.deckpower));
		c.owner.deckIds.length = 0;
	},
	deepdive: (ctx, c, t) => {
		c.setSkill('cast', Skills.freezeperm);
		c.castele = etg.Gravity;
		c.setStatus('airborne', 0);
		c.setStatus('burrowed', 1);
		c.addactive('turnstart', Skills.deepdiveproc);
	},
	deepdiveproc: passive((ctx, c, t) => {
		if (t.id == c.ownerId) {
			c.rmactive('turnstart', 'deepdiveproc');
			c.addactive('turnstart', Skills.deepdiveproc2);
			c.setStatus('airborne', 1);
			c.setStatus('burrowed', 0);
			c.setStatus('dive', c.trueatk() * 2);
		}
	}),
	deepdiveproc2: passive((ctx, c, t) => {
		c.rmactive('turnstart', 'deepdiveproc2');
		c.setSkill('cast', Skills.deepdive);
		c.castele = etg.Water;
		c.setStatus('airborne', false);
	}),
	deja: (ctx, c, t) => {
		c.active = c.active.delete('cast');
		Skills.parallel.func(ctx, c, c);
	},
	deployblobs: (ctx, c, t) => {
		const blob = c.card.as(Cards.Blob);
		for (let i = 0; i < 3; i++) {
			c.owner.addCrea(c.owner.newThing(blob));
		}
		c.atk -= 2;
		c.dmg(2);
	},
	destroy: (ctx, c, t, dontsalvage, donttalk) => {
		if (!donttalk) {
			Effect.mkText('Destroy', t);
		}
		if (t.getStatus('stackable')) {
			if (t.maybeDecrStatus('charges') < 2) {
				t.remove();
			}
		} else t.remove();
		if (!dontsalvage) {
			t.proc('destroy', {});
		}
	},
	destroycard: (ctx, c, t) => {
		if (t.type == etg.Player) {
			if (!t.deckIds.length) ctx.setWinner(t.foeId);
			else t._draw();
		} else if (!t.owner.getStatus('sanctuary')) {
			t.die();
		}
	},
	detain: (ctx, c, t) => {
		t.dmg(1);
		t.atk--;
		Skills['growth 1'].func(ctx, c);
		t.setStatus('airborne', 0);
		t.setStatus('burrowed', 1);
	},
	devour: (ctx, c, t) => {
		Effect.mkText('1|1', c);
		sfx.playSound('devour');
		c.buffhp(1);
		c.atk += 1;
		if (t.getStatus('poisonous')) c.addpoison(1);
		t.die();
	},
	die: (ctx, c, t) => {
		c.die();
	},
	disarm: (ctx, c, t) => {
		if (t.type == etg.Player && t.weapon) {
			unsummon(t.weapon);
		}
	},
	disc: (ctx, c, t) => {
		return c.owner.mark == etg.Entropy || c.owner.mark == etg.Aether ? 1 : 0;
	},
	discping: (ctx, c, t) => {
		t.dmg(1);
		c.remove();
		c.owner.addCardInstance(c);
	},
	disfield: (ctx, c, t, data) => {
		if (!c.owner.spend(etg.Chroma, data.dmg)) {
			ctx.set(c.ownerId, 'quanta', new Int8Array(13));
			c.owner.shield = undefined;
		}
		data.dmg = 0;
	},
	disshield: (ctx, c, t, data) => {
		if (!c.owner.spend(etg.Entropy, Math.ceil(data.dmg / 3))) {
			c.owner.setQuanta(etg.Entropy);
			c.remove();
		}
		data.dmg = 0;
	},
	dive: (ctx, c, t) => {
		Effect.mkText('Dive', c);
		sfx.playSound('dive');
		c.setStatus('dive', c.trueatk());
	},
	divinity: (ctx, c, t) => {
		if (c.owner.maxhp < 500) {
			c.owner.maxhp = Math.min(c.owner.maxhp + 24, 500);
		}
		c.owner.dmg(-16);
	},
	dmgproduce: (ctx, c, t, dmg) => {
		c.owner.spend(0, -dmg);
	},
	drainlife: (ctx, c, t) => {
		c.owner.dmg(-t.spelldmg(2 + Math.floor(c.owner.quanta[etg.Darkness] / 5)));
	},
	draft: (ctx, c, t) => {
		Effect.mkText('Draft', t);
		const isborne = !t.getStatus('airborne');
		t.setStatus('airborne', isborne);
		if (isborne) {
			Effect.mkText('3|0', t);
			t.atk += 3;
			if (t.getSkill('cast') === Skills.burrow)
				t.active = t.active.delete('cast');
		} else {
			t.spelldmg(3);
		}
	},
	drawcopy: (ctx, c, t) => {
		if (c.ownerId != t.ownerId) c.owner.addCardInstance(t.clone(c.ownerId));
	},
	drawequip: (ctx, c, t) => {
		const deck = c.owner.deck;
		for (let i = c.owner.deckIds.length - 1; i > -1; i--) {
			const card = deck[i];
			if (card.card.type == etg.Weapon || card.card.type == etg.Shield) {
				if (~c.owner.addCardInstance(card)) {
					const deckIds = Array.from(c.owner.deck);
					deckIds.splice(i, 1);
					c.owner.deckIds = deckIds;
					c.owner.proc('draw');
				}
				return;
			}
		}
	},
	drawpillar: (ctx, c, t) => {
		const deck = c.owner.deck;
		if (deck.length && deck[deck.length - 1].card.type == etg.Pillar)
			Skills.hasten.func(ctx, c, t);
	},
	dryspell: (ctx, c, t) => {
		c.owner.foe.masscc(
			c.owner,
			(ctx, c, t) => c.spend(etg.Water, -t.spelldmg(1)),
			true,
		);
	},
	dshield: (ctx, c, t) => {
		c.setStatus('immaterial', 1);
		c.addactive('turnstart', Skills.dshieldoff);
	},
	dshieldoff: passive((ctx, c, t) => {
		if (c.ownerId == t.id) {
			c.setStatus('immaterial', 0);
			c.rmactive('turnstart', 'dshieldoff');
		}
	}),
	duality: (ctx, c, t) => {
		if (c.owner.foe.deckIds.length && c.owner.handIds.length < 8) {
			c.owner.addCardInstance(
				c.owner.foe.deck[c.owner.foe.deckIds.length - 1].clone(c.ownerId),
			);
		}
	},
	earth: (ctx, c, t) => {
		Effect.mkText('1:4', c);
		c.owner.spend(etg.Earth, -1);
	},
	earthquake: (ctx, c, t) => {
		Effect.mkText('Earthquake', t);
		if (t.getStatus('charges') > 3) {
			t.incrStatus('charges', -3);
		} else {
			t.remove();
		}
		t.proc('destroy', {});
	},
	elf: passive((ctx, c, t, data) => {
		if (data.tgt == c && data.active == Skills.cseed) {
			c.transform(c.card.as(Cards.FallenElf));
			data.evade = true;
		}
	}),
	embezzle: (ctx, c, t) => {
		Effect.mkText('Embezzle', t);
		t.lobo();
		t.addactive('hit', Skills.forcedraw);
		t.addactive('owndeath', Skills.embezzledeath);
	},
	embezzledeath: (ctx, c, t) => {
		if (c.owner.foe.deckIds.length < 3) {
			c.owner.foe.deckIds.length = 0;
			ctx.setWinner(c.ownerId);
		} else {
			c.owner.foe.deckIds.length -= 3;
		}
	},
	empathy: (ctx, c, t) => {
		const healsum = c.owner.countcreatures();
		Effect.mkText('+' + healsum, c);
		c.owner.dmg(-healsum);
		if (!c.owner.spend(etg.Life, Math.floor(healsum / 8))) {
			c.owner.setQuanta(etg.Life);
			c.die();
		}
	},
	enchant: (ctx, c, t) => {
		Effect.mkText('Enchant', t);
		t.setStatus('immaterial', 1);
	},
	endow: (ctx, c, t) => {
		Effect.mkText('Endow', t);
		for (const [key, val] of t.status) {
			c.incrStatus(key, key == 'adrenaline' && val > 1 ? 1 : val);
		}
		if (t.active.get('cast') === Skills.endow) {
			c.active = c.active.delete('cast');
		} else {
			c.active = t.active;
			c.cast = t.cast;
			c.castele = t.castele;
		}
		c.atk += t.trueatk() - t.trigger('buff');
		c.buffhp(2);
	},
	envenom: (ctx, c, t) => {
		t.addactive('hit', parseSkill('poison 1'));
		t.addactive('shield', Skills.thornweak);
	},
	epidemic: (ctx, c, t) => {
		const poison = t.getStatus('poison');
		if (poison) c.owner.foe.addpoison(poison);
	},
	epoch: (ctx, c, t) => {
		c.incrStatus('epoch', 1);
		if (c.getStatus('epoch') > 1) Skills.silence.func(ctx, c, t.owner);
	},
	epochreset: (ctx, c, t) => {
		c.setStatus('epoch', 0);
	},
	evolve: (ctx, c, t) => {
		c.transform(c.card.as(Cards.Shrieker));
		c.setStatus('burrowed', 0);
	},
	feed: (ctx, c, t) => {
		t.addpoison(1);
		parseSkill('growth 3').func(ctx, c);
		c.setStatus('immaterial', 0);
	},
	fickle: (ctx, c, t) => {
		if (t.ownerId != c.ownerId && t.owner.getStatus('sanctuary')) {
			return;
		}
		const cards = [];
		t.owner.deck.forEach(({ card }, i) => {
			let cost = card.cost;
			if (!card.element || card.element == c.castele) cost += c.cast;
			if (t.owner.canspend(card.costele, cost)) {
				cards.push(i);
			}
		});
		if (cards.length) {
			const pick = t.choose(cards);
			const card = t.owner.deck[pick];
			const hand = Array.from(t.owner.handIds);
			hand[t.getIndex()] = card.id;
			t.owner.handIds = hand;
			card.type = etg.Spell;
			card.ownerId = t.ownerId;
			const deck = Array.from(t.owner.deckIds);
			deck[pick] = t.id;
			t.owner.deckIds = deck;
		}
	},
	fiery: (ctx, c, t) => {
		return Math.floor(c.owner.quanta[etg.Fire] / 5);
	},
	fire: (ctx, c, t) => {
		Effect.mkText('1:6', c);
		c.owner.spend(etg.Fire, -1);
	},
	firebolt: (ctx, c, t) => {
		t.spelldmg(3 + Math.floor(c.owner.quanta[etg.Fire] / 4));
		if (t.type == etg.Player) {
			if (t.weapon) {
				t.weapon.setStatus('frozen', 0);
			}
		} else {
			t.setStatus('frozen', 0);
		}
	},
	firebrand: passive((ctx, c, t, data) => {
		if (data.tgt == c && data.active == Skills.tempering) {
			c.incrStatus('charges', 1);
		}
	}),
	flatline: (ctx, c, t) => {
		if (!c.owner.foe.getStatus('sanctuary')) {
			c.owner.foe.setStatus('flatline', 1);
		}
	},
	flyself: (ctx, c, t) => {
		Skills[c.type == etg.Weapon ? 'flyingweapon' : 'livingweapon'].func(
			ctx,
			c,
			c,
		);
	},
	flyingweapon: (ctx, c, t) => {
		t.remove();
		t.setStatus('airborne', 1);
		t.owner.addCrea(t);
	},
	foedraw: (ctx, c, t) => {
		if (c.owner.handIds.length < 8) {
			if (!c.owner.foe.deckIds.length) ctx.setWinner(c.ownerId);
			else {
				c.owner.deckpush(c.owner.foe._draw());
				c.owner.drawcard();
			}
		}
	},
	forcedraw: (ctx, c, t) => {
		if (!t.owner.getStatus('sanctuary')) {
			t.owner.drawcard();
		}
	},
	forceplay: (ctx, c, t) => {
		function findtgt(tgting) {
			function tgttest(x) {
				if (x && tgting(t.owner, x)) {
					tgts.push(x);
				}
			}
			const tgts = [];
			for (let i = 0; i < 2; i++) {
				const pl = i == 0 ? c.owner : c.owner.foe;
				tgttest(pl);
				pl.forEach(tgttest, true);
			}
			return tgts.length == 0 ? undefined : c.choose(tgts);
		}
		let tgting, tgt;
		if (t.type == etg.Spell) {
			const card = t.card;
			Effect.mkSpriteFadeHandImage(t.card, t, {
				x: t.ownerId === ctx.player2Id ? -1 : 1,
				y: 0,
			});
			if (t.owner.getStatus('sanctuary')) return;
			if (card.type == etg.Spell) {
				tgting = Cards.Targeting[card.active.get('cast').name[0]];
			}
		} else if (t.active.has('cast')) {
			tgting = Cards.Targeting[t.active.get('cast').name[0]];
		}
		if (tgting && !(tgt = findtgt(tgting))) return;
		const realturn = ctx.turn;
		ctx.turn = t.owner;
		t.useactive(tgt);
		ctx.turn = realturn;
	},
	fractal: (ctx, c, t) => {
		Effect.mkText('Fractal', t);
		for (let i = 6 + Math.floor(c.owner.quanta[etg.Aether] / 2); i > 0; i--) {
			c.owner.addCard(t.card);
		}
		c.owner.setQuanta(etg.Aether);
	},
	freedom: (ctx, c, t, attackFlags) => {
		if (
			c.ownerId === t.ownerId &&
			t.type === etg.Creature &&
			t.getStatus('airborne') &&
			!attackFlags.freedom &&
			c.rng() < 0.3
		)
			attackFlags.freedom = true;
	},
	freeevade: (ctx, c, t, data) => {
		const tgt = data.tgt;
		if (
			tgt &&
			tgt.type == etg.Creature &&
			tgt.ownerId == c.ownerId &&
			tgt.ownerId != t.ownerId &&
			tgt.getStatus('airborne') &&
			!tgt.getStatus('frozen') &&
			c.rng() > 0.8
		) {
			data.evade = true;
		}
	},
	freeze: (ctx, c, t) => {
		t.freeze(c.card.upped ? 4 : 3);
	},
	freezeperm: (ctx, c, t) => {
		Skills.freeze.func(ctx, c, t);
	},
	fungusrebirth: (ctx, c, t) => {
		c.transform(c.card.as(Cards.Fungus));
	},
	gaincharge2: (ctx, c, t) => {
		if (c != t) {
			c.incrStatus('charges', 2);
		}
	},
	gaintimecharge: (ctx, c, t, drawstep) => {
		if (!drawstep && c.ownerId == t && c.getStatus('chargecap') < 4) {
			c.incrStatus('chargecap', 1);
			c.incrStatus('charges', 1);
		}
	},
	gas: (ctx, c, t) => {
		c.owner.addPerm(c.owner.newThing(c.card.as(Cards.UnstableGas)));
	},
	give: (ctx, c, t) => {
		c.owner.dmg(c.card.upped ? -10 : -5);
		if (t.type !== etg.Spell && t.hasactive('ownattack', 'singularity')) {
			t.die();
		} else {
			t.remove();
			if (t.type == etg.Permanent) c.owner.foe.addPerm(t);
			else if (t.type == etg.Creature) c.owner.foe.addCrea(t);
			else if (t.type == etg.Shield) c.owner.foe.setShield(t);
			else if (t.type == etg.Weapon) c.owner.foe.setWeapon(t);
			else c.owner.foe.addCard(t.card);
		}
	},
	golemhit: (ctx, c, t) => {
		t.attack();
	},
	gpull: (ctx, c, t) => {
		Skills.gpullspell.func(ctx, c, c);
	},
	gpullspell: (ctx, c, t) => {
		if (t.type == etg.Creature) {
			t.owner.gpull = t.id;
		} else {
			t = t.owner;
			t.gpull = 0;
		}
		Effect.mkText('Pull', t);
	},
	gratitude: (ctx, c, t) => {
		Effect.mkText('+4', c);
		c.owner.dmg(-4);
	},
	grave: (ctx, c, t) => {
		c.setStatus('burrowed', 0);
		c.transform(t.card);
		c.setStatus('nocturnal', 1);
	},
	growth: x => {
		const n = +x;
		return (ctx, c, t) => {
			Effect.mkText(`${n}|${n}`, c);
			c.buffhp(n);
			c.atk += n;
		};
	},
	guard: (ctx, c, t) => {
		Effect.mkText('Guard', t);
		c.delay(1);
		t.delay(1);
		if (c.getStatus('airborne') || !t.getStatus('airborne')) {
			c.attackCreature(t);
		}
	},
	halveatk: (ctx, c, t) => {
		t = t || c;
		const storedatk = Math.ceil(t.atk / 2);
		t.incrStatus('storedAtk', storedatk);
		t.atk -= storedatk;
	},
	hammer: (ctx, c, t) => {
		return c.owner.mark == etg.Gravity || c.owner.mark == etg.Earth ? 1 : 0;
	},
	hasten: (ctx, c, t) => {
		c.owner.drawcard();
	},
	hatch: (ctx, c, t) => {
		Effect.mkText('Hatch', c);
		c.transform(c.randomcard(c.card.upped, x => x.type == etg.Creature));
	},
	heal: (ctx, c, t) => {
		t.dmg(-20);
	},
	heatmirror: (ctx, c, t, fromhand) => {
		if (fromhand && t.type == etg.Creature && c.ownerId != t.ownerId) {
			c.owner.addCrea(c.owner.newThing(c.card.as(Cards.Spark)));
		}
	},
	hitownertwice: (ctx, c, t) => {
		if (!c.hasactive('turnstart', 'predatoroff')) {
			c.addactive('turnstart', Skills.predatoroff);
			c.attack(c.owner);
			c.attack(c.owner);
		}
	},
	holylight: (ctx, c, t) => {
		if (t.getStatus('nocturnal')) t.spelldmg(10);
		else t.dmg(-10);
	},
	hope: (ctx, c, t) => {
		return c.owner.creatures.reduce(
			(dr, cr) => (cr && cr.hasactive('ownattack', 'light') ? dr + 1 : dr),
			0,
		);
	},
	icebolt: (ctx, c, t) => {
		const bolts = Math.floor(c.owner.quanta[etg.Water] / 5);
		if (c.rng() < 0.35 + bolts / 20) {
			t.freeze(c.card.upped ? 4 : 3);
		}
		t.spelldmg(2 + bolts);
	},
	ignite: (ctx, c, t) => {
		c.die();
		c.owner.foe.spelldmg(20);
		c.owner.foe.masscc(c, (ctx, c, x) => x.spelldmg(1), true);
	},
	immolate: (ctx, c, t) => {
		t.die();
		if (!t.hasactive('ownattack', 'singularity')) {
			for (let i = 1; i < 13; i++) c.owner.spend(i, -1);
			c.owner.spend(etg.Fire, c.card.upped ? -7 : -5);
		}
	},
	improve: (ctx, c, t) => {
		Effect.mkText('Improve', t);
		t.setStatus('mutant', 1);
		t.transform(t.randomcard(false, x => x.type == etg.Creature));
	},
	inertia: (ctx, c, t, data) => {
		if (data.tgt && c.ownerId == data.tgt.ownerId) {
			c.owner.spend(etg.Gravity, -2);
		}
	},
	infect: (ctx, c, t) => {
		Effect.mkText('Infect', t);
		t.addpoison(1);
	},
	inflation: (ctx, c, t) => {
		function inflate(p) {
			if (p && p.isMaterial() && p.active.has('cast')) {
				if (!p.cast) p.castele = 0;
				p.cast++;
			}
		}
		c.owner.forEach(inflate);
		c.owner.foe.forEach(inflate);
	},
	ink: (ctx, c, t) => {
		const p = c.owner.newThing(c.card.as(Cards.Cloak));
		p.setStatus('charges', 1);
		c.owner.addPerm(p);
	},
	innovation: (ctx, c, t) => {
		const town = t.owner;
		if (!town.getStatus('sanctuary')) {
			t.die();
			if (!town.deckIds.length) ctx.setWinner(town.foeId);
			else {
				town._draw();
				for (let i = 0; i < 3; i++) {
					town.drawcard();
				}
			}
		}
	},
	integrity: (ctx, c, t) => {
		const tally = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
		const shardSkills = [
			['deadalive', 'mutation', 'paradox', 'improve', 'improve', 'antimatter'],
			['infect', 'infect', 'infect', 'infect', 'aflatoxin', 'aflatoxin'],
			['devour', 'devour', 'devour', 'devour', 'devour', 'blackhole'],
			['burrow', 'stoneform', 'guard', 'guard', 'bblood', 'bblood'],
			[
				'growth 2',
				'adrenaline',
				'adrenaline',
				'adrenaline',
				'adrenaline',
				'mitosis',
			],
			['ablaze 1', 'ablaze 2', 'tempering', 'destroy', 'destroy', 'rage'],
			['steam', 'steam', 'freeze', 'freeze', 'nymph', 'nymph'],
			['mend', 'endow', 'endow', 'luciferin', 'luciferin', 'luciferin'],
			['summon Firefly', 'summon Firefly', 'snipe', 'dive', 'gas', 'gas'],
			[
				'summon Scarab',
				'summon Scarab',
				'deja',
				'deja',
				'precognition',
				'precognition',
			],
			[
				'siphonstrength',
				'siphonstrength',
				'yoink',
				'liquid',
				'liquid',
				'steal',
			],
			['lobotomize', 'lobotomize', 'lobotomize', 'quint', 'quint', 'quint'],
		];
		const shardCosts = {
			burrow: 1,
			stoneform: 1,
			guard: 1,
			bblood: 2,
			deadalive: 1,
			mutation: 2,
			paradox: 2,
			improve: 2,
			antimatter: 3,
			infect: 1,
			aflatoxin: 2,
			devour: 3,
			blackhole: 3,
			'growth 2': 2,
			adrenaline: 2,
			mitosis: 3,
			'ablaze 1': 1,
			'ablaze 2': 1,
			tempering: c.card.upped ? 2 : 1,
			destroy: 3,
			rage: 2,
			steam: 2,
			freeze: 2,
			nymph: 3,
			mend: 1,
			endow: 2,
			luciferin: 3,
			'summon Firefly': 2,
			snipe: 2,
			dive: 2,
			gas: 2,
			'summon Scarab': 2,
			deja: 4,
			precognition: 2,
			siphonstrength: 2,
			yoink: 2,
			liquid: 2,
			steal: 3,
			lobotomize: 2,
			quint: 2,
		};
		let stat = c.card.upped ? 0.5 : 0,
			handIds = c.owner.handIds;
		for (let i = handIds.length - 1; ~i; i--) {
			const card = ctx.byId(handIds[i]).card;
			if (etg.ShardList.some(x => x && card.isOf(Cards.Codes[x]))) {
				if (card.upped) {
					stat += 0.5;
				}
				tally[card.element]++;
				handIds.splice(i, 1);
			}
		}
		c.owner.handIds = handIds;
		let num = 0,
			shlist = [];
		for (let i = 1; i < 13; i++) {
			stat += tally[i] * 2;
			if (tally[i] > num) {
				num = tally[i];
				shlist.length = 0;
				shlist[0] = i;
			} else if (num != 0 && tally[i] == num) {
				shlist.push(i);
			}
		}
		const active = shardSkills[c.choose(shlist) - 1][Math.min(num - 1, 5)];
		const shardgolem = {
			stat: Math.floor(stat),
			status: new imm.Map({ golem: 1 }),
			active: new imm.Map({ cast: parseSkill(active) }),
			cast: shardCosts[active],
		};
		function addSkill(event, active) {
			Thing.prototype.addactive.call(shardgolem, event, parseSkill(active));
		}
		[
			[[2, 'hit', 'scramble']],
			[[0, 'death', 'growth 1'], [0, '', 'nocturnal']],
			[[1, '', 'momentum']],
			[],
			[
				[0, '', 'poisonous'],
				[0, '', 'adrenaline', 1],
				[2, 'ownattack', 'regenerate'],
			],
			[[0, 'buff', 'fiery']],
			[[0, '', 'aquatic'], [2, 'hit', 'regen']],
			[
				[0, 'ownattack', 'light'],
				[1, 'blocked', 'virtue'],
				[2, 'owndmg', 'martyr'],
				[3, 'ownfreeze', 'growth 2'],
				[4, 'hit', 'disarm'],
				[5, 'ownattack', 'sanctuary'],
			],
			[[0, '', 'airborne']],
			[[1, 'hit', 'neuro']],
			[
				[0, '', 'nocturnal'],
				[0, '', 'voodoo'],
				[1, 'ownattack', 'siphon'],
				[2, 'hit', 'vampire'],
				[3, 'hit', 'reducemaxhp'],
				[4, 'destroy', 'loot'],
				[5, 'owndeath', 'catlife'],
				[5, '', 'lives', 69105],
			],
			[[2, '', 'immaterial']],
		].forEach((slist, i) => {
			const ishards = tally[i + 1];
			for (let j = 0; j < slist.length; j++) {
				const data = slist[j];
				if (ishards <= data[0]) return;
				if (!data[1]) {
					shardgolem.status = shardgolem.status.set(
						data[2],
						data[3] === undefined ? 1 : data[3],
					);
				} else {
					addSkill(data[1], data[2]);
				}
			}
		});
		if (tally[etg.Death] > 0) {
			addSkill('hit', 'poison ' + tally[etg.Death]);
		}
		ctx.set(c.owner, 'shardgolem', new imm.Map(shardgolem));
		c.owner.addCrea(c.owner.newThing(c.card.as(Cards.ShardGolem)), true);
	},
	jelly: (ctx, c, t) => {
		const tcard = t.card;
		t.transform(tcard.as(Cards.PinkJelly));
		t.castele = tcard.element;
		t.cast = 4;
		t.atk = 7;
		t.maxhp = t.hp = 4;
	},
	jetstream: (ctx, c, t) => {
		t.dmg(1);
		t.atk += 3;
	},
	light: (ctx, c, t) => {
		Effect.mkText('1:8', c);
		c.owner.spend(etg.Light, -1);
	},
	lightning: (ctx, c, t) => {
		Effect.mkText('-5', t);
		t.spelldmg(5);
	},
	liquid: (ctx, c, t) => {
		Effect.mkText('Liquid', t);
		t.lobo();
		t.setSkill('hit', Skills.vampire);
		t.addpoison(1);
	},
	livingweapon: (ctx, c, t) => {
		if (t.owner.weapon) unsummon(t.owner.weapon);
		t.owner.dmg(-t.truehp());
		t.remove();
		t.owner.setWeapon(t);
	},
	lobotomize: (ctx, c, t) => {
		Effect.mkText('Lobotomize', t);
		sfx.playSound('lobo');
		t.lobo();
		t.setStatus('psionic', 0);
	},
	locket: (ctx, c, t) => {
		const ele = c.getStatus('mode') || c.owner.mark;
		c.owner.spend(ele, ele > 0 ? -1 : -3);
	},
	locketshift: (ctx, c, t) => {
		c.setStatus('mode', t.type == etg.Player ? t.mark : t.card.element);
	},
	loot: (ctx, c, t) => {
		if (c.ownerId == t.ownerId && !c.hasactive('turnstart', 'salvageoff')) {
			const foe = c.owner.foe,
				perms = foe.permanents.filter(x => {
					return x && x.isMaterial();
				});
			if (foe.weapon && foe.weapon.isMaterial()) perms.push(foe.weapon);
			if (foe.shield && foe.shield.isMaterial()) perms.push(foe.shield);
			if (perms.length) {
				Effect.mkText('Looted', c);
				Skills.steal.func(ctx, c, foe.choose(perms));
				c.addactive('turnstart', Skills.salvageoff);
			}
		}
	},
	losecharge: (ctx, c, t) => {
		if (!c.maybeDecrStatus('charges')) {
			if (c.type == etg.Creature) c.die();
			else c.remove();
		}
	},
	luciferin: (ctx, c, t) => {
		c.owner.dmg(-10);
		c.owner.masscc(c, (ctx, c, x) => {
			for (const [key, act] of x.active) {
				if (
					key != 'ownplay' &&
					key != 'owndiscard' &&
					!act.name.every(name => parseSkill(name).passive)
				)
					return;
			}
			x.addactive('ownattack', Skills.light);
		});
	},
	lycanthropy: (ctx, c, t) => {
		Effect.mkText('5|5', c);
		c.buffhp(5);
		c.atk += 5;
		c.active = c.active.delete('cast');
		c.setStatus('nocturnal', 1);
	},
	martyr: passive((ctx, c, t, dmg) => {
		if (dmg > 0) c.atk += dmg;
	}),
	mend: (ctx, c, t) => {
		t.dmg(-10);
	},
	metamorph: (ctx, c, t) => {
		c.owner.mark = t.type == etg.Player ? t.mark : t.card.element;
		c.owner.markpower++;
	},
	midas: (ctx, c, t) => {
		if (t.getStatus('stackable') && t.getStatus('charges') > 1) {
			Skills.destroy.func(ctx, c, t, true);
			const relic = t.owner.newThing(t.card.as(Cards.GoldenRelic));
			relic.usedactive = false;
			t.owner.addPerm(relic);
		} else {
			t.clearStatus();
			t.transform(t.card.as(Cards.GoldenRelic));
			t.atk = t.maxhp = t.hp = 1;
		}
	},
	millpillar: (ctx, c, t) => {
		if (
			t.deckIds.length &&
			t.deck[t.deckIds.length - 1].card.type == etg.Pillar
		)
			t._draw();
	},
	mimic: (ctx, c, t) => {
		if (c != t && t.type == etg.Creature) {
			c.transform(t.card);
			c.addactive('play', Skills.mimic);
		}
	},
	miracle: (ctx, c, t) => {
		c.owner.setQuanta(etg.Light);
		if (c.owner.getStatus('sosa')) {
			c.owner.hp = 1;
		} else if (c.owner.hp < c.owner.maxhp) {
			c.owner.hp = c.owner.maxhp - 1;
		}
	},
	mitosis: (ctx, c, t) => {
		c.owner.newThing(c.card).play(c);
	},
	mitosisspell: (ctx, c, t) => {
		t.setSkill('cast', Skills.mitosis);
		t.castele = t.card.costele;
		t.cast = t.card.cost;
		t.buffhp(1);
	},
	momentum: (ctx, c, t) => {
		Effect.mkText('Momentum', t);
		t.atk += 1;
		t.buffhp(1);
		t.setStatus('momentum', 1);
	},
	mummy: passive((ctx, c, t, data) => {
		if (data.tgt == c && data.active == Skills.rewind) {
			c.transform(c.card.as(Cards.Pharaoh));
			data.evade = true;
		}
	}),
	mutant: (ctx, c, t) => {
		if (!c.mutantactive()) {
			c.setSkill('cast', Skills.web);
			c.cast = ctx.upto(2) + 1;
		}
		c.castele = ctx.upto(13);
		c.setStatus('mutant', 1);
	},
	mutation: (ctx, c, t) => {
		const rnd = c.rng();
		if (rnd < 0.1) {
			Effect.mkText('Death', t);
			t.die();
		} else if (rnd < 0.5) {
			Skills.improve.func(ctx, c, t);
		} else {
			Effect.mkText('Abomination', t);
			t.transform(Cards.Abomination.asShiny(t.card.shiny));
		}
	},
	neuro: adrenathrottle((ctx, c, t) => {
		t.addpoison(1);
		t.setStatus('neuro', 1);
	}),
	neuroify: (ctx, c, t) => {
		const poison = t.getStatus('poison');
		if (poison > 0) {
			t.setStatus('neuro', 1);
		} else if (poison < 0) {
			t.setStatus('poison', 0);
		}
	},
	nightmare: (ctx, c, t) => {
		if (!c.owner.foe.getStatus('sanctuary')) {
			Effect.mkText('Nightmare', t);
			c.owner.dmg(
				-c.owner.foe.spelldmg(
					(8 - c.owner.foe.handIds.length) * (c.card.upped ? 2 : 1),
				),
			);
			for (let i = c.owner.foe.handIds.length; i < 8; i++) {
				c.owner.foe.addCard(t.card);
			}
		}
	},
	nightshade: (ctx, c, t) => {
		Skills.lycanthropy.func(ctx, t);
	},
	nova: (ctx, c, t) => {
		for (let i = 1; i < 13; i++) {
			c.owner.spend(i, -1);
		}
		c.owner.incrStatus('nova', 2);
		if (c.owner.getStatus('nova') >= 6) {
			c.owner.addCrea(
				c.owner.newThing(Cards.Singularity.asShiny(c.card.shiny)),
			);
		}
	},
	nova2: (ctx, c, t) => {
		for (let i = 1; i < 13; i++) {
			c.owner.spend(i, -2);
		}
		c.owner.incrStatus('nova', 3);
		if (c.owner.get('nova') >= 6) {
			c.owner.addCrea(
				c.owner.newThing(Cards.Singularity.asUpped(true).asShiny(c.card.shiny)),
			);
		}
	},
	nullspell: (ctx, c, t) => {
		if (!c.hasactive('prespell', 'eatspell')) {
			c.addactive('prespell', Skills.eatspell);
			c.addactive('turnstart', Skills.noeatspell);
		}
	},
	eatspell: (ctx, c, t, data) => {
		if (t.type === etg.Spell && t.card.type === etg.Spell) {
			Skills['growth 1'].func(ctx, c);
			c.rmactive('prespell', 'eatspell');
			data.evade = true;
		}
	},
	noeatspell: (ctx, c, t) => {
		if (t.id == c.ownerId) {
			c.rmactive('prespell', 'eatspell');
		}
	},
	nymph: (ctx, c, t) => {
		Effect.mkText('Nymph', t);
		const tauto = t.active.get('ownattack');
		const e =
			t.card.element ||
			(tauto == Skills.pillmat
				? c.choose([etg.Earth, etg.Fire, etg.Water, etg.Air])
				: tauto == Skills.pillspi
				? c.choose([etg.Death, etg.Life, etg.Light, etg.Darkness])
				: tauto == Skills.pillcar
				? c.choose([etg.Entropy, etg.Gravity, etg.Time, etg.Aether])
				: ctx.upto(12) + 1);
		Skills.destroy.func(ctx, c, t, true, true);
		t.owner.addCrea(t.owner.newThing(t.card.as(Cards.Codes[etg.NymphList[e]])));
	},
	obsession: passive((ctx, c, t) => {
		c.owner.spelldmg(c.card.upped ? 10 : 8);
	}),
	ouija: (ctx, c, t) => {
		if (!c.owner.foe.getStatus('sanctuary') && c.owner.foe.handIds.length < 8) {
			c.owner.foe.addCard(Cards.OuijaEssence);
		}
	},
	pacify: (ctx, c, t) => {
		t.atk -= t.trueatk();
	},
	pairproduce: (ctx, c, t) => {
		c.owner.permanents.forEach(p => {
			if (p && p.card.type == etg.Pillar) p.trigger('ownattack');
		});
	},
	paleomagnetism: (ctx, c, t) => {
		const e = ctx.upto(6);
		const list = e & 1 ? etg.PillarList : etg.PendList;
		c.owner.addPerm(
			c.owner.newThing(
				c.card.as(Cards.Codes[list[e < 4 ? c.owner.mark : c.owner.foe.mark]]),
			),
		);
	},
	pandemonium: (ctx, c, t) => {
		c.owner.foe.masscc(c, Skills.cseed.func, true);
	},
	pandemonium2: (ctx, c, t) => {
		t.masscc(c, Skills.cseed.func);
	},
	pandemonium3: (ctx, c, t) => {
		function cs2(x) {
			if (x) {
				Skills.cseed2.func(ctx, c, x);
			}
		}
		for (let i = 0; i < 2; i++) {
			const pl = i ? c.owner.foe : c.owner;
			pl.creatures.forEach(cs2);
			pl.permanents.forEach(cs2);
			cs2(pl.weapon);
			cs2(pl.shield);
			pl.hand.forEach(cs2);
			cs2(pl);
		}
	},
	paradox: (ctx, c, t) => {
		Effect.mkText('Paradox', t);
		t.die();
	},
	parallel: (ctx, c, t) => {
		Effect.mkText('Parallel', t);
		if (t.card.isOf(Cards.Chimera)) {
			Skills.chimera.func(ctx, c);
			return;
		}
		const copy = t.clone(c.ownerId);
		c.owner.addCrea(copy);
		if (copy.getStatus('mutant')) {
			const buff = ctx.upto(25);
			copy.buffhp(Math.floor(buff / 5));
			copy.atk += buff % 5;
			copy.mutantactive();
		}
		if (copy.getStatus('voodoo')) {
			c.owner.foe.dmg(copy.maxhp - copy.hp);
			const poison = copy.getStatus('poison');
			if (poison) c.owner.foe.addpoison(poison);
			if (c.owner.foe.weapon) {
				const delayed = copy.getStatus('delayed');
				const frozen = copy.getStatus('frozen');
				if (delayed) c.owner.foe.delay(delayed);
				if (frozen) c.owner.foe.freeze(frozen);
			}
		}
	},
	phoenix: (ctx, c, t, data) => {
		if (!c.owner.creatures[data.index]) {
			const ash = c.owner.newThing(c.card.as(Cards.Ash));
			ash.type = etg.Creature;
			const creatures = c.owner.creatureIds;
			creatures[data.index] = ash.id;
			c.owner.creatureIds = creatures;
		}
	},
	photosynthesis: (ctx, c, t) => {
		Effect.mkText('2:5', c);
		c.owner.spend(etg.Life, -2);
		if (c.cast > 0) c.usedactive = false;
	},
	plague: (ctx, c, t) => {
		t.masscc(c, Skills.infect.func);
	},
	platearmor: (ctx, c, t) => {
		const buff = c.card.upped ? 6 : 4;
		Effect.mkText('0|' + buff, t);
		t.buffhp(buff);
	},
	poison: x => {
		const n = +x;
		return adrenathrottle((ctx, c, t) => {
			(t || c.owner.foe).addpoison(n);
		});
	},
	poisonfoe: (ctx, c) => {
		if (c.rng() < 0.7) c.owner.foe.addpoison(1);
	},
	powerdrain: (ctx, c, t) => {
		const ti = [];
		for (let i = 0; i < 23; i++) {
			if (c.owner.creatures[i]) ti.push(i);
		}
		if (!ti.length) return;
		const tgt = c.owner.creatures[c.choose(ti)],
			halfatk = Math.floor(t.trueatk() / 2),
			halfhp = Math.floor(t.truehp() / 2);
		t.atk -= halfatk;
		t.buffhp(-halfhp);
		tgt.atk += halfatk;
		tgt.buffhp(halfhp);
	},
	precognition: (ctx, c, t) => {
		c.owner.drawcard();
		c.owner.setStatus('precognition', 1);
	},
	predator: (ctx, c, t) => {
		const fhand = c.owner.foe.hand;
		if (fhand.length > 4 && !c.hasactive('turnstart', 'predatoroff')) {
			c.addactive('turnstart', Skills.predatoroff);
			c.attack();
			if (fhand.length)
				Skills.destroycard.func(ctx, c, fhand[fhand.length - 1]);
		}
	},
	predatoroff: passive((ctx, c, t) => {
		c.rmactive('turnstart', 'predatoroff');
	}),
	protectall: (ctx, c, t) => {
		function protect(p) {
			if (p && p.isMaterial()) {
				p.addactive('prespell', Skills.protectonce);
				p.addactive('spelldmg', Skills.protectoncedmg);
			}
		}
		c.owner.creatures.forEach(protect);
		c.owner.permanents.forEach(protect);
	},
	protectonce: passive((ctx, c, t, data) => {
		if (data.tgt == c && c.ownerId != t.ownerId) {
			c.rmactive('prespell', 'protectonce');
			c.rmactive('spelldmg', 'protectoncedmg');
			data.evade = true;
		}
	}),
	protectoncedmg: (ctx, c, t) => {
		c.rmactive('prespell', 'protectonce');
		c.rmactive('spelldmg', 'protectoncedmg');
		return true;
	},
	purify: (ctx, c, t) => {
		const poison = t.getStatus('poison');
		t.setStatus('poison', poison < 0 ? poison - 2 : -2);
		t.setStatus('aflatoxin', 0);
		t.setStatus('neuro', 0);
		if (t.type == etg.Player) t.setStatus('sosa', 0);
	},
	quint: (ctx, c, t) => {
		Effect.mkText('Immaterial', t);
		t.setStatus('immaterial', 1);
		t.setStatus('frozen', 0);
	},
	quinttog: (ctx, c, t) => {
		if (t.getStatus('immaterial')) {
			Effect.mkText('Materialize', t);
			t.setStatus('immaterial', 0);
		} else Skills.quint.func(ctx, c, t);
	},
	randomdr: (ctx, c, t) => {
		if (c.id == t.id) c.maxhp = c.hp = ctx.upto(c.card.upped ? 4 : 3);
	},
	rage: (ctx, c, t) => {
		const dmg = c.card.upped ? 6 : 5;
		Effect.mkText(dmg + '|-' + dmg, t);
		t.atk += dmg;
		t.spelldmg(dmg);
		t.setStatus('frozen', 0);
	},
	readiness: (ctx, c, t) => {
		Effect.mkText('Ready', t);
		if (t.active.has('cast')) {
			t.cast = 0;
			t.usedactive = false;
		}
	},
	readyequip: (ctx, c, t) => {
		if (t.type === etg.Weapon || t.type === etg.Shield) {
			t.usedactive = false;
		}
	},
	reap: (ctx, c, t) => {
		const atk = t.trueatk(),
			hp = t.truehp(),
			index = t.getIndex();
		t.die();
		if (
			!t.owner.creatures[index] ||
			t.owner.creatures[index].card != Cards.MalignantCell
		) {
			const skele = t.owner.newThing(t.card.as(Cards.Skeleton));
			skele.type = etg.Creature;
			skele.atk = atk;
			skele.maxhp = skele.hp = hp;
			const creatures = new Uint32Array(t.owner.creatureIds);
			creatures[index] = skele.id;
			t.owner.creatureIds = creatures;
		}
	},
	rebirth: (ctx, c, t) => {
		c.transform(c.card.as(Cards.Phoenix));
	},
	reducemaxhp: (ctx, c, t, dmg) => {
		t.maxhp = Math.max(t.maxhp - dmg, 1);
		if (t.maxhp > 500 && t.type == etg.Player) t.maxhp = 500;
		if (t.hp > t.maxhp) t.dmg(t.hp - t.maxhp);
	},
	regen: adrenathrottle((ctx, c, t) => {
		c.owner.incrStatus('poison', -1);
	}),
	regenerate: (ctx, c, t) => {
		Effect.mkText('+5', c);
		c.owner.dmg(-5);
	},
	regeneratespell: (ctx, c, t) => {
		t.lobo();
		t.addactive('ownattack', Skills.regenerate);
		if (t.type == etg.Permanent || t.type == etg.Shield) {
			t.clearStatus();
		}
	},
	regrade: (ctx, c, t) => {
		t.transform(t.card.asUpped(!t.card.upped));
		c.owner.spend(t.card.element, -1);
	},
	reinforce: (ctx, c, t) => {
		const atk = c.trueatk(),
			hp = c.truehp();
		Effect.mkText(atk + '|' + hp, t);
		t.atk += atk;
		t.buffhp(hp);
		c.remove();
	},
	ren: (ctx, c, t) => {
		if (!t.hasactive('predeath', 'bounce')) {
			Effect.mkText('Ren', t);
			t.addactive('predeath', Skills.bounce);
		}
	},
	resetcap: (ctx, c, t) => {
		c.setStatus('chargecap', 0);
	},
	reveal: (ctx, c, t) => {
		c.owner.setStatus('precognition', 1);
	},
	rewind: (ctx, c, t) => {
		Effect.mkText('Rewind', t);
		t.remove();
		t.owner.deckpush(t.owner.newThing(t.card).id);
	},
	ricochet: (ctx, c, t, data) => {
		if (t.type !== etg.Spell || t.card.type !== etg.Spell) return;
		const tgting = Cards.Targeting[data.active.name[0]];
		if (tgting) {
			function tgttest(x) {
				if (x) {
					if (tgting(t.owner, x)) tgts.push([x.id, t.ownerId]);
					if (tgting(t.owner.foe, x)) tgts.push([x.id, t.owner.foeId]);
				}
			}
			const tgts = [];
			for (let i = 0; i < 2; i++) {
				const pl = i == 0 ? c.owner : c.owner.foe;
				pl.forEach(tgttest, true);
			}
			if (tgts.length) {
				const tgt = c.choose(tgts),
					town = t.ownerId;
				t.ownerId = tgt[1];
				t.castSpell(tgt[0], data.active, true);
				t.ownerId = town;
			}
		}
	},
	sadism: (ctx, c, t, dmg) => {
		if (dmg > 0 && (!c.card.upped || c.ownerId == t.ownerId)) {
			c.owner.dmg(-dmg);
		}
	},
	salvage: passive((ctx, c, t, data) => {
		Skills['growth 1'].func(ctx, c);
		if (
			!data.salvaged &&
			!c.hasactive('turnstart', 'salvageoff') &&
			ctx.turn != c.owner
		) {
			Effect.mkText('Salvage', c);
			data.salvaged = true;
			c.owner.addCard(t.card);
			c.addactive('turnstart', Skills.salvageoff);
		}
	}),
	salvageoff: (ctx, c, t) => {
		c.rmactive('turnstart', 'salvageoff');
	},
	sanctify: (ctx, c, t) => {
		c.owner.setStatus('sanctuary', 1);
	},
	unsanctify: (ctx, c, t) => {
		c.owner.foe.setStatus('sanctuary', 0);
	},
	scatterhand: (ctx, c, t) => {
		if (!t.getStatus('sanctuary')) {
			t.drawhand(t.handIds.length);
			c.owner.drawcard();
		}
	},
	scramble: (ctx, c, t) => {
		if (t.type == etg.Player && !t.getStatus('sanctuary')) {
			for (let i = 0; i < 9; i++) {
				if (t.spend(etg.Chroma, 1, true)) {
					t.spend(etg.Chroma, -1, true);
				}
			}
		}
	},
	serendipity: (ctx, c) => {
		const num = Math.min(8 - c.owner.handIds.length, 3);
		let anyentro = false;
		for (let i = num - 1; ~i; i--) {
			const card = c.randomcard(c.card.upped, x => {
				return (
					x.type != etg.Pillar &&
					x.rarity < 4 &&
					(i > 0 || anyentro || x.element == etg.Entropy)
				);
			});
			anyentro |= card.element == etg.Entropy;
			c.owner.addCard(card.asShiny(c.card.shiny));
		}
	},
	shardgolem: (ctx, c, t) => {
		if (!ctx.get(c, 'maxhp')) {
			const golem = ctx.get(c.owner, 'shardgolem') || defaultShardGolem;
			ctx.set(c, 'cast', golem.get('cast'));
			ctx.set(c, 'castele', etg.Earth);
			const stat = golem.get('stat');
			ctx.set(c, 'atk', stat);
			ctx.set(c, 'maxhp', stat);
			ctx.set(c, 'hp', stat);
			ctx.set(c, 'status', golem.get('status'));
			ctx.set(c, 'active', golem.get('active'));
		}
	},
	shtriga: (ctx, c, t) => {
		if (c.ownerId == t) c.setStatus('immaterial', 1);
	},
	shuffle3: (ctx, c, t) => {
		const deckIds = Array.from(c.owner.deckIds);
		for (let i = 0; i < 3; i++)
			deckIds.splice(
				ctx.upto(c.owner.deckIds.length),
				0,
				c.owner.newThing(t.card).id,
			);
		c.owner.deckIds = deckIds;
	},
	silence: (ctx, c, t) => {
		if (t.type != etg.Player || !t.getStatus('sanctuary')) t.usedactive = true;
	},
	singularity: (ctx, c, t) => {
		if (c.trueatk() > 0) {
			Skills.antimatter.func(ctx, c, c);
			return;
		}
		const r = c.rng();
		if (r > 0.9) {
			c.setStatus('adrenaline', 1);
		} else if (r > 0.8) {
			c.addactive('hit', Skills.vampire);
		} else if (r > 0.7) {
			Skills.quint.func(ctx, c, c);
		} else if (r > 0.6) {
			Skills.scramble.func(ctx, c, c.owner);
		} else if (r > 0.5) {
			Skills.blackhole.func(ctx, c.owner.foe, c.owner);
		} else if (r > 0.4) {
			const buff = ctx.upto(25);
			c.buffhp(Math.floor(buff / 5) + 1);
			c.atk -= (buff % 5) + 1;
		} else if (r > 0.3) {
			Skills.nova.func(ctx, c.owner.foe);
		} else if (r > 0.2) {
			Skills.parallel.func(ctx, c, c);
		} else if (r > 0.1) {
			c.owner.setWeapon(c.owner.newThing(Cards.Dagger.asShiny(c.card.shiny)));
		}
	},
	sing: (ctx, c, t) => {
		t.attack(t.owner);
	},
	sinkhole: (ctx, c, t) => {
		Effect.mkText('Sinkhole', t);
		t.setStatus('burrowed', 1);
		t.setStatus('airborne', 0);
		t.lobo();
		t.setSkill('cast', Skills.unburrow);
		t.cast = c.card.upped ? 2 : 1;
		t.castele = etg.Earth;
		t.usedactive = true;
	},
	siphon: adrenathrottle((ctx, c, t) => {
		if (
			!c.owner.foe.getStatus('sanctuary') &&
			c.owner.foe.spend(etg.Chroma, 1)
		) {
			Effect.mkText('1:11', c);
			c.owner.spend(etg.Darkness, -1);
		}
	}),
	siphonactive: (ctx, c, t) => {
		Effect.mkText('Siphon', t);
		c.lobo();
		for (const [key, act] of t.active) {
			if (!act.passive) c.setSkill(key, act);
		}
		c.cast = t.cast;
		c.castele = t.castele;
		c.usedactive = false;
		t.lobo();
	},
	siphonstrength: (ctx, c, t) => {
		Effect.mkText('+1|0', c);
		Effect.mkText('-1|0', t);
		t.atk--;
		c.atk++;
	},
	skeleton: passive((ctx, c, t, data) => {
		if (data.tgt == c && data.active == Skills.rewind) {
			Skills.hatch.func(ctx, c);
			data.evade = true;
		}
	}),
	skyblitz: (ctx, c, t) => {
		c.owner.setQuanta(etg.Air);
		c.owner.creatures.forEach(cr => {
			if (cr && cr.getStatus('airborne')) {
				Effect.mkText('Dive', cr);
				cr.incrStatus('dive', cr.trueatk());
			}
		});
	},
	snipe: (ctx, c, t) => {
		Effect.mkText('-3', t);
		t.dmg(3);
	},
	sosa: (ctx, c, t) => {
		c.owner.setStatus('sosa', 2);
		const quanta = new Int8Array(13);
		quanta[etg.Death] = c.owner.quanta[etg.Death];
		ctx.set(c.ownerId, 'quanta', quanta);
		const n = c.card.upped ? 40 : 48;
		c.owner.dmg(Math.max(Math.ceil((c.owner.maxhp * n) / 100), n), true);
	},
	soulcatch: (ctx, c, t) => {
		Effect.mkText('Soul', c);
		c.owner.spend(etg.Death, -3);
	},
	spores: (ctx, c, t) => {
		const spore = c.card.as(Cards.Spore);
		c.owner.addCrea(c.owner.newThing(spore));
		c.owner.addCrea(c.owner.newThing(spore));
	},
	sskin: (ctx, c, t) => {
		c.owner.buffhp(c.owner.quanta[etg.Earth]);
	},
	staff: (ctx, c, t) => {
		return c.owner.mark == etg.Life || c.owner.mark == etg.Water ? 1 : 0;
	},
	stasis: (ctx, c, t, attackFlags) => {
		if (
			t.type === etg.Creature &&
			attackFlags.attackPhase &&
			!attackFlags.stasis
		) {
			sfx.playSound('stasis');
			attackFlags.stasis = true;
		}
	},
	ownstasis: (ctx, c, t, attackFlags) => {
		if (
			t.type === etg.Creature &&
			c.ownerId === t.ownerId &&
			attackFlags.attackPhase &&
			!attackFlags.stasis
		)
			attackFlags.stasis = true;
	},
	static: (ctx, c) => {
		c.owner.foe.spelldmg(2);
	},
	steal: (ctx, c, t) => {
		if (t.getStatus('stackable')) {
			const inst = t.clone(c.ownerId);
			inst.setStatus('charges', 1);
			Skills.destroy.func(ctx, c, t, true);
			t = inst;
		} else {
			t.remove();
		}
		t.usedactive = true;
		if (t.type == etg.Permanent) c.owner.addPerm(t);
		else if (t.type == etg.Weapon) c.owner.setWeapon(t);
		else c.owner.setShield(t);
	},
	steam: (ctx, c, t) => {
		Effect.mkText('5|0', c);
		c.incrStatus('steam', 5);
		c.atk += 5;
		if (!c.hasactive('postauto', 'decrsteam'))
			c.addactive('postauto', Skills.decrsteam);
	},
	stoneform: (ctx, c, t) => {
		Effect.mkText('0|20', c);
		c.buffhp(20);
		c.active = c.active.delete('cast');
		c.setStatus('golem', 1);
	},
	storm: x => {
		const n = +x;
		return (ctx, c, t) => {
			t.masscc(c, (ctx, c, x) => x.spelldmg(n));
		};
	},
	summon: name => {
		return (ctx, c, t) => {
			c.owner.addCrea(c.owner.newThing(c.card.as(Cards[name])));
		};
	},
	swarm: passive((ctx, c, t) => {
		return c.owner.creatures.reduce(
			(hp, cr) => (cr && cr.hasactive('hp', 'swarm') ? hp + 1 : hp),
			0,
		);
	}),
	swave: (ctx, c, t) => {
		if (t.getStatus('frozen')) {
			Effect.mkText('Death', t);
			t.die();
		} else {
			if (t.type === etg.Player && t.weaponId && t.weapon.getStatus('frozen')) {
				Skills.destroy.func(ctx, c, t.weapon);
			}
			Effect.mkText('-4', t);
			t.spelldmg(4);
		}
	},
	tempering: (ctx, c, t) => {
		const atk = c.card.upped ? 5 : 3;
		Effect.mkText(atk + '|0', t);
		t.atk += atk;
		t.setStatus('frozen', 0);
	},
	tesseractsummon: (ctx, c, t) => {
		for (let i = 0; i < 3; i++) {
			const pl = i ? c.owner : c.owner.foe,
				candidates = [],
				deckIds = Array.from(pl.deckIds);

			for (let j = 0; j < deckIds.length; j++) {
				if (ctx.byId(deckIds[j]).card.type == etg.Creature) candidates.push(j);
			}
			if (candidates.length) {
				const idx = pl.choose(candidates),
					[crid] = deckIds.splice(idx, 1),
					cr = ctx.byId(crid);
				pl.addCrea(cr);
				cr.freeze(Math.ceil(cr.card.cost / 4));
				pl.deckIds = deckIds;
			}
		}
	},
	throwrock: (ctx, c, t) => {
		const dmg = c.card.upped ? 4 : 3;
		Effect.mkText('-' + dmg, t);
		t.dmg(dmg);
		const deckIds = Array.from(t.owner.deckIds);
		deckIds.splice(
			ctx.upto(t.owner.deckIds.length),
			0,
			t.owner.newThing(c.card.as(Cards.ThrowRock)).id,
		);
		t.owner.deckIds = deckIds;
	},
	tick: (ctx, c, t) => {
		c.dmg(c.card.upped ? 3 : 1);
		if (c.hp <= 0) {
			if (c.card.upped)
				c.owner.foe.masscc(c, (ctx, c, x) => {
					x.dmg(4);
				});
			else c.owner.foe.spelldmg(18);
		}
	},
	tidalhealing: (ctx, c, t) => {
		c.owner.masscc(c, (ctx, c, t) => {
			if (t.getStatus('poison') > 0) t.setStatus('poison', 0);
			if (t.getStatus('frozen')) t.setStatus('frozen', 0);
			if (t.getStatus('aquatic') && !t.hasactive('hit', 'regen'))
				t.addactive('hit', Skills.regen);
		});
	},
	tornado: (ctx, c, t) => {
		let pl = c.owner.foe;
		for (let i = 0; i < 3; i++) {
			if (i == 2) {
				if (c.card.upped) return;
				else pl = c.owner;
			}
			const perms = pl.permanents.filter(x => x && x.isMaterial());
			if (pl.weapon && pl.weapon.isMaterial()) perms.push(pl.weapon);
			if (pl.shield && pl.shield.isMaterial()) perms.push(pl.shield);
			if (perms.length) {
				const pr = pl.choose(perms);
				const newpl = ctx.upto(2) ? pl : pl.foe;
				const deckIds = Array.from(newpl.deckIds);
				pr.ownerId = newpl.id;
				deckIds.splice(ctx.upto(newpl.deckIds.length), 0, pr.id);
				newpl.deckIds = deckIds;
				Effect.mkText('Shuffled', pr);
				Skills.destroy.func(ctx, c, pr, true, true);
			}
		}
	},
	trick: (ctx, c, t) => {
		const cards = [];
		t.owner.deck.forEach(({ card }, i) => {
			if (
				card.type == etg.Creature &&
				card.asShiny(false) != t.card.asShiny(false)
			) {
				cards.push(i);
			}
		});
		if (cards.length) {
			const pick = t.choose(cards);
			t.owner.setCrea(t.getIndex(), t.owner.deck[pick]);
			const deck = Array.from(t.owner.deckIds);
			deck[pick] = t.id;
			t.owner.deckIds = deck;
		}
	},
	turngolem: (ctx, c, t) => {
		c.remove();
		const storedpower = c.getStatus('storedpower');
		c.atk = storedpower >> 1;
		c.maxhp = c.hp = storedpower;
		c.setStatus('storedpower', 0);
		c.active = c.active.delete('cast');
		c.owner.addCrea(c);
		c.owner.gpull = c.id;
	},
	unappease: (ctx, c, t) => {
		c.setStatus('appeased', 0);
	},
	unburrow: (ctx, c, t) => {
		c.setStatus('burrowed', 0);
		c.setSkill('cast', Skills.burrow);
		c.cast = 1;
	},
	unsummon: (ctx, c, t) => {
		if (t.owner.handIds.length < 8) {
			t.remove();
			t.owner.addCard(t.card);
		} else {
			Skills.rewind.func(ctx, c, t);
		}
	},
	upkeep: (ctx, c, t) => {
		if (!c.owner.spend(c.card.element, 1)) c.die();
	},
	upload: (ctx, c, t) => {
		Effect.mkText('2|0', t);
		t.atk += c.dmg(2);
	},
	vampire: (ctx, c, t, dmg) => {
		c.owner.dmg(-dmg);
	},
	vend: (ctx, c) => {
		c.owner.drawcard();
		c.die();
	},
	vengeance: (ctx, c, t) => {
		if (c.ownerId == t.ownerId && c.ownerId == ctx.byId(ctx.turn).foe) {
			if (c.maybeDecrStatus('charges') < 2) c.remove();
			c.owner.creatures.slice().forEach(cr => {
				if (cr && cr != t) {
					cr.attack();
				}
			});
		}
	},
	vindicate: (ctx, c, t, data) => {
		if (
			c.ownerId == t.ownerId &&
			!c.getStatus('vindicated') &&
			!data.vindicated
		) {
			c.setStatus('vindicated', 1);
			data.vindicated = true;
			t.attack();
		}
	},
	unvindicate: (ctx, c, t) => {
		c.setStatus('vindicated', 0);
	},
	virtue: passive((ctx, c, t, blocked) => {
		c.owner.buffhp(blocked);
	}),
	virusinfect: (ctx, c, t) => {
		c.die();
		Skills.infect.func(ctx, c, t);
	},
	virusplague: (ctx, c, t) => {
		c.die();
		Skills.plague.func(ctx, c, t);
	},
	void: (ctx, c, t) => {
		c.owner.foe.maxhp = Math.max(c.owner.foe.maxhp - 3, 1);
		if (c.owner.foe.hp > c.owner.foe.maxhp) {
			c.owner.foe.hp = c.owner.foe.maxhp;
		}
	},
	voidshell: (ctx, c, t, data) => {
		c.owner.maxhp -= data.dmg;
		if (c.owner.maxhp < 1) {
			c.owner.maxhp = 1;
			c.remove();
		}
		if (c.owner.hp > c.owner.maxhp) {
			c.owner.hp = c.owner.maxhp;
		}
		data.dmg = 0;
	},
	quantagift: (ctx, c, t) => {
		if (c.owner.mark != etg.Water) {
			c.owner.spend(etg.Water, -2);
			c.owner.spend(c.owner.mark, c.owner.mark ? -2 : -6);
		} else c.owner.spend(etg.Water, -3);
	},
	web: (ctx, c, t) => {
		Effect.mkText('Web', t);
		t.setStatus('airborne', 0);
	},
	wind: (ctx, c, t) => {
		c.atk += c.getStatus('storedAtk');
		c.setStatus('storedAtk', 0);
	},
	wisdom: (ctx, c, t) => {
		Effect.mkText('3|0', t);
		t.atk += 3;
		if (t.getStatus('immaterial')) {
			t.setStatus('psionic', 1);
		}
	},
	yoink: (ctx, c, t) => {
		if (t.type == etg.Player) {
			Skills.foedraw.func(ctx, c);
		} else if (!t.owner.getStatus('sanctuary')) {
			t.remove();
			if (c.owner.handIds.length < 8) {
				t.ownerId = c.ownerId;
				c.owner.hand.push(t);
			}
		}
	},
	pillar: (ctx, c, t) => {
		c.owner.spend(
			c.card.element,
			c.getStatus('charges') * (c.card.element > 0 ? -1 : -3),
		);
	},
	pend: (ctx, c, t) => {
		const pendstate = c.getStatus('pendstate');
		const ele = pendstate ? c.owner.mark : c.card.element;
		c.owner.spend(ele, c.getStatus('charges') * (ele > 0 ? -1 : -3));
		c.setStatus('pendstate', pendstate ? 0 : 1);
	},
	pillmat: quadpillarFactory(18041), //4,6,7,9
	pillspi: quadpillarFactory(9611), //2,5,8,11
	pillcar: quadpillarFactory(5036), //1,3,10,12
	absorbdmg: (ctx, c, t, data) => {
		c.incrStatus('storedpower', data.blocked);
	},
	absorber: (ctx, c, t) => {
		c.owner.spend(etg.Fire, -3);
	},
	blockwithcharge: (ctx, c, t, data) => {
		if (c.maybeDecrStatus('charges') < 2) {
			c.die();
		}
		data.dmg = 0;
	},
	chaos: (ctx, c, t) => {
		const randomchance = c.rng();
		if (randomchance < 0.3) {
			if (t.type == etg.Creature && !t.getStatus('ranged')) {
				Skills.cseed.func(ctx, c, t);
			}
		} else return c.card.upped && randomchance < 0.5;
	},
	cold: (ctx, c, t) => {
		if (!t.getStatus('ranged') && c.rng() < 0.3) {
			t.freeze(3);
		}
	},
	despair: (ctx, c, t) => {
		if (!t.getStatus('ranged')) {
			const chance = c.owner.creatures.reduce((chance, cr) => {
				return cr && cr.hasactive('ownattack', 'siphon') ? chance + 1 : chance;
			}, 0);
			if (c.rng() < 1.4 - Math.pow(0.95, chance)) {
				Effect.mkText('-1|-1', t);
				t.atk--;
				t.dmg(1);
			}
		}
	},
	evade100: (ctx, c, t, data) => {
		data.dmg = 0;
	},
	evade: x => {
		const n = +x / 100;
		return (ctx, c, t, data) => {
			if (c.rng() < n) data.dmg = 0;
		};
	},
	evadespell: (ctx, c, t, data) => {
		if (
			data.tgt == c &&
			c.ownerId != t.ownerId &&
			t.type === etg.Spell &&
			t.card.type === etg.Spell
		)
			data.evade = true;
	},
	evadecrea: (ctx, c, t, data) => {
		if (data.tgt == c && c.ownerId != t.ownerId && t.type === etg.Creature)
			data.evade = true;
	},
	firewall: (ctx, c, t) => {
		if (!t.getStatus('ranged')) {
			Effect.mkText('-1', t);
			t.dmg(1);
		}
	},
	skull: (ctx, c, t) => {
		if (t.type == etg.Creature && !t.card.isOf(Cards.Skeleton)) {
			const thp = t.truehp();
			if (thp <= 0 || c.rng() < 0.5 / thp) {
				const index = t.getIndex();
				t.die();
				if (
					!t.owner.creatures[index] ||
					t.owner.creatures[index].card != Cards.MalignantCell
				) {
					sfx.playSound('skelify');
					const skele = t.owner.newThing(t.card.as(Cards.Skeleton));
					skele.type = etg.Creature;
					const creatures = new Uint32Array(ctx.get(t.ownerId, 'creatures'));
					creatures[index] = skele;
					ctx.set(t.ownerId, 'creatures', creatures);
				}
			}
		}
	},
	slow: (ctx, c, t) => {
		if (!t.getStatus('ranged')) t.delay(2);
	},
	solar: (ctx, c, t) => {
		c.owner.spend(etg.Light, -1);
	},
	thorn: (ctx, c, t) => {
		if (!t.getStatus('ranged') && c.rng() < 0.75) {
			t.addpoison(1);
		}
	},
	thornweak: (ctx, c, t) => {
		if (!t.getStatus('ranged') && c.rng() < 0.25) {
			t.addpoison(1);
		}
	},
	weight: (ctx, c, t, data) => {
		if (t.type == etg.Creature && t.truehp() > 5) data.dmg = 0;
	},
	wings: (ctx, c, t, data) => {
		if (!t.getStatus('airborne') && !t.getStatus('ranged')) data.dmg = 0;
	},
};
function unsummon(t) {
	t.remove();
	if (t.owner.handIds.length < 8) {
		t.owner.addCardInstance(t);
	} else {
		t.owner.deckpush(t.id);
	}
}
for (const key in Skills) {
	Skills[key] = {
		name: [key],
		func: Skills[key],
		passive: passiveSet.has(Skills[key]),
	};
}
module.exports = Skills;
var etg = require('./etg');
var Cards = require('./Cards');
var Thing = require('./Thing');
var Effect = require('./Effect');
var parseSkill = require('./parseSkill');
