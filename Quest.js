"use strict";
var sock = require("./sock");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
//Quest data
exports.necromancer = [
	{ deck: "04531027170b52g0c52m0452n018pk", name: "Skeleton Horde", hp: 80, markpower: 2, wintext: "You defeated the horde, but you should find out where they came from" },
	{ deck: "0d5bs045bu045c1025ca018pp", name: "Forest Wildlife", hp: 60, wintext: "The creatures seemed very afraid of something, like there was something in the forest that did not belong there." },
	{ deck: "0553104535047170d52g0652m0352l0552t018pk", name: "Evil Necromancer", hp: 120, markpower: 2, cardreward:"03531", wintext: "You defeated the evil necromancer and stopped his undead from spreading through the land!" },
];
exports.spirit = [
	{ deck: "0c606045um045us045v3025uu025v2025va018pi", name: "Evil Spirit", hp: 150, wintext: "You have defeated the evil spirit and stopped its dark influence from spreading through the land!\
		... But a dark energy is still troubling this region... \
		You sense a cold, chill air coming from a portal looming darkly at the back of the cave.", dependency:notComplete},
	{ deck: "015010i50u044vi034vh014vl024vn015ur025uq035ut045up015v2018pt", name: "Portal Guardian", hp: 175, wintext: "The portal guardian lies vanquished, but despite your best efforts you cannot close the portal from this side.\
		Examining the guardian's remains you find an ancient tome which describes the portal before you and the lands beyond\
		The incubus key lies in a large fortress at the center of the realm. You will have to venture forth."},
	{ deck: "02530015340a542044vq034vk024vv014vo0452v0252k0352n018pj", name: "Grim Maiden", hp: 175, wintext: "The maiden's swarm of skeletal minions seems endless but they are weak and fall easily.\
		Her pet cats and vultures tear viciously at your allies, but you finally manage to push past them.\
		The Grim Maiden is a truly powerful foe. Her magic wreaking havoc upon your allies.\
		Just as you are about to land the final blow, she vanishes.\
		You can hear her eerie voice echoing off of the wind, growing faint and distant.\
		'Turn back foolish mortal. This road will only lead to your doom. My sisters will not be so forgiving!'"},
	{ deck: "065ot025og065on0a6rb067n6018po", name: "Swamp Gas", wintext: "You escape the deadly explosions, just barely... A massive storm is approaching. You will need shelter.\
		A nearby abandoned mansion may be your only option. Warily you open the door. It creaks forebodingly.\
		You are greated by dank and musty air, but it seems otherwise empty. You sit and wait out the storm.\
		While waiting you could swear you hear footsteps in other rooms and voices talking.\
		However, every search turns up nothing but empty ill kept rooms and dust.\
		Just as you are about to leave, an evil laugh from behind you sends chills down your spine\
		The shadows on the wall begin to move of their own accord. And all the doors slam shut with conviction.\
		You turn to face your assailant, apparently a sister of the maiden you fell earlier."},
	{ deck: "0b606015ur025us035up025uu025v2035vb015uo025uv015v8025ul018pi", name: "Spirit of the Dark Maiden",
	morph: function(card){
		return Cards.Codes[this.morphtable[card.code] || card.code];
	},
	morphtable: {"500":"5v0","502":"5ut","534":"7t5","535":"7t6","542":"7um","563":"7t6","565":"7tj","566":"5um","567":"5uv",
		"568":"7t5","576":"7um","590":"5v8","591":"7tf","596":"7tj","597":"7t7","606":"7um","620":"5ul","625":"7t6","626":"5ul",
		"627":"5ul","710":"7um","711":"5v8","712":"7td","713":"7t7","714":"7t6","716":"7tf","744":"7um","745":"5ul","746":"5v3",
		"747":"5v0","748":"5v3","752":"5v0","778":"7um","779":"7tg","808":"7um","809":"7tj","4t8":"7tj","6ro":"7t5","4vd":"5uv",
		"6tt":"7td","4ve":"7td","6tu":"7tg","4vf":"5uv","6tv":"7to","4vh":"5uv","6u1":"5uv","4vm":"7t7","6u6":"5um","4vq":"7to",
		"6ua":"5v3","4vr":"7t5","6ub":"5v3","4vs":"7to","6uc":"7tf","4vu":"7tj","6ue":"5ut","6ui":"5v3","6ug":"5v3","52h":"7t7",
		"52i":"7tf","52j":"7t6","52k":"7t5","52m":"7tg","52t":"7tf","71d":"7t6","52u":"5ul","71e":"7tg","71k":"5v8","71l":"5v8",
		"55l":"7td","55m":"5v3","55n":"5v3","55o":"5uv","55r":"7t7","74b":"7tj","55u":"7td","74e":"7to","74j":"5ul","74l":"5ul",
		"74m":"7tg","74n":"7t7","74o":"7tg","56i":"7to","58p":"7to","58q":"7tf","77a":"5ul","58r":"5ut","77b":"5ul","58u":"7tj",
		"77e":"5um","77g":"5ul","77h":"7tg","77m":"7tj","77n":"5v3","59c":"7tg","77s":"7t5","5bt":"5um","7ad":"5v3","5bu":"5ul",
		"7ae":"7t6","5bv":"7t6","7af":"7tj","5c0":"7t6","7ag":"7tf","5c1":"5uv","7ah":"5um","5c8":"7t6","7ao":"7tf","5ca":"5un",
		"7aq":"5ul","5cb":"5ul","7ar":"7t7","5cc":"7td","7as":"7td","5ce":"7td","7au":"7t6","5cf":"7t6","7av":"7t6","5cr":"5uv",
		"7bb":"7t5","5cs":"7tg","7bc":"7td","5cg":"7td","7b0":"5ut","5f1":"5um","7dh":"5uv","5f2":"7tf","7di":"7to","5f3":"7tg",
		"7dj":"5v8","5fa":"5um","7dq":"5v0","5fc":"7to","7ds":"7t6","5fd":"7td","7dt":"5uv","5fe":"7t6","7du":"5um","5fh":"7tj",
		"7e1":"5un","5fk":"7t7","7e4":"7td","5i5":"5um","7gl":"5un","5i6":"7to","7gm":"5un","5ib":"7tj","7gr":"5ut","5id":"7t7",
		"7gt":"5v3","5ie":"5ul","7gu":"5un","5if":"7t6","7gv":"7t5","5ii":"5v8","7h2":"5un","5il":"7td","7h5":"7t6","5io":"7td",
		"7h8":"7t6","5l9":"5ul","7jp":"5v3","5la":"5ul","7jq":"7td","5lb":"7tj","7jr":"7tf","5le":"7t5","7ju":"5v0","5ll":"7to",
		"7k5":"7tg","5ln":"5v3","7k7":"5ul","5lo":"7to","7k8":"7tf","5lr":"7tj","7kb":"5v0","5ls":"7tf","7kc":"7to","5od":"7td",
		"7mt":"5v3","5oe":"7t6","7mu":"5un","5of":"5v3","7mv":"5um","5oj":"7tf","7n3":"7t6","5ok":"5ut","7n4":"7td","5or":"5v8",
		"7nb":"7t5","5os":"5v8","7nc":"5v3","5ot":"7td","7nd":"5v8","5ou":"7t7","7ne":"7to","5p0":"7t7","7ng":"5ut","5rh":"7td",
		"7q1":"7tj","5ri":"7tj","7q2":"7t7","5rm":"5uv","7q6":"5v0","5rn":"5uv","7q7":"5un","5rq":"7to","7qa":"7tg","5rs":"5un",
		"7qc":"7tf","5rt":"7tj","7qd":"5v0","5ru":"5un","7qe":"7tj","5s5":"5v0","7ql":"5v8","5s4":"7t6","7qk":"7to","5ul":"5um",
		"7t5":"5um","5um":"7t6","7t6":"7to","5un":"5um","7t7":"7t6","5ut":"5v8","7td":"5un","5uv":"5ut","7tf":"5v0","5v0":"7t6",
		"7tg":"7tf","5v3":"7to","7tj":"7t5","5v8":"5v8","7to":"7t7","61p":"7t5","61s":"7t7","80c":"7to","61v":"5uv","80f":"7td",
		"80g":"5v0","80l":"7tg","80m":"5v3","80n":"7td","62c":"5um","80s":"7t7","4sa":"7um","6qq":"7um","4sc":"7um","6qs":"7um",
		"4vc":"7um","6ts":"7um","50u":"7um","6ve":"7um","52g":"7um","72i":"7um","55k":"7um","75m":"7um","58o":"7um","5aa":"7um",
		"78q":"7um","5bs":"7um","7ac":"7um","5de":"7um","7bu":"7um","5f0":"7um","7dg":"7um","5gi":"7um","7f2":"7um","5i4":"7um",
		"7gk":"7um","5jm":"7um","7i6":"7um","5l8":"7um","7jo":"7um","5mq":"7um","7la":"7um","5oc":"7um","7ms":"7um","5pu":"7um",
		"7oe":"7um","5rg":"7um","7q0":"7um","5t2":"7um","7ri":"7um","5uk":"7um","7t4":"7um","7um":"7um","61o":"7um","63a":"7um","81q":"7um"},
	wintext: "As the maiden falls, your powers return to normal, and your allies settle back into their original forms.\
		the shadows that gripped and drained your energies recede. Your strength returns to its former glory.\
		You are still feeling tired from the fight, but the storm has passed, leaving an oddly purple sky.\
		In light of recent events, you decide it is probably best to get out while you can, tired or not.\
		Afterall whatever lies down the road has to be less painful than risking encountering another spirit.\
		...right? ... You open the creaky door and head back out down the gravel path.\
		as you take your first step you hear the maiden's silvery voice echoing from the house behind you.\
		'It appears you may be as stong as my sister claims. Your soul shall make a most delectable morsel.\
		'We shall meet again... Don't die before then. I'ld hate to lose my favorite toy.' She fades into the darkness.\
		Off in the distance the storm has settled above the castle, the echos of ominous thunder growing fainter.\
		You hope it will be gone by the time you get there... but given your luck so far, you don't think it will.\
		Storm or not, you didn't come this far just to turn back, so you continue your treck down the path."},
];
exports.bombmaker = [
	{ deck: "046220f5t2065s50680d018pu", name: "Bomb Maker 1", autonext: true },
	{ deck: "0f5rg045rk035ro065ru065v1067ql018pt", name: "Bomb Maker 2", autonext: true },
	{ deck: "035f4065f6025f5025f80e5oc065om025p0018po", name: "Bomb Maker 3", markpower: 3, drawpower: 2, cardreward: "045om035s5027ql", wintext: "Congratulations! Here, take some of my bombs as the reward!" },
];
exports.blacksummoner = [{ deck: "0f7t5018pt", name: "The Black Summoner", markpower: 12, cardreward: "027t5", wintext: "You defeat the Dark Summoner that controlled the dragons. The dragons fly away, but two of them stays, looking at you. You decide to let them join you!" }];

