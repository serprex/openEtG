var px = require("../px");
var dom = require("../dom");
var svg = require("../svg");
var chat = require("../chat");
var sock = require("../sock");
var tutor = require("../tutor");
var etgutil = require("../etgutil");
var options = require("../options");

module.exports = function() {
	var packdata = [
		{cost: 15, type: "Bronze", info: "10 Commons", color: "#c73"},
		{cost: 25, type: "Silver", info: "3 Commons, 3 Uncommons", color: "#ccc"},
		{cost: 77, type: "Gold", info: "1 Common, 2 Uncommons, 2 Rares", color: "#fd0"},
		{cost: 100, type: "Platinum", info: "4 Commons, 3 Uncommons, 1 Rare, 1 Shard", color: "#eee"},
		{cost: 250, type: "Nymph", info: "1 Nymph", color: "#69b"},
	];
	var packele = -1, packrarity = -1;
	var tgold = dom.text(sock.user.gold + "$");
	var tinfo = dom.text("Select from which element you want.");
	var tinfo2 = dom.text("Select which type of booster you want.");
	var div = dom.div(
		[40, 16, dom.box(820, 60)],
		[40, 89, dom.box(494, 168)],
		[40, 270, dom.box(620, 168)],
		[770, 90, dom.box(90, 184)],
		[775, 246, ["Exit", require("./MainMenu")]],
		[775, 101, tgold],
		[50, 26, tinfo],
		[50, 51, tinfo2]);

	if (sock.user.freepacks){
		var freeinfo = dom.text("");
		dom.add(div, [350, 26, freeinfo]);
	}
	function updateFreeInfo(rarity){
		if (freeinfo){
			freeinfo.text = sock.user.freepacks[rarity] ? "Free " + packdata[rarity].type + " packs left: " + sock.user.freepacks[rarity] : "";
		}
	}

	var bget = dom.button("Take Cards", function () {
		bget.style.display = "none";
		bbuy.style.display = "";
		popbooster.style.display = "none";
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
		options.parseInput(boostdata, "bulk", packmulti.value, 99);
		if (sock.user.gold >= pack.cost * (boostdata.bulk || 1) || (sock.user.freepacks && sock.user.freepacks[packrarity] > 0)) {
			sock.userEmit("booster", boostdata);
			bbuy.style.display = "none";
		} else {
			tinfo2.text = "You can't afford that!";
		}
	}
	var bbuy = dom.button("Buy Pack", buyPack);
	dom.add(div, [775, 156, bget], [775, 156, bbuy]);
	packdata.forEach(function(pack, n){
		var g = document.createElement("div");
		g.className = "imgb";
		dom.style(g, {
			borderRadius: "6px",
			border: "3px solid #000",
			width: "100px",
			height: "150px",
			backgroundColor: pack.color,
		});
		g.appendChild(dom.style(dom.text(pack.type), {
			fontSize: "18px",
			color: "#000",
			position: "absolute",
			top: "50%",
			left: "50%",
			transform: "translate(-50%,-50%)",
		}));
		var price = dom.text(pack.cost + "$");
		price.style.color = "#000";
		dom.add(g, [7, 122, price]);
		g.addEventListener("click", function(){
			packrarity = n;
			tinfo2.text = pack.type + " Pack: " + pack.info;
			updateFreeInfo(n);
		});
		dom.add(div, [50+125*n, 280, g]);
	});

	for (var i = 0;i < 14;i++) {
		(function(_i) {
			var b = dom.icob(i, function() {
				packele = _i;
				tinfo.text = "Selected Element: " + (packele == 13 ? "Random" : "1:" + packele);
			});
			dom.add(div, [75 + (i>>1)*64, 117 + (i&1)*75, b]);
		})(i);
	}

	var popbooster = dom.box(710, 568);
	popbooster.style.display = "none";
	dom.add(div, [40, 16, popbooster]);

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
				options.parseInput(bdata, "bulk", packmulti.value, 99);
				sock.user.gold -= packdata[data.packtype].cost * (bdata.bulk || 1);
				tgold.text = sock.user.gold + "$";
			}
			if (etgutil.decklength(data.cards) < 11){
				bget.style.display = "";
				while (popbooster.firstChild) popbooster.firstChild.remove();
				etgutil.iterdeck(data.cards, function(code, i){
					var x = i % 5, y = Math.floor(i/5);
					var cardArt = dom.svg();
					cardArt.setAttribute("width", "128");
					cardArt.setAttribute("height", "256");
					cardArt.style.position = "absolute";
					cardArt.style.left = (7+x*140)+"px";
					cardArt.style.top = (y?298:14)+"px";
					dom.svgToSvg(cardArt, svg.card(code));
					popbooster.appendChild(cardArt);
				});
				popbooster.style.display = "";
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
	packmulti.addEventListener("keypress", function(e){
		if (e.keyCode == 13){
			buyPack();
		}
	});
	dom.add(div, [777, 184, packmulti]);
	px.view(tutor(tutor.Shop, 8, 500, { dom:div, cmds:cmds }));
}
