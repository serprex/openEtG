#!/usr/bin/env node
'use strict';
const assert = require('assert'),
	etg = require('./etg'),
	Game = require('./Game'),
	etgutil = require('../etgutil'),
	Actives = require('./Skills'),
	Cards = require('./Cards');
function initHand(pl, ...args) {
	for (let i = 0; i < args.length; i++) {
		pl.hand[i] = new etg.CardInstance(args[i], pl);
	}
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
		console.log('pass ', name);
	}
}
let M = new TestModule('Upped Alignment');
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
	beforeEach: function() {
		this.game = new Game(5489);
		this.player1 = this.game.player1;
		this.player2 = this.game.player2;
		this.game.turn = this.player1;
		this.player1.mark = this.player2.mark = etg.Entropy;
		this.player1.deck = [
			Cards.AmethystPillar,
			Cards.AmethystPillar,
			Cards.AmethystPillar,
		];
		this.player2.deck = [Cards.BonePillar, Cards.BonePillar, Cards.BonePillar];
	},
});
M.test('Adrenaline', function() {
	(this.player1.creatures[0] = new etg.Creature(
		Cards.Devourer,
		this.player1,
	)).status.adrenaline = 1;
	(this.player1.creatures[1] = new etg.Creature(
		Cards.HornedFrog,
		this.player1,
	)).status.adrenaline = 1;
	(this.player1.creatures[2] = new etg.Creature(
		Cards.CrimsonDragon.asUpped(true),
		this.player1,
	)).status.adrenaline = 1;
	this.player2.quanta[etg.Life] = 3;
	this.player1.endturn();
	assert.equal(this.player2.hp, 68, 'dmg ' + this.player2.hp);
	assert.equal(this.player1.quanta[etg.Darkness], 2, 'Absorbed');
	assert.equal(this.player2.quanta[etg.Life], 1, 'Lone Life');
});
M.test('Aflatoxin', function() {
	(this.player1.creatures[0] = new etg.Creature(
		Cards.Devourer,
		this.player1,
	)).status.aflatoxin = true;
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], 'Something');
	assert.equal(
		this.player1.creatures[0].card,
		Cards.MalignantCell,
		'Malignant',
	);
});
M.test('BoneWall', function() {
	this.player1.quanta[etg.Death] = 10;
	initHand(this.player1, Cards.BoneWall);
	this.player1.hand[0].useactive();
	new etg.Creature(Cards.CrimsonDragon, this.player2).place();
	new etg.Creature(Cards.CrimsonDragon, this.player2).place();
	new etg.Creature(Cards.CrimsonDragon, this.player2).place();
	this.player1.endturn();
	this.player2.endturn();
	assert.ok(this.player1.shield, 'BW exists');
	assert.equal(this.player1.shield.status.charges, 4, '4 charges');
	this.player2.creatures[0].die();
	assert.equal(this.player1.shield.status.charges, 6, '6 charges');
});
M.test('Boneyard', function() {
	new etg.Creature(Cards.Devourer, this.player1).place();
	new etg.Permanent(Cards.Boneyard, this.player1).place();
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], 'Something');
	assert.equal(this.player1.creatures[0].card, Cards.Skeleton, 'Skeleton');
});
M.test('Deckout', function() {
	this.player2.deck.length = 0;
	this.player1.endturn();
	assert.equal(this.game.winner, this.player1);
});
M.test('Destroy', function() {
	this.player1.quanta[etg.Death] = 10;
	initHand(
		this.player1,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
		Cards.SoulCatcher,
		Cards.Shield,
		Cards.Dagger,
	);
	while (this.player1.hand.length) {
		this.player1.hand[0].useactive();
	}
	assert.equal(this.player1.permanents[0].status.charges, 2, '2 charges');
	Actives.destroy.func(this.player2, this.player1.permanents[0]);
	assert.equal(this.player1.permanents[0].status.charges, 1, '1 charge');
	Actives.destroy.func(this.player2, this.player1.permanents[0]);
	assert.ok(!this.player1.permanents[0], 'poof');
	assert.equal(
		this.player1.permanents[1].card,
		Cards.SoulCatcher,
		'SoulCatcher',
	);
	Actives.destroy.func(this.player2, this.player1.permanents[1]);
	assert.ok(!this.player1.permanents[1], 'SoulCatcher gone');
	assert.equal(this.player1.shield.card, Cards.Shield, 'Shield');
	Actives.destroy.func(this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, 'Shield gone');
	assert.equal(this.player1.weapon.card, Cards.Dagger, 'Dagger');
	Actives.destroy.func(this.player2, this.player1.weapon);
	assert.ok(!this.player1.weapon, 'Dagger gone');
	initHand(this.player1, Cards.BoneWall);
	this.player1.hand[0].useactive();
	assert.equal(this.player1.shield.status.charges, 7, '7 bones');
	Actives.destroy.func(this.player2, this.player1.shield);
	assert.equal(this.player1.shield.status.charges, 6, '6 bones');
	for (let i = 0; i < 6; i++) {
		Actives.destroy.func(this.player2, this.player1.shield);
	}
	assert.ok(!this.player1.shield, 'This town is all in hell');
});
M.test('Devourer', function() {
	new etg.Creature(Cards.Devourer, this.player1).place();
	this.player2.quanta[etg.Light] = 1;
	this.player1.endturn();
	assert.equal(this.player2.quanta[etg.Light], 0, 'Light');
	assert.equal(this.player1.quanta[etg.Darkness], 1, 'Darkness');
});
M.test('Earthquake', function() {
	initHand(
		this.player1,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
	);
	for (let i = 0; i < 5; i++) {
		this.player1.hand[0].useactive();
	}
	assert.equal(this.player1.hand.length, 3, 'handlength');
	const pillars = this.player1.permanents[0];
	assert.ok(pillars instanceof etg.Pillar, 'ispillar');
	assert.equal(pillars.status.charges, 5, '5 charges');
	Actives.earthquake.func(this.player2, pillars);
	assert.equal(pillars.status.charges, 2, '2 charges');
	Actives.earthquake.func(this.player2, pillars);
	assert.ok(!this.player1.permanents[0], 'poof');
});
M.test('Eclipse', function() {
	this.player1.deck = [Cards.Ash, Cards.Ash, Cards.Ash];
	this.player2.deck = [Cards.Ash, Cards.Ash, Cards.Ash];
	for (let i = 0; i < 2; i++)
		new etg.Creature(Cards.MinorVampire.asUpped(true), this.player1).place();
	this.player1.hp = 50;
	this.player1.endturn();
	this.player2.endturn();
	assert.equal(this.player2.hp, 92, "Noclipse dmg'd");
	assert.equal(this.player1.hp, 58, "Noclipse vamp'd");
	this.player1.permanents[0] = new etg.Permanent(
		Cards.Nightfall.asUpped(true),
		this.player1,
	);
	this.player1.endturn();
	assert.equal(this.player2.hp, 80, "Eclipse dmg'd");
	assert.equal(this.player1.hp, 70, "Eclipse vamp'd");
	assert.equal(this.player1.creatures[0].truehp(), 4, "hp buff'd");
});
M.test('Gpull', function() {
	new etg.Creature(Cards.ColossalDragon.asUpped(true), this.player2).place();
	this.player2.gpull = this.player2.creatures[0];
	new etg.Creature(Cards.ForestScorpion, this.player1).place();
	this.player1.endturn();
	assert.equal(this.player2.gpull.hp, 29, 'dmg redirected');
	assert.equal(
		this.player2.gpull.status.poison,
		undefined,
		'psn not redirected',
	);
	this.player2.gpull.die();
	assert.ok(!this.player2.gpull, 'gpull death poof');
});
M.test('Hope', function() {
	this.player1.shield = new etg.Shield(Cards.Hope, this.player1);
	new etg.Creature(Cards.Photon, this.player1).place();
	for (let i = 0; i < 3; i++) {
		new etg.Creature(Cards.Photon.asUpped(true), this.player1).place();
	}
	this.player1.endturn();
	assert.equal(this.player1.shield.dr, 3, 'DR');
	assert.equal(this.player1.quanta[etg.Light], 3, 'RoL');
});
M.test('Lobotomize', function() {
	const dev = new etg.Creature(Cards.Devourer, this.player1);
	assert.ok(dev.active.auto, 'Siphon');
	assert.ok(dev.active.cast, 'Burrow');
	Actives.lobotomize.func(this.player1, dev);
	assert.ok(dev.active.auto, 'Siphon');
	assert.ok(!dev.active.cast, 'No Burrow');
});
M.test('Obsession', function() {
	initHand(
		this.player1,
		Cards.GhostofthePast,
		Cards.GhostofthePast,
		Cards.GhostofthePast,
		Cards.GhostofthePast,
		Cards.GhostofthePast,
		Cards.GhostofthePast,
		Cards.GhostofthePast,
		Cards.GhostofthePast,
	);
	this.player1.endturn(0);
	assert.equal(this.player1.hp, 90, 'Damage');
	assert.equal(this.player1.hand.length, 7, 'Discarded');
});
M.test('Parallel', function() {
	const damsel = new etg.Creature(Cards.Dragonfly.asUpped(true), this.player1);
	damsel.place();
	Actives.parallel.func(this.player1, damsel);
	assert.equal(
		this.player1.creatures[1].card,
		Cards.Dragonfly.asUpped(true),
		"PU'd",
	);
	Actives.web.func(this.player1, damsel);
	assert.ok(
		!damsel.status.airborne && this.player1.creatures[1].status.airborne,
		"Web'd",
	);
});
M.test('Phoenix', function() {
	const phoenix = new etg.Creature(Cards.Phoenix, this.player1);
	phoenix.place();
	Actives.lightning.func(this.player1, phoenix);
	assert.equal(this.player1.creatures[0].card, Cards.Ash, 'Ash');
});
M.test('Purify', function() {
	Actives.poison3.func(this.player1);
	assert.equal(this.player2.status.poison, 3, '3');
	Actives.poison3.func(this.player1, this.player2);
	assert.equal(this.player2.status.poison, 6, '6');
	Actives.purify.func(this.player1, this.player2);
	assert.equal(this.player2.status.poison, -2, '-2');
	Actives.purify.func(this.player1, this.player2);
	assert.equal(this.player2.status.poison, -4, '-4');
});
M.test('Reflect', function() {
	Actives.lightning.func(this.player1, this.player2);
	assert.ok(this.player1.hp == 100 && this.player2.hp == 95, 'Plain spell');
	this.player2.shield = new etg.Shield(Cards.ReflectiveShield, this.player2);
	Actives.lightning.func(this.player1, this.player2);
	assert.ok(this.player1.hp == 95 && this.player2.hp == 95, 'Reflected spell');
	this.player1.shield = new etg.Shield(Cards.ReflectiveShield, this.player1);
	Actives.lightning.func(this.player1, this.player2);
	assert.ok(
		this.player1.hp == 90 && this.player2.hp == 95,
		'Unreflected reflected spell',
	);
});
M.test('Steal', function() {
	(this.player1.shield = new etg.Shield(
		Cards.BoneWall,
		this.player1,
	)).status.charges = 3;
	Actives.steal.func(this.player2, this.player1.shield);
	assert.ok(
		this.player1.shield && this.player1.shield.status.charges == 2,
		'Wish bones',
	);
	assert.ok(
		this.player2.shield && this.player2.shield.status.charges == 1,
		'stole 1',
	);
	Actives.steal.func(this.player2, this.player1.shield);
	assert.ok(
		this.player1.shield && this.player1.shield.status.charges == 1,
		'Lone bone',
	);
	assert.ok(
		this.player2.shield && this.player2.shield.status.charges == 2,
		'stole 2',
	);
	Actives.steal.func(this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, 'This town is all in hell');
	assert.ok(
		this.player2.shield && this.player2.shield.status.charges == 3,
		'stole 3',
	);
});
M.test('Steam', function() {
	const steam = new etg.Creature(Cards.SteamMachine, this.player1);
	steam.usedactive = false;
	steam.place();
	assert.equal(steam.trueatk(), 0, '0');
	steam.useactive();
	assert.equal(steam.trueatk(), 5, '5');
	steam.attack();
	assert.equal(steam.trueatk(), 4, '4');
});
M.test('Voodoo', function() {
	const voodoo = new etg.Creature(Cards.VoodooDoll, this.player1);
	voodoo.place();
	Actives.lightning.func(this.player1, voodoo);
	Actives.infect.func(this.player1, voodoo);
	assert.equal(voodoo.hp, 11, 'dmg');
	assert.equal(this.player2.hp, 95, 'foe dmg');
	assert.equal(voodoo.status.poison, 1, 'psn');
	assert.equal(this.player2.status.poison, 1, 'foe psn');
	Actives.holylight.func(this.player1, voodoo);
	assert.equal(voodoo.hp, 1, 'holy dmg');
	assert.equal(this.player2.hp, 85, 'foe holy dmg');
});
