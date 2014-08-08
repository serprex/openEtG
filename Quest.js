//Quest data
exports.necromancer = [
	{ deck: "04531027170b52g0c52m0452n018pk", name: "Skeleton Horde", hp: 80, markpower: 2, wintext: "You defeated the horde, but you should find out where they came from" },
	{ deck: "0d5bs045bu045c1025ca018pp", name: "Forest Wildlife", hp: 60, wintext: "The creatures seemed very afraid of something, like there was something in the forest that did not belong there." },
	{ deck: "0553104535047170d52g0652m0352l0552t018pk", name: "Evil Necromancer", hp: 120, markpower: 2, wintext: "You defeated the evil necromancer and stopped his undead from spreading through the land!" },
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
	morph: { from: "4t8 6ro 4vd 6tt 4ve 6tu 4vf 6tv 4vh 6u1 4vm 6u6 4vq 6ua 4vr 6ub 4vs 6uc 4vu 6ue 502 6ui 500 6ug 52h 711 " +
			"52i 712 52j 713 52k 714 52m 716 52t 71d 52u 71e 534 71k 535 71l 55l 745 55m 746 55n 747 55o 748 55r 74b 55u " +
			"74e 563 74j 565 74l 566 74m 567 74n 568 74o 56i 752 58p 779 58q 77a 58r 77b 58u 77e 590 77g 591 77h 596 77m " +
			"597 77n 59c 77s 5bt 7ad 5bu 7ae 5bv 7af 5c0 7ag 5c1 7ah 5c8 7ao 5ca 7aq 5cb 7ar 5cc 7as 5ce 7au 5cf 7av 5cr " +
			"7bb 5cs 7bc 5cg 7b0 5f1 7dh 5f2 7di 5f3 7dj 5fa 7dq 5fc 7ds 5fd 7dt 5fe 7du 5fh 7e1 5fk 7e4 5i5 7gl 5i6 7gm " +
			"5ib 7gr 5id 7gt 5ie 7gu 5if 7gv 5ii 7h2 5il 7h5 5io 7h8 5l9 7jp 5la 7jq 5lb 7jr 5le 7ju 5ll 7k5 5ln 7k7 5lo " +
			"7k8 5lr 7kb 5ls 7kc 5od 7mt 5oe 7mu 5of 7mv 5oj 7n3 5ok 7n4 5or 7nb 5os 7nc 5ot 7nd 5ou 7ne 5p0 7ng 5rh 7q1 " +
			"5ri 7q2 5rm 7q6 5rn 7q7 5rq 7qa 5rs 7qc 5rt 7qd 5ru 7qe 5s5 7ql 5s4 7qk 5ul 7t5 5um 7t6 5un 7t7 5ut 7td 5uv " +
			"7tf 5v0 7tg 5v3 7tj 5v8 7to 61p 809 61s 80c 61v 80f 620 80g 625 80l 626 80m 627 80n 62c 80s " +
			"4sa 6qq 4sc 6qs 4vc 6ts 50u 6ve 52g 710 542 72i 55k 744 576 75m 58o 778 5aa 78q 5bs 7ac 5de 7bu 5f0 7dg 5gi " +
			"7f2 5i4 7gk 5jm 7i6 5l8 7jo 5mq 7la 5oc 7ms 5pu 7oe 5rg 7q0 5t2 7ri 5uk 7t4 606 7um 61o 808 63a 81q",
		to: "7tj 7t5 5uv 7td 7td 7tg 5uv 7to 5uv 5uv 7t7 5um 7to 5v3 7t5 5v3 7to 7tf 7tj 5ut 5ut 5v3 5v0 5v3 7t7 5v8 7tf " +
			"7td 7t6 7t7 7t5 7t6 7tg 7tf 7tf 7t6 5ul 7tg 7t5 5v8 7t6 5v8 7td 5ul 5v3 5v3 5v3 5v0 5uv 5v3 7t7 7tj 7td 7to " +
			"7t6 5ul 7tj 5ul 5um 7tg 5uv 7t7 7t5 7tg 7to 5v0 7to 7tg 7tf 5ul 5ut 5ul 7tj 5um 5v8 5ul 7tf 7tg 7tj 7tj 7t7 " +
			"5v3 7tg 7t5 5um 5v3 5ul 7t6 7t6 7tj 7t6 7tf 5uv 5um 7t6 7tf 5un 5ul 5ul 7t7 7td 7td 7td 7t6 7t6 7t6 5uv 7t5 " +
			"7tg 7td 7td 5ut 5um 5uv 7tf 7to 7tg 5v8 5um 5v0 7to 7t6 7td 5uv 7t6 5um 7tj 5un 7t7 7td 5um 5un 7to 5un 7tj " +
			"5ut 7t7 5v3 5ul 5un 7t6 7t5 5v8 5un 7td 7t6 7td 7t6 5ul 5v3 5ul 7td 7tj 7tf 7t5 5v0 7to 7tg 5v3 5ul 7to 7tf " +
			"7tj 5v0 7tf 7to 7td 5v3 7t6 5un 5v3 5um 7tf 7t6 5ut 7td 5v8 7t5 5v8 5v3 7td 5v8 7t7 7to 7t7 5ut 7td 7tj 7tj " +
			"7t7 5uv 5v0 5uv 5un 7to 7tg 5un 7tf 7tj 5v0 5un 7tj 5v0 5v8 7t6 7to 5um 5um 7t6 7to 5um 7t6 5v8 5un 5ut 5v0 " +
			"7t6 7tf 7to 7t5 5v8 7t7 7t5 7tj 7t7 7to 5uv 7td 5ul 5v0 7t6 7tg 5ul 5v3 5ul 7td 5um 7t7 " +
			"7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um " +
			"7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um"},
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

//Elemental Temples
exports.elementalshrine = [{ deck: "015990c4sa014vi014vh0152m0152o0155t0155n0158p015c8015c7015f3015fb015ia015i6015lp015lr015on015ou015ri015rr015v1015ut0162a0161q018pi", name: "Shrine Guardian", hp: 100, wintext: "The Shrine Guardian speaks to you: 'You have bested me, but I am only the beginning. Find the Temples and challenge their guardians, and they will reward you! If you defeat them all, you will get access to the Chroma Palace, where the strongest guardian reside.'"}];
exports.aethertemple = [{ deck: "02622036280f61o0361u0a80a018pu", name: "Aether Guardian", hp: 150, cardreward: "0380a", wintext: "As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.", dependency: requireQuest, questdependencies:[["elementalshrine", 1]] }];
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
	provinggrounds: ["pgdragon", "pgrare", "pgshard"],
};

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