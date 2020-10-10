#!/usr/bin/node --experimental-modules

import assertSoft from 'assert';
const assert = assertSoft.strict;

import * as etg from '../src/etg.js';
import Game from '../src/Game.js';
import parseSkill from '../src/parseSkill.js';
import * as etgutil from '../src/etgutil.js';

import OpenCjson from '../src/Cards.json';
import OpenCards from '../src/Cards.js';
import OriginalCjson from '../src/vanilla/Cards.json';
import OriginalCards from '../src/vanilla/Cards.js';

function initHand(pl, ...args) {
	const hand = [];
	for (let i = 0; i < args.length; i++) {
		const cardinst = pl.newThing(args[i]);
		cardinst.type = etg.Spell;
		hand[i] = cardinst.id;
	}
	pl.handIds = hand;
}

class TestModule {
	constructor(name, opts) {
		this.name = name;
		this.opts = opts || {};
	}
	test(name, func) {
		const ctx = {};
		if (this.opts.beforeEach) this.opts.beforeEach.call(ctx, this);
		process.stdout.write(name);
		func.call(ctx, this);
		process.stdout.write(' pass\n');
		return this;
	}
}

function test(name, opts, tests) {
	const tester = new TestModule(name, opts);
	for (const key in tests) {
		tester.test(key, tests[key]);
	}
}

test(
	'Card Codes',
	{},
	{
		CodesUnique() {
			const codes = new Set();
			for (const cdata of OpenCjson) {
				let codecol = cdata[0].indexOf('Code');
				for (let j = 1; j < cdata.length; j++) {
					const cdataj = cdata[j];
					for (const cdatajk of cdataj) {
						assert.equal(cdata[0].length, cdatajk.length);
						const code = cdatajk[codecol];
						assert.ok(!codes.has(code), 'Duplicate code: ' + code);
						codes.add(code);
					}
				}
			}
		},
		UppedAlignment() {
			for (let key in OpenCards.Codes) {
				key |= 0;
				if (!key) continue;
				const un = etgutil.asUpped(key, false),
					up = etgutil.asUpped(key, true);
				assert.ok(OpenCards.Codes[un] && OpenCards.Codes[up], key);
				const card = OpenCards.Codes[key];
				if (card.type === etg.Spell) assert.ok(card.active.get('cast'));
			}
		},
	},
);

