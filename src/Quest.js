'use strict';
const etg = require('./etg');
const sock = require('./sock');
const store = require('./store');
const util = require('./util');
const RngMock = require('./RngMock');
const etgutil = require('./etgutil');
const Cards = require('./Cards');

exports.requireQuest = function(quest, user) {
	return quest.questdependencies.every(dependency => user.quests[dependency]);
};

const quarks = {};
quarks.necromancer = {
	deck: '04531027170b52g0c52m0452n018pk',
	name: 'Skeleton Horde',
	hp: 80,
	markpower: 2,
	wintext:
		'You defeated the horde, but you should find out where they came from',
	info:
		'A horde of skeletons have been seen nearby, perhaps you should go investigate?',
};
quarks.necromancer2 = {
	deck: '0d5bs045bu045c1025ca018pp',
	name: 'Forest Wildlife',
	hp: 60,
	wintext:
		'The creatures seemed very afraid of something, like there was something in the forest that did not belong there.',
	info: 'They seemed to come from the forest, so you go inside.',
	questdependencies: ['necromancer'],
};
quarks.necromancer3 = {
	deck: '0553104535047170d52g0652m0352l0552t018pk',
	name: 'Evil Necromancer',
	hp: 120,
	markpower: 2,
	cardreward: '03531',
	wintext:
		'You defeated the evil necromancer and stopped his undead from spreading through the land!',
	info:
		'Deep inside the forest you find the necromancer responsible for filling the lands with undead!',
	questdependencies: ['necromancer2'],
};
quarks.spirit = {
	deck: '0c606045um045us045v3025uu025v2025va018pi',
	name: 'Evil Spirit',
	hp: 150,
	wintext:
		'You have defeated the evil spirit and stopped its dark influence from spreading through the land!\
		... But a dark energy is still troubling this region... \
		You sense a cold, chill air coming from a portal looming darkly at the back of the cave.',
	info:
		'You pursue the energy trail of the spirit to a dark cavern. At first you think it has eluded you, but as you turn to leave, its dark shadowy form rises in front of you',
};
quarks.spirit2 = {
	deck: '015010i50u044vi034vh014vl024vn015ur025uq035ut045up015v2018pt',
	name: 'Portal Guardian',
	hp: 175,
	wintext:
		"The portal guardian lies vanquished, but despite your best efforts you cannot close the portal from this side.\
		Examining the guardian's remains you find an ancient tome which describes the portal before you and the lands beyond\
		The incubus key lies in a large fortress at the center of the realm. You will have to venture forth.",
	info:
		"You approach the portal and a large Elemental steps out of the shadows, purple energy swirling about it.\
		'Only the worthy may pass'...You state that your only intention is to destroy the portal not pass through it.\
		'Only the incubus key can close this portal.' The guardian glowers at you darkly.\
		If you wish to find it you must first pass my test.' The guardian attacks!",
	questdependencies: ['spirit'],
};
quarks.spirit3 = {
	deck: '02530015340a542044vq034vk024vv014vo0452v0252k0352n018pj',
	name: 'Grim Maiden',
	hp: 175,
	wintext:
		"The maiden's swarm of skeletal minions seems endless but they are weak and fall easily.\
		Her pet cats and vultures tear viciously at your allies, but you finally manage to push past them.\
		The Grim Maiden is a truly powerful foe. Her magic wreaking havoc upon your allies.\
		Just as you are about to land the final blow, she vanishes.\
		You can hear her eerie voice echoing off of the wind, growing faint and distant.\
		'Turn back foolish mortal. This road will only lead to your doom. My sisters will not be so forgiving!'",
	info:
		"You step through the portal and are wisked off to a shifting expanse of swampland. Purple lightning crackles above.\
		Far off, in the distant center of the dark and brooding expanse, stands an ominous fortress.\
		The gravel road before you winds its way toward it like a great serpent slithering its way through a desolate bog.\
		A lone maiden blocks your path. In a voice like claws upon glass she shrieks 'you do not belong here... DIE!' ",
	questdependencies: ['spirit2'],
};
quarks.spirit4 = {
	deck: '065ot025og065on0a6rb067n6018po',
	name: 'Swamp Gas',
	wintext:
		'You escape the deadly explosions, just barely... A massive storm is approaching. You will need shelter.\
		A nearby abandoned mansion may be your only option. Warily you open the door. It creaks forebodingly.\
		You are greeted by dank and musty air, but it seems otherwise empty. You sit and wait out the storm.\
		While waiting you could swear you hear footsteps in other rooms and voices talking.\
		However, every search turns up nothing but empty ill kept rooms and dust.\
		Just as you are about to leave, an evil laugh from behind you sends chills down your spine\
		The shadows on the wall begin to move of their own accord. And all the doors slam shut with conviction.\
		You turn to face your assailant, apparently a sister of the maiden you fell earlier.',
	info:
		"As you continue up the road, a foul stench assaults your nose... Then you hear a poping sound.\
		To the side of the road a sign reads 'Danger, swamp gas is explosive. Travelers beware'\
		You decide that NOW would be a good time to run!... But a flock of giant angry birds is in your way",
	questdependencies: ['spirit3'],
};
quarks.spirit5 = {
	deck: '0b606015ur025us035up025uu025v2035vb015uo025uv015v8025ul018pi',
	name: 'Spirit of the Dark Maiden',
	morph: card =>
		RngMock.randomcard(
			card.upped,
			x => x.element == etg.Darkness && x.type == card.type,
		),
	wintext:
		"As the maiden falls, your powers return to normal, and your allies settle back into their original forms.\
		the shadows that gripped and drained your energies recede. Your strength returns to its former glory.\
		You are still feeling tired from the fight, but the storm has passed, leaving an oddly purple sky.\
		In light of recent events, you decide it is probably best to get out while you can, tired or not.\
		Afterall whatever lies down the road has to be less painful than risking encountering another spirit.\
		...right? ... You open the creaky door and head back out down the gravel path.\
		as you take your first step you hear the maiden's silvery voice echoing from the house behind you.\
		'It appears you may be as stong as my sister claims. Your soul shall make a most delectable morsel.\
		'We shall meet again... Don't die before then. I'd hate to lose my favorite toy.' She fades into the darkness.\
		Off in the distance the storm has settled above the castle, the echos of ominous thunder growing fainter.\
		You hope it will be gone by the time you get there... but given your luck so far, you don't think it will.\
		Storm or not, you didn't come this far just to turn back, so you continue your treck down the path.",
	info:
		"You turn to face your attacker, but as you call on your powers, only darkness answers.\
		Your allies come to your aid but their forms have all been twisted. The dark lady laughs mischeviously.\
		'You must think yourself dreaming... Well this is the nightmare realm, and I am the one in control.\
		I think I will toy with you first... before I swallow your soul.' The shadows lunge toward you in a vicious attack.",
	questdependencies: ['spirit5'],
};
quarks.bombmaker = {
	deck: '046220f5t2065s50680d018pu',
	name: 'Bomb Maker',
	autonext: {
		name: 'Bomb Maker II',
		deck: '0f5rg045rk035ro065ru065v1067ql018pt',
		autonext: {
			name: 'Bomb Maker III',
			deck: '035f4065f6025f5025f80e5oc065om025p0018po',
			markpower: 3,
			drawpower: 2,
			cardreward: '045om035s5027ql',
			wintext: 'Congratulations! Here, take some of my bombs as the reward!',
		},
	},
	info:
		'A bomb maker have set up shop nearby. He have put up a sign promising a reward if you can beat him and his bombs three times in a row.',
};
quarks.blacksummoner = {
	deck: '0f7t5018pt',
	name: 'The Black Summoner',
	markpower: 12,
	cardreward: '027t5',
	wintext:
		'You defeat the Dark Summoner that controlled the dragons. The dragons fly away, but two of them stay, looking at you. You decide to let them join you!',
	info:
		'A swarm of dragons can be seen nearby. Maybe you could manage to tame one of them?',
};

