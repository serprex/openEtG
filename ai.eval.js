function evalGameState(game) {
	var disableLogging = true;
	function log(){
		if (!disableLogging){
			console.log.apply(console, arguments);
		}
	}
	var ActivesValues = {
		ablaze:3,
		accelerationspell:5,
		acceleration:function(c){
			return c.truehp()/4-2;
		},
		accretion:8,
		adrenaline:8,
		aflatoxin:5,
		aggreskele:2,
		air:1,
		antimatter:12,
		bblood:7,
		blackhole:function(c){
			var a=0, fq=c.owner.foe.quanta;
			for(var i=1; i<13; i++){
				a += Math.min(fq[i], 3)/3;
			}
			return a;
		},
		bless:4,
		boneyard:3,
		bounce:3,
		bravery:3,
		burrow:1,
		butterfly:4,
		catapult:6,
		chimera:4,
		clear:2,
		corpseexplosion:1,
		counter:3,
		cpower:4,
		darkness:1,
		deadalive:2,
		deja:4,
		deployblobs:5,
		destroy:8,
		destroycard:1,
		devour:5,
		disarm:5,
		disfield:8,
		disshield:7,
		dive:function(c){
			return c instanceof CardInstance?c.card.attack:truetrueatk(c)-c.cast-(c.status.dive||0);
		},
		divinity:3,
		drainlife:4,
		draft:1,
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
		fire:1,
		firebolt:6,
		flatline:1,
		flyingweapon:1,
		fractal:9,
		freeze:3,
		fungusrebirth:2,
		gas:10,
		give:1,
		gpull:1,
		gpullspell:3,
		gratitude:4,
		grave:4,
		growth:5,
		guard:5,
		hasten:3,
		hatch:3,
		heal:3,
		heal20:8,
		holylight:2,
		hope:7,
		icebolt:4,
		ignite:8,
		immolate:5,
		improve:6,
		infect:4,
		ink:3,
		innovation:3,
		integrity:4,
		layegg:5,
		light:1,
		lightning:7,
		liquid:5,
		livingweapon:2,
		lobotomize:6,
		luciferin:3,
		lycanthropy:4,
		metamorph:2,
		miracle:12,
		mitosis:6,
		mitosisspell:6,
		momentum:2,
		mutation:4,
		neuro:7,
		neurofy:7,
		nightmare:3,
		nova:6,
		nova2:6,
		nymph:7,
		ouija:3,
		overdrive:function(c){
			return c.truehp()/4-1;
		},
		overdrivespell:5,
		pandemonium:3,
		pandemonium2:4,
		paradox:5,
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
		rage:[5, 6],
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
		scramble:function(c){
			var a=0, fq=c.owner.foe.quanta;
			for(var i=1; i<13; i++){
				if (!fq[i])a++;
			}
			return a;
		},
		serendepity:4,
		silence:1,
		singularity:-16,
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
		steal:6,
		steam:6,
		stoneform:3,
		storm2:4,
		storm3:6,
		swave:6,
		tempering:3,
		throwrock:2,
		unburrow:0,
		upkeep:-.5,
		vampire:function(c){
			return (c instanceof CardInstance?c.attack:truetrueatk(c))*.7;
		},
		virusinfect:0,
		virusplague:1,
		void:5,
		quantagift:3,
		web:2,
		wisdom:4,
		yoink:4,
		pillar:0.3,
		pend:0.3,
		blockwithcharge:function(c){
			return c.status?c.status.charges:c.card.status.charges;
		},
		cold:7,
		despair:5,
		evade100:function(c){
			return c.status?(c.status.charges == 0 && c.owner == game.turn?0:10):10;
		},
		evade40:6,
		evade50:7,
		firewall:7,
		skull:5,
		slow:6,
		solar:3,
		thorn:5,
		weight:5,
		wings:6
	}

	function evalactive(c, active){
		var aval = ActivesValues[active.activename];
		return !aval?0:
			aval instanceof Function?aval(c):
			aval instanceof Array?aval[c.card.upped]:aval;
	}

	function checkpassivestatus(c){
		var score = 0;
		if (c.status) {
			if (c.status.immaterial) score += 6;
			var delaymix = Math.max((c.status.frozen||0), (c.status.delayed||0));
			score -= delaymix;
			if (c.status.poison){
				score -= c.status.poison*truetrueatk(c)/c.truehp();
				if (c.status.aflatoxin) score -= c.status.poison;
			}
		}
		if (c.passives) {
			if (c.passives.airborne) score += 1;
			if (c.passives.voodoo) score += 1;
			if (c.passives.swarm) score += 1;
			if (c.passives.stasis) score += 5;
			if (c.passives.flooding) score += 3;
			if (c.passives.patience) score -= 4;
			if (c.passives.freedom) score += 6;
			if (c.passives.tunneling) score += 2;
			if (c.passives.reflect) score += 1;
		}
		return score;
	}

	function truetrueatk(c) {
		var foeshield = c.owner.foe.shield;
		var momentum = c.status.momentum || c.status.psion;
		var dr = foeshield && !momentum ? foeshield.truedr() : 0;
		var atk = c.trueatk() - dr;
		if (c.status.adrenaline) {
			while (c.status.adrenaline < countAdrenaline(this.trueatk(1))) {
				c.status.adrenaline++;
				atk += c.trueatk() - dr;
			}
			c.status.adrenaline = 1;
		}
		return atk * (foeshield && foeshield.passives.reflect && c.status.psion ? -1 : 1);
	}

	function evalcard(c) {
		score = 0;
		if (c) {
			if (c.active && !isEmpty(c.active)) {
				for (key in c.active) {
					score += evalactive(c, c.active[key]);
				}
			}
			if (c instanceof Weapon && c instanceof Creature) {
				var ttatk = truetrueatk(c);
				score += ttatk;
				if (c instanceof Creature){
					c.truehp() / 5;
				}else{
					score += 3;
				}
				if (ttatk && c.active.hit){
					score += evalactive(c, c.active.hit)*(c.status.adrenaline?2:1);
				}
				if (c.owner.gpull == c && c.active.shield){
					score += evalactive(c, c.active.shield);
				}
			}
			score += checkpassivestatus(c);
			log("\t" + c.card.name + " worth " + score)
		}
		return score;

	}
	function evalcardinstance(cardInst) {
		var c = cardInst.card;
		var score = 0;
		if (c.type == SpellEnum)
			score += evalactive(c, c.active);
		else {
			if (c.active && !isEmpty(c.active)) {
				for (key in c.active) {
					score += evalactive(cardInst, c.active[key]);
				}
			}
			if (c.type == CreatureEnum){
				score += c.attack + c.health / 5;
			}else if (c.type == WeaponEnum){
				score += c.attack;
			}else if (c.type == ShieldEnum){
				score += c.health;
			}
			score += checkpassivestatus(c);
		}
		return score;
	}

	if (game.turn.foe.deck.length == 0){
		return game.turn == game.player1?99999990:-99999990;
	}
	if (game.winner){
		return game.winner==game.player1?99999999:-99999999;
	}
	var gamevalue = 0;
	for (var j = 0; j < 2; j++) {
		var pscore = 0;
		var player = j==0?game.player1:game.player2;
		pscore += evalcard(player.weapon);
		pscore += evalcard(player.shield);
		for (var i = 0; i < 23; i++) {
			pscore += evalcard(player.creatures[i]);
		}
		for (var i = 0; i < 16; i++) {
			pscore += evalcard(player.permanents[i]);
		}
		for (var i = 0; i < player.hand.length; i++) {
			var cinst = player.hand[i], costless = !cinst.card.cost || !cinst.card.costele;
			if (costless || player.quanta[cinst.card.costele]){
				pscore += evalcardinstance(cinst) * (player.cansummon(i) ? 0.5 : 0.2) * (costless?1:Math.min(player.quanta[cinst.card.costele], 20)/10);
			}else if (cinst.card.active && cinst.card.active.discard == Actives.obsession){
				pscore -= 8;
			}
		}

		if (player.gpull) {
			pscore += player.gpull.truehp()/4 + (player.gpull.passives.voodoo ? 10 : 0) - player.gpull.trueatk();
		}
		pscore += 100 * player.hp / (100 + player.hp);
		if (player.isCloaked()){
			pscore += 5;
		}
		log("\tpscore" + j + ": " + pscore);
		gamevalue += pscore*(j == 0?1:-1);
	}
	log("Eval " + gamevalue);
	return gamevalue;
}