//Quest data
exports.necromancer = {};
exports.necromancer[0] = { deck: "52g 52g 52g 52g 52g 52g 52g 52g 52g 52g 52g 52m 52m 52m 52m 52m 52m 52m 52m 52m 52m 52m 52m 531 531 531 531 52n 52n 52n 52n 717 717 8pk", name: "Skeleton Horde", hp: 80, markpower: 2, wintext: "You defeated the horde, but you should find out where they came from" };
exports.necromancer[1] = { deck: "5bs 5bs 5bs 5bs 5bs 5bs 5bs 5bs 5bs 5bs 5bs 5bs 5bs 5bu 5bu 5bu 5bu 5c1 5c1 5c1 5c1 5ca 5ca 8pp", name: "Forest Wildlife", hp: 60, wintext: "The creatures seemed very afraid of something, like there was something in the forest that did not belong there." };
exports.necromancer[2] = { deck: "52g 52g 52g 52g 52g 52g 52g 52g 52g 52g 52g 52g 52g 52m 52m 52m 52m 52m 52m 531 531 531 531 531 52l 52l 52l 52t 52t 52t 52t 52t 535 535 535 535 717 717 717 717 8pk", name: "Evil Necromancer", hp: 120, markpower: 2, wintext: "You defeated the evil necromancer and stopped his undead from spreading through the land!" };

exports.spirit = {};
exports.spirit[0] = {
	deck: "606 606 606 606 606 606 606 606 606 606 606 606 5um 5um 5um 5um 5us 5us 5us 5us 5v3 5v3 5v3 5v3 5uu 5uu 5v2 5v2 5va 5va 8pi", name: "Evil Spirit", hp: 150, wintext: "You have defeated the evil spirit and stopped its dark influence from spreading through the land!\n\
		... But a dark energy is still troubling this region... \n\
		You sense a cold, chill air coming from a portal looming darkly at the back of the cave."};
exports.spirit[1] = {
	deck: "50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 50u 4vi 4vi 4vi 4vi 4vh 4vh 4vh 4vl 501 4vn 4vn 5ur 5uq 5uq 5ut 5ut 5ut 5up 5up 5up 5up 5v2 8pt", name: "Portal Guardian", hp: 175, wintext: "The portal guardian lies vanquished, but despite your best efforts you cannot close the portal from this side.\n\
		Examining the guardian's remains you find an ancient tome which describes the portal before you and the lands beyond\n\
		The incubus key lies in a large fortress at the center of the realm. You will have to venture forth."
};
exports.spirit[2] = {
	deck: "4vq 4vq 4vq 4vq 4vk 4vk 4vk 4vv 4vv 4vo 542 542 542 542 542 542 542 542 542 542 52v 52v 52v 52v 52k 52k 52n 52n 52n 530 530 534 8pj", name: "Grim Maiden", hp: 175, wintext: "The maiden's swarm of skeletal minions seems endless but they are weak and fall easily.\n\
		Her pet cats and vultures tear viciously at your allies, but you finally manage to push past them.\n\
		The Grim Maiden is a truly powerful foe. Her magic wreaking havoc upon your allies.\n\
		Just as you are about to land the final blow, she vanishes.\n\
		You can hear her eerie voice echoing off of the wind, growing faint and distant.\n\
		'Turn back foolish mortal. This road will only lead to your doom. My sisters will not be so forgiving!'"
};
exports.spirit[3] = {
	deck: "5og 5og 5on 5on 5on 5on 5on 5on 5ot 5ot 5ot 5ot 5ot 5ot 6rb 6rb 6rb 6rb 6rb 6rb 6rb 6rb 6rb 6rb 7n6 7n6 7n6 7n6 7n6 7n6 8po", name: "Swamp Gas", wintext: "You escape the deadly explosions, just barely... A massive storm is approaching. You will need shelter.\n\
		A nearby abandoned mansion may be your only option. Warily you open the door. It creaks forebodingly.\n\
		You are greated by dank and musty air, but it seems otherwise empty. You sit and wait out the storm.\n\
		While waiting you could swear you hear footsteps in other rooms and voices talking.\n\
		However, every search turns up nothing but empty ill kept rooms and dust.\n\
		Just as you are about to leave, an evil laugh from behind you sends chills down your spine\n\
		The shadows on the wall begin to move of their own accord. And all the doors slam shut with conviction.\n\
		You turn to face your assailant, apparently a sister of the maiden you fell earlier."
};
exports.spirit[4] = {
	deck: "606 606 606 606 606 606 606 606 606 606 606 5ur 5us 5us 5up 5up 5up 5uu 5uu 5v2 5v2 5vb 5vb 5vb 5uo 5uv 5uv 5v8 5ul 5ul 8pi", name: "Spirit of the Dark Maiden", morph: {
	from: "4t8 6ro 4vd 6tt 4ve 6tu 4vf 6tv 4vh 6u1 4vm 6u6 4vq 6ua 4vr 6ub 4vs 6uc 4vu 6ue 502 6ui 500 6ug 52h 711 " +
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
		 "7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um 7um"
	}, wintext: "As the maiden falls, your powers return to normal, and your allies settle back into their original forms.\n\
		the shadows that gripped and drained your energies recede. Your strength returns to its former glory.\n\
		You are still feeling tired from the fight, but the storm has passed, leaving an oddly purple sky.\n\
		In light of recent events, you decide it is probably best to get out while you can, tired or not.\n\
		Afterall whatever lies down the road has to be less painful than risking encountering another spirit.\n\
		...right? ... You open the creaky door and head back out down the gravel path.\n\
		as you take your first step you hear the maiden's silvery voice echoing from the house behind you.\n\
		'It appears you may be as stong as my sister claims. Your soul shall make a most delectable morsel.\n\
		'We shall meet again... Don't die before then. I'ld hate to lose my favorite toy.' She fades into the darkness.\n\
		Off in the distance the storm has settled above the castle, the echos of ominous thunder growing fainter.\n\
		You hope it will be gone by the time you get there... but given your luck so far, you don't think it will.\n\
		Storm or not, you didn't come this far just to turn back, so you continue your treck down the path."};