quarks.icecave = {
	deck: '0e5i4055i8025i9035id018pp',
	name: 'Snow Storm',
	hp: 75,
	wintext:
		'You get through the storm and finally reach the mysterious cave where the weapon is said to reside.',
	info:
		'You heard a story about a rare weapon hidden in a cave up north. You decide to look for the weapon. On the way there you are caught in the middle of a big snow storm.',
};
quarks.icecave2 = {
	deck: '085i4065ik035ia035ib025ic045id018pp',
	name: 'Cave Guardians??',
	hp: 75,
	wintext:
		'You defeat the creatures that were attacking, and can finally take the rare weapon that was hiding in the cave; a Trident! But before you can grab it, you hear strange sounds behind you...',
	info:
		'You enter the cave, it is dark and icy. Suddenly you meet some creatures there, which promptly attacks you. You seem to glimpse the rare weapon right behind them though...',
	questdependencies: ['icecave'],
};
quarks.icecave3 = {
	deck: '054sa0a4sc025i5015im025iq015ic025il025ii025ie035ig018pp',
	name: 'Cave Guardians',
	hp: 75,
	wintext:
		'After defeating the Guardians, you quickly get out of the cave, ready to head home as fast as you can...',
	info:
		"You look behind you and see a range of different creatures, which you can swear were not here before. 'We are the Guardians of this Cave, and we will not allow you to take our treasure!'",
	questdependencies: ['icecave2'],
};
quarks.icecave4 = {
	deck: '0f5i4035ib025ih025i9025ig047gt018pp',
	name: 'Ice Storm',
	hp: 75,
	wintext:
		'You finally get though the storm and reach the safety of the city. You got the weapon you were looking for, and some other ice souvenirs as well.',
	cardreward: '025i8015ic',
	info:
		'The storm you got past while heading here is still raging, and it seems to have gotten a lot worse.',
	questdependencies: ['icecave3'],
};
quarks.inventor = {
	deck: '03561065950d55k0655m0255s018pm',
	name: 'Defense Catapults',
	hp: 125,
	wintext:
		"You manage to get past the crazy inventor's defense system, and get closer to his big house.",
	info:
		"You come across a small village that claims they are being regularly attacked by machines coming from a crazy inventor living nearby. You decide to put a stop to this crazy man's evil endeavors. On your way there you suddenly see a big Armagio landing in front of you. 'Catapults!' you think, and get ready to fight.",
};
quarks.inventor2 = {
	deck: '065f1045ff035f7075i4065ik045ii018po',
	name: 'Armored Machines',
	hp: 120,
	wintext:
		'Defeating the machines that were terrorizing the village, you head inside to face the inventor.',
	info:
		'In front of the house some machines seems to stand guards. These must be the machines that were attacking the village!',
	questdependencies: ['inventor'],
};
quarks.inventor3 = {
	deck: '0d5de065c5065fh065f7018po',
	name: 'Crazy Inventor',
	hp: 125,
	wintext:
		"Even with his inventions, you manage to defeat him. 'No, please, spare me, I will never hurt anyone again!' he cries. You agree to let him go, but only if he leaves the area and never comes back. You see him walking away and can't help but thinking that you haven't seen the last of him... On your way out of the house, you find some of his inventions and decide that they can be useful!",
	cardreward: '03561025fh025ii',
	info:
		"'All I wanted was to test the offensive capabilities of my machines. But now when you are here, I can test this on you!' says the crazy inventor and laughs.",
	questdependencies: ['inventor2'],
};
//Proving Grounds
quarks.pgdragon = {
	deck:
		'0g4sa014vf0152h0155o0158r015bt015f2015id015la015op015rm015ul0661t018pu',
	name: 'Dragon Tamer',
	hp: 150,
	wintext:
		'You have proved your worth for the Dragon Tamer, and he gives you two of his dragons.',
	choicerewards: [
		5103,
		5201,
		5304,
		5403,
		5501,
		5602,
		5709,
		5802,
		5903,
		6006,
		6101,
		6207,
	],
	rewardamount: 2,
	info: 'Fight the Dragon Tamer at the Proving Grounds!',
};
quarks.pgrare = {
	deck:
		'015360a4sa014vl0152q0155s0158v015c5065ff045fh015f7015ic015ir015lh025oi015ol015ro015ur0161u018po',
	name: 'Master of Arms',
	hp: 150,
	wintext:
		'You have proved your worth for the Master of Arms, and he gives you one of his rare cards.',
	choicerewards: 'rare',
	info: 'Fight the Master of Arms at the Proving Grounds!',
};
quarks.pgshard = {
	deck:
		'0c4sa0250a0253e0256i0659m025cq025fu025j2025m6025pa025se025vi0262m018pm',
	name: 'Gemcutter',
	hp: 150,
	wintext:
		'You have proved your worth for the Gemcutter and he gives you one of his shards.',
	choicerewards: 'shard',
	info: 'Fight the Gemcutter at the Proving Grounds!',
};
quarks.pgfarmer = {
	deck: '0a4sc044vs064vu0a5t2018pj',
	name: 'Farmer',
	hp: 150,
	goldreward: 100,
	wintext:
		'You have proved your worth for the Farmer and he gives you 100 gold.',
	info: 'Fight the Farmer at the Proving Grounds!',
};
quarks.pggeomancer = {
	deck:
		'0154201576016060c4sc0150u015aa015de015gi015jm015mq015pu015t20163a067h0018pp',
	name: 'Geomancer',
	hp: 150,
	choicerewards: 'uppedpillar',
	rewardamount: 2,
	wintext:
		'You have proved your worth for the Geomancer and he gives you 2 of his Towers.',
	info: 'Fight the Geomancer at the Proving Grounds!',
};
quarks.pgnymph = {
	deck:
		'015000153401568094sa094sc0159c015cg015fk015io015ls015p0015s4015v80162c018pi',
	name: 'Eunuch',
	hp: 150,
	choicerewards: 'nymph',
	wintext:
		'You have proved your worth for the Eunuch and he gives you one of his Nymphs',
	info: 'Fight the Eunuch at the Proving Grounds!',
};