exports.icecave = [
	{ deck: "0e5i4055i8025i9035id018pp", name: "Snow Storm", hp: 75, wintext: "You get through the storm and finally reach the mysterious cave where the weapon is said to reside." },
	{ deck: "085i4065ik035ia035ib025ic045id018pp", name: "Cave Guardians??", hp: 75, wintext: "You defeat the creatures that were attacking, and can finally take the rare weapon that was hiding in the cave; a Trident! But before you can grab it, you hear strange sounds behind you..." },
	{ deck: "054sa0a4sc025i5015im025iq015ic025il025ii025ie035ig018pp", name: "Cave Guardians", hp: 75, wintext: "After defeating the Guardians, you quickly get out of the cave, ready to head home as fast as you can..." },
	{ deck: "0f5i4035ib025ih025i9025ig047gt018pp", name: "Ice Storm", hp: 75, wintext: "You finally get though the storm and reach the safety of the city. You got the weapon you were looking for, and some other ice souvenirs as well.", cardreward: "025i8015ic" },
];
exports.inventor = [
	{ deck: "03561065950d55k0655m0255s018pm", name: "Defense Catapults", hp:125, wintext: "You manage to get past the crazy inventor's defense system, and get closer to his big house." },
	{ deck: "065f1045ff035f7075i4065ik045ii018po", name: "Armored Machines", hp:120, wintext: "Defeating the machines that were terrorizing the village, you head inside to face the inventor."},
	{ deck: "0d5de065c5065fh065f7018po", name: "Crazy Inventor", hp: 125, wintext: "Even with his inventions, you manage to defeat him. 'No, please, spare me, I will never hurt anyone again!' he cries. You agree to let him go, but only if he leaves the area and never comes back. You see him walking away and can't help but thinking that you haven't seen the last of him... On your way out of the house, you find some of his inventions and decide that they can be useful!", cardreward: "03561025fh025ii" },
];
//Proving Grounds
exports.pgdragon = [{ deck: "0g4sa014vf0152h0155o0158r015bt015f2015id015la015op015rm015ul0661t018pu", name: "Dragon Tamer", hp: 150, wintext: "You have proved your worth for the Dragon Tamer, and he gives you two of his dragons.", choicerewards: ["4vf", "52h", "55o", "58r", "5bt", "5f2", "5id", "5la", "5of", "5rm", "5ul", "61v"], rewardamount:2 }];
exports.pgrare = [{ deck: "015360a4sa014vl0152q0155s0158v015c5065ff045fh015f7015ic015ir015lh025oi015ol015ro015ur0161u018po", name: "Master of Arms", hp: 150, wintext: "You have proved your worth for the Master of Arms, and he gives you one of his rare cards.", choicerewards: "rare" }];
exports.pgshard = [{ deck: "0c4sa0250a0253e0256i0659m025cq025fu025j2025m6025pa025se025vi0262m018pm", name: "Gemcutter", hp: 150, wintext: "You have proved your worth for the Gemcutter and he gives you one of his shards.", choicerewards: "shard" }];
exports.pgfarmer = [{ deck: "0a4sc044vs064vu0a5t2018pj", name: "Farmer", hp: 150, goldreward: 100, wintext: "You have proved your worth for the Farmer and he gives you 100 gold." }]
exports.pggeomancer = [{ deck: "0154201576016060c4sc0150u015aa015de015gi015jm015mq015pu015t20163a067h0018pp", name: "Geomancer", hp: 150, choicerewards: "uppedpillar", rewardamount: 2, wintext: "You have proved your worth for the Geomancer and he gives you 2 of his Towers." }]
exports.pgnymph = [{ deck: "015000153401568094sa094sc0159c015cg015fk015io015ls015p0015s4015v80162c018pi", name: "Eunuch", hp: 150, choicerewards: "nymph", wintext: "You have proved your worth for the Eunuch and he gives you one of his Nymphs" }]

