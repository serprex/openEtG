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
		{cost: 15, type: "Bronze", info: "10 Commons", color: "#cd7d32"},
		{cost: 25, type: "Silver", info: "3 Commons, 3 Uncommons", color: "#c0c0c0"},
		{cost: 60, type: "Gold", info: "3 Commons, 4 Uncommons, 1 Rare", color: "#ffd700"},
		{cost: 100, type: "Platinum", info: "4 Commons, 3 Uncommons, 1 Rare, 1 Shard", color: "#e4e4e4"},
		{cost: 250, type: "Nymph", info: "1 Nymph", color: "#6699bb"},
	];
	var packele = -1, packrarity = -1, storeui = new PIXI.Container();

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

	packdata.forEach(function(pack, n){
		var g = document.createElement("div");
		g.className = "imgb";
		g.style.borderRadius = "6px";
		g.style.border = "3px solid black";
		g.style.width = "100px";
		g.style.height = "150px";
		g.style.backgroundColor = pack.color;
		var name = px.domText(pack.type);
		name.style.position = "absolute";
		name.style.fontSize = "18px";
		name.style.color = "black";
		name.style.top = "50%";
		name.style.textAlign = "center";
		name.style.transform = "translateY(-50%)"
		name.style.width = "100px";
		g.appendChild(name);
		var price = px.domText(pack.cost + "$");
		price.style.position = "absolute";
		price.style.color = "black";
		price.style.left = "7px";
		price.style.top = "122px";
		g.appendChild(price);
		g.addEventListener("click", function(){
			packrarity = n;
			tinfo2.text = pack.type + " Pack: " + pack.info;
			updateFreeInfo(n);
		});
		dom.push([50+125*n, 280, g]);
		hidedom.push(g);
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

	var tutspan;
	var tutorialbutton = px.mkButton(20, 500, gfx.eicons[13]);
	px.setClick(tutorialbutton, function() {
		if (tutspan) {
			document.body.removeChild(tutspan);
			tutspan = null;
			return;
		}
		var span = document.createElement("span");
		[[45, 97, 520, 158, "1 ) Select the element of the pack you want to buy. \nEach card in the pack has a 50% chance of being the element you choose. " +
			"\nRandom pack means the cards is completely random instead, \nand Recently Released means it has a 50% chance of being a recently added card."],
		[45, 275, 610, 158, "2 ) Select the type of pack you want. \nYou will see the amount of cards and rarity of each pack in the upper box."],
		[590, 97, 260, 158, "3) Buy the pack you selected! \nIf you want to buy many packs at once, type in the Bulk box how many you want. \nIn chat you will see a link to a deck code with the cards you got."]].forEach(function(info) {
			var div = px.domBox(info[2], info[3], true);
			div.style.position = "absolute";
			div.style.left = info[0] + "px";
			div.style.top = info[1] + "px";
			var text = px.domText(info[4]);
			text.style.color = "#000000";
			text.style.position = "absolute";
			text.style.left = 5 + "px";
			text.style.top = "50%";
			text.style.transform = "translateY(-50%)";
			div.appendChild(text);
			span.appendChild(div);
		});
		//40, 270, 620, 168,
		tutspan = span;
		document.body.appendChild(span);
	});
	storeui.addChild(tutorialbutton);

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
