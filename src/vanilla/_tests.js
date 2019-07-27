#!/usr/bin/env node

import assertSoft from 'assert';
const assert = assertSoft.strict;

import * as etg from '../etg.js';
import Game from '../Game.js';
import Cards from './Cards.js';
import parseSkill from '../parseSkill.js';
import * as etgutil from '../etgutil.js';
import Cjson from './Cards.json';

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
		func.call(ctx, this);
		console.log('pass', name);
	}
}
let M = new TestModule('Card Codes');
M.test('Codes Unique', function() {
	const codes = new Set();
	for (let i = 0; i < 6; i++) {
		let cdata = Cjson[i];
		let codecol = cdata[0].indexOf('Code');
		for (let j = 1; j < cdata.length; j++) {
			const cdataj = cdata[j];
			for (let k = 0; k < cdataj.length; k++) {
				const code = cdataj[k][codecol];
				assert.ok(!codes.has(code), 'Duplicate code: ' + code);
				codes.add(code);
			}
		}
	}
});
M.test('Upped Alignment', function() {
	for (let key in Cards.Codes) {
		key |= 0;
		if (!key) continue;
		const un = etgutil.asUpped(key, false),
			up = etgutil.asUpped(key, true);
		assert.ok(Cards.Codes[un] && Cards.Codes[up], key);
	}
});
M = new TestModule('Cards', {
	beforeEach() {
		const data = {
			seed: 5489,
			set: 'Original',
			players: [{ idx: 1, deck: '104vc' }, { idx: 2, deck: '104vc' }],
		};
		this.game = new Game(data);
		this.cast = (skill, ...args) => parseSkill(skill).func(this.game, ...args);
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
});
M.test('Adrenaline', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.Devourer));
	this.player1.addCrea(this.player1.newThing(Cards.Names.HornedFrog));
	this.player1.addCrea(
		this.player1.newThing(Cards.Names.CrimsonDragon.asUpped(true)),
	);
	for (let i = 0; i < 3; i++)
		this.player1.creatures[i].setStatus('adrenaline', 1);
	this.player2.setQuanta(etg.Life, 3);
	this.player1.endturn();
	assert.equal(this.player2.hp, 68, 'dmg');
	assert.equal(this.player1.quanta[etg.Darkness], 2, 'Absorbed');
	assert.equal(this.player2.quanta[etg.Life], 1, 'Lone Life');
});
M.test('Aflatoxin', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.Devourer));
	this.cast('v_aflatoxin', this.player1, this.player1.creatures[0]);
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], 'Something');
	assert.equal(
		this.player1.creatures[0].card,
		Cards.Names.MalignantCell,
		'Malignant',
	);
	this.player1.addCrea(this.player1.newThing(Cards.Names.Phoenix));
	this.cast('v_aflatoxin', this.player1, this.player1.creatures[1]);
	this.player1.creatures[1].die();
	assert.equal(
		this.player1.creatures[1].card,
		Cards.Names.MalignantCell,
		'Malignant, not Ash',
	);
});
M.test('BoneWall', function() {
	this.player1.setQuanta(etg.Death, 8);
	initHand(this.player1, Cards.Names.BoneWall);
	this.player1.hand[0].useactive();
	this.player2.addCrea(this.player2.newThing(Cards.Names.CrimsonDragon));
	this.player2.addCrea(this.player2.newThing(Cards.Names.CrimsonDragon));
	this.player2.addCrea(this.player2.newThing(Cards.Names.CrimsonDragon));
	assert.ok(this.player1.shield, 'BW exists?');
	this.player1.endturn();
	this.player2.endturn();
	assert.ok(this.player1.shield, 'BW exists');
	assert.equal(this.player1.shield.status.get('charges'), 4, '4 charges');
	this.player2.creatures[0].die();
	assert.equal(this.player1.shield.status.get('charges'), 6, '6 charges');
});
M.test('Boneyard', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.Devourer));
	this.player1.addPerm(this.player1.newThing(Cards.Names.Boneyard));
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], 'Something');
	assert.equal(
		this.player1.creatures[0].card,
		Cards.Names.Skeleton,
		'Skeleton',
	);
});
M.test('Deckout', function() {
	this.player2.deckIds = [];
	this.player1.endturn();
	assert.equal(this.game.winner, this.player1Id);
});
M.test('Destroy', function() {
	this.player1.setQuanta(etg.Death, 10);
	initHand(
		this.player1,
		Cards.Names.AmethystPillar,
		Cards.Names.AmethystPillar,
		Cards.Names.SoulCatcher,
		Cards.Names.Shield,
		Cards.Names.Dagger,
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
	assert.equal(this.player1.permanents[0].status.get('charges'), 1, '1 charge');
	this.cast('v_destroy', this.player2, this.player1.permanents[0]);
	assert.ok(!this.player1.permanents[0], 'poof');
	assert.equal(
		this.player1.permanents[1].card,
		Cards.Names.SoulCatcher,
		'SoulCatcher',
	);
	this.cast('v_destroy', this.player2, this.player1.permanents[1]);
	assert.ok(!this.player1.permanents[1], 'SoulCatcher gone');
	assert.equal(this.player1.shield.card, Cards.Names.Shield, 'Shield');
	this.cast('v_destroy', this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, 'Shield gone');
	assert.equal(this.player1.weapon.card, Cards.Names.Dagger, 'Dagger');
	this.cast('v_destroy', this.player2, this.player1.weapon);
	assert.ok(!this.player1.weapon, 'Dagger gone');
	initHand(this.player1, Cards.Names.BoneWall);
	this.player1.hand[0].useactive();
	assert.equal(this.player1.shield.status.get('charges'), 7, '7 bones');
	this.cast('v_destroy', this.player2, this.player1.shield);
	assert.equal(this.player1.shield.status.get('charges'), 6, '6 bones');
	for (let i = 0; i < 6; i++) {
		this.cast('v_destroy', this.player2, this.player1.shield);
	}
	assert.ok(!this.player1.shield, 'This town is all in hell');
});
M.test('Devourer', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.Devourer));
	this.player2.setQuanta(etg.Light, 1);
	this.player1.endturn();
	assert.equal(this.player2.quanta[etg.Light], 0, 'Light');
	assert.equal(this.player1.quanta[etg.Darkness], 1, 'Darkness');
});
M.test('Earthquake', function() {
	initHand(
		this.player1,
		Cards.Names.AmethystPillar,
		Cards.Names.AmethystPillar,
		Cards.Names.AmethystPillar,
		Cards.Names.AmethystPillar,
		Cards.Names.AmethystPillar,
		Cards.Names.AmethystPillar,
		Cards.Names.AmethystPillar,
		Cards.Names.AmethystPillar,
	);
	for (let i = 0; i < 5; i++) {
		this.player1.hand[0].useactive();
	}
	assert.equal(this.player1.hand.length, 3, 'handlength');
	const pillars = this.player1.permanents[0];
	assert.ok(pillars && pillars.card.type === etg.Pillar, 'ispillar');
	assert.equal(pillars.status.get('charges'), 5, '5 charges');
	this.cast('v_earthquake', this.player2, pillars);
	assert.equal(pillars.status.get('charges'), 2, '2 charges');
	this.cast('v_earthquake', this.player2, pillars);
	assert.ok(!this.player1.permanents[0], 'poof');
});
M.test('Eclipse', function() {
	this.initDeck(
		this.player1,
		Cards.Names.Ash,
		Cards.Names.Ash,
		Cards.Names.Ash,
	);
	this.initDeck(
		this.player2,
		Cards.Names.Ash,
		Cards.Names.Ash,
		Cards.Names.Ash,
	);
	for (let i = 0; i < 2; i++)
		this.player1.addCrea(
			this.player1.newThing(Cards.Names.MinorVampire.asUpped(true)),
		);
	this.player1.hp = 50;
	this.player1.endturn();
	this.player2.endturn();
	assert.equal(this.player2.hp, 92, "Noclipse dmg'd");
	assert.equal(this.player1.hp, 58, "Noclipse vamp'd");
	this.player1.addPerm(
		this.player1.newThing(Cards.Names.Nightfall.asUpped(true)),
	);
	this.player1.endturn();
	assert.equal(this.player2.hp, 80, "Eclipse dmg'd");
	assert.equal(this.player1.hp, 70, "Eclipse vamp'd");
	assert.equal(this.player1.creatures[0].truehp(), 4, "hp buff'd");
});
M.test('Gpull', function() {
	this.player2.addCrea(this.player2.newThing(Cards.Names.ColossalDragon));
	this.player2.gpull = this.player2.creatureIds[0];
	this.player1.addCrea(this.player1.newThing(Cards.Names.ForestScorpion));
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
});
M.test('Hope', function() {
	this.player1.setShield(this.player1.newThing(Cards.Names.Hope));
	this.player1.addCrea(this.player1.newThing(Cards.Names.Photon));
	for (let i = 0; i < 3; i++) {
		this.player1.addCrea(
			this.player1.newThing(Cards.Names.Photon.asUpped(true)),
		);
	}
	this.player1.endturn();
	assert.equal(this.player1.shield.truedr(), 3, 'DR');
	assert.equal(this.player1.quanta[etg.Light], 3, 'RoL');
});
M.test('Lobotomize', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.Devourer));
	const dev = this.player1.creatures[0];
	assert.ok(dev.active.get('ownattack'), 'Siphon');
	assert.ok(dev.active.get('cast'), 'Burrow');
	this.cast('v_lobotomize', this.player1, dev);
	assert.ok(dev.active.get('ownattack'), 'Siphon');
	assert.ok(!dev.active.get('cast'), 'No Burrow');
});
M.test('Obsession', function() {
	initHand(
		this.player1,
		Cards.Names.GhostofthePast,
		Cards.Names.GhostofthePast,
		Cards.Names.GhostofthePast,
		Cards.Names.GhostofthePast,
		Cards.Names.GhostofthePast,
		Cards.Names.GhostofthePast,
		Cards.Names.GhostofthePast,
		Cards.Names.GhostofthePast,
	);
	this.player1.endturn(this.player1.handIds[0]);
	assert.equal(this.player1.hp, 90, 'Damage');
	assert.equal(this.player1.hand.length, 7, 'Discarded');
});
M.test('Parallel', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.Dragonfly));
	const damsel = this.player1.creatures[0];
	this.cast('v_parallel', damsel, damsel);
	assert.equal(this.player1.creatures[1].card, Cards.Names.Dragonfly, "PU'd");
	this.cast('v_web', this.player1, damsel);
	assert.ok(
		!damsel.getStatus('airborne') &&
			this.player1.creatures[1].getStatus('airborne'),
		"Web'd",
	);
});
M.test('Phoenix', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.Phoenix));
	const phoenix = this.player1.creatures[0];
	assert.equal(this.player1.creatures[0].card, Cards.Names.Phoenix, 'Phoenix');
	this.cast('v_lightning', this.player1, phoenix);
});
M.test('Purify', function() {
	this.cast('v_poison3', this.player1);
	assert.equal(this.player2.status.get('poison'), 3, '3');
	this.cast('v_poison3', this.player1, this.player2);
	assert.equal(this.player2.status.get('poison'), 6, '6');
	this.cast('v_purify', this.player1, this.player2);
	assert.equal(this.player2.status.get('poison'), -2, '-2');
	this.cast('v_purify', this.player1, this.player2);
	assert.equal(this.player2.status.get('poison'), -4, '-4');
});
M.test('Reflect', function() {
	this.cast('v_lightning', this.player1, this.player2);
	assert.ok(this.player1.hp == 100 && this.player2.hp == 95, 'Plain spell');
	this.player2.setShield(this.player2.newThing(Cards.Names.ReflectiveShield));
	this.cast('v_lightning', this.player1, this.player2);
	assert.ok(this.player1.hp == 95 && this.player2.hp == 95, 'Reflected spell');
	this.player1.setShield(this.player1.newThing(Cards.Names.ReflectiveShield));
	this.cast('v_lightning', this.player1, this.player2);
	assert.ok(
		this.player1.hp == 90 && this.player2.hp == 95,
		'Unreflected reflected spell',
	);
});
M.test('Steal', function() {
	this.player1.setShield(this.player1.newThing(Cards.Names.BoneWall));
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
});
M.test('Steam', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.SteamMachine));
	const steam = this.player1.creatures[0];
	this.player1.setQuanta(etg.Fire, 8);
	steam.usedactive = false;
	assert.equal(steam.trueatk(), 0, '0');
	steam.useactive();
	assert.equal(steam.trueatk(), 5, '5');
	steam.attack();
	assert.equal(steam.trueatk(), 4, '4');
});
M.test('Voodoo', function() {
	this.player1.addCrea(this.player1.newThing(Cards.Names.VoodooDoll));
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
});
M.test('Scarab', function() {
	const scarabs = [
		this.player1.newThing(Cards.Names.Scarab),
		this.player1.newThing(Cards.Names.Scarab),
		this.player1.newThing(Cards.Names.Scarab),
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
});