//Elemental Temples
exports.elementalshrine = [{ deck: "015990c4sa014vi014vh0152m0152o0155t0155n0158p015c8015c7015f3015fb015ia015i6015lp015lr015on015ou015ri015rr015v1015ut0162a0161q018pi", name: "Shrine Guardian", hp: 100, wintext: "The Shrine Guardian speaks to you: 'You have bested me, but I am only the beginning. Find the Temples and challenge their guardians, and they will reward you! If you defeat them all, you will get access to the Chroma Palace, where the strongest guardian reside.'"}];
exports.aethertemple = [{ deck: "02622036280f61o0361u0a80a018pu", hp: 150, name: "Aether Guardian", cardreward: "0380a", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }];
exports.airtemple = [{ deck: "0f5oc035ou045or0a7n1018pr", hp: 150, name: "Air Guardian", cardreward: "037n1", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }];
exports.darktemple = [{ deck: "0f5uk035uv045ul0a7tc018pt", hp: 150, name: "Dark Guardian", cardreward: "037tc", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }];
exports.deathtemple = [{ deck: "03535035370a7180d52g018pk", hp: 150, name: "Death Guardian", cardreward: "03718", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency:requireQuest, questdependencies:[["elementalshrine",1]] }];
exports.earthtemple = [{ deck: "0958o0658u0658r0a77l018pm", hp: 150, name: "Earth Guardian", cardreward: "0377l", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }];
exports.entropytemple = [{ deck: "0f4vc034vd044ve0a6u2018pj", hp: 150, name: "Entropy Guardian", cardreward: "036u2", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }]
exports.firetemple = [{ deck: "0e5f0035f3045fc0a7dk018po", hp: 150, name: "Fire Guardian", cardreward: "037dk", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }];
exports.gravitytemple = [{ deck: "0d55k0455l0355s0a74k018pl", hp: 150, name: "Gravity Guardian", cardreward: "0374k", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency:requireQuest, questdependencies:[["elementalshrine",1]] }];
exports.lifetemple = [{ deck: "0d5bs065bu055c70a7ai018pn", hp: 150, name: "Life Guardian", cardreward: "037ai", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies: [["elementalshrine", 1]] }];
exports.lighttemple = [{ deck: "0c5l8035lo045ln0a7jv018pq", hp: 150, name: "Light Guardian", cardreward: "037jv", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies: [["elementalshrine", 1]] }];
exports.timetemple = [{ deck: "0e5rg045ru035rm0a7q4018ps", hp: 150, name: "Time Guardian", cardreward: "037q4", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }];
exports.watertemple = [{ deck: "0f5i4045ie035id0a7go018pp", hp: 150, name: "Water Guardian", cardreward: "037go", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }];
exports.chromatemple = [{
	deck: "064vj066qq026u10271a0174a0274e0277g027ah017dm027n0027t90280a018pi", name: "Chroma Guardian", hp: 200, drawpower: 2, choicerewards: "uppedrare", rewardamount: 2, wintext: "You have done it. You have completed the battle of the temples. A quest which took you all over the world. The chroma elemental looks at you, pleased. he knows how long it took to get here and he knows how hard it was to win. He is proud of you. As a reward, he offers you a choice of his finest possessions.",
	dependency: requireQuest, questdependencies:[["aethertemple", 1], ["airtemple", 1], ["darktemple", 1], ["deathtemple", 1], ["earthtemple", 1], ["entropytemple", 1], ["firetemple", 1], ["gravitytemple", 1], ["lifetemple", 1], ["lighttemple", 1], ["timetemple", 1], ["watertemple", 1]]
}];

