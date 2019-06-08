const imm = require('immutable'),
	sfx = require('./audio');
function adrenathrottle(f) {
	return (c, t, data) => {
		if (
			c.getStatus('adrenaline') < 3 ||
			(c.type == etg.Creature &&
				c.owner.weapon &&
				c.owner.weapon.getStatus('nothrottle'))
		) {
			return f(c, t, data);
		}
	};
}
function quadpillarFactory(ele) {
	return (c, t) => {
		const n = c == t ? 1 : c.getStatus('charges');
		for (let i = 0; i < n; i++) {
			const r = c.owner.upto(16);
			c.owner.spend((ele >> ((r & 3) << 2)) & 15, -1);
			if (c.rng() < 2 / 3) {
				c.owner.spend((ele >> (r & 12)) & 15, -1);
			}
		}
	};
}
const passiveSet = new Set();
function passive(f) {
	passiveSet.add(f);
	return f;
}
const Skills = {
	ablaze: x => {
		const n = +x;
		return (c, t) => {
			Effect.mkText(n + '|0', c);
			c.atk += n;
		};
	},
	abomination: passive((c, t, data) => {
		if (data.tgt == c && data.active == Skills.mutation) {
			Skills.improve.func(c, c);
			data.evade = true;
		}
	}),
	acceleration: x => {
		const n = +x;
		return (c, t) => {
			Effect.mkText(`${n}|-1`, c);
			c.atk += n;
			c.dmg(1, true);
		};
	},
	accelerationspell: (c, t) => {
		t.lobo();
		t.setSkill('ownattack', parseSkill(`acceleration ${c.card.upped ? 3 : 2}`));
	},
	accretion: (c, t) => {
		Skills.destroy.func(c, t);
		c.buffhp(10);
		if (c.truehp() > 30) {
			c.die();
			if (c.owner.hand.length < 8) {
				c.owner.addCard(c.card.as(Cards.BlackHole));
			}
		}
	},
	accumulation: (c, t) => {
		return c.getStatus('charges');
	},
	adrenaline: (c, t) => {
		Effect.mkText('Adrenaline', t);
		t.setStatus('adrenaline', 1);
	},
	aether: (c, t) => {
		Effect.mkText('1:12', c);
		c.owner.spend(etg.Aether, -1);
	},
	aflatoxin: (c, t) => {
		Effect.mkText('Aflatoxin', t);
		t.addpoison(2);
		t.setStatus('aflatoxin', 1);
	},
	aggroskele: (c, t) => {
		c.owner.addCrea(new Thing(c.card.as(Cards.Skeleton)));
		const dmg = c.owner.creatures.reduce(
			(dmg, cr) =>
				cr && cr.card.isOf(Cards.Skeleton) ? dmg + cr.trueatk() : dmg,
			0,
		);
		Effect.mkText('-' + dmg, t);
		t.dmg(dmg);
	},
	air: (c, t) => {
		Effect.mkText('1:9', c);
		c.owner.spend(etg.Air, -1);
	},
	alphawolf: (c, t) => {
		const pwolf = c.card.as(Cards.PackWolf);
		c.owner.addCrea(new Thing(pwolf));
		c.owner.addCrea(new Thing(pwolf));
	},
	antimatter: (c, t) => {
		Effect.mkText('Antimatter', t);
		t.atk -= t.trueatk() * 2;
	},
	appease: (c, t) => {
		Skills.devour.func(c, t);
		c.setStatus('appeased', 1);
	},
	atk2hp: (c, t) => {
		t.buffhp(t.trueatk() - t.hp);
	},
	autoburrow: (c, t) => {
		c.addactive('play', Skills.autoburrowproc);
	},
	autoburrowoff: (c, t) => {
		c.rmactive('play', 'autoburrowproc');
	},
	autoburrowproc: (c, t) => {
		if (t.getSkill('cast') === Skills.burrow) Skills.burrow.func(t);
	},
	axe: (c, t) => {
		return c.owner.mark == etg.Fire || c.owner.mark == etg.Time ? 1 : 0;
	},
	axedraw: (c, t) => {
		c.incrStatus('dive', 1);
	},
	bblood: (c, t) => {
		Effect.mkText('0|20', t);
		t.buffhp(20);
		t.delay(5);
	},
	becomearctic: passive((c, t) => {
		c.transform(c.card.as(Cards.ArcticSquid));
	}),
	beguile: (c, t) => {
		t.remove();
		t.owner = t.owner.foe;
		t.owner.addCrea(t);
		if (c != t) t.addactive('turnstart', Skills.beguilestop);
	},
	beguilestop: passive((c, t) => {
		if (t == c.owner) {
			c.rmactive('turnstart', 'beguilestop');
			Skills.beguile.func(c, c);
		}
	}),
	bellweb: (c, t) => {
		Skills.web.func(c, t);
		t.setStatus('aquatic', 1);
	},
	blackhole: (c, t) => {
		if (!t.sanctuary) {
			for (let q = 1; q < 13; q++) {
				c.owner.dmg(-Math.min(t.quanta[q], 3));
				t.quanta[q] = Math.max(t.quanta[q] - 3, 0);
			}
		}
	},
	bless: (c, t) => {
		Effect.mkText('3|3', t);
		t.atk += 3;
		t.buffhp(3);
	},
	bolsterintodeck: (c, t) => {
		c.owner.deck.push(new Thing(t.card), new Thing(t.card), new Thing(t.card));
	},
	boneyard: (c, t) => {
		c.owner.addCrea(new Thing(c.card.as(Cards.Skeleton)));
	},
	bow: (c, t) => {
		return c.owner.mark == etg.Air || c.owner.mark == etg.Light ? 1 : 0;
	},
	bounce: passive((c, t) => {
		c.hp = c.maxhp;
		unsummon(c);
		return true;
	}),
	bravery: (c, t) => {
		if (!c.owner.foe.sanctuary) {
			for (
				let i = 0;
				i < 2 && c.owner.hand.length < 8 && c.owner.foe.hand.length < 8;
				i++
			) {
				c.owner.drawcard();
				c.owner.foe.drawcard();
			}
		}
	},
	brawl: (c, t) => {
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
		c.owner.quanta[etg.Gravity] = 0;
	},
	brew: (c, t) => {
		Effect.mkText('Brew', c);
		c.owner.addCard(
			c.card.as(Cards.Codes[etg.AlchemyList[c.owner.upto(12) + 1]]),
		);
	},
	brokenmirror: (c, t, fromhand) => {
		if (fromhand && t.type == etg.Creature && c.owner != t.owner) {
			c.owner.addCrea(new Thing(c.card.as(Cards.Phantom)));
		}
	},
	burrow: (c, t) => {
		c.setStatus('burrowed', 1);
		c.setStatus('airborne', 0);
		c.setSkill('cast', Skills.unburrow);
		c.cast = 0;
	},
	butterfly: (c, t) => {
		t.lobo();
		t.setSkill('cast', Skills.destroy);
		t.cast = 3;
		t.castele = etg.Entropy;
	},
	catapult: (c, t) => {
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
	catlife: passive((c, t, data) => {
		if (!c.owner.creatures[data.index]) {
			const lives = c.maybeDecrStatus('lives');
			if (!lives) return;
			Effect.mkText(lives - 1 + ' lives', c);
			const cl = c.clone(c.owner);
			cl.hp = 1;
			c.owner.creatures[data.index] = cl;
		}
	}),
	cell: passive((c, t) => {
		c.transform(c.card.as(Cards.MalignantCell));
	}),
	chimera: (c, t) => {
		let atk = 0,
			hp = 0;
		c.owner.creatures.forEach(cr => {
			if (cr) {
				atk += cr.trueatk();
				hp += cr.truehp();
			}
		});
		const chim = new Thing(c.card.as(Cards.Chimera));
		chim.owner = c.owner;
		chim.atk = atk;
		chim.maxhp = chim.hp = hp;
		chim.setStatus('momentum', 1);
		chim.setStatus('airborne', 1);
		chim.type = etg.Creature;
		c.owner.creatures[0] = chim;
		c.owner.creatures.length = 1;
		c.owner.creatures.length = 23;
		c.owner.gpull = chim;
	},
	chromastat: (c, t) => {
		const n = c.truehp() + c.trueatk();
		Effect.mkText(n + ':0', c);
		c.owner.spend(0, -n);
	},
	clear: (c, t) => {
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
			Skills.beguilestop.func(t, t.owner);
		}
	},
	corpseexplosion: (c, t) => {
		const dmg = 1 + Math.floor(t.truehp() / 8);
		t.die();
		c.owner.foe.masscc(
			c,
			(c, t) => {
				t.spelldmg(dmg);
			},
			!c.card.upped,
		);
		const poison = t.getStatus('poison') + t.getStatus('poisonous');
		if (poison) c.owner.foe.addpoison(poison);
	},
	counter: passive((c, t, data) => {
		if (
			!c.getStatus('frozen') &&
			!c.getStatus('delayed') &&
			data.dmg > 0 &&
			~c.getIndex()
		) {
			c.attackCreature(t);
		}
	}),
	countimmbur: c => {
		let n = 0;
		function test(x) {
			if (x && (x.getStatus('immaterial') || x.getStatus('burrowed'))) n++;
		}
		c.owner.forEach(test);
		c.owner.foe.forEach(test);
		return n;
	},
	cpower: (c, t) => {
		const buff = t.owner.upto(25),
			bh = ((buff / 5) | 0) + 1,
			ba = (buff % 5) + 1;
		Effect.mkText(ba + '|' + bh, t);
		t.buffhp(bh);
		t.atk += ba;
	},
	creatureupkeep: (c, t) => {
		if (t.type === etg.Creature) Skills.upkeep.func(t);
	},
	cseed: (c, t) => {
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
		].func(c, t);
	},
	cseed2: (c, t) => {
		const choice = c.choose(
			Cards.filter(c.owner.upto(2), c => {
				if (c.type != etg.Spell) return false;
				const tgting = Cards.Targeting[c.active.get('cast').name[0]];
				return tgting && tgting(c, t);
			}),
		);
		Effect.mkText(choice.name, t);
		c.castSpell(t, choice.active.get('cast'));
	},
	dagger: c => {
		let buff = c.owner.mark == etg.Darkness || c.owner.mark == etg.Death;
		c.owner.permanents.forEach(p => {
			if (p && p.getStatus('cloak')) buff++;
		});
		return buff;
	},
	deadalive: c => {
		c.deatheffect(c.getIndex());
	},
	deathwish: (c, t, data) => {
		const tgt = data.tgt;
		if (
			!tgt ||
			c.getStatus('frozen') ||
			c.getStatus('delayed') ||
			c.owner == t.owner ||
			tgt.owner != c.owner ||
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
	decrsteam: passive(c => {
		if (c.maybeDecrStatus('steam')) {
			c.atk--;
		}
	}),
	deckblast: (c, t) => {
		c.owner.foe.spelldmg(Math.ceil(c.owner.deck.length / c.owner.deckpower));
		c.owner.deck.length = 0;
	},
	deepdive: (c, t) => {
		c.setSkill('cast', Skills.freezeperm);
		c.castele = etg.Gravity;
		c.setStatus('airborne', 0);
		c.setStatus('burrowed', 1);
		c.addactive('turnstart', Skills.deepdiveproc);
	},
	deepdiveproc: passive((c, t) => {
		if (t == c.owner) {
			c.rmactive('turnstart', 'deepdiveproc');
			c.addactive('turnstart', Skills.deepdiveproc2);
			c.setStatus('airborne', 1);
			c.setStatus('burrowed', 0);
			c.setStatus('dive', c.trueatk() * 2);
		}
	}),
	deepdiveproc2: passive((c, t) => {
		c.rmactive('turnstart', 'deepdiveproc2');
		c.setSkill('cast', Skills.deepdive);
		c.castele = etg.Water;
		c.setStatus('airborne', false);
	}),
	deja: (c, t) => {
		c.active = c.active.delete('cast');
		Skills.parallel.func(c, c);
	},
	deployblobs: (c, t) => {
		const blob = c.card.as(Cards.Blob);
		for (let i = 0; i < 3; i++) {
			c.owner.addCrea(new Thing(blob));
		}
		c.atk -= 2;
		c.dmg(2);
	},
	destroy: (c, t, dontsalvage, donttalk) => {
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
	destroycard: (c, t) => {
		if (t.type == etg.Player) {
			if (!t.deck.length) t.game.setWinner(t.foe);
			else t.deck.length--;
		} else if (!t.owner.sanctuary) {
			t.die();
		}
	},
	detain: (c, t) => {
		t.dmg(1);
		t.atk--;
		Skills['growth 1'].func(c);
		t.setStatus('airborne', 0);
		t.setStatus('burrowed', 1);
	},
	devour: (c, t) => {
		Effect.mkText('1|1', c);
		sfx.playSound('devour');
		c.buffhp(1);
		c.atk += 1;
		if (t.getStatus('poisonous')) c.addpoison(1);
		t.die();
	},
	die: (c, t) => {
		c.die();
	},
	disarm: (c, t) => {
		if (t.type == etg.Player && t.weapon) {
			unsummon(t.weapon);
		}
	},
	disc: (c, t) => {
		return c.owner.mark == etg.Entropy || c.owner.mark == etg.Aether ? 1 : 0;
	},
	discping: (c, t) => {
		t.dmg(1);
		c.remove();
		c.owner.addCardInstance(c);
	},
	disfield: (c, t, data) => {
		if (!c.owner.spend(etg.Chroma, data.dmg)) {
			for (let i = 1; i < 13; i++) {
				c.owner.quanta[i] = 0;
			}
			c.owner.shield = undefined;
		}
		data.dmg = 0;
	},
	disshield: (c, t, data) => {
		if (!c.owner.spend(etg.Entropy, Math.ceil(data.dmg / 3))) {
			c.owner.quanta[etg.Entropy] = 0;
			c.remove();
		}
		data.dmg = 0;
	},
	dive: (c, t) => {
		Effect.mkText('Dive', c);
		sfx.playSound('dive');
		c.setStatus('dive', c.trueatk());
	},
	divinity: (c, t) => {
		if (c.owner.maxhp < 500) {
			c.owner.maxhp = Math.min(c.owner.maxhp + 24, 500);
		}
		c.owner.dmg(-16);
	},
	dmgproduce: (c, t, dmg) => {
		c.owner.spend(0, -dmg);
	},
	drainlife: (c, t) => {
		c.owner.dmg(-t.spelldmg(2 + Math.floor(c.owner.quanta[etg.Darkness] / 5)));
	},
	draft: (c, t) => {
		Effect.mkText('Draft', t);
		const isborne = !t.getStatus('airborne');
		t.setStatus('airborne', isborne);
		if (isborne) {
			Effect.mkText('3|0', t);
			t.atk += 3;
			if (t.getSkill('cast') === Skills.burrow)
				t.active = t.active.remove('cast');
		} else {
			t.spelldmg(3);
		}
	},
	drawcopy: (c, t) => {
		if (c.owner != t.owner) c.owner.addCardInstance(t.clone(c.owner));
	},
	drawequip: (c, t) => {
		for (let i = c.owner.deck.length - 1; i > -1; i--) {
			const card = c.owner.deck[i];
			if (card.card.type == etg.Weapon || card.card.type == etg.Shield) {
				if (~c.owner.addCardInstance(card)) {
					c.owner.deck.splice(i, 1);
					c.owner.proc('draw');
				}
				return;
			}
		}
	},
	drawpillar: (c, t) => {
		const deck = c.owner.deck;
		if (deck.length && deck[deck.length - 1].card.type == etg.Pillar)
			Skills.hasten.func(c, t);
	},
	dryspell: (c, t) => {
		c.owner.foe.masscc(
			c.owner,
			(c, t) => {
				c.spend(etg.Water, -t.spelldmg(1));
			},
			true,
		);
	},
	dshield: (c, t) => {
		c.setStatus('immaterial', 1);
		c.addactive('turnstart', Skills.dshieldoff);
	},
	dshieldoff: passive((c, t) => {
		if (c.owner == t) {
			c.setStatus('immaterial', 0);
			c.rmactive('turnstart', 'dshieldoff');
		}
	}),
	duality: (c, t) => {
		if (c.owner.foe.deck.length && c.owner.hand.length < 8) {
			c.owner.addCardInstance(
				c.owner.foe.deck[c.owner.foe.deck.length - 1].clone(c.owner),
			);
		}
	},
	earth: (c, t) => {
		Effect.mkText('1:4', c);
		c.owner.spend(etg.Earth, -1);
	},
	earthquake: (c, t) => {
		Effect.mkText('Earthquake', t);
		if (t.getStatus('charges') > 3) {
			t.incrStatus('charges', -3);
		} else {
			t.remove();
		}
		t.proc('destroy', {});
	},
	elf: passive((c, t, data) => {
		if (data.tgt == c && data.active == Skills.cseed) {
			c.transform(c.card.as(Cards.FallenElf));
			data.evade = true;
		}
	}),
	embezzle: (c, t) => {
		Effect.mkText('Embezzle', t);
		t.lobo();
		t.addactive('hit', Skills.forcedraw);
		t.addactive('owndeath', Skills.embezzledeath);
	},
	embezzledeath: (c, t) => {
		if (c.owner.foe.deck.length < 3) {
			c.owner.foe.deck.length = 0;
			c.owner.game.setWinner(c.owner);
		} else {
			c.owner.foe.deck.length -= 3;
		}
	},
	empathy: (c, t) => {
		const healsum = c.owner.countcreatures();
		Effect.mkText('+' + healsum, c);
		c.owner.dmg(-healsum);
		if (!c.owner.spend(etg.Life, Math.floor(healsum / 8))) {
			c.owner.quanta[etg.Life] = 0;
			c.die();
		}
	},
	enchant: (c, t) => {
		Effect.mkText('Enchant', t);
		t.setStatus('immaterial', 1);
	},
	endow: (c, t) => {
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
	envenom: (c, t) => {
		t.addactive('hit', parseSkill('poison 1'));
		t.addactive('shield', Skills.thornweak);
	},
	epidemic: (c, t) => {
		const poison = t.getStatus('poison');
		if (poison) c.owner.foe.addpoison(poison);
	},
	epoch: (c, t) => {
		c.incrStatus('epoch', 1);
		if (c.getStatus('epoch') > 1) Skills.silence.func(c, t.owner);
	},
	epochreset: (c, t) => {
		c.setStatus('epoch', 0);
	},
	evolve: (c, t) => {
		c.transform(c.card.as(Cards.Shrieker));
		c.setStatus('burrowed', 0);
	},
	feed: (c, t) => {
		t.addpoison(1);
		parseSkill('growth 3').func(c);
		c.setStatus('immaterial', 0);
	},
	fickle: (c, t) => {
		if (t.owner != c.owner && t.owner.sanctuary) {
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
			const card = (t.owner.hand[t.getIndex()] = t.owner.deck[pick]);
			card.type = etg.Spell;
			card.owner = t.owner;
			t.owner.deck[pick] = t;
		}
	},
	fiery: (c, t) => {
		return Math.floor(c.owner.quanta[etg.Fire] / 5);
	},
	fire: (c, t) => {
		Effect.mkText('1:6', c);
		c.owner.spend(etg.Fire, -1);
	},
	firebolt: (c, t) => {
		t.spelldmg(3 + Math.floor(c.owner.quanta[etg.Fire] / 4));
		if (t.type == etg.Player) {
			if (t.weapon) {
				t.weapon.setStatus('frozen', 0);
			}
		} else {
			t.setStatus('frozen', 0);
		}
	},
	firebrand: passive((c, t, data) => {
		if (data.tgt == c && data.active == Skills.tempering) {
			c.incrStatus('charges', 1);
		}
	}),
	flatline: (c, t) => {
		if (!c.owner.foe.sanctuary) {
			c.owner.foe.flatline = true;
		}
	},
	flyself: (c, t) => {
		Skills[c.type == etg.Weapon ? 'flyingweapon' : 'livingweapon'].func(c, c);
	},
	flyingweapon: (c, t) => {
		t.owner.weapon = undefined;
		t.type = etg.Creature;
		t.setStatus('airborne', 1);
		t.owner.addCrea(t);
	},
	foedraw: (c, t) => {
		if (c.owner.hand.length < 8) {
			if (!c.owner.foe.deck.length) c.owner.game.setWinner(c.owner);
			else {
				c.owner.deck.push(c.owner.foe.deck.pop());
				c.owner.drawcard();
			}
		}
	},
	forcedraw: (c, t) => {
		if (!t.owner.sanctuary) {
			t.owner.drawcard();
		}
	},
	forceplay: (c, t) => {
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
				x: t.owner == t.owner.game.player2 ? -1 : 1,
				y: 0,
			});
			if (t.owner.sanctuary) return;
			if (card.type == etg.Spell) {
				tgting = Cards.Targeting[card.active.get('cast').name[0]];
			}
		} else if (t.active.has('cast')) {
			tgting = Cards.Targeting[t.active.get('cast').name[0]];
		}
		if (tgting && !(tgt = findtgt(tgting))) return;
		const realturn = t.owner.game.turn;
		t.owner.game.turn = t.owner;
		t.useactive(tgt);
		t.owner.game.turn = realturn;
	},
	fractal: (c, t) => {
		Effect.mkText('Fractal', t);
		for (let i = 6 + Math.floor(c.owner.quanta[etg.Aether] / 2); i > 0; i--) {
			c.owner.addCard(t.card);
		}
		c.owner.quanta[etg.Aether] = 0;
	},
	freedom: (c, t, attackFlags) => {
		if (
			c.owner === t.owner &&
			t.type === etg.Creature &&
			t.getStatus('airborne') &&
			!attackFlags.freedom &&
			c.rng() < 0.3
		)
			attackFlags.freedom = true;
	},
	freeevade: (c, t, data) => {
		const tgt = data.tgt;
		if (
			tgt &&
			tgt.type == etg.Creature &&
			tgt.owner == c.owner &&
			tgt.owner != t.owner &&
			tgt.getStatus('airborne') &&
			!tgt.getStatus('frozen') &&
			c.rng() > 0.8
		) {
			data.evade = true;
		}
	},
	freeze: (c, t) => {
		t.freeze(c.card.upped ? 4 : 3);
	},
	freezeperm: (c, t) => {
		Skills.freeze.func(c, t);
	},
	fungusrebirth: (c, t) => {
		c.transform(c.card.as(Cards.Fungus));
	},
	gaincharge2: (c, t) => {
		if (c != t) {
			c.incrStatus('charges', 2);
		}
	},
	gaintimecharge: (c, t, drawstep) => {
		if (!drawstep && c.owner == t && c.getStatus('chargecap') < 4) {
			c.incrStatus('chargecap', 1);
			c.incrStatus('charges', 1);
		}
	},
	gas: (c, t) => {
		c.owner.addPerm(new Thing(c.card.as(Cards.UnstableGas)));
	},
	give: (c, t) => {
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
	golemhit: (c, t) => {
		t.attack();
	},
	gpull: (c, t) => {
		Skills.gpullspell.func(c, c);
	},
	gpullspell: (c, t) => {
		if (t.type == etg.Creature) {
			t.owner.gpull = t;
		} else {
			t = t.owner;
			t.gpull = undefined;
		}
		Effect.mkText('Pull', t);
	},
	gratitude: (c, t) => {
		Effect.mkText('+4', c);
		c.owner.dmg(-4);
	},
	grave: (c, t) => {
		c.setStatus('burrowed', 0);
		c.transform(t.card);
		c.setStatus('nocturnal', 1);
	},
	growth: x => {
		const n = +x;
		return (c, t) => {
			Effect.mkText(`${n}|${n}`, c);
			c.buffhp(n);
			c.atk += n;
		};
	},
	guard: (c, t) => {
		Effect.mkText('Guard', t);
		c.delay(1);
		t.delay(1);
		if (c.getStatus('airborne') || !t.getStatus('airborne')) {
			c.attackCreature(t);
		}
	},
	halveatk: (c, t) => {
		t = t || c;
		const storedatk = Math.ceil(t.atk / 2);
		t.incrStatus('storedAtk', storedatk);
		t.atk -= storedatk;
	},
	hammer: (c, t) => {
		return c.owner.mark == etg.Gravity || c.owner.mark == etg.Earth ? 1 : 0;
	},
	hasten: (c, t) => {
		c.owner.drawcard();
	},
	hatch: (c, t) => {
		Effect.mkText('Hatch', c);
		c.transform(c.randomcard(c.card.upped, x => x.type == etg.Creature));
	},
	heal: (c, t) => {
		t.dmg(-20);
	},
	heatmirror: (c, t, fromhand) => {
		if (fromhand && t.type == etg.Creature && c.owner != t.owner) {
			c.owner.addCrea(new Thing(c.card.as(Cards.Spark)));
		}
	},
	hitownertwice: (c, t) => {
		if (!c.hasactive('turnstart', 'predatoroff')) {
			c.addactive('turnstart', Skills.predatoroff);
			c.attack(c.owner);
			c.attack(c.owner);
		}
	},
	holylight: (c, t) => {
		if (t.getStatus('nocturnal')) t.spelldmg(10);
		else t.dmg(-10);
	},
	hope: (c, t) => {
		return c.owner.creatures.reduce(
			(dr, cr) => (cr && cr.hasactive('ownattack', 'light') ? dr + 1 : dr),
			0,
		);
	},
	icebolt: (c, t) => {
		const bolts = Math.floor(c.owner.quanta[etg.Water] / 5);
		if (c.rng() < 0.35 + bolts / 20) {
			t.freeze(c.card.upped ? 4 : 3);
		}
		t.spelldmg(2 + bolts);
	},
	ignite: (c, t) => {
		c.die();
		c.owner.foe.spelldmg(20);
		c.owner.foe.masscc(
			c,
			(c, x) => {
				x.spelldmg(1);
			},
			true,
		);
	},
	immolate: (c, t) => {
		t.die();
		if (!t.hasactive('ownattack', 'singularity')) {
			for (let i = 1; i < 13; i++) c.owner.spend(i, -1);
			c.owner.spend(etg.Fire, c.card.upped ? -7 : -5);
		}
	},
	improve: (c, t) => {
		Effect.mkText('Improve', t);
		t.setStatus('mutant', 1);
		t.transform(t.randomcard(false, x => x.type == etg.Creature));
	},
	inertia: (c, t, data) => {
		if (data.tgt && c.owner == data.tgt.owner) {
			c.owner.spend(etg.Gravity, -2);
		}
	},
	infect: (c, t) => {
		Effect.mkText('Infect', t);
		t.addpoison(1);
	},
	inflation: (c, t) => {
		function inflate(p) {
			if (p && p.isMaterial() && p.active.has('cast')) {
				if (!p.cast) p.castele = 0;
				p.cast++;
			}
		}
		c.owner.forEach(inflate);
		c.owner.foe.forEach(inflate);
	},
	ink: (c, t) => {
		const p = new Thing(c.card.as(Cards.Cloak));
		p.setStatus('charges', 1);
		c.owner.addPerm(p);
	},
	innovation: (c, t) => {
		const town = t.owner;
		if (!town.sanctuary) {
			t.die();
			if (!town.deck.length) town.game.setWinner(town.foe);
			else {
				town.deck.length--;
				for (let i = 0; i < 3; i++) {
					town.drawcard();
				}
			}
		}
	},
	integrity: (c, t) => {
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
		let stat = c.card.upped ? 0.5 : 0;
		for (let i = c.owner.hand.length - 1; ~i; i--) {
			const card = c.owner.hand[i].card;
			if (etg.ShardList.some(x => x && card.isOf(Cards.Codes[x]))) {
				if (card.upped) {
					stat += 0.5;
				}
				tally[card.element]++;
				c.owner.hand.splice(i, 1);
			}
		}
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
		const shardgolem = (c.owner.shardgolem = {
			stat: Math.floor(stat),
			status: new imm.Map({ golem: 1 }),
			active: new imm.Map({ cast: parseSkill(active) }),
			cast: shardCosts[active],
		});
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
		c.owner.addCrea(new Thing(c.card.as(Cards.ShardGolem)), true);
	},
	jelly: (c, t) => {
		const tcard = t.card;
		t.transform(tcard.as(Cards.PinkJelly));
		t.castele = tcard.element;
		t.cast = 4;
		t.atk = 7;
		t.maxhp = t.hp = 4;
	},
	jetstream: (c, t) => {
		t.dmg(1);
		t.atk += 3;
	},
	light: (c, t) => {
		Effect.mkText('1:8', c);
		c.owner.spend(etg.Light, -1);
	},
	lightning: (c, t) => {
		Effect.mkText('-5', t);
		t.spelldmg(5);
	},
	liquid: (c, t) => {
		Effect.mkText('Liquid', t);
		t.lobo();
		t.setSkill('hit', Skills.vampire);
		t.addpoison(1);
	},
	livingweapon: (c, t) => {
		if (t.owner.weapon) unsummon(t.owner.weapon);
		t.owner.dmg(-t.truehp());
		t.remove();
		t.owner.setWeapon(t);
	},
	lobotomize: (c, t) => {
		Effect.mkText('Lobotomize', t);
		sfx.playSound('lobo');
		t.lobo();
		t.setStatus('psionic', 0);
	},
	locket: (c, t) => {
		const ele = c.getStatus('mode') || c.owner.mark;
		c.owner.spend(ele, ele > 0 ? -1 : -3);
	},
	locketshift: (c, t) => {
		c.setStatus('mode', t.type == etg.Player ? t.mark : t.card.element);
	},
	loot: (c, t) => {
		if (c.owner == t.owner && !c.hasactive('turnstart', 'salvageoff')) {
			const foe = c.owner.foe,
				perms = foe.permanents.filter(x => {
					return x && x.isMaterial();
				});
			if (foe.weapon && foe.weapon.isMaterial()) perms.push(foe.weapon);
			if (foe.shield && foe.shield.isMaterial()) perms.push(foe.shield);
			if (perms.length) {
				Effect.mkText('Looted', c);
				Skills.steal.func(c, foe.choose(perms));
				c.addactive('turnstart', Skills.salvageoff);
			}
		}
	},
	losecharge: (c, t) => {
		if (!c.maybeDecrStatus('charges')) {
			if (c.type == etg.Creature) c.die();
			else c.remove();
		}
	},
	luciferin: (c, t) => {
		c.owner.dmg(-10);
		c.owner.masscc(c, (c, x) => {
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
	lycanthropy: (c, t) => {
		Effect.mkText('5|5', c);
		c.buffhp(5);
		c.atk += 5;
		c.active = c.active.delete('cast');
		c.setStatus('nocturnal', 1);
	},
	martyr: passive((c, t, dmg) => {
		if (dmg > 0) c.atk += dmg;
	}),
	mend: (c, t) => {
		t.dmg(-10);
	},
	metamorph: (c, t) => {
		c.owner.mark = t.type == etg.Player ? t.mark : t.card.element;
		c.owner.markpower++;
	},
	midas: (c, t) => {
		if (t.getStatus('stackable') && t.getStatus('charges') > 1) {
			Skills.destroy.func(c, t, true);
			const relic = new Thing(t.card.as(Cards.GoldenRelic));
			relic.usedactive = false;
			t.owner.addPerm(relic);
		} else {
			t.clearStatus();
			t.transform(t.card.as(Cards.GoldenRelic));
			t.atk = t.maxhp = t.hp = 1;
		}
	},
	millpillar: (c, t) => {
		if (t.deck.length && t.deck[t.deck.length - 1].card.type == etg.Pillar)
			t.deck.length--;
	},
	mimic: (c, t) => {
		if (c != t && t.type == etg.Creature) {
			c.transform(t.card);
			c.addactive('play', Skills.mimic);
		}
	},
	miracle: (c, t) => {
		c.owner.quanta[etg.Light] = 0;
		if (c.owner.sosa) {
			c.owner.hp = 1;
		} else if (c.owner.hp < c.owner.maxhp) {
			c.owner.hp = c.owner.maxhp - 1;
		}
	},
	mitosis: (c, t) => {
		const inst = new Thing(c.card);
		inst.owner = c.owner;
		inst.play(c);
	},
	mitosisspell: (c, t) => {
		t.setSkill('cast', Skills.mitosis);
		t.castele = t.card.costele;
		t.cast = t.card.cost;
		t.buffhp(1);
	},
	momentum: (c, t) => {
		Effect.mkText('Momentum', t);
		t.atk += 1;
		t.buffhp(1);
		t.setStatus('momentum', 1);
	},
	mummy: passive((c, t, data) => {
		if (data.tgt == c && data.active == Skills.rewind) {
			c.transform(c.card.as(Cards.Pharaoh));
			data.evade = true;
		}
	}),
	mutant: (c, t) => {
		if (!c.mutantactive()) {
			c.setSkill('cast', Skills.web);
			c.cast = c.owner.upto(2) + 1;
		}
		c.castele = c.owner.upto(13);
		c.setStatus('mutant', 1);
	},
	mutation: (c, t) => {
		const rnd = c.rng();
		if (rnd < 0.1) {
			Effect.mkText('Death', t);
			t.die();
		} else if (rnd < 0.5) {
			Skills.improve.func(c, t);
		} else {
			Effect.mkText('Abomination', t);
			t.transform(Cards.Abomination.asShiny(t.card.shiny));
		}
	},
	neuro: adrenathrottle((c, t) => {
		t.addpoison(1);
		t.setStatus('neuro', 1);
	}),
	neuroify: (c, t) => {
		const poison = t.getStatus('poison');
		if (poison > 0) {
			t.setStatus('neuro', 1);
		} else if (poison < 0) {
			t.setStatus('poison', 0);
		}
	},
	nightmare: (c, t) => {
		if (!c.owner.foe.sanctuary) {
			Effect.mkText('Nightmare', t);
			c.owner.dmg(
				-c.owner.foe.spelldmg(
					(8 - c.owner.foe.hand.length) * (c.card.upped ? 2 : 1),
				),
			);
			for (let i = c.owner.foe.hand.length; i < 8; i++) {
				c.owner.foe.addCard(t.card);
			}
		}
	},
	nightshade: (c, t) => {
		Skills.lycanthropy.func(t);
	},
	nova: (c, t) => {
		for (let i = 1; i < 13; i++) {
			c.owner.spend(i, -1);
		}
		c.owner.nova += 2;
		if (c.owner.nova >= 6) {
			c.owner.addCrea(new Thing(Cards.Singularity.asShiny(c.card.shiny)));
		}
	},
	nova2: (c, t) => {
		for (let i = 1; i < 13; i++) {
			c.owner.spend(i, -2);
		}
		c.owner.nova += 3;
		if (c.owner.nova >= 6) {
			c.owner.addCrea(
				new Thing(Cards.Singularity.asUpped(true).asShiny(c.card.shiny)),
			);
		}
	},
	nullspell: (c, t) => {
		if (!c.hasactive('prespell', 'eatspell')) {
			c.addactive('prespell', Skills.eatspell);
			c.addactive('turnstart', Skills.noeatspell);
		}
	},
	eatspell: (c, t, data) => {
		if (t.type === etg.Spell && t.card.type === etg.Spell) {
			Skills['growth 1'].func(c);
			c.rmactive('prespell', 'eatspell');
			data.evade = true;
		}
	},
	noeatspell: (c, t) => {
		if (t == c.owner) {
			c.rmactive('prespell', 'eatspell');
		}
	},
	nymph: (c, t) => {
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
				: c.owner.upto(12) + 1);
		Skills.destroy.func(c, t, true, true);
		t.owner.addCrea(new Thing(t.card.as(Cards.Codes[etg.NymphList[e]])));
	},
	obsession: passive((c, t) => {
		c.owner.spelldmg(c.card.upped ? 10 : 8);
	}),
	ouija: (c, t) => {
		if (!c.owner.foe.sanctuary && c.owner.foe.hand.length < 8) {
			c.owner.foe.addCard(Cards.OuijaEssence);
		}
	},
	pacify: (c, t) => {
		t.atk -= t.trueatk();
	},
	pairproduce: (c, t) => {
		c.owner.permanents.forEach(p => {
			if (p && p.card.type == etg.Pillar) p.trigger('ownattack');
		});
	},
	paleomagnetism: (c, t) => {
		const e = c.owner.upto(6);
		const list = e & 1 ? etg.PillarList : etg.PendList;
		c.owner.addPerm(
			new Thing(
				c.card.as(Cards.Codes[list[e < 4 ? c.owner.mark : c.owner.foe.mark]]),
			),
		);
	},
	pandemonium: (c, t) => {
		c.owner.foe.masscc(c, Skills.cseed.func, true);
	},
	pandemonium2: (c, t) => {
		t.masscc(c, Skills.cseed.func);
	},
	pandemonium3: (c, t) => {
		function cs2(x) {
			if (x) {
				Skills.cseed2.func(c, x);
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
	paradox: (c, t) => {
		Effect.mkText('Paradox', t);
		t.die();
	},
	parallel: (c, t) => {
		Effect.mkText('Parallel', t);
		if (t.card.isOf(Cards.Chimera)) {
			Skills.chimera.func(c);
			return;
		}
		const copy = t.clone(c.owner);
		c.owner.addCrea(copy);
		if (copy.getStatus('mutant')) {
			const buff = c.owner.upto(25);
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
	phoenix: (c, t, data) => {
		if (!c.owner.creatures[data.index]) {
			const ash = (c.owner.creatures[data.index] = new Thing(
				c.card.as(Cards.Ash),
			));
			ash.owner = c.owner;
			ash.type = etg.Creature;
		}
	},
	photosynthesis: (c, t) => {
		Effect.mkText('2:5', c);
		c.owner.spend(etg.Life, -2);
		if (c.cast > 0) c.usedactive = false;
	},
	plague: (c, t) => {
		t.masscc(c, Skills.infect.func);
	},
	platearmor: (c, t) => {
		const buff = c.card.upped ? 6 : 4;
		Effect.mkText('0|' + buff, t);
		t.buffhp(buff);
	},
	poison: x => {
		const n = +x;
		return adrenathrottle((c, t) => {
			(t || c.owner.foe).addpoison(n);
		});
	},
	poisonfoe: c => {
		if (c.rng() < 0.7) c.owner.foe.addpoison(1);
	},
	powerdrain: (c, t) => {
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
	precognition: (c, t) => {
		c.owner.drawcard();
		c.owner.precognition = true;
	},
	predator: (c, t) => {
		const fhand = c.owner.foe.hand;
		if (fhand.length > 4 && !c.hasactive('turnstart', 'predatoroff')) {
			c.addactive('turnstart', Skills.predatoroff);
			c.attack();
			if (fhand.length) Skills.destroycard.func(c, fhand[fhand.length - 1]);
		}
	},
	predatoroff: passive((c, t) => {
		c.rmactive('turnstart', 'predatoroff');
	}),
	protectall: (c, t) => {
		function protect(p) {
			if (p && p.isMaterial()) {
				p.addactive('prespell', Skills.protectonce);
				p.addactive('spelldmg', Skills.protectoncedmg);
			}
		}
		c.owner.creatures.forEach(protect);
		c.owner.permanents.forEach(protect);
	},
	protectonce: passive((c, t, data) => {
		if (data.tgt == c && c.owner != t.owner) {
			c.rmactive('prespell', 'protectonce');
			c.rmactive('spelldmg', 'protectoncedmg');
			data.evade = true;
		}
	}),
	protectoncedmg: (c, t) => {
		c.rmactive('prespell', 'protectonce');
		c.rmactive('spelldmg', 'protectoncedmg');
		return true;
	},
	purify: (c, t) => {
		const poison = t.getStatus('poison');
		t.setStatus('poison', poison < 0 ? poison - 2 : -2);
		t.setStatus('aflatoxin', 0);
		t.setStatus('neuro', 0);
		if (t.type == etg.Player) t.sosa = 0;
	},
	quint: (c, t) => {
		Effect.mkText('Immaterial', t);
		t.setStatus('immaterial', 1);
		t.setStatus('frozen', 0);
	},
	quinttog: (c, t) => {
		if (t.getStatus('immaterial')) {
			Effect.mkText('Materialize', t);
			t.setStatus('immaterial', 0);
		} else Skills.quint.func(c, t);
	},
	randomdr: (c, t) => {
		if (c == t) c.maxhp = c.hp = c.owner.upto(c.card.upped ? 4 : 3);
	},
	rage: (c, t) => {
		const dmg = c.card.upped ? 6 : 5;
		Effect.mkText(dmg + '|-' + dmg, t);
		t.atk += dmg;
		t.spelldmg(dmg);
		t.setStatus('frozen', 0);
	},
	readiness: (c, t) => {
		Effect.mkText('Ready', t);
		if (t.active.has('cast')) {
			t.cast = 0;
			t.usedactive = false;
		}
	},
	readyequip: (c, t) => {
		if (t.type === etg.Weapon || t.type === etg.Shield) {
			t.usedactive = false;
		}
	},
	reap: (c, t) => {
		const atk = t.trueatk(),
			hp = t.truehp(),
			index = t.getIndex();
		t.die();
		if (
			!t.owner.creatures[index] ||
			t.owner.creatures[index].card != Cards.MalignantCell
		) {
			const skele = (t.owner.creatures[index] = new Thing(
				t.card.as(Cards.Skeleton),
			));
			skele.owner = t.owner;
			skele.type = etg.Creature;
			skele.atk = atk;
			skele.maxhp = skele.hp = hp;
		}
	},
	rebirth: (c, t) => {
		c.transform(c.card.as(Cards.Phoenix));
	},
	reducemaxhp: (c, t, dmg) => {
		t.maxhp = Math.max(t.maxhp - dmg, 1);
		if (t.maxhp > 500 && t.type == etg.Player) t.maxhp = 500;
		if (t.hp > t.maxhp) t.dmg(t.hp - t.maxhp);
	},
	regen: adrenathrottle((c, t) => {
		c.owner.incrStatus('poison', -1);
	}),
	regenerate: (c, t) => {
		Effect.mkText('+5', c);
		c.owner.dmg(-5);
	},
	regeneratespell: (c, t) => {
		t.lobo();
		t.addactive('ownattack', Skills.regenerate);
		if (t.type == etg.Permanent || t.type == etg.Shield) {
			t.clearStatus();
		}
	},
	regrade: (c, t) => {
		t.transform(t.card.asUpped(!t.card.upped));
		c.owner.spend(t.card.element, -1);
	},
	reinforce: (c, t) => {
		const atk = c.trueatk(),
			hp = c.truehp();
		Effect.mkText(atk + '|' + hp, t);
		t.atk += atk;
		t.buffhp(hp);
		c.remove();
	},
	ren: (c, t) => {
		if (!t.hasactive('predeath', 'bounce')) {
			Effect.mkText('Ren', t);
			t.addactive('predeath', Skills.bounce);
		}
	},
	resetcap: (c, t) => {
		c.setStatus('chargecap', 0);
	},
	reveal: (c, t) => {
		c.owner.precognition = true;
	},
	rewind: (c, t) => {
		Effect.mkText('Rewind', t);
		t.remove();
		t.owner.deck.push(new Thing(t.card));
	},
	ricochet: (c, t, data) => {
		if (t.type !== etg.Spell || t.card.type !== etg.Spell) return;
		const tgting = Cards.Targeting[data.active.name[0]];
		if (tgting) {
			function tgttest(x) {
				if (x) {
					if (tgting(t.owner, x)) tgts.push([x, t.owner]);
					if (tgting(t.owner.foe, x)) tgts.push([x, t.owner.foe]);
				}
			}
			const tgts = [];
			for (let i = 0; i < 2; i++) {
				const pl = i == 0 ? c.owner : c.owner.foe;
				pl.forEach(tgttest, true);
			}
			if (tgts.length) {
				const tgt = c.choose(tgts),
					town = t.owner;
				t.owner = tgt[1];
				t.castSpell(tgt[0], data.active, true);
				t.owner = town;
			}
		}
	},
	sadism: (c, t, dmg) => {
		if (dmg > 0 && (!c.card.upped || c.owner == t.owner)) {
			c.owner.dmg(-dmg);
		}
	},
	salvage: passive((c, t, data) => {
		Skills['growth 1'].func(c);
		if (
			!data.salvaged &&
			!c.hasactive('turnstart', 'salvageoff') &&
			c.owner.game.turn != c.owner
		) {
			Effect.mkText('Salvage', c);
			data.salvaged = true;
			c.owner.addCard(t.card);
			c.addactive('turnstart', Skills.salvageoff);
		}
	}),
	salvageoff: (c, t) => {
		c.rmactive('turnstart', 'salvageoff');
	},
	sanctify: (c, t) => {
		c.owner.sanctuary = true;
	},
	unsanctify: (c, t) => {
		c.owner.foe.sanctuary = false;
	},
	scatterhand: (c, t) => {
		if (!t.sanctuary) {
			t.drawhand(t.hand.length);
			c.owner.drawcard();
		}
	},
	scramble: (c, t) => {
		if (t.type == etg.Player && !t.sanctuary) {
			for (let i = 0; i < 9; i++) {
				if (t.spend(etg.Chroma, 1, true)) {
					t.spend(etg.Chroma, -1, true);
				}
			}
		}
	},
	serendipity: c => {
		const num = Math.min(8 - c.owner.hand.length, 3);
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
	shardgolem: (c, t) => {
		if (!c.maxhp) {
			const golem = c.owner.shardgolem || {
				stat: 1,
				cast: 0,
				status: new imm.Map(),
				active: new imm.Map(),
			};
			c.cast = golem.cast;
			c.castele = etg.Earth;
			c.atk = c.maxhp = c.hp = golem.stat;
			c.status = golem.status;
			c.active = golem.active;
		}
	},
	shtriga: (c, t) => {
		if (c.owner == t) c.setStatus('immaterial', 1);
	},
	shuffle3: (c, t) => {
		for (let i = 0; i < 3; i++)
			c.owner.deck.splice(
				c.owner.upto(c.owner.deck.length),
				0,
				new Thing(t.card),
			);
	},
	silence: (c, t) => {
		if (t.type != etg.Player || !t.sanctuary) t.usedactive = true;
	},
	singularity: (c, t) => {
		if (c.trueatk() > 0) {
			Skills.antimatter.func(c, c);
			return;
		}
		const r = c.rng();
		if (r > 0.9) {
			c.setStatus('adrenaline', 1);
		} else if (r > 0.8) {
			c.addactive('hit', Skills.vampire);
		} else if (r > 0.7) {
			Skills.quint.func(c, c);
		} else if (r > 0.6) {
			Skills.scramble.func(c, c.owner);
		} else if (r > 0.5) {
			Skills.blackhole.func(c.owner.foe, c.owner);
		} else if (r > 0.4) {
			const buff = c.owner.upto(25);
			c.buffhp(Math.floor(buff / 5) + 1);
			c.atk -= (buff % 5) + 1;
		} else if (r > 0.3) {
			Skills.nova.func(c.owner.foe);
			c.owner.foe.nova = 0;
		} else if (r > 0.2) {
			Skills.parallel.func(c, c);
		} else if (r > 0.1) {
			c.owner.setWeapon(new Thing(Cards.Dagger.asShiny(c.card.shiny)));
		}
	},
	sing: (c, t) => {
		t.attack(t.owner);
	},
	sinkhole: (c, t) => {
		Effect.mkText('Sinkhole', t);
		t.setStatus('burrowed', 1);
		t.setStatus('airborne', 0);
		t.lobo();
		t.setSkill('cast', Skills.unburrow);
		t.cast = c.card.upped ? 2 : 1;
		t.castele = etg.Earth;
		t.usedactive = true;
	},
	siphon: adrenathrottle((c, t) => {
		if (!c.owner.foe.sanctuary && c.owner.foe.spend(etg.Chroma, 1)) {
			Effect.mkText('1:11', c);
			c.owner.spend(etg.Darkness, -1);
		}
	}),
	siphonactive: (c, t) => {
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
	siphonstrength: (c, t) => {
		Effect.mkText('+1|0', c);
		Effect.mkText('-1|0', t);
		t.atk--;
		c.atk++;
	},
	skeleton: passive((c, t, data) => {
		if (data.tgt == c && data.active == Skills.rewind) {
			Skills.hatch.func(c);
			data.evade = true;
		}
	}),
	skyblitz: (c, t) => {
		c.owner.quanta[etg.Air] = 0;
		c.owner.creatures.forEach(cr => {
			if (cr && cr.getStatus('airborne')) {
				Effect.mkText('Dive', cr);
				cr.incrStatus('dive', cr.trueatk());
			}
		});
	},
	snipe: (c, t) => {
		Effect.mkText('-3', t);
		t.dmg(3);
	},
	sosa: (c, t) => {
		c.owner.sosa = 2;
		for (let i = 1; i < 13; i++) {
			if (i != etg.Death) {
				c.owner.quanta[i] = 0;
			}
		}
		const n = c.card.upped ? 40 : 48;
		c.owner.dmg(Math.max(Math.ceil((c.owner.maxhp * n) / 100), n), true);
	},
	soulcatch: (c, t) => {
		Effect.mkText('Soul', c);
		c.owner.spend(etg.Death, -3);
	},
	spores: (c, t) => {
		const spore = c.card.as(Cards.Spore);
		c.owner.addCrea(new Thing(spore));
		c.owner.addCrea(new Thing(spore));
	},
	sskin: (c, t) => {
		c.owner.buffhp(c.owner.quanta[etg.Earth]);
	},
	staff: (c, t) => {
		return c.owner.mark == etg.Life || c.owner.mark == etg.Water ? 1 : 0;
	},
	stasis: (c, t, attackFlags) => {
		if (
			t.type === etg.Creature &&
			attackFlags.attackPhase &&
			!attackFlags.stasis
		) {
			sfx.playSound('stasis');
			attackFlags.stasis = true;
		}
	},
	ownstasis: (c, t, attackFlags) => {
		if (
			t.type === etg.Creature &&
			c.owner === t.owner &&
			attackFlags.attackPhase &&
			!attackFlags.stasis
		)
			attackFlags.stasis = true;
	},
	static: c => {
		c.owner.foe.spelldmg(2);
	},
	steal: (c, t) => {
		if (t.getStatus('stackable')) {
			const inst = t.clone();
			inst.setStatus('charges', 1);
			Skills.destroy.func(c, t, true);
			t = inst;
		} else {
			t.remove();
		}
		t.usedactive = true;
		if (t.type == etg.Permanent) c.owner.addPerm(t);
		else if (t.type == etg.Weapon) c.owner.setWeapon(t);
		else c.owner.setShield(t);
	},
	steam: (c, t) => {
		Effect.mkText('5|0', c);
		c.incrStatus('steam', 5);
		c.atk += 5;
		if (!c.hasactive('postauto', 'decrsteam'))
			c.addactive('postauto', Skills.decrsteam);
	},
	stoneform: (c, t) => {
		Effect.mkText('0|20', c);
		c.buffhp(20);
		c.active = c.active.delete('cast');
		c.setStatus('golem', 1);
	},
	storm: x => {
		const n = +x;
		return (c, t) => {
			t.masscc(c, (c, x) => {
				x.spelldmg(n);
			});
		};
	},
	summon: name => {
		return (c, t) => {
			c.owner.addCrea(new Thing(c.card.as(Cards[name])));
		};
	},
	swarm: passive((c, t) => {
		return c.owner.creatures.reduce(
			(hp, cr) => (cr && cr.hasactive('hp', 'swarm') ? hp + 1 : hp),
			0,
		);
	}),
	swave: (c, t) => {
		if (t.getStatus('frozen')) {
			Effect.mkText('Death', t);
			t.die();
		} else {
			if (t.type == etg.Player && t.weapon && t.weapon.getStatus('frozen')) {
				Skills.destroy.func(c, t.weapon);
			}
			Effect.mkText('-4', t);
			t.spelldmg(4);
		}
	},
	tempering: (c, t) => {
		const atk = c.card.upped ? 5 : 3;
		Effect.mkText(atk + '|0', t);
		t.atk += atk;
		t.setStatus('frozen', 0);
	},
	tesseractsummon: (c, t) => {
		for (let i = 0; i < 3; i++) {
			const pl = i ? c.owner : c.owner.foe;
			const candidates = [];
			for (let j = 0; j < pl.deck.length; j++) {
				if (pl.deck[j].card.type == etg.Creature) candidates.push(j);
			}
			if (candidates.length) {
				const idx = pl.choose(candidates),
					[cr] = pl.deck.splice(idx, 1);
				pl.addCrea(cr);
				cr.freeze(Math.ceil(cr.card.cost / 4));
			}
		}
	},
	throwrock: (c, t) => {
		const dmg = c.card.upped ? 4 : 3;
		Effect.mkText('-' + dmg, t);
		t.dmg(dmg);
		t.owner.deck.splice(
			c.owner.upto(t.owner.deck.length),
			0,
			new Thing(c.card.as(Cards.ThrowRock)),
		);
	},
	tick: (c, t) => {
		c.dmg(c.card.upped ? 3 : 1);
		if (c.hp <= 0) {
			if (c.card.upped)
				c.owner.foe.masscc(c, (c, x) => {
					x.dmg(4);
				});
			else c.owner.foe.spelldmg(18);
		}
	},
	tidalhealing: (c, t) => {
		c.owner.masscc(c, (c, t) => {
			if (t.getStatus('poison') > 0) t.setStatus('poison', 0);
			if (t.getStatus('frozen')) t.setStatus('frozen', 0);
			if (t.getStatus('aquatic') && !t.hasactive('hit', 'regen'))
				t.addactive('hit', Skills.regen);
		});
	},
	tornado: (c, t) => {
		let pl = c.owner.foe;
		for (let i = 0; i < 3; i++) {
			if (i == 2) {
				if (c.card.upped) return;
				else pl = c.owner;
			}
			const perms = pl.permanents.filter(x => {
				return x && x.isMaterial();
			});
			if (pl.weapon && pl.weapon.isMaterial()) perms.push(pl.weapon);
			if (pl.shield && pl.shield.isMaterial()) perms.push(pl.shield);
			if (perms.length) {
				const pr = pl.choose(perms);
				const newpl = pl.upto(2) ? pl : pl.foe;
				newpl.deck.splice(newpl.upto(newpl.deck.length), 0, new Thing(pr.card));
				Effect.mkText('Shuffled', pr);
				Skills.destroy.func(c, pr, true, true);
			}
		}
	},
	trick: (c, t) => {
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
			t.owner.deck[pick] = t;
		}
	},
	turngolem: (c, t) => {
		c.remove();
		const storedpower = c.getStatus('storedpower');
		c.atk = storedpower >> 1;
		c.maxhp = c.hp = storedpower;
		c.setStatus('storedpower', 0);
		delete c.active.cast;
		c.owner.addCrea(c);
		c.owner.gpull = c;
	},
	unappease: (c, t) => {
		c.setStatus('appeased', 0);
	},
	unburrow: (c, t) => {
		c.setStatus('burrowed', 0);
		c.active.cast = Skills.burrow;
		c.cast = 1;
	},
	unsummon: (c, t) => {
		if (t.owner.hand.length < 8) {
			t.remove();
			t.owner.addCard(t.card);
		} else {
			Skills.rewind.func(c, t);
		}
	},
	upkeep: (c, t) => {
		if (!c.owner.spend(c.card.element, 1)) c.die();
	},
	upload: (c, t) => {
		Effect.mkText('2|0', t);
		t.atk += c.dmg(2);
	},
	vampire: (c, t, dmg) => {
		c.owner.dmg(-dmg);
	},
	vend: c => {
		c.owner.drawcard();
		c.die();
	},
	vengeance: (c, t) => {
		if (c.owner == t.owner && c.owner == c.owner.game.turn.foe) {
			if (c.maybeDecrStatus('charges') < 2) c.remove();
			c.owner.creatures.slice().forEach(cr => {
				if (cr && cr != t) {
					cr.attack();
				}
			});
		}
	},
	vindicate: (c, t, data) => {
		if (c.owner == t.owner && !c.getStatus('vindicated') && !data.vindicated) {
			c.setStatus('vindicated', 1);
			data.vindicated = true;
			t.attack();
		}
	},
	unvindicate: (c, t) => {
		c.setStatus('vindicated', 0);
	},
	virtue: passive((c, t, blocked) => {
		c.owner.buffhp(blocked);
	}),
	virusinfect: (c, t) => {
		c.die();
		Skills.infect.func(c, t);
	},
	virusplague: (c, t) => {
		c.die();
		Skills.plague.func(c, t);
	},
	void: (c, t) => {
		c.owner.foe.maxhp = Math.max(c.owner.foe.maxhp - 3, 1);
		if (c.owner.foe.hp > c.owner.foe.maxhp) {
			c.owner.foe.hp = c.owner.foe.maxhp;
		}
	},
	voidshell: (c, t, data) => {
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
	quantagift: (c, t) => {
		if (c.owner.mark != etg.Water) {
			c.owner.spend(etg.Water, -2);
			c.owner.spend(c.owner.mark, c.owner.mark ? -2 : -6);
		} else c.owner.spend(etg.Water, -3);
	},
	web: (c, t) => {
		Effect.mkText('Web', t);
		t.setStatus('airborne', 0);
	},
	wind: (c, t) => {
		c.atk += c.getStatus('storedAtk');
		c.setStatus('storedAtk', 0);
	},
	wisdom: (c, t) => {
		Effect.mkText('3|0', t);
		t.atk += 3;
		if (t.getStatus('immaterial')) {
			t.setStatus('psionic', 1);
		}
	},
	yoink: (c, t) => {
		if (t.type == etg.Player) {
			Skills.foedraw.func(c);
		} else if (!t.owner.sanctuary) {
			t.remove();
			if (c.owner.hand.length < 8) {
				t.owner = c.owner;
				c.owner.hand.push(t);
			}
		}
	},
	pillar: (c, t) => {
		if (!t)
			c.owner.spend(
				c.card.element,
				c.getStatus('charges') * (c.card.element > 0 ? -1 : -3),
			);
		else if (c == t)
			c.owner.spend(c.card.element, c.card.element > 0 ? -1 : -3);
	},
	pend: (c, t) => {
		const pendstate = c.getStatus('pendstate');
		const ele = pendstate ? c.owner.mark : c.card.element;
		c.owner.spend(ele, c.getStatus('charges') * (ele > 0 ? -1 : -3));
		c.setStatus('pendstate', pendstate ? 0 : 1);
	},
	pillmat: quadpillarFactory(18041), //4,6,7,9
	pillspi: quadpillarFactory(9611), //2,5,8,11
	pillcar: quadpillarFactory(5036), //1,3,10,12
	absorbdmg: (c, t, data) => {
		c.incrStatus('storedpower', data.blocked);
	},
	absorber: (c, t) => {
		c.owner.spend(etg.Fire, -3);
	},
	blockwithcharge: (c, t, data) => {
		if (c.maybeDecrStatus('charges') < 2) {
			c.die();
		}
		data.dmg = 0;
	},
	chaos: (c, t) => {
		const randomchance = c.rng();
		if (randomchance < 0.3) {
			if (t.type == etg.Creature && !t.getStatus('ranged')) {
				Skills.cseed.func(c, t);
			}
		} else return c.card.upped && randomchance < 0.5;
	},
	cold: (c, t) => {
		if (!t.getStatus('ranged') && c.rng() < 0.3) {
			t.freeze(3);
		}
	},
	despair: (c, t) => {
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
	evade100: (c, t, data) => {
		data.dmg = 0;
	},
	evade: x => {
		const n = +x / 100;
		return (c, t, data) => {
			if (c.rng() < n) data.dmg = 0;
		};
	},
	evadespell: (c, t, data) => {
		if (
			data.tgt == c &&
			c.owner != t.owner &&
			t.type === etg.Spell &&
			t.card.type === etg.Spell
		)
			data.evade = true;
	},
	evadecrea: (c, t, data) => {
		if (data.tgt == c && c.owner != t.owner && t.type === etg.Creature)
			data.evade = true;
	},
	firewall: (c, t) => {
		if (!t.getStatus('ranged')) {
			Effect.mkText('-1', t);
			t.dmg(1);
		}
	},
	skull: (c, t) => {
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
					const skele = (t.owner.creatures[index] = new Thing(
						t.card.as(Cards.Skeleton),
					));
					skele.owner = t.owner;
					skele.type = etg.Creature;
				}
			}
		}
	},
	slow: (c, t) => {
		if (!t.getStatus('ranged')) t.delay(2);
	},
	solar: (c, t) => {
		c.owner.spend(etg.Light, -1);
	},
	thorn: (c, t) => {
		if (!t.getStatus('ranged') && c.rng() < 0.75) {
			t.addpoison(1);
		}
	},
	thornweak: (c, t) => {
		if (!t.getStatus('ranged') && c.rng() < 0.25) {
			t.addpoison(1);
		}
	},
	weight: (c, t, data) => {
		if (t.type == etg.Creature && t.truehp() > 5) data.dmg = 0;
	},
	wings: (c, t, data) => {
		if (!t.getStatus('airborne') && !t.getStatus('ranged')) data.dmg = 0;
	},
};
function unsummon(t) {
	t.remove();
	if (t.owner.hand.length < 8) {
		t.owner.addCardInstance(t);
	} else {
		t.owner.deck.push(t);
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
var util = require('./util');
var Cards = require('./Cards');
var Thing = require('./Thing');
var Effect = require('./Effect');
var parseSkill = require('./parseSkill');
