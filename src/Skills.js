import * as imm from './immutable.js';
import * as sfx from './audio.js';
import * as etg from './etg.js';
import Skill from './Skill.js';
import parseSkill from './parseSkill.js';

const exports = {};
export default exports;

function adrenathrottle(f) {
	return (ctx, c, ...rest) => {
		if (
			c.getStatus('adrenaline') < 3 ||
			(c.type === etg.Creature &&
				c.owner.weapon &&
				c.owner.weapon.getStatus('nothrottle'))
		) {
			return f(ctx, c, ...rest);
		}
	};
}
function quadPillarCore(ctx, ele, c, n) {
	for (let i = 0; i < n; i++) {
		const r = ctx.upto(16);
		c.owner.spend((ele >> ((r & 3) << 2)) & 15, -1);
		if (ctx.rng() < 2 / 3) {
			c.owner.spend((ele >> (r & 12)) & 15, -1);
		}
	}
}
function quadpillarFactory1(ele) {
	return (ctx, c, t) => quadPillarCore(ctx, ele, c, 1);
}
function quadpillarFactory(ele) {
	return (ctx, c, t) => quadPillarCore(ctx, ele, c, c.getStatus('charges'));
}
const defaultShardGolem = new imm.Map({
	stat: 1,
	cast: 0,
	status: new imm.Map(),
	active: new imm.Map(),
});
const passiveSet = new WeakSet();
function passive(f) {
	passiveSet.add(f);
	return f;
}
const Skills = {
	abomination: passive((ctx, c, t, data) => {
		if (data.tgt === c.id && data.active === exports.mutation) {
			Skills.improve(ctx, c, c);
			data.evade = true;
		}
	}),
	acceleration: (ctx, c, t) => {
		t.lobo();
		t.setSkill('ownattack', parseSkill(`growth ${c.card.upped ? 3 : 2} -1`));
	},
	accretion: (ctx, c, t) => {
		Skills.destroy(ctx, c, t);
		c.buffhp(10);
		if (c.truehp() > 30) {
			c.remove();
			c.transform(c.card.as(ctx.Cards.Names.BlackHole));
			c.owner.addCard(c);
		}
	},
	accumulation: (ctx, c, t) => {
		return c.getStatus('charges');
	},
	adrenaline: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Adrenaline', id: t.id });
		t.setStatus('adrenaline', 1);
	},
	aflatoxin: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Aflatoxin', id: t.id });
		t.addpoison(2);
		t.setStatus('aflatoxin', 1);
	},
	aggroskele: (ctx, c, t) => {
		c.owner.addCrea(c.owner.newThing(c.card.as(ctx.Cards.Names.Skeleton)));
		const dmg = c.owner.creatures.reduce(
			(dmg, cr) =>
				cr && cr.card.isOf(ctx.Cards.Names.Skeleton) ? dmg + cr.trueatk() : dmg,
			0,
		);
		t.dmg(dmg);
	},
	alphawolf: (ctx, c, t) => {
		const pwolf = c.card.as(ctx.Cards.Names.PackWolf);
		for (let i = 0; i < 2; i++) {
			const wolf = c.owner.newThing(pwolf);
			ctx.effect({ x: 'StartPos', id: wolf.id, src: c.id });
			c.owner.addCrea(wolf);
		}
	},
	antimatter: (ctx, c, t) => {
		t.incrAtk(t.trueatk() * -2);
	},
	appease: (ctx, c, t) => {
		c.setStatus('appeased', 1);
		ctx.effect({ x: 'Text', text: 'Appeased', id: c.id });
		Skills.devour(ctx, c, t);
	},
	atk2hp: (ctx, c, t) => {
		t.buffhp(t.trueatk() - t.hp);
	},
	autoburrow: (ctx, c, t) => {
		c.addactive('play', exports.autoburrowproc);
	},
	autoburrowoff: (ctx, c, t) => {
		c.rmactive('play', 'autoburrowproc');
	},
	autoburrowproc: (ctx, c, t) => {
		if (t.getSkill('cast') === exports.burrow) Skills.burrow(ctx, t);
	},
	axe: (ctx, c, t) => {
		return c.owner.mark === etg.Fire || c.owner.mark === etg.Time ? 1 : 0;
	},
	axedraw: (ctx, c, t) => {
		c.incrStatus('dive', 1);
	},
	bblood: (ctx, c, t) => {
		t.buffhp(20);
		t.delay(5);
	},
	becomearctic: passive((ctx, c, t) => {
		c.transform(c.card.as(ctx.Cards.Names.ArcticSquid));
	}),
	beguile: (ctx, c, t) => {
		t.remove();
		t.ownerId = t.owner.foeId;
		t.owner.addCrea(t);
		if (c.id !== t.id) t.addactive('turnstart', exports.beguilestop);
	},
	beguilestop: passive((ctx, c, t) => {
		if (t.id === c.ownerId) {
			c.rmactive('turnstart', 'beguilestop');
			Skills.beguile(ctx, c, c);
		}
	}),
	bellweb: (ctx, c, t) => {
		Skills.web(ctx, c, t);
		t.setStatus('aquatic', 1);
	},
	blackhole: (ctx, c, t) => {
		if (!t.getStatus('sanctuary')) {
			const quanta = new Int8Array(ctx.get(t.id).get('quanta'));
			for (let q = 1; q < 13; q++) {
				c.owner.dmg(-Math.min(t.quanta[q], 3));
				quanta[q] = Math.max(quanta[q] - 3, 0);
			}
			ctx.set(t.id, 'quanta', quanta);
		}
	},
	bless: (ctx, c, t) => {
		t.incrAtk(3);
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
		if (!t.card.isOf(ctx.Cards.Names.Skeleton)) {
			c.owner.addCrea(c.owner.newThing(c.card.as(ctx.Cards.Names.Skeleton)));
		}
	},
	bow: (ctx, c, t) => {
		return c.owner.mark === etg.Air || c.owner.mark === etg.Light ? 1 : 0;
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
		const foeCreatures = c.owner.foe.creatures;
		c.owner.creatures.forEach((cr, i) => {
			if (cr) {
				const fcr = foeCreatures[i];
				if (fcr) {
					cr.attackCreature(fcr);
					fcr.attackCreature(cr);
				} else {
					cr.attack();
				}
			}
		});
		c.owner.setQuanta(etg.Gravity);
	},
	brew: (ctx, c, t) => {
		const inst = c.owner.newThing(
			c.card.as(ctx.Cards.Codes[etg.AlchemyList[ctx.upto(12) + 1]]),
		);
		ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
		c.owner.addCard(inst);
	},
	brokenmirror: (ctx, c, t, fromhand) => {
		if (fromhand && t.type === etg.Creature && c.ownerId !== t.ownerId) {
			const phantom = c.owner.newThing(c.card.as(ctx.Cards.Names.Phantom));
			ctx.effect({ x: 'StartPos', id: phantom.id, src: c.id });
			c.owner.addCrea(phantom);
		}
	},
	bubbleclear: (ctx, c, t) => {
		Skills.clear(ctx, c, t);
		t.addactive('prespell', exports.protectonce);
		t.addactive('spelldmg', exports.protectoncedmg);
	},
	burrow: (ctx, c, t) => {
		if (c.getStatus('burrowed')) {
			c.setStatus('burrowed', 0);
			c.cast = 1;
		} else {
			c.setStatus('airborne', 0);
			c.setStatus('burrowed', 1);
			c.cast = 0;
		}
	},
	butterfly: (ctx, c, t) => {
		t.lobo();
		t.setSkill('cast', exports.destroy);
		t.cast = 3;
		t.castele = etg.Entropy;
	},
	catapult: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Catapult', id: t.id });
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
		if (!c.owner.creatureIds[data.index]) {
			const lives = c.maybeDecrStatus('lives');
			if (!lives) return;
			ctx.effect({ x: 'Text', text: `${lives - 1} lives`, id: c.id });
			const cl = c.clone(c.ownerId);
			cl.hp = cl.maxhp = c.card.health;
			cl.atk = c.card.attack;
			c.owner.setCrea(data.index, cl.id);
		}
	}),
	cell: passive((ctx, c, t) => {
		c.transform(c.card.as(ctx.Cards.Names.MalignantCell));
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
		chim.maxhp = chim.hp = hp;
		chim.setStatus('momentum', 1);
		chim.setStatus('airborne', 1);
		chim.type = etg.Creature;
		const newCreatures = new Uint32Array(23);
		newCreatures[0] = chim.id;
		ctx.set(c.ownerId, 'creatures', newCreatures);
		c.owner.gpull = chim.id;
	},
	chromastat: passive((ctx, c, t) => {
		const n = c.truehp() + c.trueatk();
		ctx.effect({ x: 'Text', text: `${n}:0`, id: c.id });
		c.owner.spend(0, -n);
	}),
	clear: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Clear', id: c.id });
		t.setStatus('poison', 0);
		t.setStatus('adrenaline', 0);
		t.setStatus('aflatoxin', 0);
		t.setStatus('momentum', 0);
		t.setStatus('psionic', 0);
		t.maybeDecrStatus('delayed');
		t.maybeDecrStatus('frozen');
		t.dmg(-1);
		if (t.hasactive('turnstart', 'beguilestop')) {
			Skills.beguilestop(ctx, t, t.owner);
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
		t.buffhp(bh);
		t.incrAtk(ba);
	},
	creatureupkeep: (ctx, c, t) => {
		if (t.type === etg.Creature) Skills.upkeep(ctx, t);
	},
	cseed: (ctx, c, t) => {
		Skills[
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
		](ctx, c, t);
	},
	cseed2: (ctx, c, t) => {
		const choice = ctx.randomcard(ctx.upto(2), card => {
			if (card.type !== etg.Spell) return false;
			const tgting = ctx.Cards.Targeting[card.active.get('cast').castName];
			return tgting && tgting(c, t);
		});
		ctx.effect({ x: 'Text', text: choice.name, id: t.id });
		c.castSpell(t.id, choice.active.get('cast'));
	},
	dagger: (ctx, c) => {
		let buff = c.owner.mark === etg.Darkness || c.owner.mark === etg.Death;
		for (const p of c.owner.permanentIds) {
			if (p && ctx.getStatus(p, 'cloak')) buff++;
		}
		return buff;
	},
	deadalive: (ctx, c) => {
		c.deatheffect(c.getIndex());
	},
	deathwish: (ctx, c, t, data) => {
		const tgt = ctx.byId(data.tgt);
		if (
			!tgt ||
			c.getStatus('frozen') ||
			c.getStatus('delayed') ||
			c.ownerId === t.ownerId ||
			tgt.ownerId !== c.ownerId ||
			tgt.type !== etg.Creature ||
			!ctx.Cards.Targeting[data.active.castName](t, c)
		)
			return;
		if (!tgt.hasactive('prespell', 'deathwish')) return (data.tgt = c.id);
		let totaldw = 0;
		for (const cr of c.owner.creatures) {
			if (cr && cr.hasactive('prespell', 'deathwish')) totaldw++;
		}
		if (ctx.rng() < 1 / totaldw) {
			return (data.tgt = c.id);
		}
	},
	decrsteam: passive((ctx, c) => {
		if (c.maybeDecrStatus('steam')) {
			c.incrAtk(-1);
		}
	}),
	deckblast: (ctx, c, t) => {
		c.owner.foe.spelldmg(Math.ceil(c.owner.deckIds.length / c.owner.deckpower));
		c.owner.deckIds = [];
	},
	deepdive: (ctx, c, t) => {
		c.setSkill('cast', exports.freezeperm);
		c.castele = etg.Gravity;
		c.setStatus('airborne', 0);
		c.setStatus('burrowed', 1);
		c.addactive('turnstart', exports.deepdiveproc);
	},
	deepdiveproc: passive((ctx, c, t) => {
		if (t.id === c.ownerId) {
			c.rmactive('turnstart', 'deepdiveproc');
			c.addactive('turnstart', exports.deepdiveproc2);
			c.setStatus('airborne', 1);
			c.setStatus('burrowed', 0);
			c.setStatus('dive', c.trueatk() * 2);
		}
	}),
	deepdiveproc2: passive((ctx, c, t) => {
		c.rmactive('turnstart', 'deepdiveproc2');
		c.setSkill('cast', exports.deepdive);
		c.castele = etg.Water;
		c.setStatus('airborne', false);
	}),
	deja: (ctx, c, t) => {
		c.active = c.active.delete('cast');
		Skills.parallel(ctx, c, c);
	},
	deployblobs: (ctx, c, t) => {
		const blob = c.card.as(ctx.Cards.Names.Blob);
		for (let i = 0; i < 3; i++) {
			const inst = c.owner.newThing(blob);
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
			c.owner.addCrea(inst);
		}
		c.incrAtk(-2);
		c.dmg(2);
	},
	destroy: (ctx, c, t, dontsalvage, donttalk) => {
		if (!donttalk) {
			ctx.effect({ x: 'Text', text: 'Destroy', id: t.id });
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
		if (t.type === etg.Player) {
			t._draw();
		} else if (!t.owner.getStatus('sanctuary')) {
			t.die();
		}
	},
	detain: (ctx, c, t) => {
		t.dmg(1);
		t.atk--;
		parseSkill('growth 1').func(ctx, c);
		t.setStatus('airborne', 0);
		t.setStatus('burrowed', 1);
	},
	devour: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Devoured', id: t.id });
		sfx.playSound('devour');
		c.buffhp(1);
		c.incrAtk(1);
		if (t.getStatus('poisonous')) c.addpoison(1);
		t.die();
	},
	die: (ctx, c, t) => {
		c.die();
	},
	disarm: (ctx, c, t) => {
		if (t.type === etg.Player && t.weapon) {
			unsummon(t.weapon);
		}
	},
	disc: (ctx, c, t) => {
		return c.owner.mark === etg.Entropy || c.owner.mark === etg.Aether ? 1 : 0;
	},
	discping: (ctx, c, t) => {
		t.dmg(1);
		c.remove();
		c.owner.addCard(c);
	},
	disfield: (ctx, c, t, data) => {
		if (!c.owner.spend(etg.Chroma, data.dmg)) {
			ctx.set(c.ownerId, 'quanta', new Int8Array(13));
			c.remove();
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
		ctx.effect({ x: 'Dive', id: c.id });
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
		ctx.effect({ x: 'Text', text: 'Draft', id: t.id });
		const isborne = !t.getStatus('airborne');
		t.setStatus('airborne', isborne);
		if (isborne) {
			t.incrAtk(3);
			if (t.getSkill('cast') === exports.burrow)
				t.active = t.active.delete('cast');
		} else {
			t.spelldmg(3);
		}
	},
	drawcopy: (ctx, c, t) => {
		if (c.ownerId !== t.ownerId) {
			const inst = t.clone(c.ownerId);
			c.owner.addCard(inst);
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
		}
	},
	drawequip: (ctx, c, t) => {
		for (let p = 0; p < 2; p++) {
			const pl = p ? c.owner.foe : c.owner,
				deck = pl.deck;
			if (p && pl.getStatus('sanctuary')) return;
			for (let i = pl.deckIds.length - 1; i > -1; i--) {
				const card = deck[i];
				if (card.card.type === etg.Weapon || card.card.type === etg.Shield) {
					if (~pl.addCard(card)) {
						ctx.effect({ x: 'StartPos', id: card.id, src: -1 });
						const deckIds = Array.from(pl.deckIds);
						deckIds.splice(i, 1);
						pl.deckIds = deckIds;
						pl.proc('draw');
					}
					break;
				}
			}
		}
	},
	drawpillar: (ctx, c, t) => {
		const deck = c.owner.deck;
		if (deck.length && deck[deck.length - 1].card.type === etg.Pillar)
			Skills.hasten(ctx, c, t);
	},
	dryspell: (ctx, c, t) => {
		c.owner.foe.masscc(
			c.owner,
			(ctx, c, t) => c.spend(etg.Water, -t.spelldmg(1)),
			true,
		);
	},
	dshield: (ctx, c, t) => {
		t.setStatus('immaterial', 1);
		t.addactive('turnstart', exports.dshieldoff);
	},
	dshieldoff: passive((ctx, c, t) => {
		if (c.ownerId === t.id) {
			c.setStatus('immaterial', 0);
			c.rmactive('turnstart', 'dshieldoff');
		}
	}),
	duality: (ctx, c, t) => {
		if (c.owner.foe.deckIds.length && c.owner.handIds.length < 8) {
			const inst = c.owner.foe.deck[c.owner.foe.deckIds.length - 1].clone(
				c.ownerId,
			);
			c.owner.addCard(inst);
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
		}
	},
	earthquake: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Earthquake', id: t.id });
		if (t.getStatus('charges') > 3) {
			t.incrStatus('charges', -3);
		} else {
			t.remove();
		}
		t.proc('destroy', {});
	},
	elf: passive((ctx, c, t, data) => {
		if (data.tgt === c.id && data.active === exports.cseed) {
			c.transform(c.card.as(ctx.Cards.Names.FallenElf));
			data.evade = true;
		}
	}),
	embezzle: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Embezzle', id: t.id });
		t.lobo();
		t.addactive('hit', exports.forcedraw);
		t.addactive('owndeath', exports.embezzledeath);
	},
	embezzledeath: (ctx, c, t) => {
		const { foe } = c.owner;
		foe._draw();
		foe._draw();
		foe._draw();
	},
	empathy: (ctx, c, t) => {
		const healsum = c.owner.countcreatures();
		ctx.effect({ x: 'Text', text: `+${healsum}`, id: c.id });
		c.owner.dmg(-healsum);
		if (!c.owner.spend(etg.Life, Math.floor(healsum / 8))) {
			c.owner.setQuanta(etg.Life);
			c.die();
		}
	},
	enchant: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Enchant', id: t.id });
		t.setStatus('immaterial', 1);
	},
	endow: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Endow', id: t.id });
		for (const [key, val] of t.status) {
			c.incrStatus(key, key === 'adrenaline' && val > 1 ? 1 : val);
		}
		if (t.active.get('cast') === exports.endow) {
			c.active = c.active.delete('cast');
		} else {
			c.active = t.active;
			c.cast = t.cast;
			c.castele = t.castele;
		}
		c.incrAtk(t.trueatk() - t.trigger('buff'));
		c.buffhp(2);
	},
	envenom: (ctx, c, t) => {
		t.addactive('hit', parseSkill('poison 1'));
		t.addactive('shield', exports.thornweak);
	},
	epidemic: (ctx, c, t) => {
		const poison = t.getStatus('poison');
		if (poison) c.owner.foe.addpoison(poison);
	},
	epoch: (ctx, c, t) => {
		c.incrStatus('epoch', 1);
		if (c.getStatus('epoch') > 1) Skills.silence(ctx, c, t.owner);
	},
	epochreset: (ctx, c, t) => {
		c.setStatus('epoch', 0);
	},
	evolve: (ctx, c, t) => {
		c.transform(c.card.as(ctx.Cards.Names.Shrieker));
		c.setStatus('burrowed', 0);
	},
	feed: (ctx, c, t) => {
		t.addpoison(1);
		parseSkill('growth 3').func(ctx, c);
		c.setStatus('immaterial', 0);
	},
	fickle: (ctx, c, t) => {
		if (t.ownerId !== c.ownerId && t.owner.getStatus('sanctuary')) {
			return;
		}
		const cards = [];
		t.owner.deck.forEach(({ card }, i) => {
			let cost = card.cost;
			if (!card.element || card.element === c.castele) cost += c.cast;
			if (t.owner.canspend(card.costele, cost)) {
				cards.push(i);
			}
		});
		if (cards.length) {
			const pick = ctx.choose(cards);
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
	firebolt: (ctx, c, t) => {
		t.spelldmg(3 + Math.floor(c.owner.quanta[etg.Fire] / 4));
		if (t.type === etg.Player) {
			if (t.weapon) {
				t.weapon.setStatus('frozen', 0);
			}
		} else {
			t.setStatus('frozen', 0);
		}
	},
	firebrand: passive((ctx, c, t, data) => {
		if (data.tgt === c.id && data.active === exports.tempering) {
			c.incrStatus('charges', 1);
		}
	}),
	flatline: (ctx, c, t) => {
		if (!c.owner.foe.getStatus('sanctuary')) {
			c.owner.foe.setStatus('flatline', 1);
		}
	},
	flyself: (ctx, c, t) => {
		Skills[c.type === etg.Weapon ? 'flyingweapon' : 'livingweapon'](ctx, c, c);
	},
	flyingweapon: (ctx, c, t) => {
		t.remove();
		t.setStatus('airborne', 1);
		t.owner.addCrea(t);
	},
	foedraw: (ctx, c, t) => {
		if (c.owner.handIds.length < 8) {
			const id = c.owner.foe._draw();
			if (id && ~c.owner.addCard(id)) {
				ctx.effect({ x: 'StartPos', id, src: -2 });
				c.owner.proc('draw', false);
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
				if (x && tgting(t, x)) {
					tgts.push(x);
				}
			}
			const tgts = [];
			for (let i = 0; i < 2; i++) {
				const pl = i === 0 ? c.owner : c.owner.foe;
				tgttest(pl);
				pl.forEach(tgttest, true);
			}
			return tgts.length === 0 ? undefined : ctx.choose(tgts);
		}
		let tgting, tgt;
		if (t.type === etg.Spell) {
			const card = t.card;
			if (t.owner.getStatus('sanctuary')) return;
			if (card.type === etg.Spell) {
				tgting = ctx.Cards.Targeting[card.active.get('cast').castName];
			}
		} else if (t.active.has('cast')) {
			tgting = ctx.Cards.Targeting[t.active.get('cast').castName];
		}
		const realturn = ctx.turn;
		ctx.turn = t.ownerId;
		if (!tgting || (tgt = findtgt(tgting))) {
			ctx.effect({ x: 'Text', text: 'Forced', id: t.id });
			t.useactive(tgt);
		}
		ctx.turn = realturn;
	},
	fractal: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Fractal', t: t.id });
		for (let i = 6 + Math.floor(c.owner.quanta[etg.Aether] / 2); i > 0; i--) {
			const inst = t.owner.newThing(t.card);
			ctx.effect({ x: 'StartPos', id: inst.id, src: t.id });
			c.owner.addCard(inst);
		}
		c.owner.setQuanta(etg.Aether);
	},
	freedom: (ctx, c, t, attackFlags) => {
		if (
			c.ownerId === t.ownerId &&
			t.type === etg.Creature &&
			t.getStatus('airborne') &&
			!attackFlags.freedom &&
			ctx.rng() < 0.3
		) {
			ctx.effect({ x: 'Free', id: t.id });
			attackFlags.freedom = true;
		}
	},
	freeevade: (ctx, c, t, data) => {
		const tgt = ctx.byId(data.tgt);
		if (
			tgt &&
			tgt.type === etg.Creature &&
			tgt.ownerId === c.ownerId &&
			tgt.ownerId !== t.ownerId &&
			tgt.getStatus('airborne') &&
			!tgt.getStatus('frozen') &&
			ctx.rng() > 0.8
		) {
			data.evade = true;
		}
	},
	freeze: (ctx, c, t) => {
		t.freeze(c.card.upped ? 4 : 3);
	},
	freezeperm: (ctx, c, t) => Skills.freeze(ctx, c, t),
	fungusrebirth: (ctx, c, t) => {
		c.transform(c.card.as(ctx.Cards.Names.Fungus));
	},
	gaincharge2: (ctx, c, t) => {
		if (c.id !== t.id) {
			c.incrStatus('charges', 2);
		}
	},
	gaintimecharge: (ctx, c, t, drawstep) => {
		if (!drawstep && c.ownerId === t.id && c.getStatus('chargecap') < 4) {
			c.incrStatus('chargecap', 1);
			c.incrStatus('charges', 1);
		}
	},
	gas: (ctx, c, t) => {
		c.owner.addPerm(c.owner.newThing(c.card.as(ctx.Cards.Names.UnstableGas)));
	},
	give: (ctx, c, t) => {
		c.owner.dmg(c.card.upped ? -10 : -5);
		if (t.type !== etg.Spell && t.hasactive('ownattack', 'singularity')) {
			t.die();
		} else {
			t.remove();
			if (t.type === etg.Permanent) c.owner.foe.addPerm(t);
			else if (t.type === etg.Creature) c.owner.foe.addCrea(t);
			else if (t.type === etg.Shield) c.owner.foe.setShield(t);
			else if (t.type === etg.Weapon) c.owner.foe.setWeapon(t);
			else c.owner.foe.addCard(t);
		}
	},
	golemhit: (ctx, c, t) => {
		t.attack();
	},
	gpull: (ctx, c, t) => {
		Skills.gpullspell(ctx, c, c);
	},
	gpullspell: (ctx, c, t) => {
		if (t.type === etg.Creature) {
			t.owner.gpull = t.id;
		} else {
			t = t.owner;
			t.gpull = 0;
		}
		ctx.effect({ x: 'Text', text: 'Pull', id: t.id });
	},
	gratitude: (ctx, c, t) => {
		c.owner.dmg(-4);
	},
	grave: (ctx, c, t) => {
		c.setStatus('burrowed', 0);
		c.transform(t.card);
		c.setStatus('nocturnal', 1);
	},
	growth: (atk, hp = atk) => {
		atk |= 0;
		hp |= 0;
		return (ctx, c, t) => {
			c.buffhp(hp);
			c.incrAtk(atk);
		};
	},
	guard: (ctx, c, t) => {
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
		t.incrAtk(-storedatk);
	},
	hammer: (ctx, c, t) => {
		return c.owner.mark === etg.Gravity || c.owner.mark === etg.Earth ? 1 : 0;
	},
	hasten: (ctx, c, t) => {
		c.owner.drawcard();
	},
	hatch: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Hatch', id: c.id });
		c.transform(ctx.randomcard(c.card.upped, x => x.type === etg.Creature));
	},
	heal: (ctx, c, t) => {
		t.dmg(-20);
	},
	heatmirror: (ctx, c, t, fromhand) => {
		if (fromhand && t.type === etg.Creature && c.ownerId !== t.ownerId) {
			const spark = c.owner.newThing(c.card.as(ctx.Cards.Names.Spark));
			ctx.effect({ x: 'StartPos', id: spark.id, src: c.id });
			c.owner.addCrea(spark);
		}
	},
	hitownertwice: (ctx, c, t) => {
		if (!c.hasactive('turnstart', 'predatoroff')) {
			c.addactive('turnstart', exports.predatoroff);
			c.attack(c.owner);
			c.attack(c.owner);
		}
	},
	holylight: (ctx, c, t) => {
		if (c.card.upped) c.owner.spend(etg.Light, -1);
		if (t.getStatus('nocturnal')) t.spelldmg(10);
		else t.dmg(-10);
	},
	hope: (ctx, c, t) => {
		return c.owner.creatures.reduce(
			(dr, cr) => (cr && cr.hasactive('ownattack', 'quanta 8') ? dr + 1 : dr),
			0,
		);
	},
	icebolt: (ctx, c, t) => {
		const bolts = Math.floor(c.owner.quanta[etg.Water] / 5);
		if (ctx.rng() < 0.35 + bolts / 20) {
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
		ctx.effect({ x: 'Text', text: 'Improve', id: t.id });
		t.setStatus('mutant', 1);
		t.transform(ctx.randomcard(false, x => x.type === etg.Creature));
	},
	inertia: (ctx, c, t, data) => {
		if (
			data.tgt &&
			c.ownerId === ctx.get(data.tgt).get('owner') &&
			data.tgt !== c.ownerId
		) {
			c.owner.spend(etg.Gravity, -2);
		}
	},
	infect: (ctx, c, t) => {
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
		const p = c.owner.newThing(c.card.as(ctx.Cards.Names.Cloak));
		p.setStatus('charges', 1);
		c.owner.addPerm(p);
	},
	innovation: (ctx, c, t) => {
		const town = t.owner;
		if (!town.getStatus('sanctuary')) {
			t.die();
			for (let i = 0; i < 3; i++) {
				town.drawcard();
			}
		}
		c.owner._draw();
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
			['growth 1 0', 'growth 2 0', 'tempering', 'destroy', 'destroy', 'rage'],
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
			'growth 1 0': 1,
			'growth 2 0': 1,
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
			const card = ctx.get(handIds[i]).get('card');
			if (etg.ShardList.some(x => x && card.isOf(ctx.Cards.Codes[x]))) {
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
			} else if (num !== 0 && tally[i] === num) {
				shlist.push(i);
			}
		}
		const active = shardSkills[ctx.choose(shlist) - 1][Math.min(num - 1, 5)];
		const shardgolem = {
			stat: Math.floor(stat),
			status: new imm.Map({ golem: 1 }),
			active: new imm.Map({ cast: parseSkill(active) }),
			cast: shardCosts[active],
		};
		function addSkill(event, active) {
			shardgolem.active = shardgolem.active.update(event, a =>
				Skill.combine(a, parseSkill(active)),
			);
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
				[0, 'ownattack', 'quanta 8'],
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
		ctx.set(c.ownerId, 'shardgolem', new imm.Map(shardgolem));
		c.owner.addCrea(
			c.owner.newThing(c.card.as(ctx.Cards.Names.ShardGolem)),
			true,
		);
	},
	jelly: (ctx, c, t) => {
		const tcard = t.card;
		t.transform(tcard.as(ctx.Cards.Names.PinkJelly));
		t.castele = tcard.element;
		t.cast = tcard.element ? 4 : 12;
		t.atk = 7;
		t.maxhp = t.hp = 4;
	},
	jetstream: (ctx, c, t) => {
		t.dmg(1);
		t.incrAtk(3);
	},
	lightning: (ctx, c, t) => {
		t.spelldmg(5);
	},
	liquid: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Liquid', id: t.id });
		t.lobo();
		t.setSkill('hit', exports.vampire);
		t.addpoison(1);
	},
	livingweapon: (ctx, c, t) => {
		if (t.owner.weapon) unsummon(t.owner.weapon);
		t.owner.dmg(-t.truehp());
		t.remove();
		t.owner.setWeapon(t);
	},
	lobotomize: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Lobotomize', id: t.id });
		sfx.playSound('lobo');
		t.lobo();
		t.setStatus('psionic', 0);
	},
	locket: (ctx, c, t) => {
		c.owner.spend(c.getStatus('mode') || c.owner.mark, -1);
	},
	locketshift: (ctx, c, t) => {
		c.setStatus('mode', t.type === etg.Player ? t.mark : t.card.element);
	},
	loot: (ctx, c, t) => {
		if (c.ownerId === t.ownerId && !c.hasactive('turnstart', 'salvageoff')) {
			const foe = c.owner.foe,
				perms = foe.permanents.filter(x => x && x.isMaterial());
			if (foe.weapon && foe.weapon.isMaterial()) perms.push(foe.weapon);
			if (foe.shield && foe.shield.isMaterial()) perms.push(foe.shield);
			if (perms.length) {
				ctx.effect({ x: 'Text', text: 'Looted', id: c.id });
				Skills.steal(ctx, c, ctx.choose(perms));
				c.addactive('turnstart', exports.salvageoff);
			}
		}
	},
	losecharge: (ctx, c, t) => {
		if (!c.maybeDecrStatus('charges')) {
			if (c.type === etg.Creature) c.die();
			else c.remove();
		}
	},
	luciferin: (ctx, c, t) => {
		c.owner.dmg(-10);
		c.owner.masscc(c, (ctx, c, x) => {
			for (const [key, act] of x.active) {
				if (
					key !== 'ownplay' &&
					key !== 'owndiscard' &&
					!act.name.every(name => parseSkill(name).passive)
				)
					return;
			}
			x.addactive('ownattack', parseSkill('quanta 8'));
		});
	},
	lycanthropy: (ctx, c, t) => {
		c.buffhp(5);
		c.incrAtk(5);
		c.lobo();
		c.setStatus('nocturnal', 1);
	},
	martyr: passive((ctx, c, t, dmg) => {
		if (dmg > 0) c.incrAtk(dmg);
	}),
	mend: (ctx, c, t) => {
		t.dmg(-10);
	},
	metamorph: (ctx, c, t) => {
		c.owner.mark = t.type === etg.Player ? t.mark : t.card.element;
		c.owner.markpower++;
	},
	midas: (ctx, c, t) => {
		if (t.getStatus('stackable') && t.getStatus('charges') > 1) {
			Skills.destroy(ctx, c, t, true);
			const relic = t.owner.newThing(t.card.as(ctx.Cards.Names.GoldenRelic));
			relic.usedactive = false;
			t.owner.addPerm(relic);
		} else {
			t.clearStatus();
			t.transform(t.card.as(ctx.Cards.Names.GoldenRelic));
			t.atk = t.maxhp = t.hp = 1;
		}
	},
	millpillar: (ctx, c, t) => {
		if (
			t.deckIds.length &&
			ctx.get(t.deckIds[t.deckIds.length - 1]).get('card').type === etg.Pillar
		)
			t._draw();
	},
	mimic: (ctx, c, t) => {
		if (c.id !== t.id && t.type === etg.Creature) {
			c.transform(t.card);
			c.addactive('play', exports.mimic);
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
		const child = c.owner.newThing(c.card);
		ctx.effect({ x: 'StartPos', id: child.id, src: c.id });
		child.play(c);
	},
	mitosisspell: (ctx, c, t) => {
		t.lobo();
		t.setSkill('cast', exports.mitosis);
		t.castele = t.card.costele;
		t.cast = t.card.cost;
		t.buffhp(1);
	},
	momentum: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Momentum', id: t.id });
		t.incrAtk(1);
		t.buffhp(1);
		t.setStatus('momentum', 1);
	},
	mummy: passive((ctx, c, t, data) => {
		if (data.tgt === c.id && data.active === exports.rewind) {
			c.transform(c.card.as(ctx.Cards.Names.Pharaoh));
			data.evade = true;
		}
	}),
	mutant: (ctx, c, t) => {
		if (!c.mutantactive()) {
			c.setSkill('cast', exports.web);
			c.cast = ctx.upto(2) + 1;
		}
		c.castele = ctx.upto(13);
		c.setStatus('mutant', 1);
	},
	mutation: (ctx, c, t) => {
		const rnd = ctx.rng();
		if (rnd < 0.1) {
			ctx.effect({ x: 'Text', text: 'Oops', id: t.id });
			t.die();
		} else if (rnd < 0.5) {
			Skills.improve(ctx, c, t);
		} else {
			ctx.effect({ x: 'Text', text: 'Abomination', id: t.id });
			t.transform(ctx.Cards.Names.Abomination.asShiny(t.card.shiny));
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
			ctx.effect({ x: 'Text', text: 'Nightmare', id: t.id });
			c.owner.dmg(
				-c.owner.foe.spelldmg(
					(8 - c.owner.foe.handIds.length) * (c.card.upped ? 2 : 1),
				),
			);
			for (let i = c.owner.foe.handIds.length; i < 8; i++) {
				const inst = t.owner.newThing(t.card);
				ctx.effect({ x: 'StartPos', id: inst.id, src: t.id });
				c.owner.foe.addCard(inst);
			}
		}
	},
	nightshade: (ctx, c, t) => {
		Skills.lycanthropy(ctx, t);
	},
	nova: (ctx, c, t) => {
		for (let i = 1; i < 13; i++) {
			c.owner.spend(i, -1);
		}
		c.owner.incrStatus('nova', 2);
		if (c.owner.getStatus('nova') >= 6) {
			c.transform(ctx.Cards.Names.Singularity.asShiny(c.card.shiny));
			c.owner.addCrea(c);
		}
	},
	nova2: (ctx, c, t) => {
		for (let i = 1; i < 13; i++) {
			c.owner.spend(i, -2);
		}
		c.owner.incrStatus('nova', 3);
		if (c.owner.getStatus('nova') >= 6) {
			c.transform(
				ctx.Cards.Names.Singularity.asUpped(true).asShiny(c.card.shiny),
			);
			c.owner.addCrea(c);
		}
	},
	nullspell: (ctx, c, t) => {
		if (!c.hasactive('prespell', 'eatspell')) {
			ctx.effect({ x: 'Text', text: 'Null Spell', id: c.id });
			c.addactive('prespell', exports.eatspell);
			c.addactive('turnstart', exports.noeatspell);
		}
	},
	eatspell: (ctx, c, t, data) => {
		if (t.type === etg.Spell && t.card.type === etg.Spell) {
			parseSkill('growth 1').func(ctx, c);
			c.rmactive('prespell', 'eatspell');
			data.evade = true;
		}
	},
	noeatspell: (ctx, c, t) => {
		if (t.id === c.ownerId) {
			c.rmactive('prespell', 'eatspell');
		}
	},
	nymph: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Nymph', id: t.id });
		const tauto = t.active.get('ownattack');
		const e =
			t.card.element ||
			(tauto === exports.pillmat
				? ctx.choose([etg.Earth, etg.Fire, etg.Water, etg.Air])
				: tauto === exports.pillspi
				? ctx.choose([etg.Death, etg.Life, etg.Light, etg.Darkness])
				: tauto === exports.pillcar
				? ctx.choose([etg.Entropy, etg.Gravity, etg.Time, etg.Aether])
				: ctx.upto(12) + 1);
		Skills.destroy(ctx, c, t, true, true);
		const nymph = t.owner.newThing(
			t.card.as(ctx.Cards.Codes[etg.NymphList[e]]),
		);
		ctx.effect({ x: 'StartPos', id: nymph.id, src: t.id });
		t.owner.addCrea(nymph);
	},
	obsession: passive((ctx, c, t) => {
		c.owner.spelldmg(c.card.upped ? 13 : 10);
	}),
	ouija: (ctx, c, t) => {
		const { foe } = c.owner;
		if (!foe.getStatus('sanctuary') && foe.handIds.length < 8) {
			const inst = foe.newThing(ctx.Cards.Names.OuijaEssence);
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
			foe.addCard(inst);
		}
	},
	pacify: (ctx, c, t) => {
		t.incrAtk(-t.trueatk());
	},
	pairproduce: (ctx, c, t) => {
		for (const p of c.owner.permanentIds) {
			if (p && ctx.get(p).get('card').type === etg.Pillar) {
				ctx.trigger(p, 'ownattack');
			}
		}
	},
	paleomagnetism: (ctx, c, t) => {
		const e = ctx.upto(6),
			list = e & 1 ? etg.PillarList : etg.PendList,
			inst = c.owner.newThing(
				c.card.as(
					ctx.Cards.Codes[list[e < 4 ? c.owner.mark : c.owner.foe.mark]],
				),
			);
		ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
		c.owner.addPerm(inst);
	},
	pandemonium: (ctx, c, t) => {
		c.owner.foe.masscc(c, Skills.cseed, true);
	},
	pandemonium2: (ctx, c, t) => {
		t.masscc(c, Skills.cseed);
	},
	pandemonium3: (ctx, c, t) => {
		function cs2(x) {
			if (x) {
				Skills.cseed2(ctx, c, x);
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
		ctx.effect({ x: 'Text', text: 'Paradox', id: t.id });
		t.die();
	},
	parallel: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Parallel', id: t.id });
		if (t.card.isOf(ctx.Cards.Names.Chimera)) {
			Skills.chimera(ctx, c);
			return;
		}
		const copy = t.clone(c.ownerId);
		ctx.effect({ x: 'StartPos', id: copy.id, src: t.id });
		c.owner.addCrea(copy);
		if (copy.getStatus('mutant')) {
			const buff = ctx.upto(25);
			copy.buffhp(Math.floor(buff / 5));
			copy.incrAtk(buff % 5);
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
			const ash = c.owner.newThing(c.card.as(ctx.Cards.Names.Ash));
			ash.type = etg.Creature;
			const creatures = new Uint32Array(c.owner.creatureIds);
			creatures[data.index] = ash.id;
			c.owner.creatureIds = creatures;
		}
	},
	photosynthesis: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: '2:5', id: c.id });
		c.owner.spend(etg.Life, -2);
		if (c.cast > 0) c.usedactive = false;
	},
	plague: (ctx, c, t) => {
		t.masscc(c, Skills.infect);
	},
	platearmor: (ctx, c, t) => {
		t.buffhp(c.card.upped ? 6 : 4);
	},
	poison: x => {
		const n = +x;
		return adrenathrottle((ctx, c, t) => {
			(t || c.owner.foe).addpoison(n);
		});
	},
	poisonfoe: (ctx, c) => {
		if (ctx.rng() < 0.7) c.owner.foe.addpoison(1);
	},
	powerdrain: (ctx, c, t) => {
		const ti = [];
		for (let i = 0; i < 23; i++) {
			if (c.owner.creatures[i]) ti.push(i);
		}
		if (!ti.length) return;
		const tgt = c.owner.creatures[ctx.choose(ti)],
			halfatk = Math.floor(t.trueatk() / 2),
			halfhp = Math.floor(t.truehp() / 2);
		t.incrAtk(-halfatk);
		t.buffhp(-halfhp);
		tgt.incrAtk(halfatk);
		tgt.buffhp(halfhp);
	},
	precognition: (ctx, c, t) => {
		c.owner.drawcard();
		c.owner.setStatus('precognition', 1);
	},
	predator: (ctx, c, t) => {
		const fhand = c.owner.foe.hand;
		if (fhand.length > 4 && !c.hasactive('turnstart', 'predatoroff')) {
			c.addactive('turnstart', exports.predatoroff);
			c.attack();
			if (fhand.length) Skills.destroycard(ctx, c, fhand[fhand.length - 1]);
		}
	},
	predatoroff: passive((ctx, c, t) => {
		c.rmactive('turnstart', 'predatoroff');
	}),
	protectall: (ctx, c, t) => {
		function protect(p) {
			if (p) {
				p.addactive('prespell', exports.protectonce);
				p.addactive('spelldmg', exports.protectoncedmg);
			}
		}
		c.owner.creatures.forEach(protect);
		c.owner.permanents.forEach(protect);
		protect(c.owner.shield);
		protect(c.owner.weapon);
	},
	protectonce: passive((ctx, c, t, data) => {
		if (data.tgt === c.id && c.ownerId !== t.ownerId) {
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
		if (t.type === etg.Player) t.setStatus('sosa', 0);
	},
	quanta: (e, amt = 1) => {
		const namt = -amt,
			ne = e | 0,
			text = `${amt}:${e}`;
		return (ctx, c, t) => {
			ctx.effect({ x: 'Text', text, id: c.id });
			c.owner.spend(ne, namt);
		};
	},
	quint: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Immaterial', id: t.id });
		t.setStatus('immaterial', 1);
		t.setStatus('frozen', 0);
	},
	quinttog: (ctx, c, t) => {
		if (t.getStatus('immaterial')) {
			ctx.effect({ x: 'Text', text: 'Material', id: t.id });
			t.setStatus('immaterial', 0);
		} else Skills.quint(ctx, c, t);
	},
	randomdr: (ctx, c, t) => {
		c.maxhp = c.hp = ctx.upto(c.card.upped ? 4 : 3);
	},
	rage: (ctx, c, t) => {
		const dmg = c.card.upped ? 6 : 5;
		t.incrAtk(dmg);
		t.spelldmg(dmg);
		t.setStatus('frozen', 0);
	},
	readiness: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Ready', id: t.id });
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
			t.owner.creatures[index].card !== ctx.Cards.Names.MalignantCell
		) {
			const skele = t.owner.newThing(t.card.as(ctx.Cards.Names.Skeleton));
			skele.atk = atk;
			skele.maxhp = skele.hp = hp;
			t.owner.setCrea(index, skele.id);
		}
	},
	rebirth: (ctx, c, t) => {
		c.transform(c.card.as(ctx.Cards.Names.Phoenix));
	},
	reducemaxhp: (ctx, c, t, dmg) => {
		t.maxhp = Math.max(t.maxhp - dmg, 1);
		if (t.maxhp > 500 && t.type === etg.Player) t.maxhp = 500;
		if (t.hp > t.maxhp) t.dmg(t.hp - t.maxhp);
	},
	regen: adrenathrottle((ctx, c, t) => {
		c.owner.incrStatus('poison', -1);
	}),
	regenerate: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: '+5', id: c.id });
		c.owner.dmg(-5);
	},
	regeneratespell: (ctx, c, t) => {
		t.lobo();
		t.addactive('ownattack', exports.regenerate);
		if (t.type === etg.Permanent || t.type === etg.Shield) {
			t.clearStatus();
		}
	},
	regrade: (ctx, c, t) => {
		t.transform(t.card.asUpped(!t.card.upped));
		c.owner.spend(t.card.element, -1);
	},
	reinforce: (ctx, c, t) => {
		ctx.effect({ x: 'EndPos', id: c.id, tgt: t.id });
		const atk = c.trueatk(),
			hp = c.truehp();
		t.incrAtk(atk);
		t.buffhp(hp);
		c.remove();
	},
	ren: (ctx, c, t) => {
		if (!t.hasactive('predeath', 'bounce')) {
			ctx.effect({ x: 'Text', text: 'Ren', id: t.id });
			t.addactive('predeath', exports.bounce);
		}
	},
	resetcap: (ctx, c, t) => {
		c.setStatus('chargecap', 0);
	},
	reveal: (ctx, c, t) => {
		c.owner.setStatus('precognition', 1);
	},
	rewind: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Rewind', id: t.id });
		ctx.effect({ x: 'EndPos', id: t.id, tgt: -1 });
		t.remove();
		t.owner.deckpush(t.owner.newThing(t.card).id);
	},
	ricochet: (ctx, c, t, data) => {
		if (t.type !== etg.Spell || t.card.type !== etg.Spell) return;
		const tgting = ctx.Cards.Targeting[data.active.castName];
		if (tgting) {
			function tgttest(x) {
				if (x) {
					if (tgting(t.owner, x)) tgts.push([x.id, t.ownerId]);
					if (tgting(t.owner.foe, x)) tgts.push([x.id, t.owner.foeId]);
				}
			}
			const tgts = [];
			for (let i = 0; i < 2; i++) {
				const pl = i === 0 ? c.owner : c.owner.foe;
				pl.forEach(tgttest, true);
			}
			if (tgts.length) {
				const tgt = ctx.choose(tgts),
					town = t.ownerId;
				t.ownerId = tgt[1];
				t.castSpell(tgt[0], data.active, true);
				t.ownerId = town;
			}
		}
	},
	sadism: (ctx, c, t, dmg) => {
		if (dmg > 0 && (!c.card.upped || c.ownerId === t.ownerId)) {
			c.owner.dmg(-dmg);
		}
	},
	salvage: passive((ctx, c, t, data) => {
		parseSkill('growth 1').func(ctx, c);
		if (
			!data.salvaged &&
			!c.hasactive('turnstart', 'salvageoff') &&
			ctx.turn !== c.ownerId
		) {
			ctx.effect({ x: 'Text', text: 'Salvage', id: c.id });
			data.salvaged = true;
			const inst = c.owner.newThing(t.card);
			ctx.effect({ x: 'StartPos', id: inst.id, src: t.id });
			c.owner.addCard(inst);
			c.addactive('turnstart', exports.salvageoff);
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
		if (t.type === etg.Player && !t.getStatus('sanctuary')) {
			for (let i = 0; i < 9; i++) {
				if (t.spend(etg.Chroma, 1, true)) {
					t.spend(etg.Chroma, -1, true);
				}
			}
		}
	},
	scramblespam: (ctx, c, t) => {
		Skills.scramble(ctx, c, t);
		c.usedactive = false;
	},
	serendipity: (ctx, c) => {
		const num = Math.min(8 - c.owner.handIds.length, 3);
		let anyentro = false;
		for (let i = num - 1; ~i; i--) {
			const card = ctx.randomcard(
				c.card.upped,
				x =>
					x.type !== etg.Pillar &&
					x.rarity < 4 &&
					(i > 0 || anyentro || x.element === etg.Entropy),
			);
			anyentro |= card.element === etg.Entropy;
			const inst = c.owner.newThing(card.asShiny(c.card.shiny));
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
			c.owner.addCard(inst);
		}
	},
	shardgolem: (ctx, c, t) => {
		if (!ctx.get(c.id).get('maxhp')) {
			const golem = ctx.get(c.ownerId).get('shardgolem') || defaultShardGolem;
			ctx.set(c.id, 'cast', golem.get('cast'));
			ctx.set(c.id, 'castele', etg.Earth);
			const stat = golem.get('stat');
			ctx.set(c.id, 'atk', stat);
			ctx.set(c.id, 'maxhp', stat);
			ctx.set(c.id, 'hp', stat);
			ctx.set(c.id, 'status', golem.get('status'));
			ctx.set(c.id, 'active', golem.get('active'));
		}
	},
	shtriga: (ctx, c, t) => {
		if (c.ownerId === t.id) c.setStatus('immaterial', 1);
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
		if (t.type !== etg.Player || !t.getStatus('sanctuary')) t.usedactive = true;
	},
	singularity: (ctx, c, t) => {
		if (c.trueatk() > 0) {
			Skills.antimatter(ctx, c, c);
			return;
		}
		const r = ctx.rng();
		if (r > 0.9) {
			c.setStatus('adrenaline', 1);
		} else if (r > 0.8) {
			c.addactive('hit', exports.vampire);
		} else if (r > 0.7) {
			Skills.quint(ctx, c, c);
		} else if (r > 0.6) {
			Skills.scramble(ctx, c, c.owner);
		} else if (r > 0.5) {
			Skills.blackhole(ctx, c.owner.foe, c.owner);
		} else if (r > 0.4) {
			const buff = ctx.upto(25);
			c.buffhp(Math.floor(buff / 5) + 1);
			c.incrAtk(-(buff % 5) - 1);
		} else if (r > 0.3) {
			c.owner.spend(etg.Chroma, -12);
		} else if (r > 0.2) {
			Skills.parallel(ctx, c, c);
		} else if (r > 0.1) {
			c.owner.setWeapon(
				c.owner.newThing(ctx.Cards.Names.Dagger.asShiny(c.card.shiny)),
			);
		}
	},
	sing: (ctx, c, t) => {
		t.attack(t.owner);
	},
	sinkhole: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Sinkhole', id: c.id });
		t.setStatus('airborne', 0);
		t.setStatus('burrowed', 1);
		t.lobo();
		t.setSkill('cast', exports.burrow);
		t.cast = c.card.upped ? 2 : 1;
		t.castele = etg.Earth;
		t.usedactive = true;
	},
	siphon: passive(
		adrenathrottle((ctx, c, t) => {
			if (
				!c.owner.foe.getStatus('sanctuary') &&
				c.owner.foe.spend(etg.Chroma, 1)
			) {
				ctx.effect({ x: 'Text', text: '1:11', id: c.id });
				c.owner.spend(etg.Darkness, -1);
			}
		}),
	),
	siphonactive: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Siphon', id: c.id });
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
		t.incrAtk(-1);
		c.incrAtk(1);
	},
	skeleton: passive((ctx, c, t, data) => {
		if (data.tgt === c.id && data.active === exports.rewind) {
			Skills.hatch(ctx, c);
			data.evade = true;
		}
	}),
	skyblitz: (ctx, c, t) => {
		c.owner.setQuanta(etg.Air);
		c.owner.creatures.forEach(cr => {
			if (cr && cr.getStatus('airborne')) {
				ctx.effect({ x: 'Dive', id: cr.id });
				cr.incrStatus('dive', cr.trueatk());
			}
		});
	},
	snipe: (ctx, c, t) => {
		t.dmg(3);
	},
	sosa: (ctx, c, t) => {
		const quanta = new Int8Array(13);
		quanta[etg.Death] = c.owner.quanta[etg.Death];
		ctx.set(c.ownerId, 'quanta', quanta);
		const n = c.card.upped ? 40 : 48;
		c.owner.setStatus('sosa', 0);
		c.owner.dmg(Math.ceil((c.owner.maxhp * n) / 100));
		c.owner.setStatus('sosa', 2);
	},
	soulcatch: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: '3:2', id: c.id });
		c.owner.spend(etg.Death, -3);
	},
	spores: (ctx, c, t) => {
		const spore = c.card.as(ctx.Cards.Names.Spore);
		for (let i = 0; i < 2; i++) {
			const inst = c.owner.newThing(spore);
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
			c.owner.addCrea(inst);
		}
	},
	sskin: (ctx, c, t) => {
		c.owner.buffhp(c.owner.quanta[etg.Earth]);
	},
	staff: (ctx, c, t) => {
		return c.owner.mark === etg.Life || c.owner.mark === etg.Water ? 1 : 0;
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
			Skills.destroy(ctx, c, t, true, true);
			ctx.effect({ x: 'StartPos', id: inst.id, src: t.id });
			t = inst;
		} else {
			t.remove();
		}
		t.usedactive = true;
		if (t.type === etg.Permanent) c.owner.addPerm(t);
		else if (t.type === etg.Weapon) c.owner.setWeapon(t);
		else c.owner.setShield(t);
	},
	steam: (ctx, c, t) => {
		c.incrStatus('steam', 5);
		c.incrAtk(5);
		if (!c.hasactive('postauto', 'decrsteam'))
			c.addactive('postauto', exports.decrsteam);
	},
	stoneform: (ctx, c, t) => {
		c.buffhp(20);
		c.lobo();
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
			const inst = c.owner.newThing(c.card.as(ctx.Cards.Names[name]));
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
			c.owner.addCrea(inst);
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
			ctx.effect({ x: 'Text', text: 'Shatter', id: t.id });
			t.die();
		} else {
			if (t.type === etg.Player && t.weaponId && t.weapon.getStatus('frozen')) {
				Skills.destroy(ctx, c, t.weapon);
			}
			t.spelldmg(4);
		}
	},
	tempering: (ctx, c, t) => {
		t.incrAtk(c.card.upped ? 5 : 3);
		t.setStatus('frozen', 0);
	},
	tesseractsummon: (ctx, c, t) => {
		for (let i = 0; i < 3; i++) {
			const pl = i ? c.owner : c.owner.foe,
				candidates = [],
				deckIds = Array.from(pl.deckIds);

			for (let j = 0; j < deckIds.length; j++) {
				if (ctx.byId(deckIds[j]).card.type === etg.Creature) candidates.push(j);
			}
			if (candidates.length) {
				const idx = ctx.choose(candidates),
					[crid] = deckIds.splice(idx, 1),
					cr = ctx.byId(crid);
				ctx.effect({ x: 'StartPos', id: cr.id, src: -1 });
				pl.addCrea(cr);
				cr.freeze(Math.ceil(cr.card.cost / 4));
				pl.deckIds = deckIds;
			}
		}
	},
	throwrock: (ctx, c, t) => {
		const dmg = c.card.upped ? 4 : 3;
		t.dmg(dmg);
		const deckIds = Array.from(t.owner.deckIds);
		deckIds.splice(
			ctx.upto(t.owner.deckIds.length),
			0,
			t.owner.newThing(c.card.as(ctx.Cards.Names.ThrowRock)).id,
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
				t.addactive('hit', exports.regen);
		});
	},
	tornado: (ctx, c, t) => {
		let pl = c.owner.foe;
		for (let i = 0; i < 3; i++) {
			if (i === 2) {
				if (c.card.upped) return;
				else pl = c.owner;
			}
			const perms = pl.permanents.filter(x => x && x.isMaterial());
			if (pl.weaponId && pl.weapon.isMaterial()) perms.push(pl.weapon);
			if (pl.shieldId && pl.shield.isMaterial()) perms.push(pl.shield);
			if (perms.length) {
				const pr = ctx.choose(perms);
				ctx.effect({ x: 'Text', text: 'Shuffled', id: pr.id });
				const newpl = ctx.upto(2) ? pl : pl.foe;
				const deckIds = Array.from(newpl.deckIds);
				deckIds.splice(
					ctx.upto(newpl.deckIds.length),
					0,
					newpl.newThing(pr.card).id,
				);
				newpl.deckIds = deckIds;
				Skills.destroy(ctx, c, pr, true, true);
			}
		}
	},
	trick: (ctx, c, t) => {
		const cards = [];
		t.owner.deckIds.forEach((id, i) => {
			const card = ctx.get(id).get('card');
			if (
				card.type === etg.Creature &&
				card.asShiny(false) !== t.card.asShiny(false)
			) {
				cards.push(i);
			}
		});
		if (cards.length) {
			const pick = ctx.choose(cards);
			t.owner.setCrea(t.getIndex(), t.owner.deckIds[pick]);
			const deck = Array.from(t.owner.deckIds);
			deck[pick] = t.id;
			t.owner.deckIds = deck;
			ctx.effect({ x: 'StartPos', id: t.owner.deckIds[pick], src: -1 });
			ctx.effect({ x: 'EndPos', id: t.id, tgt: -1 });
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
	unsummon: (ctx, c, t) => {
		if (t.owner.handIds.length < 8) {
			t.remove();
			const inst = t.owner.newThing(t.card);
			ctx.effect({ x: 'StartPos', id: inst.id, src: c.id });
			t.owner.addCard(inst);
		} else {
			Skills.rewind(ctx, c, t);
		}
	},
	upkeep: (ctx, c, t) => {
		if (!c.owner.spend(c.card.element, 1)) c.die();
	},
	upload: (ctx, c, t) => {
		t.incrAtk(c.dmg(2));
	},
	vampire: (ctx, c, t, dmg) => {
		ctx.effect({ x: 'Text', text: `+${dmg}`, id: c.id });
		c.owner.dmg(-dmg);
	},
	vend: (ctx, c) => {
		c.owner.drawcard();
		c.die();
	},
	vengeance: (ctx, c, t) => {
		if (
			c.ownerId === t.ownerId &&
			c.owner.leader !== ctx.get(ctx.turn).get('leader')
		) {
			if (c.maybeDecrStatus('charges') < 2) c.remove();
			for (const cr of c.owner.creatures) {
				if (cr && cr.id !== t.id) {
					cr.attack();
				}
			}
		}
	},
	vindicate: (ctx, c, t, data) => {
		if (
			c.ownerId === t.ownerId &&
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
		Skills.infect(ctx, c, t);
	},
	virusplague: (ctx, c, t) => {
		c.die();
		Skills.plague(ctx, c, t);
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
		if (c.owner.mark !== etg.Water) {
			c.owner.spend(etg.Water, -2);
			c.owner.spend(c.owner.mark, c.owner.mark ? -2 : -6);
		} else c.owner.spend(etg.Water, -3);
	},
	web: (ctx, c, t) => {
		ctx.effect({ x: 'Text', text: 'Web', id: t.id });
		t.setStatus('airborne', 0);
	},
	wind: (ctx, c, t) => {
		c.incrAtk(c.getStatus('storedAtk'));
		c.setStatus('storedAtk', 0);
	},
	wisdom: (ctx, c, t) => {
		t.incrAtk(3);
		if (t.getStatus('immaterial')) {
			t.setStatus('psionic', 1);
		}
	},
	yoink: (ctx, c, t) => {
		if (t.type === etg.Player) {
			Skills.foedraw(ctx, c);
		} else if (!t.owner.getStatus('sanctuary')) {
			t.remove();
			if (c.owner.handIds.length < 8) {
				t.ownerId = c.ownerId;
				c.owner.addCard(t);
			}
		}
	},
	pillar: (ctx, c, t) => {
		c.owner.spend(
			c.card.element,
			c.getStatus('charges') * (c.card.element > 0 ? -1 : -3),
		);
	},
	pillar1: (ctx, c, t) => {
		c.owner.spend(c.card.element, c.card.element > 0 ? -1 : -3);
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
	pillmat1: quadpillarFactory1(18041), //4,6,7,9
	pillspi1: quadpillarFactory1(9611), //2,5,8,11
	pillcar1: quadpillarFactory1(5036), //1,3,10,12
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
		const randomchance = ctx.rng();
		if (randomchance < 0.3) {
			if (t.type === etg.Creature && !t.getStatus('ranged')) {
				Skills.cseed(ctx, c, t);
			}
		} else return c.card.upped && randomchance < 0.5;
	},
	cold: (ctx, c, t) => {
		if (!t.getStatus('ranged') && ctx.rng() < 0.3) {
			t.freeze(3);
		}
	},
	despair: (ctx, c, t) => {
		if (!t.getStatus('ranged')) {
			const chance = c.owner.creatures.reduce((chance, cr) => {
				return cr && cr.hasactive('ownattack', 'siphon') ? chance + 1 : chance;
			}, 0);
			if (ctx.rng() < 1.4 - Math.pow(0.95, chance)) {
				t.incrAtk(-1);
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
			if (ctx.rng() < n) data.dmg = 0;
		};
	},
	evadespell: (ctx, c, t, data) => {
		if (
			data.tgt === c.id &&
			c.ownerId !== t.ownerId &&
			t.type === etg.Spell &&
			t.card.type === etg.Spell
		)
			data.evade = true;
	},
	evadecrea: (ctx, c, t, data) => {
		if (data.tgt === c.id && c.ownerId !== t.ownerId && t.type === etg.Creature)
			data.evade = true;
	},
	firewall: (ctx, c, t) => {
		if (!t.getStatus('ranged')) {
			t.spelldmg(1);
		}
	},
	skull: (ctx, c, t) => {
		if (t.type === etg.Creature && !t.card.isOf(ctx.Cards.Names.Skeleton)) {
			const thp = t.truehp();
			if (thp <= 0 || ctx.rng() < 0.5 / thp) {
				const index = t.getIndex();
				t.die();
				if (
					!t.owner.creatures[index] ||
					t.owner.creatures[index].card !== ctx.Cards.Names.MalignantCell
				) {
					sfx.playSound('skelify');
					const skele = t.owner.newThing(t.card.as(ctx.Cards.Names.Skeleton));
					t.owner.setCrea(index, skele.id);
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
		if (!t.getStatus('ranged') && ctx.rng() < 0.75) {
			t.addpoison(1);
		}
	},
	thornweak: (ctx, c, t) => {
		if (!t.getStatus('ranged') && ctx.rng() < 0.25) {
			t.addpoison(1);
		}
	},
	weight: (ctx, c, t, data) => {
		if (t.type === etg.Creature && t.truehp() > 5) data.dmg = 0;
	},
	wings: (ctx, c, t, data) => {
		if (!t.getStatus('airborne') && !t.getStatus('ranged')) data.dmg = 0;
	},
};
function unsummon(t) {
	t.remove();
	if (t.owner.handIds.length < 8) {
		t.owner.addCard(t);
	} else {
		t.owner.deckpush(t.id);
	}
}
for (const key in Skills) {
	exports[key] = new Skill([key], Skills[key], passiveSet.has(Skills[key]));
}

import vSkills from './vanilla/Skills.js';
for (const key in vSkills) {
	exports['v_' + key] = vSkills[key];
}