//Menu info
exports.necromancer.info = { pos: [[200, 200], [200, 250], [225, 300]], text: ["A horde of skeletons have been seen nearby, perhaps you should go investigate?", "They seemed to come from the forest, so you go inside.", "Deep inside the forest you find the necromancer responsible for filling the lands with undead!"] };
exports.spirit.info = { pos: [[275, 350], [325, 375], [500, 200], [500, 250], [525, 275]], text:["You pursue the energy trail of the spirit to a dark cavern.\At first you think it has eluded you, but as you turn to leave, its dark shadowy form rises in front of you",
	"You approach the portal and a large Elemental steps out of the shadows, purple energy swirling about it.\
		'Only the worthy may pass'...You state that your only intention is to destroy the portal not pass through it.\
		'Only the incubus key can close this portal.' The guardian glowers at you darkly.\
		If you wish to find it you must first pass my test.' The guardian attacks!",
	"You step through the portal and are wisked off to a shifting expanse of swampland. Purple lightning crackles above.\
		Far off, in the distant center of the dark and brooding expanse, stands an ominous fortress.\
		The gravel road before you winds its way toward it like a great serpent slithering its way through a desolate bog.\
		A lone maiden blocks your path. In a voice like claws upon glass she shrieks 'you do not belong here... DIE!' ",
	"As you continue up the road, a foul stench assaults your nose... Then you hear a poping sound.\
		To the side of the road a sign reads 'Danger, swamp gas is explosive. Travelers beware'\
		You decide that NOW would be a good time to run!... But a flock of giant angry birds is in your way",
	"You turn to face your attacker, but as you call on your powers, only darkness answers.\
		Your allies come to your aid but their forms have all been twisted. The dark lady laughs mischeviously.\
		'You must think yourself dreaming... Well this is the nightmare realm, and I am the one in control.\
		I think I will toy with you first... before I swallow your soul.' The shadows lunge toward you in a vicious attack."]};