test(
	'Cards',
	{
		beforeEach() {
			const data = {
				seed: 5489,
				players: [
					{ idx: 1, deck: '104vc' },
					{ idx: 2, deck: '104vc' },
				],
			};
			this.game = new Game(data);
			this.Cards = this.game.Cards;
			this.cast = (skill, ...args) =>
				parseSkill(skill).func(this.game, ...args);
			this.initDeck = (pl, ...args) =>
				(pl.deckIds = args.map(x => pl.newThing(x).id));
			this.player1 = this.game.byId(this.game.players[0]);
			this.player2 = this.game.byId(this.game.players[1]);
			this.player1.handIds = this.player2.handIds = [];
			this.player1Id = this.player1.id;
			this.player2Id = this.player2.id;
			this.game.phase = etg.PlayPhase;
			this.player1.mark = this.player2.mark = etg.Entropy;
		},
	},
	{
		Adrenaline() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Devourer));
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.HornedFrog));
			this.player1.addCrea(
				this.player1.newThing(this.Cards.Names.CrimsonDragon.asUpped(true)),
			);
			for (let i = 0; i < 3; i++)
				this.player1.creatures[i].setStatus('adrenaline', 1);
			this.player2.setQuanta(etg.Life, 3);
			this.player1.endturn();
			assert.equal(this.player2.hp, 68, 'dmg');
			assert.equal(this.player1.quanta[etg.Darkness], 2, 'Absorbed');
			assert.equal(this.player2.quanta[etg.Life], 1, 'Lone Life');
		},
		Aflatoxin() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Devourer));
			this.cast('aflatoxin', this.player1, this.player1.creatures[0]);
			assert.ok(this.player1.creatures[0].getStatus('poison'), 'Is poisoned');
			this.player1.creatures[0].die();
			assert.ok(this.player1.creatures[0], 'Something');
			assert.equal(
				this.player1.creatures[0].card,
				this.Cards.Names.MalignantCell,
				'Malignant',
			);
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Phoenix));
			this.cast('aflatoxin', this.player1, this.player1.creatures[1]);
			this.player1.creatures[1].die();
			assert.equal(
				this.player1.creatures[1].card,
				this.Cards.Names.MalignantCell,
				'Malignant, not Ash',
			);
		},
		BoneWall() {
			this.player1.setQuanta(etg.Death, 8);
			initHand(this.player1, this.Cards.Names.BoneWall);
			this.player1.hand[0].useactive();
			this.player2.addCrea(
				this.player2.newThing(this.Cards.Names.CrimsonDragon),
			);
			this.player2.addCrea(
				this.player2.newThing(this.Cards.Names.CrimsonDragon),
			);
			this.player2.addCrea(
				this.player2.newThing(this.Cards.Names.CrimsonDragon),
			);
			assert.ok(this.player1.shield, 'BW exists?');
			this.player1.endturn();
			this.player2.endturn();
			assert.ok(this.player1.shield, 'BW exists');
			assert.equal(this.player1.shield.getStatus('charges'), 4, '4 charges');
			this.player2.creatures[0].die();
			assert.equal(this.player1.shield.getStatus('charges'), 6, '6 charges');
		},
		Boneyard() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Devourer));
			this.player1.addPerm(this.player1.newThing(this.Cards.Names.Boneyard));
			this.player1.creatures[0].die();
			assert.ok(this.player1.creatures[0], 'Something');
			assert.equal(
				this.player1.creatures[0].card,
				this.Cards.Names.Skeleton,
				'Skeleton',
			);
		},
		Bounce() {
			const dev = this.player1.newThing(this.Cards.Names.Devourer);
			this.player1.addCrea(dev);
			this.cast('acceleration', dev, dev);
			this.cast('ren', dev, dev);
			this.player2.setQuanta(etg.Light, 2);
			dev.attack();
			dev.attack();
			assert.equal(this.player1.handIds[this.player1.hand.length - 1], dev.id);
			assert.equal(dev.atk, 4);
			assert.equal(dev.hp, 2);
			assert.equal(dev.maxhp, 2);
			assert.ok(dev.hasactive('ownattack', 'growth 2 -1'));
			this.player1.hand[this.player1.hand.length - 1].play();
			this.cast('pacify', dev, dev);
			this.cast('atk2hp', dev, dev);
			assert.equal(this.player1.handIds[this.player1.hand.length - 1], dev.id);
			assert.equal(dev.atk, 0);
			assert.equal(dev.hp, 0);
			assert.equal(dev.maxhp, 0);
		},
		Deckout() {
			this.player2.deckIds = [];
			this.player1.endturn();
			assert.equal(this.game.winner, this.player1Id);
		},
		Destroy() {
			this.player1.setQuanta(etg.Death, 10);
			initHand(
				this.player1,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.SoulCatcher,
				this.Cards.Names.Shield,
				this.Cards.Names.Dagger,
			);
			while (this.player1.handIds.length) {
				this.player1.hand[0].useactive();
			}
			assert.equal(
				this.player1.permanents[0].getStatus('charges'),
				2,
				'2 charges',
			);
			this.cast('destroy', this.player2, this.player1.permanents[0]);
			assert.equal(
				this.player1.permanents[0].getStatus('charges'),
				1,
				'1 charge',
			);
			this.cast('destroy', this.player2, this.player1.permanents[0]);
			assert.ok(!this.player1.permanents[0], 'poof');
			assert.equal(
				this.player1.permanents[1].card,
				this.Cards.Names.SoulCatcher,
				'SoulCatcher',
			);
			this.cast('destroy', this.player2, this.player1.permanents[1]);
			assert.ok(!this.player1.permanents[1], 'SoulCatcher gone');
			assert.equal(this.player1.shield.card, this.Cards.Names.Shield, 'Shield');
			this.cast('destroy', this.player2, this.player1.shield);
			assert.ok(!this.player1.shield, 'Shield gone');
			assert.equal(this.player1.weapon.card, this.Cards.Names.Dagger, 'Dagger');
			this.cast('destroy', this.player2, this.player1.weapon);
			assert.ok(!this.player1.weapon, 'Dagger gone');
			initHand(this.player1, this.Cards.Names.BoneWall);
			this.player1.hand[0].useactive();
			assert.equal(this.player1.shield.getStatus('charges'), 7, '7 bones');
			this.cast('destroy', this.player2, this.player1.shield);
			assert.equal(this.player1.shield.getStatus('charges'), 6, '6 bones');
			for (let i = 0; i < 6; i++) {
				this.cast('destroy', this.player2, this.player1.shield);
			}
			assert.ok(!this.player1.shield, 'This town is all in hell');
		},
		Devourer() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Devourer));
			this.player2.setQuanta(etg.Light, 1);
			this.player1.endturn();
			assert.equal(this.player2.quanta[etg.Light], 0, 'Light');
			assert.equal(this.player1.quanta[etg.Darkness], 1, 'Darkness');
		},
		Disarm() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Monk));
			this.player2.setWeapon(this.player2.newThing(this.Cards.Names.Dagger));
			this.player1.endturn();
			assert.ok(!this.player2.weapon, 'Disarmed');
			assert.equal(
				this.player2.hand[0].card,
				this.Cards.Names.Dagger,
				'In hand',
			);
		},
		Earthquake() {
			initHand(
				this.player1,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
			);
			for (let i = 0; i < 5; i++) {
				this.player1.hand[0].useactive();
			}
			assert.equal(this.player1.handIds.length, 3, 'handlength');
			const pillars = this.player1.permanents[0];
			assert.ok(pillars && pillars.getStatus('pillar'), 'ispillar');
			assert.equal(pillars.getStatus('charges'), 5, '5 charges');
			this.cast('earthquake', this.player2, pillars);
			assert.equal(pillars.getStatus('charges'), 2, '2 charges');
			this.cast('earthquake', this.player2, pillars);
			assert.ok(!this.player1.permanents[0], 'poof');
		},
		Eclipse() {
			this.initDeck(
				this.player1,
				this.Cards.Names.Ash,
				this.Cards.Names.Ash,
				this.Cards.Names.Ash,
			);
			this.initDeck(
				this.player2,
				this.Cards.Names.Ash,
				this.Cards.Names.Ash,
				this.Cards.Names.Ash,
			);
			for (let i = 0; i < 2; i++)
				this.player1.addCrea(
					this.player1.newThing(this.Cards.Names.MinorVampire.asUpped(true)),
				);
			this.player1.hp = 50;
			this.player1.endturn();
			this.player2.endturn();
			assert.equal(this.player2.hp, 92, "Noclipse dmg'd");
			assert.equal(this.player1.hp, 58, "Noclipse vamp'd");
			this.player1.addPerm(
				this.player1.newThing(this.Cards.Names.Nightfall.asUpped(true)),
			);
			this.player1.endturn();
			assert.equal(this.player2.hp, 80, "Eclipse dmg'd");
			assert.equal(this.player1.hp, 70, "Eclipse vamp'd");
			assert.equal(this.player1.creatures[0].truehp(), 4, "hp buff'd");
		},
		Gpull() {
			this.player2.addCrea(
				this.player2.newThing(this.Cards.Names.ColossalDragon),
			);
			this.player2.gpull = this.player2.creatureIds[0];
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Scorpion));
			this.initDeck(this.player2, this.Cards.Names.ColossalDragon);
			this.player1.endturn();
			assert.equal(
				this.game.get(this.player2.gpull).get('hp'),
				24,
				'dmg redirected',
			);
			assert.equal(
				this.game.getStatus(this.player2.gpull, 'poison'),
				1,
				'psn redirected',
			);
			this.game.byId(this.player2.gpull).die();
			assert.ok(!this.player2.gpull, 'gpull death poof');
		},
		Hope() {
			this.player1.setShield(this.player1.newThing(this.Cards.Names.Hope));
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Photon));
			for (let i = 0; i < 3; i++) {
				this.player1.addCrea(
					this.player1.newThing(this.Cards.Names.Photon.asUpped(true)),
				);
			}
			this.player1.endturn();
			assert.equal(this.player1.shield.truedr(), 3, 'DR');
			assert.equal(this.player1.quanta[etg.Light], 4, 'RoL');
		},
		Lobotomize() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Scorpion));
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Abomination));
			const [scorp, abom] = this.player1.creatures;
			assert.ok(scorp.active.size, 'Scorp Skills');
			assert.ok(abom.active.size, 'Abom Skills');
			this.cast('lobotomize', scorp, scorp);
			this.cast('lobotomize', abom, abom);
			assert.ok(!scorp.active.size, 'Scorp no more');
			assert.ok(abom.active.size, 'Abom still');
		},
		Obsession() {
			initHand(
				this.player1,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
			);
			this.player1.endturn(this.player1.handIds[0]);
			assert.equal(this.player1.hp, 90, 'Damage');
			assert.equal(this.player1.handIds.length, 7, 'Discarded');
		},
		Parallel() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Dragonfly));
			const damsel = this.player1.creatures[0];
			this.cast('parallel', damsel, damsel);
			assert.equal(
				this.player1.creatures[1].card,
				this.Cards.Names.Dragonfly,
				"PU'd",
			);
			this.cast('web', this.player1, damsel);
			assert.ok(
				!damsel.getStatus('airborne') &&
					this.player1.creatures[1].getStatus('airborne'),
				"Web'd",
			);
		},
		Phoenix() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Phoenix));
			const phoenix = this.player1.creatures[0];
			assert.equal(
				this.player1.creatures[0].card,
				this.Cards.Names.Phoenix,
				'Phoenix',
			);
			this.cast('lightning', this.player1, phoenix);
			assert.equal(this.player1.creatures[0].card, this.Cards.Names.Ash, 'Ash');
		},
		Plague() {
			this.player1.setQuanta(etg.Death, 8);
			initHand(this.player1, this.Cards.Names.Plague);
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Rustler));
			this.player1.hand[0].useactive(this.player1);
			assert.ok(
				this.player1.creatures[0].getStatus('poison'),
				'Poisoned Rustler',
			);
			this.player1.endturn();
			assert.ok(!this.player1.creatureIds[0], 'No Rustler');
		},
		Purify() {
			this.cast('poison 3', this.player1, this.player2);
			assert.equal(this.player2.getStatus('poison'), 3, '3');
			this.cast('poison 3', this.player1, this.player2);
			assert.equal(this.player2.getStatus('poison'), 6, '6');
			this.cast('purify', this.player1, this.player2);
			assert.equal(this.player2.getStatus('poison'), -2, '-2');
			this.cast('purify', this.player1, this.player2);
			assert.equal(this.player2.getStatus('poison'), -4, '-4');
		},
		Reflect() {
			this.cast('lightning', this.player1, this.player2);
			assert.ok(
				this.player1.hp === 100 && this.player2.hp === 95,
				'Plain spell',
			);
			this.player2.setShield(
				this.player2.newThing(this.Cards.Names.MirrorShield),
			);
			this.cast('lightning', this.player1, this.player2);
			assert.ok(
				this.player1.hp === 95 && this.player2.hp === 95,
				'Reflected spell',
			);
			this.player1.setShield(
				this.player1.newThing(this.Cards.Names.MirrorShield),
			);
			this.cast('lightning', this.player1, this.player2);
			assert.ok(
				this.player1.hp === 90 && this.player2.hp === 95,
				'Unreflected reflected spell',
			);
		},
		Rustler() {
			this.player1.setQuanta(etg.Light, 3);
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Rustler));
			this.player1.endturn();
			this.player2.endturn();
			this.player1.creatures[0].useactive();
			this.player1.creatures[0].useactive();
			assert.equal(this.player1.quanta[etg.Light], 1, '1 Light');
			assert.equal(this.player1.quanta[etg.Life], 4, '4 Life');
		},
		Steal() {
			this.player1.setShield(this.player1.newThing(this.Cards.Names.BoneWall));
			this.player1.shield.setStatus('charges', 3);
			this.cast('steal', this.player2, this.player1.shield);
			assert.ok(
				this.player1.shield && this.player1.shield.getStatus('charges') === 2,
				'Wish bones',
			);
			assert.ok(
				this.player2.shield && this.player2.shield.getStatus('charges') === 1,
				'stole 1',
			);
			this.cast('steal', this.player2, this.player1.shield);
			assert.ok(
				this.player1.shield && this.player1.shield.getStatus('charges') === 1,
				'Lone bone',
			);
			assert.ok(
				this.player2.shield && this.player2.shield.getStatus('charges') === 1,
				'stole 2',
			);
			this.cast('steal', this.player2, this.player1.shield);
			assert.ok(!this.player1.shield, 'This town is all in hell');
			assert.ok(
				this.player2.shield && this.player2.shield.getStatus('charges') === 1,
				'stole 3',
			);
		},
		Steam() {
			this.player1.addCrea(
				this.player1.newThing(this.Cards.Names.SteamMachine),
			);
			const steam = this.player1.creatures[0];
			this.player1.setQuanta(etg.Fire, 8);
			steam.casts = 1;
			assert.equal(steam.trueatk(), 0, '0');
			steam.useactive();
			assert.equal(steam.trueatk(), 5, '5');
			steam.attack();
			assert.equal(steam.trueatk(), 4, '4');
		},
		TimeBarrier() {
			const barrier = this.player2.newThing(this.Cards.Names.TimeBarrier);
			this.player2.shieldId = barrier.id;
			this.player1.endturn();
			assert.equal(barrier.getStatus('charges'), 5, 'No charge on drawstep');
			this.cast('hasten', this.player2);
			assert.equal(barrier.getStatus('charges'), 6, 'Yes charge on hasten');
			this.cast('hasten', this.player2);
			this.cast('hasten', this.player2);
			this.cast('hasten', this.player2);
			assert.equal(barrier.getStatus('charges'), 9, '9 charges');
			this.cast('hasten', this.player2);
			assert.equal(barrier.getStatus('charges'), 9, 'No more');
			this.player2.endturn();
			this.player1.endturn();
			this.cast('hasten', this.player2);
			assert.equal(barrier.getStatus('charges'), 10, 'New turn, now 10');
		},
		TransformNoSick() {
			this.player1.setQuanta(etg.Entropy, 8);
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Pixie));
			const pixie = this.player1.creatures[0];
			pixie.casts = 1;
			pixie.transform(this.Cards.Names.Pixie);
			assert.ok(pixie.canactive(), 'canactive');
		},
		Voodoo() {
			const voodoo = this.player1.newThing(this.Cards.Names.VoodooDoll);
			this.player1.addCrea(voodoo);
			this.cast('lightning', voodoo, voodoo);
			this.cast('infect', voodoo, voodoo);
			assert.equal(voodoo.hp, 11, 'dmg');
			assert.equal(this.player2.hp, 95, 'foe dmg');
			assert.equal(voodoo.getStatus('poison'), 1, 'psn');
			assert.equal(this.player2.getStatus('poison'), 1, 'foe psn');
			this.cast('holylight', voodoo, voodoo);
			assert.equal(voodoo.hp, 1, 'holy dmg');
			assert.equal(this.player2.hp, 85, 'foe holy dmg');
		},
		Whim() {
			this.player1.deckIds = [];
			const whim = this.player1.newThing(this.Cards.Names.Whim),
				tstorm = this.player1.newThing(this.Cards.Names.Thunderstorm),
				dfly = this.player1.newThing(this.Cards.Names.Dragonfly);
			this.player1.addCrea(whim);
			this.player1.deckpush(dfly.id);
			this.player1.setQuanta(etg.Air, 3);
			this.player1.addCard(tstorm);
			whim.useactive(tstorm);
			assert.ok(~this.player1.deckIds.indexOf(tstorm.id), 'Storm on deck');
			assert.ok(~this.player1.handIds.indexOf(dfly.id), 'Fly in hand');
		},
	},
);