exports.bombmaker = {};
exports.bombmaker[0] = { deck: "5t2 5t2 5t2 5t2 5t2 5t2 5t2 5t2 5t2 5t2 5t2 5t2 5t2 5t2 5t2 5s5 5s5 5s5 5s5 5s5 5s5 622 622 622 622 80d 80d 80d 80d 80d 80d 8pu", name: "Bomb Maker 1", autonext: true };
exports.bombmaker[1] = { deck: "5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rg 5rk 5rk 5rk 5rk 5ro 5ro 5ro 5ru 5ru 5ru 5ru 5ru 5ru 5v1 5v1 5v1 5v1 5v1 5v1 7ql 7ql 7ql 7ql 7ql 7ql 8pt", name: "Bomb Maker 2", autonext: true };
exports.bombmaker[2] = { deck: "5f4 5f4 5f4 5f6 5f6 5f6 5f6 5f6 5f6 5f5 5f5 5f8 5f8 5oc 5oc 5oc 5oc 5oc 5oc 5oc 5oc 5oc 5oc 5oc 5oc 5oc 5oc 5om 5om 5om 5om 5om 5om 5p0 5p0 8po", name: "Bomb Maker 3", markpower: 3, drawpower: 2, cardreward: ["5om", "5om", "5om", "5om", "5s5", "5s5", "5s5", "7ql", "7ql"], wintext: "Congratulations! Here, take some of my bombs as the reward!" };

exports.blacksummoner = {};
exports.blacksummoner[0] = { deck: "7t5 7t5 7t5 7t5 7t5 7t5 7t5 7t5 7t5 7t5 7t5 7t5 7t5 7t5 7t5 8pt", name: "The Black Summoner", markpower: 12, cardreward: ["7t5", "7t5"], wintext: "You defeat the Dark Summoner that controlled the dragons. The dragons fly away, but two of them stays, looking at you.\nYou decide to let them join you!" }

exports.icecave = {};
exports.icecave[0] = { deck: "5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i8 5i8 5i8 5i8 5i8 5i9 5i9 5id 5id 5id 8pp", name: "Snow Storm", hp: 75, wintext: "You get through the storm and finally reach the mysterious cave \nwhere the weapon is said to reside." };
exports.icecave[1] = { deck: "5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5ik 5ik 5ik 5ik 5ik 5ik 5ia 5ia 5ia 5ib 5ib 5ib 5ic 5ic 5id 5id 5id 5id 8pp", name: "Cave Guardians??", hp: 75, wintext: "You defeat the creatures that were attacking, and can finally take the rare weapon \nthat was hiding in the cave; a Trident! But before you can grab it, you hear strange sounds behind you..." };
exports.icecave[2] = { deck: "4sa 4sa 4sa 4sa 4sa 4sc 4sc 4sc 4sc 4sc 4sc 4sc 4sc 4sc 4sc 5i5 5i5 5im 5iq 5iq 5ic 5il 5il 5ii 5ii 5ie 5ie 5ig 5ig 5ig 8pp", name: "Cave Guardians", hp: 75, wintext: "After defeating the Guardians, you quickly get out of the cave, ready to head home as fast as you can..." };
exports.icecave[3] = { deck: "5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5ib 5ib 5ib 5ih 5ih 5i9 5i9 5ig 5ig 7gt 7gt 7gt 7gt 8pp", name: "Ice Storm", hp: 75, wintext: "You finally get though the storm and reach the safety of the city. \nYou got the weapon you were looking for, and some other ice souvenirs as well.", cardreward: ["5i8", "5i8", "5ic"] };

