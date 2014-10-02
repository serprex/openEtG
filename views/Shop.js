var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");
var ui = require("./uiutil");
var chat = require("./chat");
var sock = require("./sock");
var etgutil = require("./etgutil");
module.exports = function() {
	var packdata = [
		{cost: 15, type: "Bronze", info: "9 Commons", color: 0xcd7d32},
		{cost: 25, type: "Silver", info: "3 Commons, 3 Uncommons", color: 0xc0c0c0},
		{cost: 65, type: "Gold", info: "3 Commons, 4 Uncommons, 1 Rare", color: 0xffd700},
		{cost: 100, type: "Platinum", info: "4 Commons, 3 Uncommons, 1 Rare, 1 Shard", color: 0xe4e4e4},
		{cost: 250, type: "Nymph", info: "1 Nymph", color: 0x6699bb},
	];
	var packele = -1, packrarity = -1;

	var storeui = px.mkView();

	//shop background
	storeui.addChild(px.mkBgRect(
		40, 16, 820, 60,
		40, 92, 530, 168,
		40, 270, 620, 168,
		770, 90, 90, 184
	));
	//gold text
	var tgold = new px.MenuText(775, 101, "$" + sock.user.gold);
	storeui.addChild(tgold);

	//info text
	var tinfo = new px.MenuText(50, 26, "Select from which element you want.");
	storeui.addChild(tinfo);

	var tinfo2 = new px.MenuText(50, 51, "Select which type of booster you want.");
	storeui.addChild(tinfo2);

    //free packs text
	if (sock.user.freepacks){
		var freeinfo = new px.MenuText(350, 26, "");
		storeui.addChild(freeinfo);
	}
	function updateFreeInfo(rarity){
		if (freeinfo){
			freeinfo.setText(sock.user.freepacks[rarity] ? "Free " + packdata[rarity].type + " packs left: " + sock.user.freepacks[rarity] : "");
		}
	}

	//get cards button
	var bget = px.mkButton(775, 156, "Take Cards");
	px.toggleB(bget);
	px.setClick(bget, function () {
		px.toggleB(bget, bbuy);
		px.toggleB.apply(null, buttons);
		popbooster.visible = false;
	});
	storeui.addChild(bget);

	//buy button
	var bbuy = px.mkButton(775, 156, "Buy Pack");
	px.setClick(bbuy, function() {
		if (packrarity == -1) {
			tinfo2.setText("Select a pack first!");
			return;
		}
		if (packele == -1) {
			tinfo.setText("Select an element first!");
			return;
		}
		var pack = packdata[packrarity];
		var boostdata = { pack: packrarity, element: packele };
		ui.parseInput(boostdata, "bulk", packmulti.value, 99);
		if (sock.user.gold >= pack.cost * (boostdata.bulk || 1) || (sock.user.freepacks && sock.user.freepacks[packrarity] > 0)) {
			sock.userEmit("booster", boostdata);
			px.toggleB(bbuy);
		} else {
			tinfo2.setText("You can't afford that!");
		}
	});
	storeui.addChild(bbuy);

	var buttons = packdata.map(function(pack, n){
		var g = new PIXI.Graphics();
		g.hitArea = new PIXI.Rectangle(0, 0, 100, 150);
		g.lineStyle(3);
		g.beginFill(pack.color);
		g.drawRoundedRect(3, 3, 94, 144, 6);
		g.endFill();
		var name = new PIXI.Text(pack.type, {font: "18px Verdana"});
		name.anchor.set(.5, .5);
		name.position.set(50, 75);
		g.addChild(name);
		var price = new PIXI.Sprite(ui.getTextImage("$"+pack.cost, {font: "12px Verdana"}));
		price.anchor.set(0, 1);
		price.position.set(7, 146);
		g.addChild(price);
		px.setClick(g, function(){
			packrarity = n;
			tinfo2.setText(pack.type + " Pack: " + pack.info);
			updateFreeInfo(n);
		});
		storeui.addChild(g);
		return px.mkButton(50+125*n, 280, g);
	});

	for (var i = 0;i < 15;i++) {
		var elementbutton = px.mkButton(75 + Math.floor(i / 2)*64, 120 + (i == 14 ? 37 : (i % 2)*75), gfx.eicons[i]);
		(function(_i) {
			px.setClick(elementbutton, function() {
				packele = _i;
				tinfo.setText("Selected Element: " + etg.eleNames[packele]);
			});
		})(i);
		storeui.addChild(elementbutton);
	}

	//booster popup
	var popbooster = px.mkBgRect(0, 0, 627, 457);
	popbooster.position.set(40, 90);
	popbooster.visible = false;
	storeui.addChild(popbooster);

	storeui.cmds = {
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
				tgold.setText("$" + sock.user.gold);
			}
			if (etgutil.decklength(data.cards) < 11){
				px.toggleB(bget);
				px.toggleB.apply(null, buttons);
				if (popbooster.children.length) popbooster.removeChildren();
				etgutil.iterdeck(data.cards, function(code, i){
					var x = i % 5, y = Math.floor(i/5);
					var cardArt = new PIXI.Sprite(gfx.getArt(code));
					cardArt.scale.set(0.85, 0.85);
					cardArt.position.set(7 + (x * 125), 7 + (y * 225));
					popbooster.addChild(cardArt);
				});
				popbooster.visible = true;
			}else{
				var link = document.createElement("a");
				link.href = "deck/" + data.cards;
				link.target = "_blank";
				link.appendChild(document.createTextNode(data.cards));
				chat.addSpan(link);
				px.toggleB(bbuy);
			}
		},
	};
	var packmulti = document.createElement("input");
	packmulti.style.width = "64px";
	packmulti.placeholder = "Bulk";
	px.refreshRenderer({view: storeui, div: {packmulti: [[777, 184, packmulti], [775, 246, ["Exit", require("./MainMenu")]]]}});
}