test(
	'Card Codes',
	{},
	{
		OriginalCodesUnique() {
			const codes = new Set();
			for (const cdata of OriginalCjson) {
				let codecol = cdata[0].indexOf('Code');
				for (let j = 1; j < cdata.length; j++) {
					const cdataj = cdata[j];
					for (const cdatajk of cdata[j]) {
						assert.equal(cdata[0].length, cdatajk.length);
						const code = cdatajk[codecol];
						assert.ok(!codes.has(code), 'Duplicate code: ' + code);
						codes.add(code);
					}
				}
			}
		},
		OriginalUppedAlignment() {
			for (let key in OriginalCards.Codes) {
				key |= 0;
				if (!key) continue;
				const un = etgutil.asUpped(key, false),
					up = etgutil.asUpped(key, true);
				assert.ok(OriginalCards.Codes[un] && OriginalCards.Codes[up], key);
				const card = OriginalCards.Codes[key];
				if (card.type === etg.Spell) assert.ok(card.active.get('cast'));
			}
		},
	},
);
test(
	'Original Cards',
	{
		beforeEach() {
			const data = {
				seed: 5489,
				set: 'Original',
				players: [
					{ idx: 1, deck: '1012c' },
					{ idx: 2, deck: '1012c' },
				],
			};
			this.game = new Game(data);
			this.Cards = this.game.Cards;
			this.cast = (skill, ...args) =>
				parseSkill(skill).func(this.game, ...args);
			this.initDeck = (pl, ...args) =>
				(pl.deckIds = args.map(x => pl.newThing(x).id));
			this.player1 = this.game.byId(this.game.players[0]);
			this.player2 = this.game.byId(this.game.players[1]);
			this.player1.handIds = this.player2.handIds = [];
			this.player1Id = this.player1.id;
			this.player2Id = this.player2.id;
			this.game.phase = etg.PlayPhase;
			this.player1.mark = this.player2.mark = etg.Entropy;
		},
	},
	{
		Adrenaline() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Devourer));
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.HornedFrog));
			this.player1.addCrea(
				this.player1.newThing(this.Cards.Names.CrimsonDragon.asUpped(true)),
			);
			for (let i = 0; i < 3; i++)
				this.player1.creatures[i].setStatus('adrenaline', 1);
			this.player2.setQuanta(etg.Life, 3);
			this.player1.endturn();
			assert.equal(this.player2.hp, 68, 'dmg');
			assert.equal(this.player1.quanta[etg.Darkness], 2, 'Absorbed');
			assert.equal(this.player2.quanta[etg.Life], 1, 'Lone Life');
		},
		Aflatoxin() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Devourer));
			this.cast('v_aflatoxin', this.player1, this.player1.creatures[0]);
			this.player1.creatures[0].die();
			assert.ok(this.player1.creatures[0], 'Something');
			assert.equal(
				this.player1.creatures[0].card.code,
				this.Cards.Names.MalignantCell.code,
				'Malignant',
			);
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Phoenix));
			this.cast('v_aflatoxin', this.player1, this.player1.creatures[1]);
			this.player1.creatures[1].die();
			assert.equal(
				this.player1.creatures[1].card.code,
				this.Cards.Names.MalignantCell.code,
				'Malignant, not Ash',
			);
		},
		BoneWall() {
			this.player1.setQuanta(etg.Death, 8);
			initHand(this.player1, this.Cards.Names.BoneWall);
			this.player1.hand[0].useactive();
			this.player2.addCrea(
				this.player2.newThing(this.Cards.Names.CrimsonDragon),
			);
			this.player2.addCrea(
				this.player2.newThing(this.Cards.Names.CrimsonDragon),
			);
			this.player2.addCrea(
				this.player2.newThing(this.Cards.Names.CrimsonDragon),
			);
			assert.ok(this.player1.shield, 'BW exists?');
			this.player1.endturn();
			this.player2.endturn();
			assert.ok(this.player1.shield, 'BW exists');
			assert.equal(this.player1.shield.status.get('charges'), 4, '4 charges');
			this.player2.creatures[0].die();
			assert.equal(this.player1.shield.status.get('charges'), 6, '6 charges');
		},
		Boneyard() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Devourer));
			this.player1.addPerm(this.player1.newThing(this.Cards.Names.Boneyard));
			this.player1.creatures[0].die();
			assert.ok(this.player1.creatures[0], 'Something');
			assert.equal(
				this.player1.creatures[0].card,
				this.Cards.Names.Skeleton,
				'Skeleton',
			);
		},
		Deckout() {
			this.player2.deckIds = [];
			this.player1.endturn();
			assert.equal(this.game.winner, this.player1Id);
		},
		Destroy() {
			this.player1.setQuanta(etg.Death, 10);
			initHand(
				this.player1,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.SoulCatcher,
				this.Cards.Names.Shield,
				this.Cards.Names.Dagger,
			);
			while (this.player1.hand.length) {
				this.player1.hand[0].useactive();
			}
			assert.equal(
				this.player1.permanents[0].status.get('charges'),
				2,
				'2 charges',
			);
			this.cast('v_destroy', this.player2, this.player1.permanents[0]);
			assert.equal(
				this.player1.permanents[0].status.get('charges'),
				1,
				'1 charge',
			);
			this.cast('v_destroy', this.player2, this.player1.permanents[0]);
			assert.ok(!this.player1.permanents[0], 'poof');
			assert.equal(
				this.player1.permanents[1].card,
				this.Cards.Names.SoulCatcher,
				'SoulCatcher',
			);
			this.cast('v_destroy', this.player2, this.player1.permanents[1]);
			assert.ok(!this.player1.permanents[1], 'SoulCatcher gone');
			assert.equal(this.player1.shield.card, this.Cards.Names.Shield, 'Shield');
			this.cast('v_destroy', this.player2, this.player1.shield);
			assert.ok(!this.player1.shield, 'Shield gone');
			assert.equal(this.player1.weapon.card, this.Cards.Names.Dagger, 'Dagger');
			this.cast('v_destroy', this.player2, this.player1.weapon);
			assert.ok(!this.player1.weapon, 'Dagger gone');
			initHand(this.player1, this.Cards.Names.BoneWall);
			this.player1.hand[0].useactive();
			assert.equal(this.player1.shield.status.get('charges'), 7, '7 bones');
			this.cast('v_destroy', this.player2, this.player1.shield);
			assert.equal(this.player1.shield.status.get('charges'), 6, '6 bones');
			for (let i = 0; i < 6; i++) {
				this.cast('v_destroy', this.player2, this.player1.shield);
			}
			assert.ok(!this.player1.shield, 'This town is all in hell');
		},
		Devourer() {
			const dev = this.player1.newThing(this.Cards.Names.Devourer);
			this.player1.addCrea(dev);
			this.player2.setQuanta(etg.Light, 1);
			this.player1.endturn();
			assert.equal(this.player2.quanta[etg.Light], 0, 'Light');
			assert.equal(this.player1.quanta[etg.Darkness], 1, 'Darkness');
			this.player1.setQuanta(etg.Earth, 2);
			this.cast('v_bless', this.player1, dev);
			assert.equal(dev.trueatk(), 3, 'Blessed to 3|2');
			dev.useactive();
			assert.equal(dev.trueatk(), 1, 'Burrow halved to 1|2');
			dev.casts = 1;
			dev.useactive();
			assert.equal(dev.trueatk(), 2, 'Unburrow doubled to 2|2');
			dev.casts = 1;
			dev.useactive();
			assert.equal(dev.trueatk(), 1, 'Burrow halved again to 1|2');
			this.player1.addPerm(
				this.player1.newThing(this.Cards.Names.Nightfall.asUpped(true)),
			);
			assert.equal(dev.trueatk(), 3, 'Eclipse brings to 3|2');
			dev.casts = 1;
			dev.useactive();
			assert.equal(dev.trueatk(), 4, 'Eclipse brings to 4|2 after unburrow');
		},
		Earthquake() {
			initHand(
				this.player1,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
				this.Cards.Names.AmethystPillar,
			);
			for (let i = 0; i < 5; i++) {
				this.player1.hand[0].useactive();
			}
			assert.equal(this.player1.hand.length, 3, 'handlength');
			const pillars = this.player1.permanents[0];
			assert.ok(pillars && pillars.getStatus('pillar'), 'ispillar');
			assert.equal(pillars.status.get('charges'), 5, '5 charges');
			this.cast('v_earthquake', this.player2, pillars);
			assert.equal(pillars.status.get('charges'), 2, '2 charges');
			this.cast('v_earthquake', this.player2, pillars);
			assert.ok(!this.player1.permanents[0], 'poof');
		},
		Eclipse() {
			this.initDeck(
				this.player1,
				this.Cards.Names.Ash,
				this.Cards.Names.Ash,
				this.Cards.Names.Ash,
			);
			this.initDeck(
				this.player2,
				this.Cards.Names.Ash,
				this.Cards.Names.Ash,
				this.Cards.Names.Ash,
			);
			for (let i = 0; i < 2; i++)
				this.player1.addCrea(
					this.player1.newThing(this.Cards.Names.MinorVampire.asUpped(true)),
				);
			this.player1.hp = 50;
			this.player1.endturn();
			this.player2.endturn();
			assert.equal(this.player2.hp, 92, "Noclipse dmg'd");
			assert.equal(this.player1.hp, 58, "Noclipse vamp'd");
			this.player1.addPerm(
				this.player1.newThing(this.Cards.Names.Nightfall.asUpped(true)),
			);
			this.player1.endturn();
			assert.equal(this.player2.hp, 80, "Eclipse dmg'd");
			assert.equal(this.player1.hp, 70, "Eclipse vamp'd");
			assert.equal(this.player1.creatures[0].truehp(), 4, "hp buff'd");
		},
		Gpull() {
			this.player2.addCrea(
				this.player2.newThing(this.Cards.Names.ColossalDragon),
			);
			this.player2.gpull = this.player2.creatureIds[0];
			this.player1.addCrea(
				this.player1.newThing(this.Cards.Names.ForestScorpion),
			);
			this.player1.endturn();
			assert.equal(
				this.game.get(this.player2.gpull).get('hp'),
				14,
				'dmg redirected',
			);
			assert.equal(
				this.game.getStatus(this.player2.gpull, 'poison'),
				0,
				'psn not redirected',
			);
			this.game.byId(this.player2.gpull).die();
			assert.ok(!this.player2.gpull, 'gpull death poof');
		},
		Hope() {
			this.player1.setShield(this.player1.newThing(this.Cards.Names.Hope));
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Photon));
			for (let i = 0; i < 3; i++) {
				this.player1.addCrea(
					this.player1.newThing(this.Cards.Names.Photon.asUpped(true)),
				);
			}
			this.player1.endturn();
			assert.equal(this.player1.shield.truedr(), 3, 'DR');
			assert.equal(this.player1.quanta[etg.Light], 3, 'RoL');
		},
		Lobotomize() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Devourer));
			const dev = this.player1.creatures[0];
			assert.ok(dev.active.get('ownattack'), 'Siphon');
			assert.ok(dev.active.get('cast'), 'Burrow');
			this.cast('v_lobotomize', this.player1, dev);
			assert.ok(dev.active.get('ownattack'), 'Siphon');
			assert.ok(!dev.active.get('cast'), 'No Burrow');
		},
		Obsession() {
			initHand(
				this.player1,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
				this.Cards.Names.GhostofthePast,
			);
			this.player1.endturn(this.player1.handIds[0]);
			assert.equal(this.player1.hp, 90, 'Damage');
			assert.equal(this.player1.hand.length, 7, 'Discarded');
		},
		Parallel() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Dragonfly));
			const damsel = this.player1.creatures[0];
			this.cast('v_parallel', damsel, damsel);
			assert.equal(
				this.player1.creatures[1].card,
				this.Cards.Names.Dragonfly,
				"PU'd",
			);
			this.cast('v_web', this.player1, damsel);
			assert.ok(
				!damsel.getStatus('airborne') &&
					this.player1.creatures[1].getStatus('airborne'),
				"Web'd",
			);
		},
		Phoenix() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.Phoenix));
			const phoenix = this.player1.creatures[0];
			assert.equal(
				this.player1.creatures[0].card,
				this.Cards.Names.Phoenix,
				'Phoenix',
			);
			this.cast('v_lightning', this.player1, phoenix);
		},
		Purify() {
			this.cast('v_poison3', this.player1);
			assert.equal(this.player2.status.get('poison'), 3, '3');
			this.cast('v_poison3', this.player1, this.player2);
			assert.equal(this.player2.status.get('poison'), 6, '6');
			this.cast('v_purify', this.player1, this.player2);
			assert.equal(this.player2.status.get('poison'), -2, '-2');
			this.cast('v_purify', this.player1, this.player2);
			assert.equal(this.player2.status.get('poison'), -4, '-4');
		},
		Reflect() {
			this.cast('v_lightning', this.player1, this.player2);
			assert.ok(this.player1.hp == 100 && this.player2.hp == 95, 'Plain spell');
			this.player2.setShield(
				this.player2.newThing(this.Cards.Names.ReflectiveShield),
			);
			this.cast('v_lightning', this.player1, this.player2);
			assert.ok(
				this.player1.hp == 95 && this.player2.hp == 95,
				'Reflected spell',
			);
			this.player1.setShield(
				this.player1.newThing(this.Cards.Names.ReflectiveShield),
			);
			this.cast('v_lightning', this.player1, this.player2);
			assert.ok(
				this.player1.hp == 90 && this.player2.hp == 95,
				'Unreflected reflected spell',
			);
		},
		Scarab() {
			const scarabs = [
				this.player1.newThing(this.Cards.Names.Scarab),
				this.player1.newThing(this.Cards.Names.Scarab),
				this.player1.newThing(this.Cards.Names.Scarab),
			];
			this.player1.addCrea(scarabs[0]);
			this.player1.addCrea(scarabs[1]);
			assert.equal(scarabs[0].truehp(), 1);
			this.player1.endturn();
			assert.equal(scarabs[0].truehp(), 2);
			this.player1.addCrea(scarabs[2]);
			assert.equal(scarabs[0].truehp(), 2);
			this.cast('v_devour', scarabs[0], scarabs[2]);
			assert.equal(scarabs[0].truehp(), 3);
			this.player1.endturn();
			assert.equal(scarabs[0].truehp(), 3);
			assert.equal(scarabs[1].truehp(), 2);
		},
		Steal() {
			this.player1.setShield(this.player1.newThing(this.Cards.Names.BoneWall));
			this.player1.shield.setStatus('charges', 3);
			this.cast('v_steal', this.player2, this.player1.shield);
			assert.ok(
				this.player1.shield && this.player1.shield.status.get('charges') == 2,
				'Wish bones',
			);
			assert.ok(
				this.player2.shield && this.player2.shield.status.get('charges') == 1,
				'stole 1',
			);
			this.cast('v_steal', this.player2, this.player1.shield);
			assert.ok(
				this.player1.shield && this.player1.shield.status.get('charges') == 1,
				'Lone bone',
			);
			assert.ok(
				this.player2.shield && this.player2.shield.status.get('charges') == 2,
				'stole 2',
			);
			this.cast('v_steal', this.player2, this.player1.shield);
			assert.ok(!this.player1.shield, 'This town is all in hell');
			assert.ok(
				this.player2.shield && this.player2.shield.status.get('charges') == 3,
				'stole 3',
			);
		},
		Steam() {
			this.player1.addCrea(
				this.player1.newThing(this.Cards.Names.SteamMachine),
			);
			const steam = this.player1.creatures[0];
			this.player1.setQuanta(etg.Fire, 8);
			steam.casts = 1;
			assert.equal(steam.trueatk(), 0, '0');
			steam.useactive();
			assert.equal(steam.trueatk(), 5, '5');
			steam.attack();
			assert.equal(steam.trueatk(), 4, '4');
		},
		Voodoo() {
			this.player1.addCrea(this.player1.newThing(this.Cards.Names.VoodooDoll));
			const voodoo = this.player1.creatures[0];
			this.cast('v_lightning', this.player1, voodoo);
			this.cast('v_infect', this.player1, voodoo);
			assert.equal(voodoo.hp, 11, 'dmg');
			assert.equal(this.player2.hp, 95, 'foe dmg');
			assert.equal(voodoo.status.get('poison'), 1, 'psn');
			assert.equal(this.player2.status.get('poison'), 1, 'foe psn');
			this.cast('v_holylight', this.player1, voodoo);
			assert.equal(voodoo.hp, 1, 'holy dmg');
			assert.equal(this.player2.hp, 85, 'foe holy dmg');
		},
	},
);
