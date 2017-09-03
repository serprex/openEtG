#!/usr/bin/env node
"use strict";
const assert = require("assert"),
	etg = require("../etg"),
	util = require("../util"),
	Game = require("../Game"),
	Cards = require("../Cards"),
	Thing = require("../Thing"),
	Skills = require("../Skills"),
	etgutil = require("../etgutil");
function initHand(pl, ...args){
	for(var i=0; i<args.length; i++){
		var cardinst = pl.hand[i] = new Thing(args[i]);
		cardinst.owner = pl;
		cardinst.type = etg.Spell;
	}
}
class TestModule{
	constructor(name, opts){
		this.name = name;
		this.opts = opts || {};
	}
	test(name, func){
		var ctx = {};
		if (this.opts.beforeEach) this.opts.beforeEach.call(ctx, this);
		func.call(ctx, this);
		console.log("pass ", name);
	}
}
var M = new TestModule("Upped Alignment");
M.test("Upped Alignment", function() {
	for(let key in Cards.Codes){
		key |= 0;
		if (!key) continue;
		var un = etgutil.asUpped(key, false), up = etgutil.asUpped(key, true);
		assert.ok(Cards.Codes[un] && Cards.Codes[up], key);
	}
});
M = new TestModule("Cards", {
	beforeEach:function(){
		this.game = new Game(5489);
		this.player1 = this.game.player1;
		this.player2 = this.game.player2;
		this.game.turn = this.player1;
		this.player1.mark = this.player2.mark = etg.Entropy;
		this.player1.deck = [Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar];
		this.player2.deck = [Cards.BonePillar, Cards.BonePillar, Cards.BonePillar];
	}
});
M.test("Adrenaline", function() {
	this.player1.addCrea(new Thing(Cards.Devourer));
	this.player1.addCrea(new Thing(Cards.HornedFrog));
	this.player1.addCrea(new Thing(Cards.CrimsonDragon.asUpped(true)));
	for(var i=0; i<3; i++) this.player1.creatures[i].status.set("adrenaline", 1);
	this.player2.quanta[etg.Life]=3;
	this.player1.endturn();
	assert.equal(this.player2.hp, 68, "dmg");
	assert.equal(this.player1.quanta[etg.Darkness], 2, "Absorbed");
	assert.equal(this.player2.quanta[etg.Life], 1, "Lone Life");
});
M.test("Aflatoxin", function() {
	this.player1.addCrea(new Thing(Cards.Devourer));
	this.player1.creatures[0].status.set("aflatoxin", 1);
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], "Something");
	assert.equal(this.player1.creatures[0].card, Cards.MalignantCell, "Malignant");
});
M.test("BoneWall", function() {
	this.player1.quanta[etg.Death] = 8;
	initHand(this.player1, Cards.BoneWall);
	this.player1.hand[0].useactive();
	this.player2.addCrea(new Thing(Cards.CrimsonDragon));
	this.player2.addCrea(new Thing(Cards.CrimsonDragon));
	this.player2.addCrea(new Thing(Cards.CrimsonDragon));
	this.player1.endturn();
	this.player2.endturn();
	assert.ok(this.player1.shield, "BW exists");
	assert.equal(this.player1.shield.status.get("charges"), 4, "4 charges");
	this.player2.creatures[0].die();
	assert.equal(this.player1.shield.status.get("charges"), 6, "6 charges");
});
M.test("Boneyard", function() {
	this.player1.addCrea(new Thing(Cards.Devourer));
	this.player1.addPerm(new Thing(Cards.Boneyard));
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], "Something");
	assert.equal(this.player1.creatures[0].card, Cards.Skeleton, "Skeleton");
});
M.test("Deckout", function() {
	this.player2.deck.length = 0;
	this.player1.endturn();
	assert.equal(this.game.winner, this.player1);
});
M.test("Destroy", function() {
	this.game.turn = this.player1;
	this.player1.quanta[etg.Death] = 10;
	initHand(this.player1, Cards.AmethystPillar, Cards.AmethystPillar, Cards.SoulCatcher, Cards.Shield, Cards.Dagger);
	while(this.player1.hand.length){
		this.player1.hand[0].useactive();
	}
	assert.equal(this.player1.permanents[0].status.get("charges"), 2, "2 charges");
	Skills.destroy.func(this.player2, this.player1.permanents[0]);
	assert.equal(this.player1.permanents[0].status.get("charges"), 1, "1 charge");
	Skills.destroy.func(this.player2, this.player1.permanents[0]);
	assert.ok(!this.player1.permanents[0], "poof");
	assert.equal(this.player1.permanents[1].card, Cards.SoulCatcher, "SoulCatcher");
	Skills.destroy.func(this.player2, this.player1.permanents[1]);
	assert.ok(!this.player1.permanents[1], "SoulCatcher gone");
	assert.equal(this.player1.shield.card, Cards.Shield, "Shield");
	Skills.destroy.func(this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, "Shield gone");
	assert.equal(this.player1.weapon.card, Cards.Dagger, "Dagger");
	Skills.destroy.func(this.player2, this.player1.weapon);
	assert.ok(!this.player1.weapon, "Dagger gone");
	initHand(this.player1, Cards.BoneWall);
	this.player1.hand[0].useactive();
	assert.equal(this.player1.shield.status.get("charges"), 7, "7 bones");
	Skills.destroy.func(this.player2, this.player1.shield);
	assert.equal(this.player1.shield.status.get("charges"), 6, "6 bones");
	for(var i=0; i<6; i++){
		Skills.destroy.func(this.player2, this.player1.shield);
	}
	assert.ok(!this.player1.shield, "This town is all in hell");
});
M.test("Devourer", function() {
	this.player1.addCrea(new Thing(Cards.Devourer));
	this.player2.quanta[etg.Light] = 1;
	this.player1.endturn();
	assert.equal(this.player2.quanta[etg.Light], 0, "Light");
	assert.equal(this.player1.quanta[etg.Darkness], 1, "Darkness");
});
M.test("Disarm", function() {
	this.player1.addCrea(new Thing(Cards.Monk));
	this.player2.setWeapon(new Thing(Cards.Dagger));
	this.player1.endturn();
	assert.ok(!this.player2.weapon, "Disarmed");
	assert.equal(this.player2.hand[0].card, Cards.Dagger, "In hand");
});
M.test("Earthquake", function() {
	initHand(this.player1, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar);
	for(var i=0; i<5; i++){
		this.player1.hand[0].useactive();
	}
	assert.equal(this.player1.hand.length, 3, "handlength");
	var pillars = this.player1.permanents[0];
	assert.ok(pillars.card.type == etg.Pillar, "ispillar");
	assert.equal(pillars.status.get("charges"), 5, "5 charges");
	Skills.earthquake.func(this.player2, pillars);
	assert.equal(pillars.status.get("charges"), 2, "2 charges");
	Skills.earthquake.func(this.player2, pillars);
	assert.ok(!this.player1.permanents[0], "poof");
});
M.test("Eclipse", function() {
	this.player1.deck = [Cards.Ash, Cards.Ash, Cards.Ash];
	this.player2.deck = [Cards.Ash, Cards.Ash, Cards.Ash];
	for(var i=0; i<2; i++)
		this.player1.addCrea(new Thing(Cards.MinorVampire.asUpped(true)));
	this.player1.hp = 50;
	this.player1.endturn();
	this.player2.endturn();
	assert.equal(this.player2.hp, 92, "Noclipse dmg'd");
	assert.equal(this.player1.hp, 58, "Noclipse vamp'd");
	this.player1.addPerm(new Thing(Cards.Nightfall.asUpped(true)));
	this.player1.endturn();
	assert.equal(this.player2.hp, 80, "Eclipse dmg'd");
	assert.equal(this.player1.hp, 70, "Eclipse vamp'd");
	assert.equal(this.player1.creatures[0].truehp(), 4, "hp buff'd");
});
M.test("Gpull", function() {
	this.player2.addCrea(new Thing(Cards.ColossalDragon));
	this.player2.gpull = this.player2.creatures[0];
	this.player1.addCrea(new Thing(Cards.Scorpion));
	this.player2.deck = [Cards.ColossalDragon];
	this.player1.endturn();
	assert.equal(this.player2.gpull.hp, 24, "dmg redirected");
	assert.equal(this.player2.gpull.status.get("poison"), 1, "psn redirected");
	this.player2.gpull.die();
	assert.ok(!this.player2.gpull, "gpull death poof");
});
M.test("Hope", function() {
	this.player1.setShield(new Thing(Cards.Hope));
	this.player1.addCrea(new Thing(Cards.Photon));
	for(var i=0; i<3; i++){
		this.player1.addCrea(new Thing(Cards.Photon.asUpped(true)));
	}
	this.player1.endturn();
	assert.equal(this.player1.shield.truedr(), 3, "DR");
	assert.equal(this.player1.quanta[etg.Light], 4, "RoL");
});
M.test("Lobotomize", function() {
	this.player1.addCrea(new Thing(Cards.Devourer));
	var dev = this.player1.creatures[0];
	assert.ok(!util.isEmpty(dev.active), "Skills");
	Skills.lobotomize.func(dev, dev);
	assert.ok(util.isEmpty(dev.active), "No more");
});
M.test("Obsession", function() {
	initHand(this.player1, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast);
	this.player1.endturn(0);
	assert.equal(this.player1.hp, 92, "Damage");
	assert.equal(this.player1.hand.length, 7, "Discarded");
});
M.test("Parallel", function() {
	this.player1.addCrea(new Thing(Cards.Dragonfly))
	var damsel = this.player1.creatures[0];
	Skills.parallel.func(damsel, damsel);
	assert.equal(this.player1.creatures[1].card, Cards.Dragonfly, "PU'd");
	Skills.web.func(this.player1, damsel);
	assert.ok(!damsel.status.get("airborne") && this.player1.creatures[1].status.get("airborne"), "Web'd");
});
M.test("Phoenix", function() {
	this.player1.addCrea(new Thing(Cards.Phoenix));
	var phoenix = this.player1.creatures[0];
	Skills.lightning.func(this.player1, phoenix);
	assert.equal(this.player1.creatures[0].card, Cards.Ash, "Ash");
});
M.test("Purify", function() {
	Skills["poison 3"].func(this.player1);
	assert.equal(this.player2.status.get("poison"), 3, "3");
	Skills["poison 3"].func(this.player1, this.player2);
	assert.equal(this.player2.status.get("poison"), 6, "6");
	Skills.purify.func(this.player1, this.player2);
	assert.equal(this.player2.status.get("poison"), -2, "-2");
	Skills.purify.func(this.player1, this.player2);
	assert.equal(this.player2.status.get("poison"), -4, "-4");
});
M.test("Reflect", function() {
	Skills.lightning.func(this.player1, this.player2);
	assert.ok(this.player1.hp == 100 && this.player2.hp == 95, "Plain spell");
	this.player2.setShield(new Thing(Cards.MirrorShield));
	Skills.lightning.func(this.player1, this.player2);
	assert.ok(this.player1.hp == 95 && this.player2.hp == 95, "Reflected spell");
	this.player1.setShield(new Thing(Cards.MirrorShield));
	Skills.lightning.func(this.player1, this.player2);
	assert.ok(this.player1.hp == 90 && this.player2.hp == 95, "Unreflected reflected spell");
});
M.test("Steal", function() {
	this.player1.setShield(new Thing(Cards.BoneWall));
	this.player1.shield.status.set("charges", 3);
	Skills.steal.func(this.player2, this.player1.shield);
	assert.ok(this.player1.shield && this.player1.shield.status.get("charges") == 2, "Wish bones");
	assert.ok(this.player2.shield && this.player2.shield.status.get("charges") == 1, "stole 1");
	Skills.steal.func(this.player2, this.player1.shield);
	assert.ok(this.player1.shield && this.player1.shield.status.get("charges") == 1, "Lone bone");
	assert.ok(this.player2.shield && this.player2.shield.status.get("charges") == 2, "stole 2");
	Skills.steal.func(this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, "This town is all in hell");
	assert.ok(this.player2.shield && this.player2.shield.status.get("charges") == 3, "stole 3");
});
M.test("Steam", function() {
	this.player1.addCrea(new Thing(Cards.SteamMachine));
	var steam = this.player1.creatures[0];
	this.player1.quanta[etg.Fire] = 8;
	steam.usedactive = false;
	assert.equal(steam.trueatk(), 0, "0");
	steam.useactive();
	assert.equal(steam.trueatk(), 5, "5");
	steam.attack();
	assert.equal(steam.trueatk(), 4, "4");
});
M.test("Transform No Sick", function() {
	this.player1.quanta[etg.Entropy] = 8;
	this.player1.addCrea(new Thing(Cards.Pixie));
	var pixie = this.player1.creatures[0];
	pixie.usedactive = false;
	pixie.transform(Cards.Pixie);
	assert.ok(pixie.canactive(), "canactive");
});
M.test("Voodoo", function() {
	var voodoo = new Thing(Cards.VoodooDoll);
	this.player1.addCrea(voodoo);
	Skills.lightning.func(this.player1, voodoo);
	Skills.infect.func(this.player1, voodoo);
	assert.equal(voodoo.hp, 11, "dmg");
	assert.equal(this.player2.hp, 95, "foe dmg");
	assert.equal(voodoo.status.get("poison"), 1, "psn");
	assert.equal(this.player2.status.get("poison"), 1, "foe psn");
	Skills.holylight.func(this.player1, voodoo);
	assert.equal(voodoo.hp, 1, "holy dmg");
	assert.equal(this.player2.hp, 85, "foe holy dmg");
});