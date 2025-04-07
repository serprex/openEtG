import Cards from './Cards.js';
import { decodedeck, encodeCode } from './etgutil.js';
import Game from './Game.js';
import * as sock from './sock.jsx';
import * as store from './store.jsx';
import { randint, shuffle } from './util.js';

export function requireQuest(quest, user) {
	return (quest.depends ?? []).every(dependency => user.quests[dependency]);
}

export const quarks = {
	basic_damage: {
		name: 'Damage',
		info: 'Tutorial - Basic 1/10 - Damage',
		urdeck: '0a52m0a5l90a61p018pi',
		deck: '0a52m0k5i6018pp',
		hp: 10,
		goldreward: 10,
		opentext: [
			'Welcome to openEtG!\n\n' +
				'To exit this tutorial, lose any battle (or resign), and then click "Exit" twice until you get back to the main menu.\n\n' +
				'To resume or replay this tutorial, select "Quests" from the main menu and select "Tutorial".',
			'To win a game of openEtG, you need to defeat your opponent before they defeat you. This is usually done by doing damage until their health reaches zero. The easiest way to do damage is with creatures.\n\n' +
				'Every creature has two numbers listed at the top of the card text box (when viewing the full card), and shown in the lower right when the card is in play.\n\n' +
				"The first of those two numbers is the creature's strength, or attack power. At the end of your turn, all of your creatures will attack the opponent, doing damage equal to their attack power.\n\n" +
				"The second of those numbers is the creature's health. That represents the amount of damage a creature can take before dying. Creatures cannot directly attack each other, but there are a variety of options available to damage your opponent's creatures before they can kill you.",
			"For this battle, you have a deck full of creatures. You and your opponent will each start with seven cards in your hand. If you don't like your hand, you can mulligan to shuffle it back into your deck and draw a new hand with one less card. Every turn (except the first turn for whoever goes first), you will draw a card. If you end your turn with eight cards in your hand, you will have to discard.\n\n" +
				'When you draw a creature, you can play it from your hand by clicking on it.\n\n' +
				'Defeat your opponent before they defeat you!',
		],
		wintext:
			"Congratulations! Here's a few gold for your victory.\n\n" +
			'You can also defeat your opponent if they try to draw a card but have no cards remaining in the deck, but more on that later.\n\n' +
			'For the next lesson, you will learn about "quanta", the energy that lets you summon more powerful creatures and other effects.',
	},
	basic_quanta: {
		name: 'Quanta',
		info: 'Tutorial - Basic 2/10 - Quanta',
		urdeck: '0o5l8065la018pq',
		deck: '0a52m0k5i6018pp',
		hp: 30,
		goldreward: 15,
		opentext: [
			'To play most cards and activate most abilities, you will need to spend "quanta".\n\n' +
				'You start the game with your "mark" of one element. You will gain one quanta matching your mark at the end of your turn.\n\n' +
				'One of the best ways to get more quanta is by playing pillars. They are free, and every pillar you have will also generate one quanta of its corresponding element at the end of your turn.',
			'This time, your deck is full of pillars and dragons, which cost a lot of quanta to summon. Play your pillars, store up your quanta, and unleash your dragons before your opponent can bring you down!',
		],
		wintext:
			"Congratulations! Have a few more gold. Next time, we'll learn about pendulums, another way to generate quanta.",
	},
	basic_duos: {
		name: 'Duos',
		info: 'Tutorial - Basic 3/10 - Duos',
		urdeck: '0k5jm055id055la018pq',
		deck: '0a52m0k5i6018pp',
		hp: 30,
		goldreward: 20,
		opentext: [
			'Last time, we learned about generating quanta with pillars. They\'re the easiest (and usually fastest) way to generate quanta of a single element. Playing with a single element makes it very easy to build your deck, since you\'ll only need one kind of pillar. "Mono" decks (those with only one element) are usually stable and have far fewer problems with not drawing enough quanta to play their cards.',
			"However, mono decks can only use cards from a single element, and a single element often won't have all the cards you want to use. Sometimes, you'll find you want to use more than one element in your deck to have access to more complex strategies or to cover the weaknesses of a single element.\n\n" +
				"You could do this by just using some pillars from each element, but there's another way. Pendulums work like pillars, in that at the end of the turn you play them, they will generate one quanta of their element. However, on the second turn, the pendulum will swing to your mark's element and generate one of those at the end of the turn. After that, the pendulum will swing back to its element, and will continue to switch between its element and your mark's element every turn.\n\n" +
				'This is a great way to make sure you receive quanta from two different elements.',
			'For this battle, your deck is again full of dragons, but this time they are split between two different elements! Fortunately, your pillars have been replaced with pendulums. Try it out and see if you get the quanta you need to play your dragons.',
		],
		wintext:
			'Congratulations! You\'ve learned how to play monos, with only a single element. And now, you\'ve played a "duo", using cards from two different elements. But what if you want to play with ALL the elements?',
	},
	basic_rainbows: {
		name: 'Rainbows',
		info: 'Tutorial - Basic 4/10 - Rainbows',
		urdeck:
			'0i4sa014vf0152h0155o0158r015bt015f2015id015la015of015rm015ul0161v018pi',
		deck: '0a52m0k5i6018pp',
		hp: 50,
		goldreward: 25,
		opentext: [
			'Monos and duos aren\'t the only types of deck. There are trios and quads, which can be much more difficult and may not be the best place to start if you\'re new to the game, though feel free to give it a shot! Quads in particular can be made easier by using "cardinal", "material", or "spiritual" pillars, which generate quanta from four different elements each.',
			"However, there are also quantum pillars. They generate three quanta every turn. In exchange for the speed of gaining quanta being tripled, the quanta they generate is random, so you'll be able to use cards from every element as long as your quantum pillars generate what you need.\n\n" +
				'You can use quantum pendulums as well, if you want to use cards of every element while still focusing on a single one. Like regular pendulums, quantum pendulums will alternate between generating three random quanta and one quanta matching your mark.\n\n' +
				'Of course, you could set your mark to "chroma", and then you\'d generate three random per turn from that as well!\n\n' +
				'"Rainbow" decks (which is what decks that use most or all elements are called) can be very strong because they have cards available to cover every weakness, but they are also at the mercy of pillars that may not produce what they want.',

			"This time, your deck has one of every dragon, and a lot of quantum pillars. It may be a little while before you can play your first dragon, but you'll likely be able to play several in a short period of time once you get there. Good luck!",
		],
		wintext:
			"Well done! You've explored pillars and pendulums and various different ways to build your deck. There are also cards within the various elements that can generate quanta on your own. You can build decks that don't use any pillars and pendulums at all!\n\n" +
			"Now that you have a feel for how to get what you need to play cards, and have seen most of the different elements, you should know that creatures can do things besides just attack every turn. Next time, we'll take a look at active skills.",
	},
	basic_skills: {
		name: 'Active Skills',
		info: 'Tutorial - Basic 5/10 - Active Skills',
		urdeck: '075uk07606085un085v3018pk',
		deck: '0a52m0k5i6018pp',
		hp: 30,
		goldreward: 50,
		opentext: [
			'Some creatures have abilities that you can use once a turn. These are generally called "skills" or "actives". They will be listed as "(quanta cost):effect". Abilities will often cost quanta matching their element, but they can require quanta from any element. They can cost any amount, or even be free! No matter how much quanta you have, you can only use an active once a turn on each creature, and you can\'t use an active the turn a creature comes into play. If an active has a cost listed in chroma quanta, anything can be used to pay it, and it will be taken from your available quanta pool randomly.',
			"For this battle, you have a darkness deck with two different creatures: parasite and shadling. Both have abilities you will need to use to defeat your opponent. While every card in your deck is darkness, your mark is death. Parasite's ability costs death, so you'll need some death quanta to use it.\n\n" +
				"Parasite has an active ability that will poison opposing creatures (or your own). A poisoned creature will take one damage per poison every turn after they attack. If a creature's health reaches zero, it dies.\n\n" +
				"Shadling, however, has an active ability that will steal your opponent's attack points and add them to shadling, weakening your opponent's creatures while increasing your own damage every turn.\n\n" +
				"Be careful not to use your parasite to poison EVERY enemy creature to death, or your shadlings won't have anyone to absorb attack from. You can steal attack with your shadlings from creatures that are poisoned - they won't catch the poison. But you could also let one of the opponent's creatures live and just steal from it. You can steal so much attack that the opposing creature drops below zero. Negative attack will heal you!",
		],
		wintext:
			'Good job! Creatures attack every turn, and most of them will also have additional abilities.\n\n' +
			'In addition to actives, creatures can have "passive" abilities, which may automatically have an effect every turn, or may take effect in response to other actions by you or your opponent, or even always be in effect!\n\n' +
			"However, most of the time, creatures' abilities can't be TOO strong, because they're also attacking every turn. Some creatures have very powerful abilities along with low attack or health. But if you want some of the strongest abilities, you'll have to look at cards that don't attack every turn.",
	},
	basic_permanents: {
		name: 'Permanents',
		info: 'Tutorial - Basic 6/10 - Permanents',
		urdeck: '0i5oc0c5om018po',
		deck: '0f55k0f56f018pl',
		hp: 50,
		goldreward: 40,
		opentext: [
			'"Permanents" are another kind of card. Actually, you have already seen some permanents. Pillars and pendulums are considered permanents, but they aren\'t the only kind. Other permanents have active abilities like creatures do, and some of these abilities are extremely powerful!',
			'For this battle, you have a deck without any creatures at all! Take a look at the permanents you draw, and see if you can figure out how to defeat your opponent.\n\n' +
				"Be careful, though. Your opponent is learning too. They've thrown away their skeletons and crawlers and have switched to a \"mono gravity\" deck. Their creatures are now using abilities, as well. Take a look, they'll get bigger every turn like your shadlings. But these don't need to pay to use their ability, and you won't stop them just by not having any creatures to steal from.\n\n" +
				'Good luck!',
		],
		wintext:
			"Well done! You're getting the hang of this.\n\n" +
			"But I bet you miss getting to attack every turn. Don't worry, though. Even though I said permanents don't attack every turn, there are special types of permanents that do.",
	},
	basic_equipment: {
		name: 'Equipment',
		info: 'Tutorial - Basic 7/10 - Equipment',
		urdeck: '065oi0c5uk065ur045uo025ul018pr',
		deck: '0f52g0652m0552h045f6018po',
		hp: 50,
		goldreward: 50,
		opentext: [
			'Permanents that attack are called weapons. You can only use one weapon at a time, but it will attack every turn. Many of them also have extra abilities, both active and passive. Because you can only use one at a time, these can be very strong!\n\n' +
				'Weapons are a special type of permanent called "equipment". In addition to weapons, there are also shields. You can only use one of these at a time, as well, but they will usually block some damage from every one of your opponent\'s creatures.\n\n' +
				'While you can only use one weapon at a time, there are cards that allow you to "fly" weapons, turning them into creatures but retaining their abilities. Once your weapon "flies", your hands will be free so you can play another weapon.',
			'Try to defeat your opponent using weapons. Watch out, though! There are cards that can destroy any permanent, and your opponent just might have some!\n\n' +
				"Besides permanents and creatures, there are cards called \"spells\". These cards take effect as soon as they are played, and their effects can be quite strong. They don't stick around, though, so once they're played, that card is gone and doesn't have any further effect.\n\n" +
				"If your weapons are flying, they aren't permanents anymore, so they'll be safe from these destructive cards.",
		],
		wintext:
			"Good job! You've seen the different kinds of cards you can put into play. Over time, you'll obtain much stronger cards than the ones you've used so far.",
	},
	basic_upgrades: {
		name: 'Upgrades',
		info: 'Tutorial - Basic 8/10 - Upgrades',
		urdeck:
			'0d6qq016rk016rs016tv01711017480177b017ad017di017gt017jq017mv037qb017q6017t50180f018pi',
		deck: '0i4sa014vf0152h0155o0158r015bt015f2015id015la015of015rm015ul0161v018pi',
		hp: 100,
		goldreward: 70,
		opentext: [
			"Whew! We've learned a lot. Let's take a moment to take a look at the cards you'll be able to get after you've gotten your collection going.\n\n" +
				'Every card you\'ve seen so far can be "upgraded". Most upgraded cards are made by combining six "unupgraded" cards into a single "upgraded" card. But don\'t worry, they\'ll get a lot stronger when you upgrade. You are also free to downgrade any upgraded card back into six unupgraded copies freely at any time. There\'s no cost.\n\n' +
				"Pillars and pendulums are the only exception. Since your collection will start with unlimited copies of all unupgraded pillars and pendulums, you'll need to pay 50 gold apiece to upgrade them.",
			'This time, your opponent stole your rainbow dragon deck! And they have as much health as you! Watch out!\n\n' +
				'I\'ll let you borrow an upgraded rainbow dragon to try. Every card is upgraded. Upgraded pillars are called "towers" and will generate their quanta as soon as you play them (in addition to at the end of every turn). Pendulums will do the same, giving you a quick head start. All the dragons will be stronger, as well.\n\n' +
				'Good luck!',
		],
		wintext:
			"Well done. You can see how strong cards can become when they've been upgraded. But you'll have to collect quite a few to build fully upgraded decks, so time to start saving up!",
	},
	basic_colosseum: {
		name: 'Colosseum',
		info: 'Tutorial - Basic 9/10 - Colosseum',
		urdeck:
			'0d6qq016rk016rs016tv01711017480177b017ad017di017gt017jq017mv037qb017q6017t50180f018pi',
		deck: '024tc0c55k0655n0656f0255s0255o018pl',
		hp: 100,
		goldreward: 90,
		opentext: [
			"You'll generally get a handful of gold from every battle you win. How much you get will vary depending on how hard your opponent is and how well you play. Some battles won't give any rewards, such as player vs player (pvp) or custom games. They're just for fun.\n\n" +
				"In addition to your gold reward, most games you'll win a card from your opponent's deck as well. There are some cards that are so rare you can't win them from your opponent, so you'll need to find them in packs. But more on that later.\n\n" +
				'Besides the rewards you get from defeating your opponent, a very good way to get gold is the "colosseum", which you can find on the main menu. The colosseum holds a number of events that can only be completed once a day, but which will give much larger rewards than normal battles. It\'s a great way to get a boost.\n\n' +
				'There are two kinds of colosseum events: "duel" and "endurance".',
			"Endurance battles require you to defeat multiple decks in a row. If you lose before defeating all the opponents, you won't receive a reward. Fortunately, you can retry endurance events as many times as you want until you've defeated them, and there's no cost or penalty for losing.\n\n" +
				'"Novice endurance" requires you to defeat three commoners in a row. These are the easiest opponent, and they each have an unupgraded deck full of random cards. You won\'t heal between matches, so they can still be tough.\n\n' +
				'"Expert endurance" requires you to defeat two champions. It\'s only two, but these are much stronger. Their decks are still random, but can contain upgraded cards, which you know are a lot more powerful. You will heal between battles, but it can still be extremely difficult.',
			"Duels can only be attempted once a day, win or lose. You don't lose anything if your opponent wins, but you don't gain anything either. It's a quick fight either way so it's worth a try every day, and the rewards are much larger than normal. You'll also know your opponent ahead of time, so if you're clever you can build a deck designed to counter your opponent.\n\n" +
				'"Novice duel" will let you fight a mage. This is an opponent using a pre-built unupgraded deck that will usually use cards that work very well together. Their cards will compliment each other, so they can be a lot harder than the random cards used by commoners.\n\n' +
				'"Expert duel" will require you to defeat a demigod. These are the strongest opponents, using pre-built decks that are completely upgraded! They are the most difficult regular opponent, so it may be a little while before you can defeat one. Remember there\'s no cost in the colosseum, so it\'s worth a try even if you lose.',
			"For this battle, you've got your rainbow dragons back, and you're going to have a \"duel\". Don't worry, though. Unlike a colosseum duel, you can try this one as many times as you'd like.\n\n" +
				"Like a colosseum duel, you know who you're going to be fighting. It's your opponent's boar deck again. But they've learned from playing with your dragons, and this time they've added some of their own, along with some other cards.\n\n" +
				'Good luck!',
		],
		wintext:
			'Good job! Enjoy your reward.\n\n' +
			"If you defeat every colosseum event in a single day, you'll get a special bonus reward!",
	},
	basic_quests: {
		name: 'Quests',
		info: 'Tutorial - Basic 10/10 - Quests',
		urdeck: '014tc0b5bs025c5055bu055c0065cr018pn',
		deck: '0a52g0652i0452k0252n0452r0461q018pu',
		hp: 100,
		goldreward: 150,
		opentext: [
			'This is the last battle in the basic tutorial.\n\n' +
				'Besides the four types of opponent mentioned in the last battle, there is another type of AI battle: quests. Quests are diverse battles that often tell a story. Some quests are many battles long, and many quests will give you rewards. They are all free to try and can be retried until you defeat them, so they can be a good way to get cards early on. The opponents will always use the same decks, too, so if you lose on your first try, remember what beat you and try to build a deck to counter it.',
			"Let's go on a quick quest. You are a life elemental, with a deck full of forest creatures. You encounter a necromancer! Their deck is about pestilence and death. Good luck in your battle of life against death!",
		],
		wintext:
			"Well done! You have completed the basic tutorial. You've been earning rewards for every battle, so don't forget to spend your gold on more cards and keep improving your deck. From here, you can learn more advanced topics, you can go on some quests, you can play the AI, you can buy cards and improve your deck, or you can even find another player and fight a live battle! We hope you're enjoying the game!",
	},
	necromancer: {
		deck: '04531027170b52g0c52m0452n018pk',
		name: 'Skeleton Horde',
		hp: 80,
		markpower: 2,
		wintext:
			'You defeated the horde, but you should find out where they came from',
		info: 'A horde of skeletons have been seen nearby, perhaps you should go investigate?',
	},
	necromancer2: {
		deck: '0d5bs045bu045c1025ca018pp',
		name: 'Forest Wildlife',
		hp: 60,
		wintext:
			'The creatures seemed very afraid of something, like there was something in the forest that did not belong there.',
		info: 'They seemed to come from the forest, so you go inside.',
		depends: ['necromancer'],
	},
	necromancer3: {
		deck: '0553104535047170d52g0652m0352l0552t018pk',
		name: 'Evil Necromancer',
		hp: 120,
		markpower: 2,
		cardreward: '03531',
		wintext:
			'You defeated the evil necromancer and stopped his undead from spreading through the land!',
		info: 'Deep inside the forest you find the necromancer responsible for filling the lands with undead!',
		depends: ['necromancer2'],
	},
	spirit: {
		deck: '0c606045um045us045v3025uu025v2025va018pi',
		name: 'Evil Spirit',
		hp: 150,
		wintext:
			'You have defeated the evil spirit and stopped its dark influence from spreading through the land!\
		... But a dark energy is still troubling this region... \
		You sense a cold, chill air coming from a portal looming darkly at the back of the cave.',
		info: 'You pursue the energy trail of the spirit to a dark cavern. At first you think it has eluded you, but as you turn to leave, its dark shadowy form rises in front of you',
	},
	spirit2: {
		deck: '015010i50u044vi034vh014vl024vn015ur025uq035ut045up015v2018pt',
		name: 'Portal Guardian',
		hp: 175,
		wintext:
			"The portal guardian lies vanquished, but despite your best efforts you cannot close the portal from this side.\
		Examining the guardian's remains you find an ancient tome which describes the portal before you and the lands beyond\
		The incubus key lies in a large fortress at the center of the realm. You will have to venture forth.",
		info: "You approach the portal and a large Elemental steps out of the shadows, purple energy swirling about it.\
		'Only the worthy may pass'...You state that your only intention is to destroy the portal not pass through it.\
		'Only the incubus key can close this portal.' The guardian glowers at you darkly.\
		If you wish to find it you must first pass my test.' The guardian attacks!",
		depends: ['spirit'],
	},
	spirit3: {
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
		info: "You step through the portal and are wisked off to a shifting expanse of swampland. Purple lightning crackles above.\
		Far off, in the distant center of the dark and brooding expanse, stands an ominous fortress.\
		The gravel road before you winds its way toward it like a great serpent slithering its way through a desolate bog.\
		A lone maiden blocks your path. In a voice like claws upon glass she shrieks 'you do not belong here... DIE!'",
		depends: ['spirit2'],
	},
	spirit4: {
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
		info: "As you continue up the road, a foul stench assaults your nose... Then you hear a poping sound.\
		To the side of the road a sign reads 'Danger, swamp gas is explosive. Travelers beware'\
		You decide that NOW would be a good time to run!... But a flock of giant angry birds is in your way",
		depends: ['spirit3'],
	},
	bombmaker: {
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
		info: 'A bomb maker have set up shop nearby. He have put up a sign promising a reward if you can beat him and his bombs three times in a row.',
	},
	blacksummoner: {
		deck: '0f7t5018pt',
		name: 'Dark Summoner',
		markpower: 12,
		cardreward: '027t5',
		wintext:
			'You defeat the Dark Summoner that controlled the dragons. The dragons fly away, but two of them stay, looking at you. You decide to let them join you!',
		info: 'A swarm of dragons can be seen nearby. Maybe you could manage to tame one of them?',
	},
	icecave: {
		deck: '0e5i4055i8025i9035id018pp',
		name: 'Snow Storm',
		hp: 75,
		wintext:
			'You get through the storm and finally reach the mysterious cave where the weapon is said to reside.',
		info: 'You heard a story about a rare weapon hidden in a cave up north. You decide to look for the weapon. On the way there you are caught in the middle of a big snow storm.',
	},
	icecave2: {
		deck: '085i4065ik035ia035ib025ic045id018pp',
		name: 'Cave Guardians??',
		hp: 75,
		wintext:
			'You defeat the creatures that were attacking, and can finally take the rare weapon that was hiding in the cave; a Trident! But before you can grab it, you hear strange sounds behind you...',
		info: 'You enter the cave, it is dark and icy. Suddenly you meet some creatures there, which promptly attacks you. You seem to glimpse the rare weapon right behind them though...',
		depends: ['icecave'],
	},
	icecave3: {
		deck: '054sa0a4sc025i5015im025iq015ic025il025ii025ie035ig018pp',
		name: 'Cave Guardians',
		hp: 75,
		wintext:
			'After defeating the Guardians, you quickly get out of the cave, ready to head home as fast as you can...',
		info: "You look behind you and see a range of different creatures, which you can swear were not here before. 'We are the Guardians of this Cave, and we will not allow you to take our treasure!'",
		depends: ['icecave2'],
	},
	icecave4: {
		deck: '0f5i4035ib025ih025i9025ig047gt018pp',
		name: 'Ice Storm',
		hp: 75,
		wintext:
			'You finally get though the storm and reach the safety of the city. You got the weapon you were looking for, and some other ice souvenirs as well.',
		cardreward: '025i8015ic',
		info: 'The storm you got past while heading here is still raging, and it seems to have gotten a lot worse.',
		depends: ['icecave3'],
	},
	inventor: {
		deck: '03561065950d55k0655m0255s018pm',
		name: 'Defense Catapults',
		hp: 125,
		wintext:
			"You manage to get past the crazy inventor's defense system, and get closer to his big house.",
		info: "You come across a small village that claims they are being regularly attacked by machines coming from a crazy inventor living nearby. You decide to put a stop to this crazy man's evil endeavors. On your way there you suddenly see a big Armagio landing in front of you. 'Catapults!' you think, and get ready to fight.",
	},
	inventor2: {
		deck: '065f1045ff035f7075i4065ik045ii018po',
		name: 'Armored Machines',
		hp: 120,
		wintext:
			'Defeating the machines that were terrorizing the village, you head inside to face the inventor.',
		info: 'In front of the house some machines seems to stand guards. These must be the machines that were attacking the village!',
		depends: ['inventor'],
	},
	inventor3: {
		deck: '0d5de065c5065fh065f7018po',
		name: 'Crazy Inventor',
		hp: 125,
		wintext:
			"Even with his inventions, you manage to defeat him. 'No, please, spare me, I will never hurt anyone again!' he cries. You agree to let him go, but only if he leaves the area and never comes back. You see him walking away and can't help but thinking that you haven't seen the last of him... On your way out of the house, you find some of his inventions and decide that they can be useful!",
		cardreward: '03561025fh025ii',
		info: "'All I wanted was to test the offensive capabilities of my machines. But now when you are here, I can test this on you!' says the crazy inventor and laughs.",
		depends: ['inventor2'],
	},
	// Proving Grounds
	pgdragon: {
		deck: '0g4sa014vf0152h0155o0158r015bt015f2015id015la015op015rm015ul0661t018pu',
		name: 'Dragon Tamer',
		hp: 150,
		wintext:
			'You have proved your worth for the Dragon Tamer, and he gives you two of his dragons.',
		choicerewards: [
			5103, 5201, 5304, 5403, 5501, 5602, 5709, 5802, 5903, 6006, 6101, 6207,
		],
		rewardamount: 2,
		info: 'Fight the Dragon Tamer at the Proving Grounds!',
	},
	pgrare: {
		deck: '015360a4sa014vl0152q0155s0158v015c5065ff045fh015f7015ic015ir015lh025oi015ol015ro015ur0161u018po',
		name: 'Master of Arms',
		hp: 150,
		wintext:
			'You have proved your worth for the Master of Arms, and he gives you one of his rare weapons.',
		/* prettier-ignore */
		choicerewards : [
              5109, 5124, 5210, 5222, 5308, 5324, 5407, 5423,
              5509, 5523, 5607, 5621, 5708, 5723, 5809, 5822,
              5909, 5924, 6008, 6025, 6107, 6126, 6206, 6223,
            ],
		info: 'Fight the Master of Arms at the Proving Grounds!',
	},
	pgshard: {
		deck: '0c4sa0250a0253e0256i0659m025cq025fu025j2025m6025pa025se025vi0262m018pm',
		name: 'Gemcutter',
		hp: 150,
		wintext:
			'You have proved your worth for the Gemcutter and he gives you one of his rare shards.',
		choicerewards: [
			5130, 5230, 5330, 5430, 5530, 5630, 5730, 5830, 5930, 6030, 6130, 6230,
		],
		info: 'Fight the Gemcutter at the Proving Grounds!',
	},
	pgfarmer: {
		deck: '0a4sc044vs064vu0a5t2018pj',
		name: 'Farmer',
		hp: 150,
		goldreward: 100,
		wintext:
			'You have proved your worth for the Farmer and he gives you 100 gold.',
		info: 'Fight the Farmer at the Proving Grounds!',
	},
	pggeomancer: {
		deck: '0154201576016060c4sc0150u015aa015de015gi015jm015mq015pu015t20163a067h0018pp',
		name: 'Geomancer',
		hp: 150,
		choicerewards: 'uppedpillar',
		rewardamount: 2,
		wintext:
			'You have proved your worth for the Geomancer and he gives you 2 of his Towers.',
		info: 'Fight the Geomancer at the Proving Grounds!',
	},
	pgnymph: {
		deck: '015000153401568094sa094sc0159c015cg015fk015io015ls015p0015s4015v80162c018pi',
		name: 'Eunuch',
		hp: 150,
		choicerewards: 'nymph',
		wintext:
			'You have proved your worth for the Eunuch and he gives you one of his Nymphs',
		info: 'Fight the Eunuch at the Proving Grounds!',
	},

	// Elemental Temples
	elementalshrine: {
		deck: '015990c4sa014vi014vh0152m0152o0155t0155n0158p015c8015c7015f3015fb015ia015i6015lp015lr015on015ou015ri015rr015v1015ut0162a0161q018pi',
		name: 'Shrine Guardian',
		hp: 100,
		wintext:
			"The Shrine Guardian speaks to you: 'You have bested me, but I am only the beginning. Find the Temples and challenge their guardians, and they will reward you! If you defeat them all, you will get access to the Chroma Palace, where the strongest guardian reside.'",
		info: "You walk up to the shrine. You don't know what to expect. Suddenly, you are attacked by a cloaked figure! Could it be the Shrine Guardian!?",
	},
	aethertemple: {
		deck: '02622036280f61o0361u0a80a018pu',
		hp: 150,
		name: 'Aether Guardian',
		cardreward: '0380a',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Aether Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	airtemple: {
		deck: '0f5oc035ou045or0a7n1018pr',
		hp: 150,
		name: 'Air Guardian',
		cardreward: '037n1',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Air Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	darktemple: {
		deck: '0f5uk035uv045ul0a7tc018pt',
		hp: 150,
		name: 'Dark Guardian',
		cardreward: '037tc',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Dark Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	deathtemple: {
		deck: '03535035370a7180d52g018pk',
		hp: 150,
		name: 'Death Guardian',
		cardreward: '03718',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Death Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	earthtemple: {
		deck: '0958o0658u0658r0a77l018pm',
		hp: 150,
		name: 'Earth Guardian',
		cardreward: '0377l',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Earth Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	entropytemple: {
		deck: '0f4vc034vd044ve0a6u2018pj',
		hp: 150,
		name: 'Entropy Guardian',
		cardreward: '036u2',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Entropy Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	firetemple: {
		deck: '0e5f0035f3045fc0a7dk018po',
		hp: 150,
		name: 'Fire Guardian',
		cardreward: '037dk',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Fire Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	gravitytemple: {
		deck: '0d55k0455l0355s0a74k018pl',
		hp: 150,
		name: 'Gravity Guardian',
		cardreward: '0374k',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Gravity Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	lifetemple: {
		deck: '0d5bs065bu055c70a7ai018pn',
		hp: 150,
		name: 'Life Guardian',
		cardreward: '037ai',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Life Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	lighttemple: {
		deck: '0c5l8035lo045ln0a7jv018pq',
		hp: 150,
		name: 'Light Guardian',
		cardreward: '037jv',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Light Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	timetemple: {
		deck: '0e5rg045ru035rm0a7q4018ps',
		hp: 150,
		name: 'Time Guardian',
		cardreward: '037q4',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Time Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	watertemple: {
		deck: '0f5i4045ie035id0a7go018pp',
		hp: 150,
		name: 'Water Guardian',
		cardreward: '037go',
		wintext:
			'As you defeat the Guardian, he disappears. He leaves some of his magic power behind to you, as a reward.',
		depends: ['elementalshrine'],
		info: 'As you approach the Water Temple, you can feel the guardian waiting inside for you. This is it, another step on your quest to defeat the Temple Guardians.',
	},
	chromatemple: {
		deck: '064vj066qq026u10271a0174a0274e0277g027ah017dm027n0027t90280a018pi',
		name: 'Chroma Guardian',
		hp: 200,
		drawpower: 2,
		choicerewards: 'uppedrare',
		rewardamount: 2,
		wintext:
			'You have done it. You have completed the battle of the temples. A quest which took you all over the world. The chroma elemental looks at you, pleased. He knows how long it took to get here and he knows how hard it was to win. He is proud of you. As a reward, he offers you a choice of his finest possessions.',
		depends: [
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
		info: 'You walk up to the steps of the last temple, the Chroma Temple. It was harsh getting here, but well worth it. This is it.',
	},
	ai1: {
		deck: '0g55k065630456i04569015660156e025rl065s6018ps',
		name: 'AI Troubles',
		hp: 100,
		markpower: 2,
		drawpower: 1,
		cardreward: '0153b0159l015cv015fq015j3015p6015sf0162j',
		info: 'You hear reports that the AI controlled clock golems have gone haywire. Will you check it out? You also receive a report that Serprex’s account has been kidnapped. This is serious.',
		wintext:
			'The clocks are functioning properly now, but you hear reports of another malfunction.',
	},
	ai2: {
		deck: '0255u0256c015f7025fj015fb015rk015rj0262a02628076s0066u2016u4027q1018po',
		name: 'AI Troubles',
		hp: 125,
		markpower: 3,
		drawpower: 1,
		cardreward: '0653c025m4',
		info: 'You enter the AI’s engineering facility. It’s hot and sparks are flying!',
		wintext:
			'Things have cooled off, but witnesses report that Serprex’s account was being ‘modified’ and caused the facility overload.',
	},
	ai3: {
		deck: '046qr016u0016u4016uj0171a01719017170174s0174i0174m0177p0178301785017at017ba017au017dk017e2017e1017h6017gn017gv017ki017kh017kf017nc017nk017nj017qm017qh017qv017ts017th017u00180h0180n0180o018pi',
		name: 'AI Takeover',
		hp: 400,
		markpower: 3,
		drawpower: 2,
		cardreward: '0171r01785017bf017ea017hj017nm017qv01813',
		info: 'The AI has taken control of Serprex’s account and gone berserk. It has a power beyond a demigod!',
		wintext:
			'You defeat the AI menace and restore Serprex’s account to their rightful place. Phew!',
	},
	cream1: {
		deck: '06598045og035ov0577e06779067mt018pm',
		name: 'Setting up',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: 'The CEO offers you a job selling ice cream as a roaming bike vendor. Will you accept the job in hopes for a day of big earnings?',
		wintext:
			'Fog, potholes, and a few ants slowed your preparations but your vending stall is all set for business.',
	},
	cream2: {
		deck: '065s5015ur065vg057ri057qn077t4057tr027u4037u5018pt',
		name: 'Thieves',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: "Potential customers approach but they don't look like they’re about to buy ice cream.",
		wintext: 'Clearly, you can handle small time criminals.',
		depends: ['cream1'],
	},
	cream3: {
		deck: '024vl064vu015fb086ts056u3016um027dp027dm027ea027do018ps',
		name: 'Angry moms',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: 'Rowdy children snatch fudgesicles and polar bars while you are distracted. Their mommas nearby think you gave it to them. They are not happy.',
		wintext: 'Those geese had a lot of odd looking kids.',
		depends: ['cream2'],
	},
	cream4: {
		deck: '055940574i067450b7780678q04785018pl',
		name: 'Steep hill',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: "There's a great spot to set up shop on that nearby hill, but it sure is steep.",
		wintext: "You've made it up to the hill with calves on fire.",
		depends: ['cream3'],
	},
	cream5: {
		deck: '045fr067f2017n2027q0027ri057qn067qs017qh037qv018ps',
		name: 'Scorching temps',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: 'The hill is scorching hot. Head to a cool area where potential customers may be waiting for refreshments.',
		wintext:
			'You cool off in a shady spot. Potential customers look welcomingly at your stall.',
		depends: ['cream4'],
	},
	cream6: {
		deck: '0252j035c6025c9015ca076rv046r1047b4027ki017k2027mt017n2027n8027th027t7018pn',
		name: 'Bugs',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: 'A long line of customers form but oh no! Some of your stock melted and attracted BUGS!',
		wintext: 'Bugs begone. But the customers have left as well',
		depends: ['cream5'],
	},
	cream7: {
		deck: '044vi06507026u7057ms067mt047nj027mu017n5017mv018pj',
		name: 'Windy chaos',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: 'Just as you open your vending stand  the winds pick up and wreak havoc.',
		wintext: 'You break wind and order is regained.',
		depends: ['cream6'],
	},
	cream8: {
		deck: '035f6035ic096ru0674j0274p017nf067n6018pl',
		name: 'After the Storm',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: 'The windstorm has left debris and hidden dangers. Be careful.',
		wintext: 'Let’s find a safer area to sell ice cream.',
		depends: ['cream7'],
	},
	cream9: {
		deck: '035cg015lu096rv0271r0171n037ac017b2027hc027h0017k8017kb047t7018pp',
		name: 'Ambulance',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: "An ambulance approaches with blaring sirens. You're in their way and viewed as a threat.",
		wintext: 'Better not get on the bad side of healthcare workers.',
		depends: ['cream8'],
	},
	cream10: {
		deck: '0562g087jo077la067kd037km027kl057k6027k202813018pu',
		name: 'Lullaby',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: 'A mother is singing a lullaby to her baby. You fight the urge to sleep.',
		wintext: 'You stay awake and turn on upbeat music',
		depends: ['cream9'],
	},
	cream11: {
		deck: '047t4047um067u2047tc017tk027th027u4017t9067u1018pt',
		name: 'Dark Waters',
		hp: 150,
		markpower: 2,
		drawpower: 1,
		info: "Black waters surround you. These customers don't want ice cream, they want your flesh.",
		wintext: 'The water levels finally drop.',
		depends: ['cream10'],
	},
	cream12: {
		deck: '066rk017dg017f2057dh027dk047dm067dv017dj047n2018po',
		name: 'Big Tip',
		hp: 150,
		markpower: 2,
		drawpower: 2,
		info: 'A customer buys an ice cream and says they’re leaving you a big tip.',
		wintext: 'You wonder if it’s worth being an ice cream biker after all.',
		depends: ['cream11'],
	},
	cream13: {
		deck: '0a6s0026uo016u8016un0274s02750017h7057n2027q80180v0281401813018pi',
		name: 'CEO Evaluation',
		hp: 200,
		markpower: 3,
		drawpower: 2,
		info: 'The CEO checks in on you and is displeased by the low sales. They move to plan b: turning you into their eternal minion. This is no joke! Fight for your life.',
		wintext:
			"The CEO is defeated. You don't collect any pay, but you keep the bike and sweet treats. Oh, and your last customer orders an ice cream sandwich. They give you a nice tip.",
		depends: ['cream12'],
	},
};
for (const key in quarks) {
	let q = quarks[key];
	do {
		q.key = key;
	} while ((q = q.autonext));
}
export const root = {
	children: [
		{
			name: 'Tutorial',
			children: [
				'basic_damage',
				'basic_quanta',
				'basic_duos',
				'basic_rainbows',
				'basic_skills',
				'basic_permanents',
				'basic_equipment',
				'basic_upgrades',
				'basic_colosseum',
				'basic_quests',
			],
		},
		{
			name: 'Proving Grounds',
			children: [
				'pgdragon',
				'pgrare',
				'pgshard',
				'pgfarmer',
				'pggeomancer',
				'pgnymph',
			],
		},
		{
			name: 'Necromancer',
			children: ['necromancer', 'necromancer2', 'necromancer3'],
		},
		{
			name: 'Dark Summoner',
			children: ['blacksummoner'],
		},
		{
			name: 'Inventor',
			children: ['inventor', 'inventor2', 'inventor3'],
		},
		{
			name: 'Bomb Maker',
			children: ['bombmaker'],
		},
		{
			name: 'Ice Cave',
			children: ['icecave', 'icecave2', 'icecave3', 'icecave4'],
		},
		{
			name: 'Elemental Shrine',
			children: [
				'elementalshrine',
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
				'chromatemple',
			],
		},
		{
			name: 'Dark Spirit',
			children: ['spirit', 'spirit2', 'spirit3', 'spirit4'],
		},
		{
			name: 'AI Takeover',
			children: ['ai1', 'ai2', 'ai3'],
		},
		{
			name: 'Ice Cream Biker',
			children: [
				'cream1',
				'cream2',
				'cream3',
				'cream4',
				'cream5',
				'cream6',
				'cream7',
				'cream8',
				'cream9',
				'cream10',
				'cream11',
				'cream12',
				'cream13',
			],
		},
	],
};
export function mkQuestAi(quest, datafn) {
	const markpower = quest.markpower ?? 1;
	const drawpower = quest.drawpower ?? 1;
	const hp = quest.hp ?? 100;
	const playerHPstart = quest.urhp ?? 100;
	const { user, username } = store.state;
	let urdeck = quest.urdeck;
	if (!urdeck) {
		urdeck = store.getDeck();
		if (!Cards.isDeckLegal(decodedeck(urdeck), user)) {
			store.chatMsg('Invalid deck', 'System');
			return;
		}
	}
	const data = {
		quest,
		wintext: quest.wintext ?? '',
		noheal: quest.noheal,
		seed: randint(),
		players: [
			{
				idx: 1,
				name: username,
				user: username,
				deck: urdeck,
				hp: playerHPstart,
			},
			{
				idx: 2,
				ai: 1,
				name: quest.name,
				deck: quest.deck,
				hp: hp,
				markpower: markpower,
				drawpower: drawpower,
			},
		],
	};
	if (!user.quests[quest.key]) {
		data.cardreward = quest.cardreward;
		data.goldreward = quest.goldreward;
		data.choicerewards = quest.choicerewards;
		data.rewardamount = quest.rewardamount;
		if (!quest.urdeck && store.hasflag(user, 'hardcore')) {
			const ante = store.hardcoreante(Cards, urdeck);
			if (ante) {
				data.ante = ante;
				sock.userExec('rmcard', ante);
				const key = ante.bound ? 'cardreward' : 'poolreward';
				data[key] = '01' + encodeCode(ante.c) + (data[key] ?? '');
			}
		}
	}
	shuffle(data.players);
	return new Game(datafn ? datafn(data) : data);
}