//Elemental Temples
quarks.elementalshrine = {
	deck:
		'015990c4sa014vi014vh0152m0152o0155t0155n0158p015c8015c7015f3015fb015ia015i6015lp015lr015on015ou015ri015rr015v1015ut0162a0161q018pi',
	name: 'Shrine Guardian',
	hp: 100,
	wintext:
		"The Shrine Guardian speaks to you: 'You have bested me, but I am only the beginning. Find the Temples and challenge their guardians, and they will reward you! If you defeat them all, you will get access to the Chroma Palace, where the strongest guardian reside.'",
	info:
		"You walk up to the shrine. You don't know what to expect. Suddenly, you are attacked by a cloaked figure! Could it be the Shrine Guardian!?",
};
quarks.aethertemple = {
	deck: '02622036280f61o0361u0a80a018pu',
	hp: 150,
	name: 'Aether Guardian',
	cardreward: '0380a',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Aether Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.airtemple = {
	deck: '0f5oc035ou045or0a7n1018pr',
	hp: 150,
	name: 'Air Guardian',
	cardreward: '037n1',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Air Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.darktemple = {
	deck: '0f5uk035uv045ul0a7tc018pt',
	hp: 150,
	name: 'Dark Guardian',
	cardreward: '037tc',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Dark Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.deathtemple = {
	deck: '03535035370a7180d52g018pk',
	hp: 150,
	name: 'Death Guardian',
	cardreward: '03718',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Death Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.earthtemple = {
	deck: '0958o0658u0658r0a77l018pm',
	hp: 150,
	name: 'Earth Guardian',
	cardreward: '0377l',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Earth Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.entropytemple = {
	deck: '0f4vc034vd044ve0a6u2018pj',
	hp: 150,
	name: 'Entropy Guardian',
	cardreward: '036u2',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Entropy Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.firetemple = {
	deck: '0e5f0035f3045fc0a7dk018po',
	hp: 150,
	name: 'Fire Guardian',
	cardreward: '037dk',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Fire Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.gravitytemple = {
	deck: '0d55k0455l0355s0a74k018pl',
	hp: 150,
	name: 'Gravity Guardian',
	cardreward: '0374k',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Gravity Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.lifetemple = {
	deck: '0d5bs065bu055c70a7ai018pn',
	hp: 150,
	name: 'Life Guardian',
	cardreward: '037ai',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Life Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.lighttemple = {
	deck: '0c5l8035lo045ln0a7jv018pq',
	hp: 150,
	name: 'Light Guardian',
	cardreward: '037jv',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Light Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.timetemple = {
	deck: '0e5rg045ru035rm0a7q4018ps',
	hp: 150,
	name: 'Time Guardian',
	cardreward: '037q4',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Time Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.watertemple = {
	deck: '0f5i4045ie035id0a7go018pp',
	hp: 150,
	name: 'Water Guardian',
	cardreward: '037go',
	wintext:
		'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
	questdependencies: ['elementalshrine'],
	info:
		'As you approach the Water Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
};
quarks.chromatemple = {
	deck: '064vj066qq026u10271a0174a0274e0277g027ah017dm027n0027t90280a018pi',
	name: 'Chroma Guardian',
	hp: 200,
	drawpower: 2,
	choicerewards: 'uppedrare',
	rewardamount: 2,
	wintext:
		'You have done it. You have completed the battle of the temples. A quest which took you all over the world. The chroma elemental looks at you, pleased. He knows how long it took to get here and he knows how hard it was to win. He is proud of you. As a reward, he offers you a choice of his finest possessions.',
	questdependencies: [
		'aethertemple',
		'airtemple',
		'darktemple',
		'deathtemple',
		'earthtemple',
		'entropytemple',
		'firetemple',
		'gravitytemple',
		'lifetemple',
		'lighttemple',
		'timetemple',
		'watertemple',
	],
	info:
		'You walk up to the steps of the last temple, the Chroma Temple. It was harsh getting here, but well worth it. This is it.',
};
exports.root = {
	children: [
		{
			key: 'necromancer',
			children: [
				{
					key: 'necromancer2',
				},
				{
					key: 'necromancer3',
				},
			],
		},
		{
			key: 'blacksummoner',
		},
		{
			key: 'inventor',
			children: [
				{
					key: 'inventor2',
				},
				{
					key: 'inventor3',
				},
			],
		},
		{
			key: 'bombmaker',
		},
		{
			key: 'icecave',
			children: [
				{
					key: 'icecave2',
					children: [
						{
							key: 'icecave3',
							children: [
								{
									key: 'icecave4',
								},
							],
						},
					],
				},
			],
		},
		{
			name: 'Proving Grounds',
			children: [
				{
					key: 'pgdragon',
				},
				{
					key: 'pgrare',
				},
				{
					key: 'pgshard',
				},
				{
					key: 'pgfarmer',
				},
				{
					key: 'pggeomancer',
				},
				{
					key: 'pgnymph',
				},
			],
		},
		{
			key: 'elementalshrine',
			children: [
				{
					key: 'aethertemple',
				},
				{
					key: 'airtemple',
				},
				{
					key: 'darktemple',
				},
				{
					key: 'deathtemple',
				},
				{
					key: 'earthtemple',
				},
				{
					key: 'entropytemple',
				},
				{
					key: 'firetemple',
				},
				{
					key: 'gravitytemple',
				},
				{
					key: 'lifetemple',
				},
				{
					key: 'lighttemple',
				},
				{
					key: 'timetemple',
				},
				{
					key: 'watertemple',
				},
				{
					key: 'chromatemple',
				},
			],
		},
		{
			key: 'spirit',
			children: [
				{
					key: 'spirit2',
				},
				{
					key: 'spirit3',
				},
				{
					key: 'spirit4',
				},
				{
					key: 'spirit5',
				},
			],
		},
	],
};
exports.quarks = quarks;
exports.mkQuestAi = function(quest, datafn) {
	const markpower = quest.markpower || 1;
	const drawpower = quest.drawpower || 1;
	const hp = quest.hp || 100;
	const playerHPstart = quest.urhp || 100;
	const { user } = store.store.getState();
	let urdeck = quest.urdeck;
	if (!urdeck) {
		urdeck = sock.getDeck();
		if (!Cards.isDeckLegal(etgutil.decodedeck(urdeck), user)) {
			store.store.dispatch(store.chatMsg(`Invalid deck`, 'System'));
			return;
		}
	}
	const data = {
		quest,
		wintext: quest.wintext || '',
		noheal: quest.noheal,
		deck: quest.deck,
		urdeck: urdeck,
		seed: util.randint(),
		p2hp: hp,
		p2markpower: markpower,
		foename: quest.name,
		p1hp: playerHPstart,
		p2drawpower: drawpower,
		ai: 1,
	};
	if (!user.quests[quest.key]) {
		data.cardreward = quest.cardreward;
		data.goldreward = quest.goldreward;
		data.choicerewards = quest.choicerewards;
		data.rewardamount = quest.rewardamount;
	}
	const game = require('./mkGame')(datafn ? datafn(data) : data);
	if (quest.morph) {
		game.player1.deckIds = game.player1.deck.map(
			x => game.player1.newThing(quest.morph(x.card)).id,
		);
	}
	return game;
};
