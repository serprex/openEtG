#!/usr/bin/env node
'use strict';
const assert = require('assert'),
	etg = require('../src/etg'),
	Game = require('../src/Game'),
	Cards = require('../src/Cards'),
	parseSkill = require('../src/parseSkill'),
	etgutil = require('../src/etgutil');

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
		console.log('pass ', name);
	}
}
let M = new TestModule('Card Codes');
M.test('Codes Unique', function() {
	const Cjson = require('../src/Cards.json');
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
	beforeEach: function() {
		this.game = new Game(5489);
		this.cast = (skill, ...args) => parseSkill(skill).func(this.game, ...args);
		this.initDeck = (...args) => args.map(x => this.game.newThing(x).id);
		this.player1 = this.game.player1;
		this.player2 = this.game.player2;
		this.player1Id = this.game.player1Id;
		this.player2Id = this.game.player2Id;
		this.game.turn = this.player1Id;
		this.game.phase = etg.PlayPhase;
		this.player1.mark = this.player2.mark = etg.Entropy;
		this.player1.deckIds = this.initDeck(
			Cards.AmethystPillar,
			Cards.AmethystPillar,
			Cards.AmethystPillar,
		);
		this.player2.deckIds = this.initDeck(
			Cards.BonePillar,
			Cards.BonePillar,
			Cards.BonePillar,
		);
	},
});
M.test('Adrenaline', function() {
	this.player1.addCrea(this.game.newThing(Cards.Devourer));
	this.player1.addCrea(this.game.newThing(Cards.HornedFrog));
	this.player1.addCrea(this.game.newThing(Cards.CrimsonDragon.asUpped(true)));
	for (let i = 0; i < 3; i++)
		this.player1.creatures[i].setStatus('adrenaline', 1);
	this.player2.setQuanta(etg.Life, 3);
	this.player1.endturn();
	assert.equal(this.player2.hp, 68, 'dmg');
	assert.equal(this.player1.quanta[etg.Darkness], 2, 'Absorbed');
	assert.equal(this.player2.quanta[etg.Life], 1, 'Lone Life');
});
M.test('Aflatoxin', function() {
	this.player1.addCrea(this.game.newThing(Cards.Devourer));
	this.cast('aflatoxin', this.player1, this.player1.creatures[0]);
	assert.ok(this.player1.creatures[0].getStatus('poison'), 'Is poisoned');
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], 'Something');
	assert.equal(
		this.player1.creatures[0].card,
		Cards.MalignantCell,
		'Malignant',
	);
	this.player1.addCrea(this.game.newThing(Cards.Phoenix));
	this.cast('aflatoxin', this.player1, this.player1.creatures[1]);
	this.player1.creatures[1].die();
	assert.equal(
		this.player1.creatures[1].card,
		Cards.MalignantCell,
		'Malignant, not Ash',
	);
});
M.test('BoneWall', function() {
	this.player1.setQuanta(etg.Death, 8);
	initHand(this.player1, Cards.BoneWall);
	this.player1.hand[0].useactive();
	this.player2.addCrea(this.game.newThing(Cards.CrimsonDragon));
	this.player2.addCrea(this.game.newThing(Cards.CrimsonDragon));
	this.player2.addCrea(this.game.newThing(Cards.CrimsonDragon));
	assert.ok(this.player1.shield, 'BW exists?');
	this.player1.endturn();
	this.player2.endturn();
	assert.ok(this.player1.shield, 'BW exists');
	assert.equal(this.player1.shield.getStatus('charges'), 4, '4 charges');
	this.player2.creatures[0].die();
	assert.equal(this.player1.shield.getStatus('charges'), 6, '6 charges');
});
M.test('Boneyard', function() {
	this.player1.addCrea(this.game.newThing(Cards.Devourer));
	this.player1.addPerm(this.game.newThing(Cards.Boneyard));
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], 'Something');
	assert.equal(this.player1.creatures[0].card, Cards.Skeleton, 'Skeleton');
});
M.test('Deckout', function() {
	this.player2.deckIds = [];
	this.player1.endturn();
	assert.equal(this.game.winner, this.player1Id);
});
M.test('Destroy', function() {
	this.game.turn = this.player1Id;
	this.player1.setQuanta(etg.Death, 10);
	initHand(
		this.player1,
		Cards.AmethystPillar,
		Cards.AmethystPillar,
		Cards.SoulCatcher,
		Cards.Shield,
		Cards.Dagger,
	);
	while (this.player1.handIds.length) {
		this.player1.hand[0].useactive();
	}
	assert.equal(this.player1.permanents[0].getStatus('charges'), 2, '2 charges');
	this.cast('destroy', this.player2, this.player1.permanents[0]);
	assert.equal(this.player1.permanents[0].getStatus('charges'), 1, '1 charge');
	this.cast('destroy', this.player2, this.player1.permanents[0]);
	assert.ok(!this.player1.permanents[0], 'poof');
	assert.equal(
		this.player1.permanents[1].card,
		Cards.SoulCatcher,
		'SoulCatcher',
	);
	this.cast('destroy', this.player2, this.player1.permanents[1]);
	assert.ok(!this.player1.permanents[1], 'SoulCatcher gone');
	assert.equal(this.player1.shield.card, Cards.Shield, 'Shield');
	this.cast('destroy', this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, 'Shield gone');
	assert.equal(this.player1.weapon.card, Cards.Dagger, 'Dagger');
	this.cast('destroy', this.player2, this.player1.weapon);
	assert.ok(!this.player1.weapon, 'Dagger gone');
	initHand(this.player1, Cards.BoneWall);
	this.player1.hand[0].useactive();
	assert.equal(this.player1.shield.getStatus('charges'), 7, '7 bones');
	this.cast('destroy', this.player2, this.player1.shield);
	assert.equal(this.player1.shield.getStatus('charges'), 6, '6 bones');
	for (let i = 0; i < 6; i++) {
		this.cast('destroy', this.player2, this.player1.shield);
	}
	assert.ok(!this.player1.shield, 'This town is all in hell');
});
M.test('Devourer', function() {
	this.player1.addCrea(this.game.newThing(Cards.Devourer));
	this.player2.setQuanta(etg.Light, 1);
	this.player1.endturn();
	assert.equal(this.player2.quanta[etg.Light], 0, 'Light');
	assert.equal(this.player1.quanta[etg.Darkness], 1, 'Darkness');
});
M.test('Disarm', function() {
	this.player1.addCrea(this.game.newThing(Cards.Monk));
	this.player2.setWeapon(this.game.newThing(Cards.Dagger));
	this.player1.endturn();
	assert.ok(!this.player2.weapon, 'Disarmed');
	assert.equal(this.player2.hand[0].card, Cards.Dagger, 'In hand');
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
	assert.equal(this.player1.handIds.length, 3, 'handlength');
	const pillars = this.player1.permanents[0];
	assert.ok(pillars.card.type == etg.Pillar, 'ispillar');
	assert.equal(pillars.getStatus('charges'), 5, '5 charges');
	this.cast('earthquake', this.player2, pillars);
	assert.equal(pillars.getStatus('charges'), 2, '2 charges');
	this.cast('earthquake', this.player2, pillars);
	assert.ok(!this.player1.permanents[0], 'poof');
});
M.test('Eclipse', function() {
	this.player1.deckIds = this.initDeck(Cards.Ash, Cards.Ash, Cards.Ash);
	this.player2.deckIds = this.initDeck(Cards.Ash, Cards.Ash, Cards.Ash);
	for (let i = 0; i < 2; i++)
		this.player1.addCrea(this.game.newThing(Cards.MinorVampire.asUpped(true)));
	this.player1.hp = 50;
	this.player1.endturn();
	this.player2.endturn();
	assert.equal(this.player2.hp, 92, "Noclipse dmg'd");
	assert.equal(this.player1.hp, 58, "Noclipse vamp'd");
	this.player1.addPerm(this.game.newThing(Cards.Nightfall.asUpped(true)));
	this.player1.endturn();
	assert.equal(this.player2.hp, 80, "Eclipse dmg'd");
	assert.equal(this.player1.hp, 70, "Eclipse vamp'd");
	assert.equal(this.player1.creatures[0].truehp(), 4, "hp buff'd");
});
M.test('Gpull', function() {
	this.player2.addCrea(this.game.newThing(Cards.ColossalDragon));
	this.player2.gpull = this.player2.creatureIds[0];
	this.player1.addCrea(this.game.newThing(Cards.Scorpion));
	this.player2.deckIds = this.initDeck(Cards.ColossalDragon);
	this.player1.endturn();
	assert.equal(this.game.get(this.player2.gpull, 'hp'), 24, 'dmg redirected');
	assert.equal(
		this.game.byId(this.player2.gpull).getStatus('poison'),
		1,
		'psn redirected',
	);
	this.game.byId(this.player2.gpull).die();
	assert.ok(!this.player2.gpull, 'gpull death poof');
});
M.test('Hope', function() {
	this.player1.setShield(this.game.newThing(Cards.Hope));
	this.player1.addCrea(this.game.newThing(Cards.Photon));
	for (let i = 0; i < 3; i++) {
		this.player1.addCrea(this.game.newThing(Cards.Photon.asUpped(true)));
	}
	this.player1.endturn();
	assert.equal(this.player1.shield.truedr(), 3, 'DR');
	assert.equal(this.player1.quanta[etg.Light], 3, 'RoL');
});
M.test('Lobotomize', function() {
	this.player1.addCrea(this.game.newThing(Cards.Devourer));
	this.player1.addCrea(this.game.newThing(Cards.Abomination));
	const [dev, abom] = this.player1.creatures;
	assert.ok(dev.active.size, 'Dev Skills');
	assert.ok(abom.active.size, 'Abom Skills');
	this.cast('lobotomize', dev, dev);
	this.cast('lobotomize', abom, abom);
	assert.ok(!dev.active.size, 'Dev no more');
	assert.ok(abom.active.size, 'Abom still');
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
	assert.equal(this.player1.hp, 92, 'Damage');
	assert.equal(this.player1.handIds.length, 7, 'Discarded');
});
M.test('Parallel', function() {
	this.player1.addCrea(this.game.newThing(Cards.Dragonfly));
	const damsel = this.player1.creatures[0];
	this.cast('parallel', damsel, damsel);
	assert.equal(this.player1.creatures[1].card, Cards.Dragonfly, "PU'd");
	this.cast('web', this.player1, damsel);
	assert.ok(
		!damsel.getStatus('airborne') &&
			this.player1.creatures[1].getStatus('airborne'),
		"Web'd",
	);
});
M.test('Phoenix', function() {
	this.player1.addCrea(this.game.newThing(Cards.Phoenix));
	const phoenix = this.player1.creatures[0];
	this.cast('lightning', this.player1, phoenix);
	assert.equal(this.player1.creatures[0].card, Cards.Ash, 'Ash');
});
M.test('Plague', function() {
	this.player1.setQuanta(etg.Death, 8);
	initHand(this.player1, Cards.Plague);
	this.player1.addCrea(this.game.newThing(Cards.Rustler));
	this.player1.hand[0].useactive(this.player1);
	assert.ok(this.player1.creatures[0].getStatus('poison'), 'Poisoned Rustler');
	this.player1.endturn();
	assert.ok(!this.player1.creatureIds[0], 'No Rustler');
});
M.test('Purify', function() {
	this.cast('poison 3', this.player1, this.player2);
	assert.equal(this.player2.getStatus('poison'), 3, '3');
	this.cast('poison 3', this.player1, this.player2);
	assert.equal(this.player2.getStatus('poison'), 6, '6');
	this.cast('purify', this.player1, this.player2);
	assert.equal(this.player2.getStatus('poison'), -2, '-2');
	this.cast('purify', this.player1, this.player2);
	assert.equal(this.player2.getStatus('poison'), -4, '-4');
});
M.test('Reflect', function() {
	this.cast('lightning', this.player1, this.player2);
	assert.ok(this.player1.hp == 100 && this.player2.hp == 95, 'Plain spell');
	this.player2.setShield(this.game.newThing(Cards.MirrorShield));
	this.cast('lightning', this.player1, this.player2);
	assert.ok(this.player1.hp == 95 && this.player2.hp == 95, 'Reflected spell');
	this.player1.setShield(this.game.newThing(Cards.MirrorShield));
	this.cast('lightning', this.player1, this.player2);
	assert.ok(
		this.player1.hp == 90 && this.player2.hp == 95,
		'Unreflected reflected spell',
	);
});
M.test('Rustler', function() {
	this.player1.setQuanta(etg.Light, 3);
	this.player1.addCrea(this.game.newThing(Cards.Rustler));
	this.player1.endturn();
	this.player2.endturn();
	this.player1.creatures[0].useactive();
	this.player1.creatures[0].useactive();
	assert.equal(this.player1.quanta[etg.Light], 1, '1 Light');
	assert.equal(this.player1.quanta[etg.Life], 4, '4 Life');
});
M.test('Steal', function() {
	this.player1.setShield(this.game.newThing(Cards.BoneWall));
	this.player1.shield.setStatus('charges', 3);
	this.cast('steal', this.player2, this.player1.shield);
	assert.ok(
		this.player1.shield && this.player1.shield.getStatus('charges') == 2,
		'Wish bones',
	);
	assert.ok(
		this.player2.shield && this.player2.shield.getStatus('charges') == 1,
		'stole 1',
	);
	this.cast('steal', this.player2, this.player1.shield);
	assert.ok(
		this.player1.shield && this.player1.shield.getStatus('charges') == 1,
		'Lone bone',
	);
	assert.ok(
		this.player2.shield && this.player2.shield.getStatus('charges') == 1,
		'stole 2',
	);
	this.cast('steal', this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, 'This town is all in hell');
	assert.ok(
		this.player2.shield && this.player2.shield.getStatus('charges') == 1,
		'stole 3',
	);
});
M.test('Steam', function() {
	this.player1.addCrea(this.game.newThing(Cards.SteamMachine));
	const steam = this.player1.creatures[0];
	this.player1.setQuanta(etg.Fire, 8);
	steam.usedactive = false;
	assert.equal(steam.trueatk(), 0, '0');
	steam.useactive();
	assert.equal(steam.trueatk(), 5, '5');
	steam.attack();
	assert.equal(steam.trueatk(), 4, '4');
});
M.test('Transform No Sick', function() {
	this.player1.setQuanta(etg.Entropy, 8);
	this.player1.addCrea(this.game.newThing(Cards.Pixie));
	const pixie = this.player1.creatures[0];
	pixie.usedactive = false;
	pixie.transform(Cards.Pixie);
	assert.ok(pixie.canactive(), 'canactive');
});
M.test('Voodoo', function() {
	const voodoo = this.game.newThing(Cards.VoodooDoll);
	this.player1.addCrea(voodoo);
	this.cast('lightning', this.player1, voodoo);
	this.cast('infect', this.player1, voodoo);
	assert.equal(voodoo.hp, 11, 'dmg');
	assert.equal(this.player2.hp, 95, 'foe dmg');
	assert.equal(voodoo.getStatus('poison'), 1, 'psn');
	assert.equal(this.player2.getStatus('poison'), 1, 'foe psn');
	this.cast('holylight', this.player1, voodoo);
	assert.equal(voodoo.hp, 1, 'holy dmg');
	assert.equal(this.player2.hp, 85, 'foe holy dmg');
});