exports.bombmaker.info = {pos: [[600,400]], text:["A bomb maker have set up shop nearby. He have put up a sign promising a reward if you can beat him and his bombs three times in a row."]}
exports.blacksummoner.info = { pos: [[500, 420]], text: ["A swarm of dragons can be seen nearby. Maybe you could manage to tame one of them?"] }
exports.icecave.info = { pos: [[300, 350], [260, 250], [220, 250], [200,350]], text: ["You heard a story about a rare weapon hidden in a cave up north. You decide to look for the weapon. On the way there you are caught in the middle of a big snow storm.",
	"You enter the cave, it is dark and icy. Suddenly you meet some creatures there, which promptly attacks you. You seem to glimpse the rare weapon right behind them though...",
	"You look behind you and see a range of different creatures, which you can swear were not here before. 'We are the Guardians of this Cave, and we will not allow you to take our treasure!'",
	"The storm you got past while heading here is still raging, and it seems to have gotten a lot worse."]
}
exports.inventor.info = {
	pos: [[500, 300], [510, 360], [505, 410]], text: ["You come across a small village that claims they are being regularly attacked by machines coming from a crazy inventor living nearby. You decide to put a stop to this crazy man's evil endeavors. On your way there you suddenly see a big Armagio landing in front of you. 'Catapults!' you think, and get ready to fight.",
	"In front of the house some machines seems to stand guards. These must be the machines that were attacking the village!",
	"'All I wanted was to test the offensive capabilities of my machines. But now when you are here, I can test this on you!' says the crazy inventor and laughs."]
}
exports.pgdragon.info = { pos: [[200, 200]], text: ["Fight the Dragon Tamer at the Proving Grounds!"] };
exports.pgrare.info = { pos: [[250, 200]], text: ["Fight the Master of Arms at the Proving Grounds!"] };
exports.pgshard.info = { pos: [[225, 250]], text: ["Fight the Gemcutter at the Proving Grounds!"] };
exports.pgfarmer.info = { pos: [[175, 250]], text: ["Fight the Farmer at the Proving Grounds!"] };
exports.pggeomancer.info = { pos: [[275, 250]], text: ["Fight the Geomancer at the Proving Grounds!"] };
exports.pgnymph.info = { pos: [[225, 300]], text: ["Fight the Eunuch at the Proving Grounds!"] };

