var px = require("../px");
var etg = require("../etg");
var gfx = require("../gfx");
var ui = require("../uiutil");
var chat = require("../chat");
var sock = require("../sock");
var etgutil = require("../etgutil");
function setVis(eles, vis) {
	eles.forEach(function(x){
		x.style.display = vis ? "inline" : "none";
	});
}
module.exports = function() {
	var packdata = [
		{cost: 15, type: "Bronze", info: "10 Commons", color: 0xcd7d32},
		{cost: 25, type: "Silver", info: "3 Commons, 3 Uncommons", color: 0xc0c0c0},
		{cost: 60, type: "Gold", info: "3 Commons, 4 Uncommons, 1 Rare", color: 0xffd700},
		{cost: 100, type: "Platinum", info: "4 Commons, 3 Uncommons, 1 Rare, 1 Shard", color: 0xe4e4e4},
		{cost: 250, type: "Nymph", info: "1 Nymph", color: 0x6699bb},
	];
	var packele = -1, packrarity = -1;

	var storeui = px.mkView();

	storeui.addChild(px.mkBgRect(
		40, 16, 820, 60,
		40, 92, 530, 168,
		40, 270, 620, 168,
		770, 90, 90, 184
	));

	var tgold = px.domText(sock.user.gold + "$");
	var tinfo = px.domText("Select from which element you want.");
	var tinfo2 = px.domText("Select which type of booster you want.");
	var dom = [
		[775, 246, ["Exit", require("./MainMenu")]],
		[775, 101, tgold],
		[50, 26, tinfo],
		[50, 51, tinfo2]
	];
	var hidedom = [tinfo, tinfo2];

	if (sock.user.freepacks){
		var freeinfo = px.domText("");
		dom.push([350, 26, freeinfo]);
	}
	function updateFreeInfo(rarity){
		if (freeinfo){
			freeinfo.text = sock.user.freepacks[rarity] ? "Free " + packdata[rarity].type + " packs left: " + sock.user.freepacks[rarity] : "";
		}
	}

	var bget = px.domButton("Take Cards", function () {
		bget.style.display = "none";
		bbuy.style.display = "inline";
		popbooster.visible = false;
		setVis(hidedom, true);
	});
	bget.style.display = "none";

	function buyPack() {
		if (packrarity == -1) {
			tinfo2.text = "Select a pack first!";
			return;
		}
		if (packele == -1) {
			tinfo.text = "Select an element first!";
			return;
		}
		var pack = packdata[packrarity];
		var boostdata = { pack: packrarity, element: packele };
		ui.parseInput(boostdata, "bulk", packmulti.value, 99);
		if (sock.user.gold >= pack.cost * (boostdata.bulk || 1) || (sock.user.freepacks && sock.user.freepacks[packrarity] > 0)) {
			sock.userEmit("booster", boostdata);
			bbuy.style.display = "none";
		} else {
			tinfo2.text = "You can't afford that!";
		}
	}
	var bbuy = px.domButton("Buy Pack", buyPack);
	dom.push([775, 156, bget], [775, 156, bbuy]);

	var buttons = packdata.map(function(pack, n){
		var g = new PIXI.Graphics();
		g.hitArea = new PIXI.math.Rectangle(0, 0, 100, 150);
		g.lineStyle(3);
		g.beginFill(pack.color);
		g.drawRoundedRect(3, 3, 94, 144, 6);
		g.endFill();
		var name = new PIXI.text.Text(pack.type, {font: "18px Dosis"});
		name.anchor.set(.5, .5);
		name.position.set(50, 75);
		g.addChild(name);
		var price = new PIXI.text.Text(pack.cost, {font: "12px Dosis"});
		price.anchor.set(0, 1);
		price.position.set(7, 148);
		g.addChild(price);
		var gold = new PIXI.Sprite(gfx.gold);
		gold.anchor.set(0, 1);
		gold.position.set(8 + price.width, 144);
		g.addChild(gold);
		px.setClick(g, function(){
			packrarity = n;
			tinfo2.text = pack.type + " Pack: " + pack.info;
			updateFreeInfo(n);
		});
		storeui.addChild(g);
		return px.mkButton(50+125*n, 280, g);
	});

	for (var i = 0;i < 15;i++) {
		(function(_i) {
			var b = px.domEButton(i, function() {
				packele = _i;
				tinfo.text = "Selected Element: " + (packele>12 ? etg.eleNames[packele] : "1:" + packele);
			});
			hidedom.push(b);
			dom.push([75 + Math.floor(i / 2)*64, 120 + (i == 14 ? 37 : (i % 2)*75), b]);
		})(i);
	}

	//booster popup
	var popbooster = px.mkBgRect(0, 0, 710, 568);
	popbooster.position.set(40, 16);
	popbooster.visible = false;
	storeui.addChild(popbooster);

	var cmds = {
		boostergive: function(data) {
			if (data.accountbound) {
				sock.user.accountbound = etgutil.mergedecks(sock.user.accountbound, data.cards);
				if (sock.user.freepacks){
					sock.user.freepacks[data.packtype]--;
					updateFreeInfo(packrarity);
				}
			}
			else {
				sock.user.pool = etgutil.mergedecks(sock.user.pool, data.cards);
				var bdata = {};
				ui.parseInput(bdata, "bulk", packmulti.value, 99);
				sock.user.gold -= packdata[data.packtype].cost * (bdata.bulk || 1);
				tgold.text = sock.user.gold + "$";
			}
			if (etgutil.decklength(data.cards) < 11){
				bget.style.display = "inline";
				if (popbooster.children.length) popbooster.removeChildren();
				etgutil.iterdeck(data.cards, function(code, i){
					var x = i % 5, y = Math.floor(i/5);
					var cardArt = new PIXI.Sprite(gfx.getArt(code));
					cardArt.position.set(7 + (x * 140), y?298:14);
					popbooster.addChild(cardArt);
				});
				popbooster.visible = true;
				setVis(hidedom, false);
			}else{
				bbuy.style.display = "inline";
				var link = document.createElement("a");
				link.href = "deck/" + data.cards;
				link.target = "_blank";
				link.appendChild(document.createTextNode(data.cards));
				chat.addSpan(link);
			}
		},
	};
	var packmulti = document.createElement("input");
	packmulti.style.width = "64px";
	packmulti.placeholder = "Bulk";
	packmulti.addEventListener("keydown", function(e){
		if (e.keyCode == 13){
			buyPack();
		}
	});
	dom.push([777, 184, packmulti]);
	px.refreshRenderer({view: storeui, domshop: dom, cmds:cmds});
}
