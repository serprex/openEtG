
function evalGameState(game) {
	gamevalue = 0

	var ActivesValues = {
		ablaze:3,
		accelerationspell:5,
		acceleration:3,
		accretion:8,
		accumulation:0,
		adrenaline:8,
		aflatoxin:5,
		aggreskele:2,
		air:1,
		antimatter:15,
		bblood:7,
		blackhole:8,
		bless:4,
		boneyard:3,
		bow:0,
		bounce:3,
		bravery:3,
		burrow:1,
		butterfly:5,
		chimera:4,
		clear:2,
		corpseexplosion:4,
		counter:3,
		cpower:4,
		dagger:0,
		darkness:1,
		deadalive:2,
		deja:4,
		deployblobs:5,
		destroy:8,
		destroycard:3,
		devour:5,
		die:0,
		disarm:5,
		disfield:8,
		disshield:7,
		dive:4,
		divinity:3,
		drainlife:4,
		draft:2,
		dryspell:5,
		dshield:4,
		duality:4,
		earth:1,
		earthquake:5,
		empathy:7,
		enchant:6,
		endow:4,
		epidemic:4,
		evolve:5,
		fickle:3,
		fiery:0,
		fire:1,
		firebolt:6,
		flatline:4,
		flyingweapon:2,
		fractal:9,
		freeze:3,
		fungusrebirth:2,
		gaincharge2:0,
		gainchargeowner:0,
		gas:12,
		give:2,
		gpull:1,
		gpullspell:3,
		gratitude:4,
		grave:5,
		growth:4,
		guard:5,
		hammer:0,
		hasten:3,
		hatch:3,
		heal:3,
		heal20:8,
		holylight:2,
		hope:7,
		icebolt:4,
		ignite:4,
		immolate:5,
		improve:6,
		infect:4,
		infest:0,
		ink:3,
		innovation:3,
		integrity:4,
		layegg:5,
		light:1,
		lightning:7,
		liquid:5,
		livingweapon:2,
		lobotomize:6,
		losecharge:0,
		luciferin:3,
		lycanthropy:4,
		metamorph:2,
		miracle:12,
		mitosis:6,
		mitosisspell:6,
		momentum:2,
		mutant:0,
		mutation:4,
		neuro:8,
		neurofy:7,
		nightmare:3,
		nova:6,
		nova2:6,
		nymph:7,
		obsession:0,
		ouija:3,
		overdrive:4,
		overdrivespell:5,
		pandemonium:4,
		pandemonium2:4,
		paradox:8,
		parallell:7,
		phoenix:3,
		photosynthesis:2,
		plague:5,
		platearmor:1,
		poison:2,
		poison2:3,
		poison3:4,
		precognition:1,
		purify:4,
		queen:7,
		quint:6,
		randomdr:0,
		rage:5,
		readiness:4,
		rebirth:6,
		regenerate:5,
		regrade:3,
		reinforce:4,
		ren:5,
		rewind:6,
		ricochet:4,
		santuary:5,
		scarab:3,
		scavenger:3,
		scramble:5,
		serendepity:4,
		silence:5,
		singularity:-15,
		sinkhole:3,
		siphon:5,
		siphonactive:6,
		siphonstrength:4,
		skyblitz:10,
		snipe:7,
		sosa:6,
		soulcatch:2,
		spores:4,
		sskin:5,
		staff:0,
		steal:6,
		steam:6,
		stoneform:3,
		storm2:4,
		storm3:6,
		swave:6,
		tempering:3,
		throwrock:2,
		unburrow:2,
		upkeep:0,
		vampire:4,
		virusinfect:2,
		virusplague:4,
		void:5,
		quantagift:3,
		web:2,
		wisdom:4,
		yoink:4,
		pillar:0.3,
		pend:0.3,
		blockwithcharge:0,
		cold:7,
		despair:5,
		evade100:10,
		evade40:6,
		evade60:7,
		firewall:7,
		skull:5,
		slow:6,
		solar:3,
		thorn:5,
		weight:5,
		wings:6
	}

	checkpassivestatus = function(c){
		score = 0;
		if (c.status) {
			if (c.status.immaterial) score += 8;
			if (c.status.frozen || c.status.delayed) score += -3;
			if (c.status.poison) score += -2;
			if (c.status.aflatoxin) score += -4
		}
		if (c.passives) {
			if (c.passives.airborne) score += 1;
			if (c.passives.voodoo) score += 2;
			if (c.passives.swarm) score += 1;

			if (c.passives.stasis) score += 5;
			if (c.passives.flooding) score += 3;
			if (c.passives.patience) score += 8;
			if (c.passives.freeom) score += 6;
			if (c.passives.nightfall) score += 4;
			if (c.passives.cloak) score += 3;
			if (c.passives.tunneling) score += 2;
		}
		return score;
	}

	truetrueatk = function (c, oppshield) {
		var reflected = (oppshield && oppshield.passives.reflect && c.status.psion) ? -1 : 1;
		var atk = c.trueatk() - (oppshield && !c.status.momentum ? oppshield.truedr() : 0);
		if (c.status.adrenaline) {
			dmg = c.trueatk() - (oppshield && !c.status.momentum ? oppshield.truedr() : 0), oldadrenaline = c.status.adrenaline;
			while (c.status.adrenaline < countAdrenaline(this.trueatk(1))) {
				adrenaline++;
				dmg += c.trueatk() - (oppshield && !c.status.momentum ? oppshield.truedr() : 0);
			}
			adrenaline = oldadrenaline
			atk = dmg;
		}
		atk *= reflected;
		return atk;
	}
	evalcard = function (c) {
		score = 0;
		if (c) {
			if (c.active) {
				score += (c.active.cast ? ActivesValues[c.active.cast.activename] : 0);
				score += (c.active.auto ? ActivesValues[c.active.auto.activename] : 0);
			}
			score += checkpassivestatus(c);
		}
		else if (c.type == WeaponEnum) {
			score += truetrueatk(c, foe.shield);
			score += 3;
		}
		else if (c.type == CreatureEnum) {
			score += truetrueatk(c, foe.shield);
			score += c.truehp() / 2;
		}
		return score;

	}

	for (var j = 0; j < 2; j++) {
		var pscore = 0;
		player = j==0?game.player1:game.player2;
		foe = player.foe;
		for (var i = 0; i < 23; i++) {
			var cr = player.creatures[i];
			if (cr) {
				pscore+=evalcard(cr);
				
			}
		}
		var wp = player.weapon, sh = player.shield;
		if (wp) {
			pscore += evalcard(wp);
		}
		if (sh) {
			pscore += evalcard(sh);
		}
		for (var i = 0; i < 16; i++) {
			var pm = player.permanents[i];
			if (pm) {
				pscore += evalcard(pm);
			}
		}
		for (var i = 0; i > 12; i++) {
			pscore += 0.1 * player.quanta[i];
		}
		for (var i = 0; i < player.hand.length; i++) {
			pscore += evalcard(player.hand[i])*0.2;
		}

		if (player.gpull) {
			pscore += -player.gpull.trueatk() / 3;
			pscore += player.gpull.passives.voodoo ? 10 : 0;
		}
		pscore += player.hp;
		gamevalue = (j == 0) ? gamevalue + pscore : gamevalue - pscore;
	}
	//For testing only:
	console.log("Game-value: " + evalGameState(this.game));
	return gamevalue;
	}