exports.elementalshrine.info = { pos: [[400,400]], text: ["You walk up to the shrine. You don't know what to expect. Suddenly, you are attacked by a cloaked figure! Could it be the Shrine Guardian!?"] };
exports.aethertemple.info = { pos: [[500,220]], text: ["As you approach the Aether Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.airtemple.info = { pos: [[400,400]], text: ["As you approach the Air Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.darktemple.info = { pos: [[200,400]], text: ["As you approach the Dark Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.deathtemple.info = { pos: [[400,200]], text: ["As you approach the Death Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.earthtemple.info = { pos: [[300,420]], text: ["As you approach the Earth Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.entropytemple.info = { pos: [[200,400]], text: ["As you approach the Entropy Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.firetemple.info = { pos: [[360,400]], text: ["As you approach the Fire Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.gravitytemple.info = { pos: [[600,250]], text: ["As you approach the Gravity Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.lifetemple.info = { pos: [[550,420]], text: ["As you approach the Life Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.lighttemple.info = { pos: [[200,200]], text: ["As you approach the Light Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.timetemple.info = { pos: [[200,300]], text: ["As you approach the Time Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.watertemple.info = { pos: [[200,200]], text: ["As you approach the Water Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians."] }
exports.chromatemple.info = { pos: [[400,340]], text: ["You walk up to the steps of the last temple, the Chroma Temple. It was harsh getting here, but well worth it. This is it."] }
exports.areas = {
	forest: ["necromancer", "spirit", "inventor", "lifetemple", "earthtemple", "darktemple"],
	city: ["bombmaker", "elementalshrine", "aethertemple", "entropytemple", "lighttemple"],
	desert: ["blacksummoner", "timetemple", "deathtemple", "firetemple", "chromatemple"],
	ice: ["icecave", "watertemple", "gravitytemple", "airtemple"],
	provinggrounds: ["pgdragon", "pgrare", "pgshard", "pgfarmer","pggeomancer", "pgnymph"],
};
exports.mkQuestAi = function(questname, stage, area) {
	var quest = exports[questname][stage];
	if (!quest)
		return "Quest " + questname + ":" + stage + " does not exist.";
	var markpower = quest.markpower || 1;
	var drawpower = quest.drawpower || 1;
	var hp = quest.hp || 100;
	var playerHPstart = quest.urhp || 100;
	var urdeck = sock.getDeck();
	if (etgutil.decklength(urdeck) < (sock.user ? 31 : 11)) {
		return "ERROR: Your deck is invalid or missing! Please exit & create a valid deck in the deck editor.";
	}
	var game = require("./views/Match")({ deck: quest.deck, urdeck: urdeck, seed: Math.random() * etgutil.MAX_INT, p2hp: hp, p2markpower: markpower, foename: quest.name, p1hp: playerHPstart, p2drawpower: drawpower }, true);
	if (quest.morph) {
		game.player1.deck = game.player1.deck.map(quest.morph.bind(quest));
	}
	game.quest = [questname, stage];
	game.wintext = quest.wintext || "";
	game.autonext = quest.autonext;
	game.noheal = quest.noheal;
	game.area = area;
	if ((sock.user.quest[questname] <= stage || !(questname in sock.user.quest))) {
		game.cardreward = quest.cardreward;
		game.goldreward = quest.goldreward;
		game.choicerewards = quest.choicerewards;
		game.rewardamount = quest.rewardamount;
	}
	return game;
}

//Dependency functions
function requireQuest(user) {
	var listofquests = this.questdependencies;
	return this.questdependencies.every(function(dependency){
		var progress = user.quest[dependency[0]];
		return progress && progress >= dependency[1];
	});
}
function notComplete() {
	return false;
}