exports.inventor = {};
exports.inventor[0] = {deck: "55k 55k 55k 55k 55k 55k 55k 55k 55k 55k 55k 55k 55k 561 561 561 55m 55m 55m 55m 55m 55m 55s 55s 595 595 595 595 595 595 8pm", name: "Defense Catapults", hp:125, wintext: "You manage to get past the crazy inventor's defense system, and get closer to his big house." };
exports.inventor[1] = {deck: "5f1 5f1 5f1 5f1 5f1 5f1 5ff 5ff 5ff 5ff 5f7 5f7 5f7 5i4 5i4 5i4 5i4 5i4 5i4 5i4 5ik 5ik 5ik 5ik 5ik 5ik 5ii 5ii 5ii 5ii 8po", name: "Armored Machines", hp:120, wintext: "Defeating the machines that were terrorizing the village, you head inside to face the inventor"};
exports.inventor[2] = {deck: "5de 5de 5de 5de 5de 5de 5de 5de 5de 5de 5de 5de 5de 5c5 5c5 5c5 5c5 5c5 5c5 5fh 5fh 5fh 5fh 5fh 5fh 5f7 5f7 5f7 5f7 5f7 5f7 8po", name: "Crazy Inventor", hp:125, wintext: "Even with his inventions, you manage to defeat him. 'No, please, spare me, I will never hurt anyone again!' he cries. \nYou agree to let him go, but only if he leaves the area and never comes back. You see him walking away \nand can't help but thinking that you haven't seen the last of him... On your way out of \nthe house, you find some of his inventions and decide that they can be useful!", cardreward:["561", "561","561","5fh","5fh","5ii", "5ii"]};
//Menu info
exports.necromancer.info = { pos: [[200, 200], [200, 250], [225, 300]], text: ["A horde of skeletons have been seen nearby, perhaps you should go investigate?", "They seemed to come from the forest, so you go inside.", "Deep inside the forest you find the necromancer responsible for filling the lands with undead!"] };
exports.spirit.info = { pos: [[275, 350], [325, 375], [500, 200], [500, 250], [525, 275]], text:["You pursue the energy trail of the spirit to a dark cavern.\n\At first you think it has eluded you, but as you turn to leave, its dark shadowy form rises in front of you",
	"You approach the portal and a large Elemental steps out of the shadows, purple energy swirling about it.\n\
		'Only the worthy may pass'...You state that your only intention is to destroy the portal not pass through it.\n\
		'only the incubus key can close this portal.' The guardian glowers at you darkly.\n\
		If you wish to find it you must first pass my test.' The guardian attacks!",
	"You step through the portal and are wisked off to a shifting expanse of swampland. Purple lightning crackles above.\n\
		Far off, in the distant center of the dark and brooding expanse, stands an ominous fortress.\n\
		The gravel road before you winds its way toward it like a great serpent slithering its way through a desolate bog.\n\
		A lone maiden blocks your path. In a voice like claws upon glass she shrieks 'you do not belong here... DIE!' ",
	"As you continue up the road, a foul stench assaults your nose... Then you hear a poping sound.\n\
		To the side of the road a sign reads 'Danger, swamp gas is explosive. Travelers beware'\n\
		You decide that NOW would be a good time to run!... But a flock of giant angry birds is in your way",
	"You turn to face your attacker, but as you call on your powers, only darkness answers.\n\
		Your allies come to your aid but their forms have all been twisted. The dark lady laughs mischeviously.\n\
		'You must think yourself dreaming... Well this is the nightmare realm, and I am the one in control.\n\
		I think I will toy with you first... before I swallow your soul.' The shadows lunge toward you in a vicious attack."]};
exports.bombmaker.info = {pos: [[600,400]], text:["A bomb maker have set up shop nearby. He have put up a sign promising a reward if you can beat him\n and his bombs three times in a row."]}
exports.blacksummoner.info = { pos: [[500, 420]], text: ["A swarm of dragons can be seen nearby. Maybe you could manage to tame one of them?"] }
exports.icecave.info = { pos: [[300, 350], [260, 250], [220, 250], [200,350]], text: ["You heard a story about a rare weapon hidden in a cave up north. You decide to look for the weapon. \nOn the way there you are caught in the middle of a big snow storm.",
	"You enter the cave, it is dark and icy. Suddenly you meet some creatures there, which promptly attacks you. \nYou seem to glimpse the rare weapon right behind them though...",
	"You look behind you and see a range of different creatures, which you can swear were not here before. \n'We are the Guardians of this Cave, and we will not allow you to take our treasure!'",
	"The storm you got past while heading here is still raging, and it seems to have gotten a lot worse."]
}
exports.inventor.info = {
	pos: [[500, 300], [510, 360], [505, 410]], text: ["You come across a small village that claims they are being regularly attacked by machines coming from a crazy inventor \nliving nearby. You decide to put a stop to this crazy man's evil endeavors. On your way there you suddenly \nsee a big Armagio landing in front of you. 'Catapults!' you think, and get ready to fight.",
	"In front of the house some machines seems to stand guards. \nThese must be the machines that were attacking the village!",
	"'All I wanted was to test the offensive capabilities of my machines. \nBut now when you are here, I can test this on you!' says the crazy inventor and laughs."]
}
exports.areas = { forest: ["necromancer", "spirit", "inventor"], city:["bombmaker"], desert:["blacksummoner"], ice:["icecave"] };