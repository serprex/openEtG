function evalGameState(game, player) {
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
		bounce:5,
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
		devour:7,
		die:0,
		disarm:5,
		disfield:8,
		disshield:7,
		dive:4,
		divinity:3,
		drainlife:4,
		draft:2,
		dryspell:5,
		dshield:13,
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
		






	}
	for (var j = 1; j > -2; j-=2) {
		player = j==-1?game.player1:game.player2;
		foe = player.foe;
		for (var i = 0; i < 23; i++) {
			var cr = player.creatures[i];

			gamevalue += (cr.trueatk() - foe.shield?foe.shield.truedr():0) * j;
			gamevalue += cr.truehp() / 5 * j;
		}
		var wp = player.weapon, sh = player.shield;
		if (wp) {
			gamevalue += wp.trueatk();
		}
		if (sh) {
			//evaluate shield abilities
		}
		for (var i = 0; i < 16; i++) {
			
			}
		}
	}
}