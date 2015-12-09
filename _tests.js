#!/usr/bin/env node
"use strict";
var assert = require("assert");
var etg = require("./etg");
var Game = require("./Game");
var Cards = require("./Cards");
var Skills = require("./Skills");
var etgutil = require("./etgutil");
Cards.loadcards();
function initHand(pl){
	for(var i=1; i<arguments.length; i++){
		pl.hand[i-1] = new etg.CardInstance(arguments[i], pl);
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
	for(var key in Cards.Codes){
		key = parseInt(key);
		if (!key) continue;
		var un = etgutil.asUpped(key, false), up = etgutil.asUpped(key, true);
		if (!(un in Cards.Codes) || !(up in Cards.Codes)){
			assert.fail(key);
		}
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
	(this.player1.creatures[0] = new etg.Creature(Cards.Devourer, this.player1)).status.adrenaline = 1;
	(this.player1.creatures[1] = new etg.Creature(Cards.HornedFrog, this.player1)).status.adrenaline = 1;
	(this.player1.creatures[2] = new etg.Creature(Cards.CrimsonDragon.asUpped(true), this.player1)).status.adrenaline = 1;
	this.player2.quanta[etg.Life]=3;
	this.player1.endturn();
	assert.equal(this.player2.hp, 68, "dmg");
	assert.equal(this.player1.quanta[etg.Darkness], 2, "Absorbed");
	assert.equal(this.player2.quanta[etg.Life], 1, "Lone Life");
});
M.test("Aflatoxin", function() {
	(this.player1.creatures[0] = new etg.Creature(Cards.Devourer, this.player1)).status.aflatoxin = true;
	this.player1.creatures[0].die();
	assert.ok(this.player1.creatures[0], "Something");
	assert.equal(this.player1.creatures[0].card, Cards.MalignantCell, "Malignant");
});
M.test("BoneWall", function() {
	this.player1.quanta[etg.Death] = 8;
	initHand(this.player1, Cards.BoneWall);
	this.player1.hand[0].useactive();
	new etg.Creature(Cards.CrimsonDragon, this.player2).place();
	new etg.Creature(Cards.CrimsonDragon, this.player2).place();
	new etg.Creature(Cards.CrimsonDragon, this.player2).place();
	this.player1.endturn();
	this.player2.endturn();
	assert.ok(this.player1.shield, "BW exists");
	assert.equal(this.player1.shield.status.charges, 4, "4 charges");
	this.player2.creatures[0].die();
	assert.equal(this.player1.shield.status.charges, 6, "6 charges");
});
M.test("Boneyard", function() {
	new etg.Creature(Cards.Devourer, this.player1).place();
	new etg.Permanent(Cards.Boneyard, this.player1).place();
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
	assert.equal(this.player1.permanents[0].status.charges, 2, "2 charges");
	Skills.destroy(this.player2, this.player1.permanents[0]);
	assert.equal(this.player1.permanents[0].status.charges, 1, "1 charge");
	Skills.destroy(this.player2, this.player1.permanents[0]);
	assert.ok(!this.player1.permanents[0], "poof");
	assert.equal(this.player1.permanents[1].card, Cards.SoulCatcher, "SoulCatcher");
	Skills.destroy(this.player2, this.player1.permanents[1]);
	assert.ok(!this.player1.permanents[1], "SoulCatcher gone");
	assert.equal(this.player1.shield.card, Cards.Shield, "Shield");
	Skills.destroy(this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, "Shield gone");
	assert.equal(this.player1.weapon.card, Cards.Dagger, "Dagger");
	Skills.destroy(this.player2, this.player1.weapon);
	assert.ok(!this.player1.weapon, "Dagger gone");
	initHand(this.player1, Cards.BoneWall);
	this.player1.hand[0].useactive();
	assert.equal(this.player1.shield.status.charges, 7, "7 bones");
	Skills.destroy(this.player2, this.player1.shield);
	assert.equal(this.player1.shield.status.charges, 6, "6 bones");
	for(var i=0; i<6; i++){
		Skills.destroy(this.player2, this.player1.shield);
	}
	assert.ok(!this.player1.shield, "This town is all in hell");
});
M.test("Devourer", function() {
	new etg.Creature(Cards.Devourer, this.player1).place();
	this.player2.quanta[etg.Light] = 1;
	this.player1.endturn();
	assert.equal(this.player2.quanta[etg.Light], 0, "Light");
	assert.equal(this.player1.quanta[etg.Darkness], 1, "Darkness");
});
M.test("Disarm", function() {
	new etg.Creature(Cards.Monk, this.player1).place();
	new etg.Weapon(Cards.Dagger, this.player2).place();
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
	assert.ok(pillars.card.type == etg.PillarEnum, "ispillar");
	assert.equal(pillars.status.charges, 5, "5 charges");
	Skills.earthquake(this.player2, pillars);
	assert.equal(pillars.status.charges, 2, "2 charges");
	Skills.earthquake(this.player2, pillars);
	assert.ok(!this.player1.permanents[0], "poof");
});
M.test("Eclipse", function() {
	this.player1.deck = [Cards.Ash, Cards.Ash, Cards.Ash];
	this.player2.deck = [Cards.Ash, Cards.Ash, Cards.Ash];
	for(var i=0; i<2; i++)
		new etg.Creature(Cards.MinorVampire.asUpped(true), this.player1).place();
	this.player1.hp = 50;
	this.player1.endturn();
	this.player2.endturn();
	assert.equal(this.player2.hp, 92, "Noclipse dmg'd");
	assert.equal(this.player1.hp, 58, "Noclipse vamp'd");
	this.player1.permanents[0] = new etg.Permanent(Cards.Nightfall.asUpped(true), this.player1);
	this.player1.endturn();
	assert.equal(this.player2.hp, 80, "Eclipse dmg'd");
	assert.equal(this.player1.hp, 70, "Eclipse vamp'd");
	assert.equal(this.player1.creatures[0].truehp(), 4, "hp buff'd");
});
M.test("Gpull", function() {
	new etg.Creature(Cards.ColossalDragon, this.player2).place();
	this.player2.gpull = this.player2.creatures[0];
	new etg.Creature(Cards.Scorpion, this.player1).place();
	this.player2.deck = [Cards.ColossalDragon];
	this.player1.endturn();
	assert.equal(this.player2.gpull.hp, 24, "dmg redirected");
	assert.equal(this.player2.gpull.status.poison, 1, "psn redirected");
	this.player2.gpull.die();
	assert.ok(!this.player2.gpull, "gpull death poof");
});
M.test("Hope", function() {
	this.player1.shield = new etg.Shield(Cards.Hope, this.player1);
	new etg.Creature(Cards.Photon, this.player1).place();
	for(var i=0; i<3; i++){
		new etg.Creature(Cards.Photon.asUpped(true), this.player1).place();
	}
	this.player1.endturn();
	assert.equal(this.player1.shield.truedr(), 3, "DR");
	assert.equal(this.player1.quanta[etg.Light], 4, "RoL");
});
M.test("Lobotomize", function() {
	var dev = new etg.Creature(Cards.Devourer, this.player1);
	assert.ok(!etg.isEmpty(dev.active), "Skills");
	Skills.lobotomize(dev, dev);
	assert.ok(etg.isEmpty(dev.active), "No more");
});
M.test("Obsession", function() {
	initHand(this.player1, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast);
	this.player1.endturn(0);
	assert.equal(this.player1.hp, 92, "Damage");
	assert.equal(this.player1.hand.length, 7, "Discarded");
});
M.test("Parallel", function() {
	var damsel = new etg.Creature(Cards.Dragonfly, this.player1);
	damsel.place();
	Skills.parallel(this.player1, damsel);
	assert.equal(this.player1.creatures[1].card, Cards.Dragonfly, "PU'd");
	Skills.web(this.player1, damsel);
	assert.ok(!damsel.status.airborne && this.player1.creatures[1].status.airborne, "Web'd");
});
M.test("Phoenix", function() {
	var phoenix = new etg.Creature(Cards.Phoenix, this.player1);
	phoenix.place();
	Skills.lightning(this.player1, phoenix);
	assert.equal(this.player1.creatures[0].card, Cards.Ash, "Ash");
});
M.test("Purify", function() {
	Skills["poison 3"](this.player1);
	assert.equal(this.player2.status.poison, 3, "3");
	Skills["poison 3"](this.player1, this.player2);
	assert.equal(this.player2.status.poison, 6, "6");
	Skills.purify(this.player1, this.player2);
	assert.equal(this.player2.status.poison, -2, "-2");
	Skills.purify(this.player1, this.player2);
	assert.equal(this.player2.status.poison, -4, "-4");
});
M.test("Reflect", function() {
	Skills.lightning(this.player1, this.player2);
	assert.ok(this.player1.hp == 100 && this.player2.hp == 95, "Plain spell");
	this.player2.shield = new etg.Shield(Cards.MirrorShield, this.player2);
	Skills.lightning(this.player1, this.player2);
	assert.ok(this.player1.hp == 95 && this.player2.hp == 95, "Reflected spell");
	this.player1.shield = new etg.Shield(Cards.MirrorShield, this.player1);
	Skills.lightning(this.player1, this.player2);
	assert.ok(this.player1.hp == 90 && this.player2.hp == 95, "Unreflected reflected spell");
});
M.test("Steal", function() {
	(this.player1.shield = new etg.Shield(Cards.BoneWall, this.player1)).status.charges=3;
	Skills.steal(this.player2, this.player1.shield);
	assert.ok(this.player1.shield && this.player1.shield.status.charges == 2, "Wish bones");
	assert.ok(this.player2.shield && this.player2.shield.status.charges == 1, "stole 1");
	Skills.steal(this.player2, this.player1.shield);
	assert.ok(this.player1.shield && this.player1.shield.status.charges == 1, "Lone bone");
	assert.ok(this.player2.shield && this.player2.shield.status.charges == 2, "stole 2");
	Skills.steal(this.player2, this.player1.shield);
	assert.ok(!this.player1.shield, "This town is all in hell");
	assert.ok(this.player2.shield && this.player2.shield.status.charges == 3, "stole 3");
});
M.test("Steam", function() {
	var steam = new etg.Creature(Cards.SteamMachine, this.player1);
	this.player1.quanta[etg.Fire] = 8;
	steam.usedactive = false;
	steam.place();
	assert.equal(steam.trueatk(), 0, "0");
	steam.useactive();
	assert.equal(steam.trueatk(), 5, "5");
	steam.attack();
	assert.equal(steam.trueatk(), 4, "4");
});
M.test("Transform No Sick", function() {
	this.player1.quanta[etg.Entropy] = 8;
	var pixie = new etg.Creature(Cards.Pixie, this.player1);
	pixie.place();
	pixie.usedactive = false;
	pixie.transform(Cards.Pixie);
	assert.ok(pixie.canactive(), "canactive");
});
M.test("Voodoo", function() {
	var voodoo = new etg.Creature(Cards.VoodooDoll, this.player1);
	voodoo.place();
	Skills.lightning(this.player1, voodoo);
	Skills.infect(this.player1, voodoo);
	assert.equal(voodoo.hp, 11, "dmg");
	assert.equal(this.player2.hp, 95, "foe dmg");
	assert.equal(voodoo.status.poison, 1, "psn");
	assert.equal(this.player2.status.poison, 1, "foe psn");
	Skills.holylight(this.player1, voodoo);
	assert.equal(voodoo.hp, 1, "holy dmg");
	assert.equal(this.player2.hp, 85, "foe holy dmg");
});