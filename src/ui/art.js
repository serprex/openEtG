import { card_index, card_name, CardSet } from '../rs/pkg/etg.js';

function trMouseOver(e) {
	let i = 1;
	for (; i < this.children.length; i++) {
		const child = this.children[i].children[0];
		if (child.href && child.href.match(/\/Cards\/...\.webp$/)) {
			imgs[i - 1].src = child.href;
			imgs[i - 1].style.visibility = '';
		} else imgs[i - 1].style.visibility = 'hidden';
	}
	for (; i - 1 < imgs.length; i++) {
		imgs[i - 1].style.visibility = 'hidden';
	}
}
const imgs = new Array(8),
	imgdiv = document.getElementById('imgdiv');
for (let i = 0; i < 8; i++) imgdiv.appendChild((imgs[i] = new Image()));
const table = document.createElement('table');
for (const credit of [
	[
		['andretimpa', 'https://andretimpa.deviantart.com'],
		['Opening Music', 'sound/openingMusic.ogg'],
		'4sa4si4sj4sk4sl4sm4sn4so4sp4sq4sr4ss4st4su4ta4te4vr53m55k55p5ic5m05m35m45ol5rl5vj61r61s6216ub',
	],
	[['artimies', 'http://elementscommunity.org/forum/profile/?u=140'], '593'],
	[['Cryotube', 'https://cryotube.deviantart.com'], '5665975fe5lr'],
	[
		['Dawn to Dusk', 'http://elementscommunity.org/forum/profile/?u=5119'],
		'505ls95sa62f6ul',
	],
	[['Hawanja', 'https://hawanja.deviantart.com'], '4vs'],
	[
		['jarozaoz', 'http://elementscommunity.org/forum/profile/?u=6364'],
		'4t34vn5le5op',
	],
	[
		['kae', 'https://kaeillustrates.art'],
		'4sd4sg4sh4tc50650750152l52q53553655u56756b56d58s59859b59c59d59e59j5bs5bu5c25c45c65c75cu5cv5f55fb5fk5fl5fm5fo5ib5il5io5iq5j15ld5lg5lj5ls5lt5m15m35od5oe5og5ok5om5oo5oq5os5ov5p05rg5rj5rr5s45s85uo5v25v85vf5vj62b62e62i6rs7ae7ak77c7gr7h57k0lcv',
	],
	[
		['Lost in Nowhere', '/forum/index.php?action=profile;u=38'],
		'4vd4vg5395it5fh',
	],
	[['mega plini', 'http://elementscommunity.org/forum/profile/?u=202'], '5ig'],
	[['moomoose', 'http://elementscommunity.org/forum/profile/?u=40'], ['5i6']],
	[
		['Niharia', 'https://etg.dek.im/forum/index.php?action=profile;u=522'],
		'5fq5j35p6',
	],
	[
		['OdinVanguard', 'http://elementscommunity.org/forum/profile/?u=232'],
		'4se4sf4t44t54td4tf4tg4vf4vk4vo52i52m52o52p52s53053855m55t56156556956a56c56e59459659k5c55cr5cs5f45f65f75ff5fg5fj5fn5i85ii5ir5lq5lu5lv5m25oi5on5or5ri5ru5s15s65s95un5ur5us5v05v15vc5ve5vk61u62362862962d7167e7',
	],
	[['pepokish', 'http://theowlettenest.com'], '52g58o5bv5f05i45ie5l85lb5oj'],
	[
		['Ravizant', 'http://elementscommunity.org/forum/profile/?u=8037'],
		'4sc4tb4vp4vi4vj4vm4vq4vt4vu4vv50050350a50u52h52j52k52n52r52u52v53153353453753e54255n55q55v56456856f56i57658p58q58r58u58v59559959a59f59g59i59m5bt5c35c85ca5cb5cc5cd5ce5cf5cg5ch5ci5cq5de5f35f85f95fd5fi5fu5gi5ia5ih5ik5im5in5ip5is5j25jm5l95la5lc5lf5lh5li5lk5ln5lo5lp5m65mq5oh5ou5p15p35pa5pu5rh5rm5rn5rq5rv5se5t25uq5uu5vd5vg5vh5vi61p61q61v62062762c62g62m6rr6u377a77p7au7av7dj7e27jq7k17qa7ta80980a',
	],
	[
		['sael', 'mailto:animaetmateria@gmail.com'],
		['Bronze', 'assets/pack0.webp'],
		['Silver', 'assets/pack1.webp'],
		['Gold', 'assets/pack2.webp'],
		['Nymph', 'assets/pack3.webp'],
		'4vl53255s58t5fp5rp5s75sb5up',
	],
	[
		['serprex', 'https://serprex.github.io'],
		'50453a53bl8t5cj5ctlfp5iv5j05p4lrl5rolrp5s0lsb5sc5sd5sf5valvh5vl62262a62h62j',
	],
	[
		['Sovereign', 'https://soundcloud.com/the_sovereign'],
		['Mulligan', 'sound/mulligan.ogg'],
		['Click', 'sound/click.ogg'],
		['creaPlay', 'sound/creaPlay.ogg'],
		['permPlay', 'sound/permPlay.ogg'],
		['Devour', 'sound/devour.ogg'],
		['Dive', 'sound/dive.ogg'],
		['Draw1', 'sound/draw1.ogg'],
		['Draw2', 'sound/draw2.ogg'],
		['Draw3', 'sound/draw3.ogg'],
		['Draw4', 'sound/draw4.ogg'],
		['Freeze', 'sound/freeze.ogg'],
		['Lobotomize', 'sound/lobo.ogg'],
		['Poison', 'sound/poison.ogg'],
		['Shuffle', 'sound/shuffle.ogg'],
		['Skelify', 'sound/skelify.ogg'],
		['Stasis', 'sound/stasis.ogg'],
		[],
	],
	[
		['Thalas', 'http://elementscommunity.org/forum/profile/?u=103'],
		'5i95if7dl',
	],
	[['TheManuz', 'http://elementscommunity.org/forum/profile/?u=75'], '5025ot'],
	[
		['vrt', 'http://elementscommunity.org/forum/profile/?u=16'],
		'4sb4vc4ve4vh52t55l55o55r5605625635915c05c15c95f15f25fa5fc5i55i75id5ij5ll5oc5of5rk5rs5rt5uk5ul5um5ut5uv5v361o61t62462562674a80g590',
	],
	[['NASA', 'https://nasa.gov'], '5p2'],
	[
		[
			'Atlas/3',
			'https://github.com/Render96/Render96Wiki/wiki/cobble_stone-%28The-Texture-of-Your-Childhood%29',
		],
		'59l',
	],
	[['freeSFX', 'https://freesfx.co.uk'], []],
]) {
	let tr = document.createElement('tr');
	tr.addEventListener('mouseover', trMouseOver);
	tr.className = 'padtop';
	let x = 0;
	function incx(text, link) {
		const td = document.createElement('td'),
			a = document.createElement('a');
		a.href = link;
		a.textContent = text;
		td.appendChild(a);
		tr.appendChild(td);
		if (++x === 9) {
			table.appendChild(tr);
			tr = document.createElement('tr');
			tr.addEventListener('mouseover', trMouseOver);
			tr.appendChild(document.createElement('td'));
			x = 1;
		}
	}
	for (let i = 0; i < credit.length - 1; i++) {
		incx(credit[i][0], credit[i][1]);
	}
	const cards = credit[credit.length - 1];
	for (let i = 0; i < cards.length; i += 3) {
		const code = cards.slice(i, i + 3);
		const index = card_index(CardSet.Open, parseInt(code, 32) & 0x3fff);
		const name = card_name(CardSet.Open, index);
		incx(name, `Cards/${code}.webp`);
	}
	table.appendChild(tr);
}
document.body.insertBefore(table, imgdiv);
