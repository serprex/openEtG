var px = require("../px");
var etg = require("../etg");
var gfx = require("../gfx");
var ui = require("../uiutil");
var chat = require("../chat");
var sock = require("../sock");
var tutor = require("../tutor");
var etgutil = require("../etgutil");
function setVis(eles, vis) {
	eles.forEach(function(x){
		x.style.display = vis ? "" : "none";
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

	var tgold = px.dom.text(sock.user.gold + "$");
	var tinfo = px.dom.text("Select from which element you want.");
	var tinfo2 = px.dom.text("Select which type of booster you want.");
	var div = px.dom.div(
		[775, 246, ["Exit", require("./MainMenu")]],
		[775, 101, tgold],
		[50, 26, tinfo],
		[50, 51, tinfo2]
	);
	var hidedom = [tinfo, tinfo2];

	if (sock.user.freepacks){
		var freeinfo = px.dom.text("");
		px.dom.add(div, [350, 26, freeinfo]);
	}
	function updateFreeInfo(rarity){
		if (freeinfo){
			freeinfo.text = sock.user.freepacks[rarity] ? "Free " + packdata[rarity].type + " packs left: " + sock.user.freepacks[rarity] : "";
		}
	}

	var bget = px.dom.button("Take Cards", function () {
		bget.style.display = "none";
		bbuy.style.display = "";
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
	var bbuy = px.dom.button("Buy Pack", buyPack);
	px.dom.add(div, [775, 156, bget], [775, 156, bbuy]);

	packdata.forEach(function(pack, n){
		var g = document.createElement("div");
		g.className = "imgb";
		px.dom.style(g, {
			borderRadius: "6px",
			border: "3px solid black",
			width: "100px",
			height: "150px",
			backgroundColor: pack.color,
		});
		g.appendChild(px.dom.style(px.dom.text(pack.type), {
			fontSize: "18px",
			color: "black",
			position: "absolute",
			top: "50%",
			left: "50%",
			transform: "translate(-50%,-50%)",
		}));
		var price = px.dom.text(pack.cost + "$");
		price.style.color = "black";
		px.dom.add(g, [7, 122, price]);
		g.addEventListener("click", function(){
			packrarity = n;
			tinfo2.text = pack.type + " Pack: " + pack.info;
			updateFreeInfo(n);
		});
		px.dom.add(div, [50+125*n, 280, g]);
		hidedom.push(g);
	});

	for (var i = 0;i < 15;i++) {
		(function(_i) {
			var b = px.dom.icob(i, function() {
				packele = _i;
				tinfo.text = "Selected Element: " + (packele>12 ? etg.eleNames[packele] : "1:" + packele);
			});
			hidedom.push(b);
			px.dom.add(div, [75 + Math.floor(i / 2)*64, 120 + (i == 14 ? 37 : (i % 2)*75), b]);
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
				bget.style.display = "";
				popbooster.removeChildren();
				etgutil.iterdeck(data.cards, function(code, i){
					var x = i % 5, y = Math.floor(i/5);
					var cardArt = new PIXI.Sprite(gfx.getArt(code));
					cardArt.position.set(7 + (x * 140), y?298:14);
					popbooster.addChild(cardArt);
				});
				popbooster.visible = true;
				setVis(hidedom, false);
			}else{
				bbuy.style.display = "";
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
	px.dom.add(div, [777, 184, packmulti]);
	px.view(tutor(tutor.Shop, 8, 500, { view:storeui, dom:div, cmds:cmds }));
}
