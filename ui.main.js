var Cards, CardCodes,Targeting, targetingMode, targetingModeCb, targetingText, game, discarding, animCb, user, renderer, endturnFunc, cancelFunc, foeDeck, player2summon, player2Card;
(function(g){
	var htmlElements = ["leftpane", "chatArea", "chatinput", "deckimport", "aideck", "foename", "airefresh", "change", "login", "password", "challenge", "aievalopt", "chatBox", "trade", "bottompane"];
	for(var i=0; i<htmlElements.length; i++){
		g[htmlElements[i]] = document.getElementById(htmlElements[i]);
	}
})(window);
var etg = require("./etgutil");
var MersenneTwister = require("./MersenneTwister");
var myTurn = false;
var cardChosen = false;
loadcards(function(cards, cardcodes, targeting) {
	Cards = cards;
	CardCodes = cardcodes;
	Targeting = targeting;
	console.log("Cards loaded");
});
function getTarget(src, active, cb){
	var targetingFilter = Targeting[active.activename];
	if (targetingFilter){
		targetingMode = function(t){ return (t instanceof Player || t instanceof CardInstance || t.owner == game.turn || t.passives.cloak || !t.owner.isCloaked()) && targetingFilter(src, t); }
		targetingModeCb = cb;
		targetingText = active.activename;
	}else{
		cb();
	}
}
function maybeSetText(obj, text){
	if (obj.text != text)obj.setText(text);
}
function maybeSetTexture(obj, text){
	if (text){
		obj.visible = true;
		obj.setTexture(text);
	}else obj.visible = false;
}
function reflectPos(obj){
	var pos = obj instanceof PIXI.Point?obj:obj.position;
	pos.set(900-pos.x, 600-pos.y);
}
function hitTest(obj, pos){
	var x = obj.position.x-obj.width*obj.anchor.x, y = obj.position.y-obj.height*obj.anchor.y;
	return pos.x > x && pos.y > y && pos.x < x+obj.width && pos.y < y+obj.height;
}
function setInteractive(){
	for(var i=0; i<arguments.length; i++){
		arguments[i].interactive = true;
	}
}
function userEmit(x, data){
	if (!data)data = {};
	data.u = user.name;
	data.a = user.auth;
	socket.emit(x, data);
}
function tgtToBits(x){
	var bits;
	if (x == undefined){
		return 0;
	}else if (x instanceof Player){
		bits = 1;
	}else if (x instanceof Weapon){
		bits = 17;
	}else if (x instanceof Shield){
		bits = 33;
	}else{
		bits = (x instanceof Creature?2:x instanceof Permanent?4:5)|x.getIndex()<<4;
	}
	if (x.owner == game.player2){
		bits |= 8;
	}
	return bits;
}
function bitsToTgt(x){
	var tgtop=x&7, player=game.players[x&8?0:1];
	if (tgtop == 0){
		return undefined;
	}else if (tgtop==1){
		return player[["owner", "weapon", "shield"][x>>4]];
	}else if (tgtop==2){
		return player.creatures[x>>4];
	}else if (tgtop==4){
		return player.permanents[x>>4];
	}else if (tgtop==5){
		return player.hand[x>>4];
	}else console.log("Unknown tgtop: "+tgtop+", "+x);
}
function creaturePos(j, i){
	var p = new PIXI.Point(170+Math.floor(i/5)*120+(i%5)*8, 315+(i%5)*30);
	if (j){
		reflectPos(p);
	}
	return p;
}
function permanentPos(j, i){
	var p = new PIXI.Point(170+Math.floor(i/4)*120+(i%4)*8, 475+(i%4)*30);
	if (j){
		reflectPos(p);
	}
	return p;
}
function tgtToPos(t){
	if (t instanceof Creature){
		return creaturePos(t.owner == game.player2, t.getIndex());
	}else if (t instanceof Weapon){
		var p = new PIXI.Point(690, 530);
		if (t.owner == game.player2)reflectPos(p);
		return p;
	}else if (t instanceof Shield){
		var p = new PIXI.Point(690, 560);
		if (t.owner == game.player2)reflectPos(p);
		return p;
	}else if (t instanceof Permanent){
		return permanentPos(t.owner == game.player2, t.getIndex());
	}else if (t instanceof Player){
		var p = new PIXI.Point(50, 560);
		if (t == game.player2)reflectPos(p);
		return p;
	}else if (t instanceof CardInstance){
		return new PIXI.Point(j?20:780, (j?140:300)+20*i);
	}else console.log("Unknown target");
}
function refreshRenderer(){
	if (renderer){
		leftpane.removeChild(renderer.view);
	}
	renderer = new PIXI.CanvasRenderer(900, 600);
	leftpane.appendChild(renderer.view);
}
var loader = new PIXI.AssetLoader(["esheet.png"]);
loader.onComplete = function(){
	var baseTexture = PIXI.Texture.fromImage("esheet.png");
	var icons = [];
	for(var i=0; i<13; i++){
		icons.push(new PIXI.Texture(baseTexture, new PIXI.Rectangle(i*32, 0, 32, 32)));
	}
	eicons = icons;
}
var cardBacks = [];
var backLoader = new PIXI.AssetLoader(["backsheet.png"]);
backLoader.onComplete = function () {
	var baseTexture = PIXI.Texture.fromImage("backsheet.png");
	var backs = [];
	for (var i = 0; i < 26; i++) {
		backs.push(new PIXI.Texture(baseTexture, new PIXI.Rectangle(i * 132, 0, 132, 256)));
	}
	cardBacks = backs;
}
var rarityicons = [];
var rarityLoader = new PIXI.AssetLoader(["raritysheet.png"]);
rarityLoader.onComplete = function () {
	var baseTexture = PIXI.Texture.fromImage("raritysheet.png");
	var rarities = [];
	for (var i = 0; i < 6; i++) {
		rarities.push(new PIXI.Texture(baseTexture, new PIXI.Rectangle(i * 10, 0, 10, 10)));
	}
	rarityicons = rarities;
}
loader.load();
backLoader.load();
rarityLoader.load();
var mainStage, menuui, gameui;
var nopic = PIXI.Texture.fromImage("null.png"),cardBacks, eicons, caimgcache = {}, crimgcache = {}, primgcache = {}, artcache = {};
var elecols = [0xa99683, 0xaa5999, 0x777777, 0x996633, 0x5f4930, 0x50a005, 0xcc6611, 0x205080, 0xa9a9a9, 0x337ddd, 0xccaa22, 0x333333, 0x77bbdd];
function lighten(c){
	return (c&255)/2+127|((c>>8)&255)/2+127<<8|((c>>16)&255)/2+127<<16;
}
function getIcon(ele){
	return eicons?eicons[ele]:nopic;
}
function getBack(ele, upped) {
	var offset = upped ? 13 : 0;
	return cardBacks ? cardBacks[ele + offset] : nopic;
}
function getRareIcon(rarity) {
	return rarityicons ? rarityicons[rarity] : nopic;
}
function makeArt(card, art){
	var rend = new PIXI.RenderTexture(132, 256);
	var background = new PIXI.Sprite(getBack(card.element, card.upped));
	var rarity = new PIXI.Sprite(getRareIcon(card.rarity));
	var template = new PIXI.Graphics();
	background.position.set(0, 0);
	template.addChild(background);
	rarity.position.set(66, 241);
	template.addChild(rarity);
	if (art){
		var artspr = new PIXI.Sprite(art);
		artspr.position.set(2, 20);
		template.addChild(artspr);
	}
	var nametag = new PIXI.Text(card.name, {font: "12px Dosis", fill:card.upped?"black":"white"});
	nametag.position.set(2, 4);
	template.addChild(nametag);
	if (card.cost){
		var text = new PIXI.Text(card.cost, {font: "12px Dosis", fill:card.upped?"black":"white"});
		text.anchor.x = 1;
		text.position.set(rend.width-20, 4);
		template.addChild(text);
		if (card.costele){
			var eleicon = new PIXI.Sprite(getIcon(card.costele));
			eleicon.position.set(rend.width-1, 10);
			eleicon.anchor.set(1, .5);
			eleicon.scale.set(.5, .5);
			template.addChild(eleicon);
		}
	}
	var words = card.info().split(" ");
	var x=2, y=150;
	for(var i=0; i<words.length; i++){
		var wordgfx = new PIXI.Sprite(getTextImage(words[i], 11, card.upped?"black":"white"));
		if (x + wordgfx.width > rend.width-2){
			x = 2;
			y += 12;
		}
		wordgfx.position.set(x, y);
		x += wordgfx.width + 3;
		template.addChild(wordgfx);
	}
	rend.render(template);
	return rend;
}
function getArt(code){
	if (artcache[code])return artcache[code];
	else{
		var loader = new PIXI.AssetLoader(["Cards/" + code + ".png"]);
		loader.onComplete = function(){
			artcache[code] = makeArt(CardCodes[code], PIXI.Texture.fromImage("Cards/"+code+".png"));
		}
		artcache[code] = makeArt(CardCodes[code]);
		loader.load();
		return artcache[code];
	}
}
function getCardImage(code){
	if (caimgcache[code])return caimgcache[code];
	else{
		var card = CardCodes[code];
		var rend = new PIXI.RenderTexture(100, 20);
		var graphics = new PIXI.Graphics();
		graphics.lineStyle(2, 0x222222, 1);
		graphics.beginFill(card?(card.upped?lighten(elecols[card.element]):elecols[card.element]):code=="0"?0x887766:0x111111);
		graphics.drawRect(0, 0, 100, 20);
		graphics.endFill();
		if (card){
			var clipwidth = 2;
			if (card.cost){
				var text = new PIXI.Text(card.cost, {font: "11px Dosis", fill:card.upped?"black":"white"});
				text.anchor.x = 1;
				text.position.set(rend.width-20, 5);
				graphics.addChild(text);
				clipwidth += text.width + 22;
				if (card.costele){
					var eleicon = new PIXI.Sprite(getIcon(card.costele));
					eleicon.position.set(rend.width-1, 10);
					eleicon.anchor.set(1, .5);
					eleicon.scale.set(.5, .5);
					graphics.addChild(eleicon);
				}
			}
			var text, loopi=0;
			do text = new PIXI.Text(card.name.substring(0, card.name.length-(loopi++)), {font: "11px Dosis", fill:card.upped?"black":"white"}); while(text.width>rend.width-clipwidth);
			text.position.set(2, 5);
			graphics.addChild(text);
		}
		rend.render(graphics);
		return eicons?(caimgcache[code] = rend):rend;
	}
}
function getCreatureImage(code){
	if (crimgcache[code])return crimgcache[code];
	else{
		var card = CardCodes[code];
		var rend = new PIXI.RenderTexture(120, 30);
		var graphics = new PIXI.Graphics();
		graphics.lineStyle(2, 0x222222, 1);
		graphics.beginFill(card?(card.upped?lighten(elecols[card.element]):elecols[card.element]):elecols[0]);
		graphics.drawRect(0, 0, 120, 30);
		graphics.endFill();
		if (card){
			var text = new PIXI.Text(CardCodes[code].name, {font: "12px Dosis", fill:card.upped?"black":"white"});
			text.position.set(2, 2);
			graphics.addChild(text);
		}
		rend.render(graphics);
		return crimgcache[code] = rend;
	}
}
function getPermanentImage(code){
	if (primgcache[code])return primgcache[code];
	else{
		var card = CardCodes[code];
		var rend = new PIXI.RenderTexture(120, 30);
		var graphics = new PIXI.Graphics();
		graphics.lineStyle(2, 0x222222, 1);
		graphics.beginFill(card?(card.upped?lighten(elecols[card.element]):elecols[card.element]):elecols[0]);
		graphics.drawRect(0, 0, 120, 30);
		graphics.endFill();
		if (card){
			var text = new PIXI.Text(CardCodes[code].name, {font: "12px Dosis", fill:card.upped?"black":"white"});
			text.position.set(2, 2);
			graphics.addChild(text);
		}
		rend.render(graphics);
		return primgcache[code] = rend;
	}
}
function initTrade(data) {
	function isFreeCard(card) {
		return card.type == PillarEnum && !card.upped && !card.rarity;
	}
	player2Card = null;
	cardChosen = false;
	if (data.first) myTurn = true;
	var editorui = new PIXI.Stage(0x336699, true), tradeelement = 0;
	var btrade = new PIXI.Text("Trade", { font: "16px Dosis" });
	var bconfirm = new PIXI.Text("Confirm trade", { font: "16px Dosis" });
	var bconfirmed = new PIXI.Text("Confirmed!", { font: "16px Dosis" });
	var bcancel = new PIXI.Text("Cancel Trade", { font: "16px Dosis" });
	var editorcolumns = [];
	var selectedCard;
	var cardartcode;
	bcancel.position.set(10, 10);
	bcancel.click = function () {
		userEmit("canceltrade");
		startMenu();
	}
	btrade.position.set(100, 100);
	btrade.click = function () {
		if (myTurn) {
			if (selectedCard) {
				userEmit("cardchosen", { card: selectedCard })
				console.log("Card sent")
				myTurn = false;
				cardChosen = true;
				editorui.removeChild(btrade);
				editorui.addChild(bconfirm);
			}
			else
				chatArea.value = "You have to choose a card!"
		}
		else
			chatArea.value = "You need to wait for your friend to choose a card first";
	}
	bconfirm.position.set(100, 150);
	bconfirm.click = function () {
		if (player2Card) {
			console.log("Confirmed!");
			myTurn = false;
			userEmit("confirmtrade", { card: selectedCard, oppcard: player2Card });
			editorui.removeChild(bconfirm);
			editorui.addChild(bconfirmed);
		}
		else
			chatArea.value = "Wait for your friend to choose a card!"
	}
	bconfirmed.position.set(100, 180);
	setInteractive(btrade, bconfirm, bcancel);
	editorui.addChild(btrade);
	editorui.addChild(bcancel);


	var cardpool = {};
	for (var i = 0; i < user.pool.length; i++) {
		if (user.pool[i] in cardpool) {
			cardpool[user.pool[i]]++;
		} else {
			cardpool[user.pool[i]] = 1;
		}
	}

	var editoreleicons = [];
	for (var i = 0; i < 13; i++) {
		var sprite = new PIXI.Sprite(nopic);
		sprite.position.set(8, 184 + i * 32);
		setInteractive(sprite);
		(function (_i) {
			sprite.click = function () { tradeelement = _i; }
		})(i);
		editoreleicons.push(sprite);
		editorui.addChild(sprite);
	}
	for (var i = 0; i < 6; i++) {
		editorcolumns.push([[], []]);
		for (var j = 0; j < 15; j++) {
			var sprite = new PIXI.Sprite(nopic);
			sprite.position.set(100 + i * 130, 272 + j * 20);
			var sprcount = new PIXI.Text("", { font: "12px Dosis" });
			sprcount.position.set(102, 4);
			sprite.addChild(sprcount);
			(function (_i, _j) {
				sprite.click = function () {
					if (player2Card && CardCodes[player2Card].rarity != CardCodes[cardartcode].rarity) chatArea.value = "You can only trade cards with the same rarity";
					else if (cardChosen) chatArea.value = "You have already selected a card";
					else if (!myTurn) chatArea.value = "You need to wait for your friend to choose a card first";
					else if (isFreeCard(CardCodes[cardartcode])) chatArea.value = "You can't trade a free card, that would just be cheating!";
					else selectedCard = cardartcode;
				}
				sprite.mouseover = function () {
					cardartcode = editorcolumns[_i][1][tradeelement][_j];
				}
			})(i, j);
			sprite.interactive = true;
			editorui.addChild(sprite);
			editorcolumns[i][0].push(sprite);
		}
		for (var j = 0; j < 13; j++) {
			editorcolumns[i][1].push(filtercards(i > 2,
				function (x) { return x.element == j && ((i % 3 == 0 && x.type == CreatureEnum) || (i % 3 == 1 && x.type <= PermanentEnum) || (i % 3 == 2 && x.type == SpellEnum)); },
				editorCardCmp));
		}
	}
	var cardArt = new PIXI.Sprite(nopic);
	cardArt.position.set(734, 8);
	editorui.addChild(cardArt);
	var selectedCardArt = new PIXI.Sprite(nopic);
	selectedCardArt.position.set(334, 8);
	editorui.addChild(selectedCardArt);
	var player2CardArt = new PIXI.Sprite(nopic);
	player2CardArt.position.set(534, 8);
	editorui.addChild(player2CardArt);
	animCb = function () {
		if (cardartcode) {
			cardArt.setTexture(getArt(cardartcode));
		}
		if (selectedCard) {
			selectedCardArt.setTexture(getArt(selectedCard));
		}
		if (player2Card) {
			player2CardArt.setTexture(getArt(player2Card));
		}
		for (var i = 0; i < 13; i++) {
			editoreleicons[i].setTexture(getIcon(i));
		}
		for (var i = 0; i < 6; i++) {
			for (var j = 0; j < editorcolumns[i][1][tradeelement].length; j++) {
				var spr = editorcolumns[i][0][j], code = editorcolumns[i][1][tradeelement][j], card = CardCodes[code];
				if (card in cardpool || isFreeCard(card)) spr.visible = true;
				else spr.visible = false;
				spr.setTexture(getCardImage(code));
				var txt = spr.getChildAt(0), card = CardCodes[code], inf = isFreeCard(card);
				if ((txt.visible = inf || code in cardpool)) {
					maybeSetText(txt, inf ? "-" : (cardpool[code].toString()));
				}
			}
			for (; j < 15; j++) {
				editorcolumns[i][0][j].visible = false;
			}
		}
	}
	mainStage = editorui;
	refreshRenderer();
}
function initGame(data, ai){
	game = mkGame(data.first, data.seed);
	if (data.hp){
		game.player2.maxhp = game.player2.hp = data.hp;
	}
	if (data.aimarkpower) {
		game.player2.markpower = data.aimarkpower;
	}
	var idx, code, decks = [data.urdeck, data.deck];
	for(var j=0; j<2; j++){
		for(var i=0; i<decks[j].length; i++){
			if (CardCodes[code=decks[j][i]]){
				game.players[j].deck.push(CardCodes[code]);
			}else if (~(idx=TrueMarks.indexOf(code))){
				game.players[j].mark=idx;
			}
		}
	}
	foeDeck = game.player2.deck.slice();
	if (game.turn == game.player1){
		game.player1.drawhand(7);
		game.player2.drawhand(7);
	}else{
		game.player2.drawhand(7);
		game.player1.drawhand(7);
	}
	startMatch();
	if (ai){
		game.player2.ai = ai;
		if(game.turn == game.player2){
			progressMulligan(game);
		}
	}
}
function getDeck(){
	if (user){
		return user.deck || [];
	}
	var deckstring = deckimport.value;
	return deckstring?deckstring.split(" "):[];
}
var aiDelay = 0;
function aiEvalFunc(){
	var gameBack = game;
	var disableEffectsBack = disableEffects;
	game = cloneGame(game);
	disableEffects = true;
	var self = game.player2;
	function mkcommand(cbits, tbits){
		return ["cast", cbits|tbits<<9];
	}
	function iterLoop(n, commands, currentEval){
		function iterCore(c, active){
			var cbits = tgtToBits(c)^8;
			var candidates = [fullCandidates[0]];
			function evalIter(t, ignoret){
				if (ignoret || (t && targetingMode(t))){
					var tbits = tgtToBits(t)^8;
					var gameBack2 = game, targetingModeBack = targetingMode, targetingModeCbBack = targetingModeCb;
					game = cloneGame(game);
					var tone = bitsToTgt(tbits);
					bitsToTgt(cbits).useactive(tone);
					var cmdcopy = commands.slice();
					cmdcopy.push(mkcommand(cbits, tbits));
					var v = evalGameState(game);
					console.log(c + " " + t + " " + v);
					if (v<candidates[0]){
						candidates = [v, cmdcopy];
					}
					if (n){
						var iterRet = iterLoop(n-1, cmdcopy, v);
						if (iterRet[0] < candidates[0]){
							candidates = iterRet;
						}
					}
					game = gameBack2;
					targetingMode = targetingModeBack;
					targetingModeCb = targetingModeCbBack;
				}
			}
			getTarget(c, active || Actives.obsession, function(t){
				if (!t){
					evalIter(undefined, true);
				}
				targetingMode = null;
				console.log(candidates.length + candidates.join(" "));
				if (candidates.length > 1){
					var v = candidates[0], oldv = fullCandidates[0];
					if (v < oldv){
						fullCandidates = candidates;
					}
				}
			});
			if (targetingMode){
				console.log("in " + active.activename);
				for(var j=0; j<2; j++){
					var pl = j==0?c.owner:c.owner.foe;
					console.log("1:" + (pl.game == game));
					evalIter(pl);
					console.log("2:" + (pl.game == game));
					evalIter(pl.weapon);
					evalIter(pl.shield);
					for(var i=0; i<23; i++){
						evalIter(pl.creatures[i]);
					}
					console.log("3:" + (pl.game == game));
					for(var i=0; i<16; i++){
						evalIter(pl.permanents[i]);
					}
					for(var i=0; i<pl.hand.length; i++){
						evalIter(pl.hand[i]);
					}
				}
				console.log("out");
				targetingModeCb(1);
			}
		}
		if (currentEval === undefined){
			currentEval = evalGameState(game);
		}
		console.log("Currently " + currentEval);
		var fullCandidates = [currentEval];
		var self = game.player2;
		var wp=self.weapon, sh=self.shield;
		if (wp && wp.canactive()){
			iterCore(wp, wp.active.cast);
		}
		if (sh && sh.canactive()){
			iterCore(sh, sh.active.cast);
		}
		for(var i=0; i<23; i++){
			var cr = self.creatures[i];
			if (cr && cr.canactive()){
				iterCore(cr, cr.active.cast);
			}
		}
		for(var i=0; i<16; i++){
			var pr = self.permanents[i];
			if (pr && pr.canactive()){
				iterCore(pr, pr.active.cast);
			}
		}
		var codecache = {};
		for(var i=self.hand.length-1; i>=0; i--){
			var cardinst = self.hand[i];
			if (cardinst.canactive()){
				if (!(cardinst.card.code in codecache)){
					codecache[cardinst.card.code] = true;
					iterCore(cardinst, cardinst.card.type == SpellEnum && cardinst.card.active);
				}
			}
		}
		return fullCandidates;
	}
	var cmd = iterLoop(1, [])[1];
	game = gameBack;
	disableEffects = disableEffectsBack;
	if (cmd){
		return cmd[0];
	}else if (self.hand.length == 8) {
		var mincardvalue = 999, worstcards;
		for (var i = 0; i<8; i++) {
			var cardinst = self.hand[i];
			var cardvalue = self.quanta[cardinst.card.element] - cardinst.card.cost;
			if (cardinst.card.type != SpellEnum && cardinst.card.active && cardinst.card.active.discard == Actives.obsession) { cardvalue += 5; }
			if (cardvalue == mincardvalue){
				worstcards.push(i);
			}else if (cardvalue < mincardvalue) {
				mincardvalue = cardvalue;
				worstcards = [i];
			}
		}
		return ["endturn", worstcards[Math.floor(Math.random()*worstcards.length)]];
	}else return ["endturn"];
}
function aiFunc(){
	var self = this;
	function iterCore(c, active){
		var cmd;
		getTarget(c, active, function(t){
			targetingMode = null;
			if (!t && !ActivesEval[active.activename](c)){
				console.log("Hold "+active.activename);
				return;
			}
			cmd = ["cast", (tgtToBits(c)^8)|(tgtToBits(t)^8)<<9];
		});
		if (targetingMode){
			console.log("in " + active.activename);
			var t = evalPickTarget(c, active, targetingMode);
			console.log("out " + (t?(t instanceof Player?"player":t.card.name):""));
			if (t){
				targetingModeCb(t);
			}else targetingMode = null;
		}
		return cmd;
	}
	var cmd;
	for(var i=0; i<23; i++){
		var cr = self.creatures[i];
		if (cr && cr.canactive()){
			if (cmd = iterCore(cr, cr.active.cast))return cmd;
		}
	}
	var wp=self.weapon, sh=self.shield;
	if (wp && wp.canactive()){
		if (cmd = iterCore(wp, wp.active.cast))return cmd;
	}
	if (sh && sh.canactive()){
		if (cmd = iterCore(sh, sh.active.cast))return cmd;
	}
	for(var i=self.hand.length-1; i>=0; i--){
		var cardinst = self.hand[i];
		if (cardinst.canactive()){
			if (cardinst.card.type == SpellEnum){
				if (cmd = iterCore(cardinst, cardinst.card.active))return cmd;
			}else if (cardinst.card.type == WeaponEnum ? (!self.weapon || self.weapon.card.cost < cardinst.card.cost):
				cardinst.card.type == ShieldEnum ? (!self.shield || self.shield.card.cost < cardinst.card.cost):true){
				return ["cast", tgtToBits(cardinst)^8];
			}
		}
	}
	for(var i=0; i<16; i++){
		var pr = self.permanents[i];
		if (pr && pr.canactive()){
			if (cmd = iterCore(pr, pr.active.cast))return cmd;
		}
	}
	if (self.hand.length == 8) {
		var mincardvalue = 999, worstcards;
		for (var i = 0; i<8; i++) {
			var cardinst = self.hand[i];
			var cardvalue = self.quanta[cardinst.card.element] - cardinst.card.cost;
			if (cardinst.card.type != SpellEnum && cardinst.card.active && cardinst.card.active.discard == Actives.obsession) { cardvalue += 5; }
			if (cardvalue == mincardvalue){
				worstcards.push(i);
			}else if (cardvalue < mincardvalue) {
				mincardvalue = cardvalue;
				worstcards = [i];
			}
		}
		return ["endturn", worstcards[Math.floor(Math.random()*worstcards.length)]];
	}else return ["endturn"];
}
function mkDemigod()
{
	if (user) {
		if (user.gold < 20) {
			chatArea.value = "Requires 20\u00A4";
			return;
		}
		user.gold -= 20;
		userEmit("subgold", { g: 20 });
	}
	var demigodDeck = ["7ne 7ne 7ne 7ne 7n9 7n9 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t4 7t9 7t9 7t9 7tb 7tb 7ta 7ta 7ta 7td 7td 7td 7td 7t5 7t5 8pr",
	"7an 7an 7an 7an 7ap 7ap 7ap 7ap 7aj 7aj 7gk 7gk 7gk 7gk 7gk 7gk 7gk 7gk 7gk 7gk 7gk 7gk 7gk 7gk 7h4 7h4 7h4 7h4 7h4 7gq 7gq 7gq 7h1 7h1 7h1 7gr 7gr 7gr 7gu 7gu 7gu 7gu 7gu 7gu 8pn",
	"744 744 744 744 744 744 744 744 744 744 744 744 744 744 744 74f 74f 74f 74f 74f 74f 745 745 745 745 745 7k9 7k9 7k9 7k9 7k9 7k9 7jv 7jv 7jv 7jv 7jv 7k7 7k7 7k7 7k1 8pq",
	"6ts 6ts 6ts 6ts 6ts 6ts 6ts 6ts 6ts 6ts 6ve 6ve 6ve 6ve 6ve 6ve 6u2 6u2 6u2 6u2 6u2 6u2 6u1 6u1 6u1 6u1 6u1 6u1 6ud 6ud 6ud 6ud 6u7 6u7 6u7 6u7 7th 7th 7tj 7tj 7tj 7ta 7ta 8pt",
	"718 718 718 718 718 718 71a 71a 71a 71a 71a 7n2 7n2 7n2 7n2 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q0 7q4 7q4 7q4 7qf 7qf 7qf 7q5 7q5 7q5 7q5 7q5 7q5 7qg 7qg 7qg 7qg 8pk",
	"7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7bu 7bu 7bu 7bu 7bu 7bu 7ae 7ae 7ae 7ae 7ae 7ae 7al 7am 7am 7am 7as 7as 7as 7as 80d 80d 80d 80d 80i 80i 80i 8pu",
	"7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7ac 7bu 7bu 7bu 7bu 7bu 7am 7am 7am 7dm 7dm 7dn 7dn 7do 7do 7n0 7n6 7n6 7n6 7n6 7n3 7n3 7n3 7n3 7n3 7n3 7nb 7n9 7n9 7n9 8pr",
	"7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7dg 7e0 7e0 7e0 7e0 7e0 7e0 7dv 7dv 7dv 7dv 7dv 7dv 7n2 7n2 7n2 7n2 7qb 7qb 7qb 7th 7th 7th 7th 7tb 7tb 7tb 7tb 7tb 7tb 7ta 7ta 8pt",
	"710 710 710 710 710 710 710 710 710 710 710 710 710 710 72i 72i 72i 72i 71l 71l 71l 71l 717 717 717 71b 71b 71b 711 711 7t7 7t7 7t7 7t7 7t7 7t7 7t9 7t9 7t9 7ti 7ti 7ti 7ti 7ta 7ta 8pt",
	"778 778 778 778 778 778 778 778 778 778 778 778 778 778 778 778 778 778 778 77g 77g 77g 77g 77g 77g 77q 77q 77h 77h 77h 77h 77h 77b 77b 77b 7q4 7q4 7q4 7ql 7ql 7ql 7ql 7ql 7q3 7q3 8ps"]
	var deck = demigodDeck[Math.floor(Math.random() * demigodDeck.length)].split(" ");
	deck = deck.slice(0,deck.length-2).concat(deck);
	var urdeck = getDeck();
	if ((user && (!user.deck || user.deck.length < 31)) || urdeck.length < 11){
		startEditor();
		return;
	}
	initGame({ first: Math.random() < .5, deck: deck, urdeck: urdeck, seed: Math.random() * etg.MAX_INT, hp: 200, aimarkpower: 3 }, aievalopt.checked ? aiEvalFunc : aiFunc);
	game.cost = 20;
	game.gold = 30;
}
function mkAi(level){
	return function() {
		var uprate = level==1?0:(level==2?.1:.3);
		var gameprice = 0;
		function upCode(x){
			return CardCodes[x].asUpped(Math.random()<uprate).code;
		}
		if (Cards){
			var urdeck = getDeck();
			if ((user && (!user.deck || user.deck.length < 31)) || urdeck.length < 11){
				startEditor();
				return;
			}
			var aideckstring = aideck.value, deck;
			if (!user && aideckstring){
				deck = aideckstring.split(" ");
			} else {
				if (user && level>1){
					if (user.gold<10){
						chatArea.value = "Requires 10\u00A4";
						return;
					}
					user.gold -= 10;
					userEmit("subgold", { g: 10 });
					gameprice = 10;
				}
				var cardcount = {};
				var eles = [Math.ceil(Math.random()*12), Math.ceil(Math.random()*12)], ecost = [];
				var pillars = filtercards(false, function(x){ return x.type == PillarEnum && !x.rarity; });
				for(var i=0; i<13; i++){
					ecost[i] = 0;
				}
				deck = [];
				var pl = PlayerRng;
				var anyshield=0, anyweapon=0;
				for(var j=0; j<2; j++){
					for (var i = 0; i < (j == 0 ? 20 : 10) ; i++) {
						var maxRarity = level==1?2:(level==2?3:4);
						var card = pl.randomcard(Math.random()<uprate, function(x){return x.element == eles[j] && x.type != PillarEnum && x.rarity <= maxRarity && cardcount[x.code] != 6 && !(x.type == ShieldEnum && anyshield == 3) && !(x.type == WeaponEnum && anyweapon == 3);});
						deck.push(card.code);
						cardcount[card.code] = (cardcount[card.code] || 0) + 1;
						if (!(((card.type == WeaponEnum && !anyweapon) || (card.type == ShieldEnum && !anyshield)) && cardcount[card.code])){
							ecost[card.costele] += card.cost;
						}
						if (card.cast){
							ecost[card.castele] += card.cast*1.5;
						}
						if (card == Cards.Nova || card == Cards.SuperNova){
							for(var k=1; k<13; k++){
								ecost[k]--;
							}
						}else if (card.type == ShieldEnum)anyshield++;
						else if (card.type == WeaponEnum)anyweapon++;
					}
				}
				if (!anyshield){
					var card = CardCodes[deck[0]];
					ecost[card.costele] -= card.cost;
					deck[0] = Cards.Shield.asUpped(Math.random()<uprate).code;
				}
				if (!anyweapon){
					var card = CardCodes[deck[1]];
					ecost[card.costele] -= card.cost;
					deck[1] = (eles[1]==Air?Cards.ShortBow:
						eles[1]==Gravity||eles[1]==Earth?Cards.Hammer:
						eles[1]==Water||eles[1]==Life?Cards.Staff:
						eles[1]==Darkness||eles[1]==Death?Cards.Dagger:
						Cards.ShortSword).asUpped(Math.random()<uprate).code;
				}
				var pillarstart = deck.length, qpe=0, qpemin=99;
				for(var i=1; i<13; i++){
					if (!ecost[i])continue;
					qpe++;
					qpemin = Math.min(qpemin, ecost[i]);
				}
				if (qpe>=4){
					for(var i=0; i<qpemin*.8; i++){
						deck.push(upCode(Cards.QuantumPillar.code));
						qpe++;
					}
				}else qpemin=0;
				for(var i=1; i<13; i++){
					if (!ecost[i])continue;
					for(var j=0; j<Math.round((ecost[i]-qpemin)/5); j++){
						deck.push(upCode(pillars[i*2]));
					}
				}
				deck.push(TrueMarks[eles[1]]);
				chatArea.value = deck.join(" ");
			}
			initGame({ first: Math.random() < .5, deck: deck, urdeck: urdeck, seed: Math.random() * etg.MAX_INT, hp: level == 1 ? 100 : (level == 2 ? 125 : 150), aimarkpower: level == 3 ? 2 : 1}, aievalopt.checked ? aiEvalFunc : aiFunc);
			game.cost = gameprice;
			game.gold = level==1?5:(level==2?10:20);
		}
	}
}

function makeButton(x, y, w, h) {
	var button = new PIXI.Graphics();
	
	button.beginFill(0xFFFFFF);
	button.lineStyle(2, 0x000000);
	button.drawRect(x, y, w, h);
	button.endFill();
	
	button.interactive = true;
	button.hitArea = new PIXI.Rectangle(x, y, w, h);
	button.buttonMode = true;
	
	return button;
}

function makeButtonText(x, y, t) {
	var text = new PIXI.Text(t, {font: "bold 16px Dosis"});
	text.position.set(x+1, y+1);
	
	return text;
}

function startMenu() {
	menuui = new PIXI.Stage(0x336699, true);
	
	//background to clear text
	var bempty = new PIXI.Graphics();
	bempty.interactive = true;
	bempty.hitArea = new PIXI.Rectangle(0, 0, 900, 670);
	bempty.mouseover = function () { 
		tinfo.setText(""); 
		tcost.setText("");
	}
	
	menuui.addChild(bempty);
	
	//gold text
	var tgold = new PIXI.Text(user ? user.gold + "g" : "Sandbox", {font: "bold 16px Dosis"});
	tgold.position.set(800, 25);
	menuui.addChild(tgold);
	
	//info text
	var tinfo = new PIXI.Text("", { font: "bold 16px Dosis" });
	tinfo.position.set(50, 50);
	
	menuui.addChild(tinfo);
	
	//cost text
	var tcost = new PIXI.Text("", {font: "bold 16px Dosis"});
	tcost.position.set(50, 70);
	
	menuui.addChild(tcost);
	
	//ai0 button
	var bai0 = makeButton(50, 100, 75, 18);
	var bai0t = makeButtonText(50, 100, "Commoner");
	bai0.click = mkAi(1);
	bai0.mouseover = function () {
		tinfo.setText("Commoners aren't very strong.");
		tcost.setText("Cost: 0g");
	}
	
	menuui.addChild(bai0);
	menuui.addChild(bai0t);
	
	//ai1 button
	var bai1 = makeButton(150, 100, 75, 18);
	var bai1t = makeButtonText(150, 100, "Mage");
	bai1.click = mkAi(2);
	bai1.mouseover = function () {
		tinfo.setText("Mages are more powerful than commoners, and have a few upgraded cards.");
		tcost.setText("Cost: 10g");
	}
	
	menuui.addChild(bai1);
	menuui.addChild(bai1t);
	
	//ai2 button
	var bai2 = makeButton(250, 100, 75, 18);
	var bai2t = makeButtonText(250, 100, "Champion");
	bai2.click = mkAi(3);
	bai2.mouseover = function () {
		tinfo.setText("Champions have several upgraded cards, so you should come well prepared.");
		tcost.setText("Cost: 10g");
	}
	
	menuui.addChild(bai2);
	menuui.addChild(bai2t);
	
	//ai3 button
	var bai3 = makeButton(350, 100, 75, 18);
	var bai3t = makeButtonText(350, 100, "Demigod");
	bai3.click = mkDemigod;
	bai3.mouseover = function () {
		tinfo.setText("Demigods are among the strongest beings in the world. Unless you are very powerful, you shouldn't even try.");
		tcost.setText("Cost: 20g");
	}
	
	menuui.addChild(bai3);
	menuui.addChild(bai3t);
	
	//ai arena button
	var baia = makeButton(650, 100, 75, 18);
	var baiat = makeButtonText(650, 100, "Arena AI");
	baia.click = function() {
		if (Cards) {
			if (!user.deck || user.deck.length < 31) {
				startEditor();
				return;
			}
			
			if (user.gold < 10) {
				chatArea.value = "Requires 10g";
				return;
			}
			
			user.gold -= 10;
			userEmit("subgold", {g: 10});
			userEmit("foearena");
		}
	}
	baia.mouseover = function () {
		tinfo.setText("In the arena you will face decks from other players.");
		tcost.setText("Cost: 10g");
	}
	
	//arena info button
	var binfoa = makeButton(650, 150, 75, 18);
	var binfoat = makeButtonText(650, 150, "Arena Info");
	binfoa.click = function(){
		if (Cards){
			userEmit("arenainfo");
		}
	}
	binfoa.mouseover = function () {
		tinfo.setText("Check how your arena deck is doing.")
		tcost.setText("");
	}
	
	//arena top10 button
	var btopa = makeButton(650, 200, 75, 18);
	var btopat = makeButtonText(650, 200, "Arena T10");
	btopa.click = function(){
		if (Cards){
			userEmit("arenatop");
		}
	}
	btopa.mouseover = function () {
		tinfo.setText("Here you can see who the top players in arena are right now.")
		tcost.setText("");
	}
	
	//edit button
	var bedit = makeButton(50, 200, 75, 18);
	var beditt = makeButtonText(50, 200, "Editor");
	bedit.click = startEditor;
	bedit.mouseover = function () {
		tinfo.setText("Here you can edit your deck, as well as upgrade your cards.");
		tcost.setText("");
	}
	
	menuui.addChild(bedit);
	menuui.addChild(beditt);
	
	//shop button
	var bshop = makeButton(150, 200, 75, 18);
	var bshopt = makeButtonText(150, 200, "Shop");
	bshop.click = startStore;
	bshop.mouseover = function () {
		tinfo.setText("Here you can buy booster packs which contains ten cards from the elements you choose.");
		tcost.setText("");
	}
	
	//logout button
	var blogout = makeButton(750, 100, 75, 18);
	var blogoutt = makeButtonText(750, 100, "Logout");
	blogout.click = function(){
		userEmit("logout");
		logout();
	}
	blogout.mouseover = function () {
		tinfo.setText("Click here if you want to log out.")
		tcost.setText("");
	}
	
	//delete account button
	var bdelete = makeButton(750, 500, 100, 18);
	var bdeletet = makeButtonText(750, 500, "Delete Account");
	bdelete.click = function(){
		if (foename.value == user.name) {
			userEmit("delete");
			logout();
		} else {
			chatArea.value = "Input '" + user.name + "' into Challenge to delete your account";
		}
	}
	bdeletet.mouseover = function () {
		tinfo.setText("Click here if you want to remove your account.")
		tcost.setText("");
	}
	
	//only display if user is logged in
	if (user){		
		menuui.addChild(baia);
		menuui.addChild(baiat);
		menuui.addChild(bshop);
		menuui.addChild(bshopt);
		menuui.addChild(binfoa);
		menuui.addChild(binfoat);
		menuui.addChild(btopa);
		menuui.addChild(btopat);
		menuui.addChild(blogout);
		menuui.addChild(blogoutt);
		menuui.addChild(bdelete);
		menuui.addChild(bdeletet);
		
		if (user.oracle){
			// todo user.oracle should be a card, not true. The card is the card that the server itself added. This'll only show what was added
			delete user.oracle;
			var card = PlayerRng.randomcard(false,
				(function(y){return function(x){ return x.type != PillarEnum && ((x.rarity != 5) ^ y); }})(Math.random()<.03)).code;
			userEmit("addcard", {c:card, o:card});
			user.ocard = card;
			user.pool.push(card);
			var oracle = new PIXI.Sprite(nopic);
			oracle.position.set(50, 300);
			menuui.addChild(oracle);
		}
	}
		
	function logout(){
		user = undefined;
		tgold.setText("Sandbox");
		menuui.removeChild(baia);
		menuui.removeChild(baiat);
		menuui.removeChild(bshop);
		menuui.removeChild(bshopt);
		menuui.removeChild(binfoa);
		menuui.removeChild(binfoat);
		menuui.removeChild(btopa);
		menuui.removeChild(btopat);
		menuui.removeChild(blogout);
		menuui.removeChild(blogoutt);
		menuui.removeChild(bdelete);
		menuui.removeChild(bdeletet);
		
		if (oracle){
			menuui.removeChild(oracle);
		}
	}
	
	animCb = function() {
		if (user && oracle) {
			oracle.setTexture(getArt(card));
		}
	}
	
	mainStage = menuui;
	refreshRenderer();
}

function editorCardCmp(x,y){
	var cardx = CardCodes[x], cardy = CardCodes[y];
	return cardx.upped - cardy.upped || cardx.element - cardy.element || cardx.cost-cardy.cost || (x>y)-(x<y);
}
function startStore() {
	var newCards = [];
	var newCardsArt = [];
	var storeui = new PIXI.Stage(0x336699, true);
	var bsave = new PIXI.Text("Done", { font: "16px Dosis" });
	var bbuy = new PIXI.Text("Buy Booster", { font: "16px Dosis" });
	var bchoose = new PIXI.Text("Choose Pack-type:", { font: "18px Dosis" });
	var brainbow = new PIXI.Text("Rainbow", { font: "16px Dosis" });
	var bfire = new PIXI.Text("Fire, Water, Earth, Air", { font: "16px Dosis" });
	var baether = new PIXI.Text("Aether, Time, Gravity, Entropy", { font: "16px Dosis" });
	var blife = new PIXI.Text("Life, Death, Darkness, Light", { font: "16px Dosis" });
	var bchosenpack = new PIXI.Text("Chosen pack: Rainbow", { font: "16px Dosis" });
	var bgetcards = new PIXI.Text("Take cards", { font: "16px Dosis" });
	var cardartcode;
	var packtype = 0;
	bchoose.position.set(100, 10);
	brainbow.position.set(100, 30);
	brainbow.click = function () { packtype = 0; bchosenpack.setText("Chosen pack: " + brainbow.text); }
	bfire.position.set(100, 50);
	bfire.click = function () { packtype = 1; bchosenpack.setText("Chosen pack: " + bfire.text); }
	baether.position.set(100, 70);
	baether.click = function () { packtype = 2; bchosenpack.setText("Chosen pack: " + baether.text); }
	blife.position.set(100, 90);
	blife.click = function () { packtype = 3; bchosenpack.setText("Chosen pack: " + blife.text);}
	bchosenpack.position.set(150, 200);
	bsave.position.set(8,8);
	bsave.click = function () {
		if (isEmpty(newCards))
			startMenu();
		else
			chatArea.value = "Get your cards before leaving!";
	}
	bbuy.position.set(150,150);
	bbuy.click = function () {
		if (isEmpty(newCards)){
			if (user.gold >= 30) {
				user.gold -= 30;
				var allowedElements = []
				if (!packtype) allowedElements = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
				if (packtype == 1) allowedElements = [4, 6, 7, 9];
				if (packtype == 2) allowedElements = [1, 3, 10, 12];
				if (packtype == 3) allowedElements = [2, 5, 8, 11];
				userEmit("subgold", { g: 30 });
				for (var i = 0; i < 10; i++) {
					var rarity = i < 6 ? 1 : (i < 9 ? 2 : (Math.random() < .2 ? 4: 3))
					newCards.push(PlayerRng.randomcard(false, function (x) { return allowedElements.indexOf(x.element) != -1 && x.type != PillarEnum && x.rarity == rarity }).code);
					newCardsArt[i].setTexture(getArt(newCards[i]));
					newCardsArt[i].visible = true;
					storeui.addChild(bgetcards);
				}
			}else{
				chatArea.value = "You can't afford more cards, you need 30 gold!";
			}
		}else{
			chatArea.value = "Take the cards before buying more!";
		}
	}
	bgetcards.position.set(400, 250);
	bgetcards.click = function () {
		userEmit("add", { add: etg.encodedeck(newCards)});
		for (var i = 0; i < 10; i++) {
			user.pool.push(newCards[i]);
			newCardsArt[i].visible = false;
		}
		newCards = [];
		storeui.removeChild(bgetcards);
	}
	var goldcount = new PIXI.Text(user.gold + "\u00A4", { font: "16px Dosis" });
	goldcount.position.set(600, 50);
	storeui.addChild(goldcount);

	setInteractive(bsave, bbuy, bgetcards, bchoose,bfire,baether,blife, brainbow);
	storeui.addChild(bsave);
	storeui.addChild(bbuy);
	storeui.addChild(bchoose);
	storeui.addChild(brainbow);
	storeui.addChild(bfire);
	storeui.addChild(baether);
	storeui.addChild(blife);
	storeui.addChild(bchosenpack);

	for (var i = 0; i < 10; i++) {
		var cardArt = new PIXI.Sprite(nopic);
		cardArt.scale = new PIXI.Point(0.6, 0.6)
		cardArt.position.set(20 + 80 * i, 300);
		(function (_i) {
			cardArt.mouseover = function () {
				cardartcode = newCards[_i];
				console.log(cardartcode);
			}
		})(i);
		cardArt.interactive = true;
		storeui.addChild(cardArt);
		newCardsArt.push(cardArt);
	}

	var cardArt = new PIXI.Sprite(nopic);
	cardArt.position.set(734, 8);
	storeui.addChild(cardArt);
	animCb = function() {
		if (cardartcode) {
			cardArt.setTexture(getArt(cardartcode));
		}
		for (var i = 0; i < 10; i++) {
			if (newCards[i])
				newCardsArt[i].setTexture(getArt(newCards[i]));
		}
		goldcount.setText(user.gold + "\u00A4");
	}

	mainStage = storeui;
	refreshRenderer();
}
function startEditor(){
	function adjustCardMinus(code, x){
		if (code in cardminus){
			cardminus[code] += x;
		}else cardminus[code] = x;
	}
	function isFreeCard(card){
		return card.type == PillarEnum && !card.upped && !card.rarity;
	}
	function processDeck(){
		for(var i=editordeck.length-1; i>=0; i--){
			if(!(editordeck[i] in CardCodes)){
				var index = TrueMarks.indexOf(editordeck[i]);
				if (index >= 0){
					editormark = index;
				}
				editordeck.splice(i, 1);
			}
		}
		editordeck.sort(editorCardCmp);
		if (usePool){
			cardminus = {};
			cardpool = {};
			for(var i=0; i<user.pool.length; i++){
				if (user.pool[i] in cardpool){
					cardpool[user.pool[i]]++;
				}else{
					cardpool[user.pool[i]] = 1;
				}
			}
			if (user.starter) {
				for (var i = 0; i < user.starter.length; i++) {
					if (user.starter[i] in cardpool) {
						cardpool[user.starter[i]]++;
					} else {
						cardpool[user.starter[i]] = 1;
					}
				}
			}
			for(var i=editordeck.length-1; i>=0; i--){
				var code = editordeck[i];
				if (CardCodes[code].type != PillarEnum){
					var card = CardCodes[code];
					if ((cardminus[card.asUpped(false).code]||0)+(cardminus[card.asUpped(true).code]||0) == 6){
						editordeck.splice(i, 1);
						continue;
					}
				}
				if (!isFreeCard(CardCodes[code])){
					if((cardminus[code]||0)<(cardpool[code]||0)){
						adjustCardMinus(code, 1);
					}else{
						editordeck.splice(i, 1);
					}
				}
			}
		}
	}
	function transmute(rm){
		userEmit("transmute", {rm: etg.encodedeck(rm), add: etg.encodedeck(editordeck)});
		user.deck = editordeck;
		for(var i=0; i<rm.length; i++){
			user.pool.splice(user.pool.indexOf(rm[i]), 1);
		}
		for(var i=0; i<editordeck.length; i++){
			user.pool.push(editordeck[i]);
		}
		processDeck();
	}
	if (Cards && (!user || user.deck)){
		var usePool = !!(user && (user.deck || user.starter));
		var cardminus, cardpool, cardartcode;
		chatArea.value = "Build a 30-60 card deck";
		var editorui = new PIXI.Stage(0x336699, true), editorelement = 0;
		var bclear = new PIXI.Text("Clear", {font: "16px Dosis"});
		var bsave = new PIXI.Text("Done", {font: "16px Dosis"});
		var bimport = new PIXI.Text("Import", {font: "16px Dosis"});
		var bpillar = new PIXI.Text("Pillarify", {font: "16px Dosis"});
		var bupgrade = new PIXI.Text("Upgrade", {font: "16px Dosis"});
		var barena = new PIXI.Text("Arena", {font: "16px Dosis"});
		bclear.position.set(8, 8);
		bclear.click = function(){
			if (usePool){
				cardminus = {};
			}
			editordeck.length = 0;
		}
		bsave.position.set(8, 32);
		bsave.click = function(){
			editordeck.push(TrueMarks[editormark]);
			deckimport.value = editordeck.join(" ");
			if (usePool){
				userEmit("setdeck", {d:etg.encodedeck(editordeck)});
				user.deck = editordeck;
			}
			startMenu();
		}
		bimport.position.set(8, 56);
		bimport.click = function(){
			editordeck = deckimport.value.split(" ");
			processDeck();
		}
		bpillar.position.set(8, 104);
		bpillar.click = function(){
			if (foename.value != "trans"){
				chatArea.value = "Input 'trans' into Challenge to transmute an upped pillar per 6 cards in deck";
				return;
			}else if (editordeck.length<6 || (editordeck.length%6)!=0){
				chatArea.value = "Transmutation of upped pillars requires an input size divisible by 6";
				return;
			}
			for(var i=0; i<editordeck.length; i++){
				var card = CardCodes[editordeck[i]];
				if(card.rarity == 5){
					chatArea.value = "Transmutation of ultrarares is ill advised";
					return;
				}else if(card.type == PillarEnum){
					chatArea.value = "Transmutation of pillars is a fool's errand";
					return;
				}
			}
			var rm = editordeck;
			editordeck = [];
			var pillars = filtercards(true, function(x){ return x.type == PillarEnum && !x.rarity; });
			for(var i=0; i<rm.length; i+=6){
				editordeck.push(pillars[editormark*2+Math.floor(Math.random()*2)]);
			}
			transmute(rm);
		}
		bupgrade.position.set(8, 128);
		bupgrade.click = function(){
			if (foename.value != "trans"){
				chatArea.value = "Input 'trans' into Challenge to convert 6 cards into an upgraded copy";
				return;
			}
			for(var i=0; i<editordeck.length; i++){
				var card = CardCodes[editordeck[i]];
				if(card.type == PillarEnum && !card.rarity){
					chatArea.value = "Transmutation of pillars is a fool's errand";
					return;
				}
			}
			var rm = editordeck;
			editordeck = [];
			for(var i=0; i<rm.length; i+=6){
				var card = CardCodes[rm[i]];
				if (card.rarity == 5){
					i-=5;
					editordeck.push(card.asUpped(true).code);
				}else{
					for(var j=1; j<6; j++){
						if (rm[i+j] != rm[i])break;
					}
					if (j == 6){
						editordeck.push(card.asUpped(true).code);
					}else{
						chatArea.value = "Incomplete set of " + card.name + ". Only "+j+" copies";
						editordeck = rm;
						return;
					}
				}
			}
			transmute(rm);
		}
		barena.position.set(8, 152);
		barena.click = function(){
			if (editordeck.length<30){
				chatArea.value = "30 cards required before submission";
				return;
			}
			if (usePool){
				editordeck.push(TrueMarks[editormark]);
				userEmit("setarena", {d:etg.encodedeck(editordeck)});
				editordeck.pop();
				chatArea.value = "Arena deck submitted";
			}
		}
		barena.mouseover = function(){
			if (user && user.ocard){
				chatArea.value = "Oracle Card: " + CardCodes[user.ocard].name;
			}
		}
		setInteractive(bclear, bsave, bimport, bpillar, bupgrade, barena);
		editorui.addChild(bclear);
		editorui.addChild(bsave);
		editorui.addChild(bimport);
		if (usePool){
			editorui.addChild(bpillar);
			editorui.addChild(bupgrade);
			if (user.ocard){
				editorui.addChild(barena);
			}
		}
		var editorcolumns = [];
		var editordecksprites = [];
		var editordeck = getDeck();
		var editormarksprite = new PIXI.Sprite(nopic);
		editormarksprite.position.set(100, 210);
		editorui.addChild(editormarksprite);
		var editormark = 0;
		processDeck();
		var editoreleicons = [];
		for(var i=0; i<13; i++){
			var sprite = new PIXI.Sprite(nopic);
			sprite.position.set(8, 184 + i*32);
			var marksprite = new PIXI.Sprite(nopic);
			marksprite.position.set(200+i*32, 210);
			setInteractive(sprite, marksprite);
			(function(_i){
				sprite.click = function() { editorelement = _i; }
				marksprite.click = function() { editormark = _i; }
			})(i);
			editoreleicons.push([sprite, marksprite]);
			editorui.addChild(sprite);
			editorui.addChild(marksprite);
		}
		for(var i=0; i<60; i++){
			var sprite = new PIXI.Sprite(nopic);
			sprite.position.set(100+Math.floor(i/10)*100, 8+(i%10)*20);
			(function(_i){
				sprite.click = function() {
					var card = CardCodes[editordeck[_i]];
					if (usePool && !isFreeCard(card)){
						adjustCardMinus(editordeck[_i], -1);
					}
					editordeck.splice(_i, 1);
				}
				sprite.mouseover = function() {
					cardartcode = editordeck[_i];
				}
			})(i);
			sprite.interactive = true;
			editorui.addChild(sprite);
			editordecksprites.push(sprite);
		}
		for(var i=0; i<6; i++){
			editorcolumns.push([[],[]]);
			for(var j=0; j<15; j++){
				var sprite = new PIXI.Sprite(nopic);
				sprite.position.set(100+i*130, 272+j*20);
				if (usePool){
					var sprcount = new PIXI.Text("", {font: "12px Dosis"});
					sprcount.position.set(102, 4);
					sprite.addChild(sprcount);
				}
				(function(_i, _j){
					sprite.click = function() {
						if(editordeck.length<60){
							var code = editorcolumns[_i][1][editorelement][_j], card = CardCodes[code];
							if (usePool && !isFreeCard(card)){
								if (!(code in cardpool) || (code in cardminus && cardminus[code] >= cardpool[code]) ||
									(CardCodes[code].type != PillarEnum && (cardminus[card.asUpped(false).code]||0)+(cardminus[card.asUpped(true).code]||0) >= 6)){
									return;
								}
								adjustCardMinus(code, 1);
							}
							for(var i=0; i<editordeck.length; i++){
								var cmp = editorCardCmp(editordeck[i], code);
								if (cmp >= 0)break;
							}
							editordeck.splice(i, 0, code);
						}
					}
					sprite.mouseover = function() {
						cardartcode = editorcolumns[_i][1][editorelement][_j];
					}
				})(i, j);
				sprite.interactive = true;
				editorui.addChild(sprite);
				editorcolumns[i][0].push(sprite);
			}
			for(var j=0; j<13; j++){
				editorcolumns[i][1].push(filtercards(i>2,
					function(x){ return x.element == j && ((i%3==0 && x.type == CreatureEnum)||(i%3==1 && x.type <= PermanentEnum)||(i%3==2 && x.type == SpellEnum)); },
					editorCardCmp));
			}
		}
		var cardArt = new PIXI.Sprite(nopic);
		cardArt.position.set(734, 8);
		editorui.addChild(cardArt);
		animCb = function(){
			editormarksprite.setTexture(getIcon(editormark));
			if (cardartcode){
				cardArt.setTexture(getArt(cardartcode));
			}
			for (var i=0; i<13; i++){
				for(var j=0; j<2; j++){
					editoreleicons[i][j].setTexture(getIcon(i));
				}
			}
			for (var i=0; i<editordeck.length; i++){
				editordecksprites[i].visible = true;
				editordecksprites[i].setTexture(getCardImage(editordeck[i]));
			}
			for (;i<60; i++){
				editordecksprites[i].visible = false;
			}
			for (var i=0; i<6; i++){
				for(var j=0; j<editorcolumns[i][1][editorelement].length; j++){
					var spr = editorcolumns[i][0][j], code = editorcolumns[i][1][editorelement][j], card = CardCodes[code];
					if (!usePool || card in cardpool || isFreeCard(card)) spr.visible = true;
					else spr.visible = false;
					spr.setTexture(getCardImage(code));
					if (usePool){
						var txt = spr.getChildAt(0), card = CardCodes[code], inf = isFreeCard(card);
						if ((txt.visible = inf || code in cardpool)){
							maybeSetText(txt, inf?"-":(cardpool[code] - (code in cardminus?cardminus[code]:0)).toString());
						}
					}
				}
				for(;j<15; j++){
					editorcolumns[i][0][j].visible = false;
				}
			}
		}
		mainStage = editorui;
		refreshRenderer();
	}
}
function startElementSelect(){
	var stage = new PIXI.Stage(0x336699, true);
	chatArea.value = "Select your starter element";
	var elesel = [];
	var descr = [
		"Chroma",
		"Entropy",
		"Death",
		"Gravity",
		"Earth",
		"Life",
		"Fire",
		"Water",
		"Light",
		"Air",
		"Time",
		"Darkness",
		"Aether"
	];
	var eledesc = new PIXI.Text("", {font: "24px Dosis"});
	eledesc.position.set(100, 250);
	stage.addChild(eledesc);
	for(var i=0; i<13; i++){
		elesel[i] = new PIXI.Sprite(nopic);
		elesel[i].position.set(100+i*32, 300);
		(function(_i){
			elesel[_i].mouseover = function(){
				maybeSetText(eledesc, descr[_i]);
			}
			elesel[_i].click = function(){
				var msg = {u:user.name, a:user.auth, e:_i};
				user = undefined;
				socket.emit("inituser", msg);
				startMenu();
			}
		})(i);
		elesel[i].interactive = true;
		stage.addChild(elesel[i]);
	}
	animCb = function(){
		for(var i=0; i<13; i++){
			elesel[i].setTexture(getIcon(i));
		}
	}
	mainStage = stage;
	refreshRenderer();
}
function startMatch(){
	if (anims.length){
		while (anims.length){
			anims[0].remove();
		}
	}
	player2summon = function(cardinst){
		var card = cardinst.card;
		var sprite = new PIXI.Sprite(nopic);
		sprite.position.set((foeplays.length%9)*100, Math.floor(foeplays.length/9)*20);
		gameui.addChild(sprite);
		foeplays.push([card, sprite]);
	}
	function drawBorder(obj, spr) {
		if (obj){
			if (targetingMode){
				if(targetingMode(obj)){
					fgfx.lineStyle(2, 0xff0000);
					fgfx.drawRect(spr.position.x-spr.width/2, spr.position.y-spr.height/2, spr.width, spr.height);
					fgfx.lineStyle(2, 0xffffff);
				}
			}else if (obj.canactive()){
				fgfx.drawRect(spr.position.x-spr.width/2, spr.position.y-spr.height/2, spr.width, spr.height);
			}
		}
	}
	function drawStatus(obj, spr){
		var x = spr.position.x, y=spr.position.y, wid = spr.width, hei = spr.height;
		if (obj == obj.owner.gpull){
			fgfx.beginFill(0xffaa00, .3);
			fgfx.drawRect(x-wid/2-2, y-hei/2-2, wid+4, hei+4);
			fgfx.endFill();
		}
		if (obj.status.frozen){
			fgfx.beginFill(0x0000ff, .3);
			fgfx.drawRect(x-wid/2-2, y-hei/2-2, wid+4, hei+4);
			fgfx.endFill();
		}
		if (obj.status.delayed){
			fgfx.beginFill(0xffff00, .3);
			fgfx.drawRect(x-wid/2-2, y-hei/2-2, wid+4, hei+4);
			fgfx.endFill();
		}
		fgfx.lineStyle(1, 0);
		if (obj.passives.airborne || obj.passives.ranged){
			fgfx.beginFill(elecols[Air], .8);
			fgfx.drawRect(x-wid/2-2, y+hei/2-10, 12, 12);
			fgfx.endFill();
		}
		if (obj.status.adrenaline){
			fgfx.beginFill(elecols[Life], .8);
			fgfx.drawRect(x-wid/2+6, y+hei/2-10, 12, 12);
			fgfx.endFill();
		}
		if (obj.status.momentum){
			fgfx.beginFill(elecols[Gravity], .8);
			fgfx.drawRect(x-wid/2+14, y+hei/2-10, 12, 12);
			fgfx.endFill();
		}
		if (obj.status.psion){
			fgfx.beginFill(elecols[Aether], .8);
			fgfx.drawRect(x-wid/2+22, y+hei/2-10, 12, 12);
			fgfx.endFill();
		}
		if (obj.status.burrowed){
			fgfx.beginFill(elecols[Earth], .8);
			fgfx.drawRect(x-wid/2+30, y+hei/2-10, 12, 12);
			fgfx.endFill();
		}
		if (obj.status.poison){
			fgfx.beginFill(obj.aflatoxin?elecols[Darkness]:obj.status.poison>0?elecols[Death]:elecols[Water], .8);
			fgfx.drawRect(x-wid/2+38, y+hei/2-10, 12, 12);
			fgfx.endFill();
		}
		fgfx.lineStyle(0, 0, 0);
		spr.alpha = obj.status.immaterial||obj.status.burrowed?.7:1;
	}
	var cardwon;
	animCb = function(){
		if (game.phase == PlayPhase && game.turn == game.player2 && game.player2.ai && --aiDelay<=0){
			aiDelay = parseInt(airefresh.value) || 0;
			if (aiDelay == -2){
				disableEffects = true;
			}
			do {
				var cmd = game.player2.ai();
				cmds[cmd[0]](cmd[1]);
			}while (aiDelay<0 && game.turn == game.player2);
			disableEffects = false;
		}
		var pos=gameui.interactionManager.mouse.global;
		maybeSetText(endturn, game.winner?(game.winner==game.player1?"Won ":"Lost ")+game.ply:"End Turn");
		if (!game.winner || !user){
			var cardartcode;
			for(var i=0; i<foeplays.length; i++){
				if(hitTest(foeplays[i][1], pos)){
					cardartcode = foeplays[i][0].code;
					setInfo(foeplays[i][0]);
				}
			}
			for(var j=0; j<2; j++){
				var pl = game.players[j];
				if (j==0 || game.player1.precognition){
					for(var i=0; i<pl.hand.length; i++){
						if(hitTest(handsprite[j][i], pos)){
							cardartcode = pl.hand[i].card.code;
							setInfo(pl.hand[i].card);
						}
					}
				}
				for(var i=0; i<23; i++){
					var cr = pl.creatures[i];
					if(cr && hitTest(creasprite[j][i], pos)){
						cardartcode = cr.card.code;
						setInfo(cr);
					}
				}
				for(var i=0; i<16; i++){
					var pr = pl.permanents[i];
					if(pr && hitTest(permsprite[j][i], pos)){
						cardartcode = pr.card.code;
						setInfo(pr);
					}
				}
				if (pl.weapon && hitTest(weapsprite[j], pos)){
					cardartcode = pl.weapon.card.code;
					setInfo(pl.weapon);
				}
				if (pl.shield && hitTest(shiesprite[j], pos)){
					cardartcode = pl.shield.card.code;
					setInfo(pl.shield);
				}
			}
			if(cardartcode){
				cardart.setTexture(getArt(cardartcode));
				cardart.visible = true;
				cardart.position.y = pos.y>300?44:300;
			}else cardart.visible = false;
		}else{
			if(game.winner == game.player1){
				if (!cardwon){
					var winnable = [];
					for(var i=0; i<foeDeck.length; i++){
						if (foeDeck[i].type != PillarEnum && foeDeck[i].rarity < 3){
							winnable.push(foeDeck[i]);
						}
					}
					if (winnable.length){
						cardwon = winnable[Math.floor(Math.random()*winnable.length)];
					}else{
						var elewin = foeDeck[Math.floor(Math.random() * foeDeck.length)];
						rareAllowed = Math.random() < .3 ? 3 : 2;
						cardwon = PlayerRng.randomcard(elewin.upped, function(x){ return x.element == elewin.element && x.type != PillarEnum && x.rarity <= rareAllowed; });
					}
					if (!game.player2.ai){
						cardwon = cardwon.asUpped(false);
					}
					var data = {c:cardwon.code};
					if (game.gold){
						var goldwon = Math.floor(game.gold * (game.player1.hp == game.player1.maxhp ? 2 : .5 + game.player1.hp / (game.player1.maxhp * 2)));
						console.log(goldwon);
						if(game.cost) goldwon += game.cost;
						data.g = goldwon;
						user.gold += goldwon;
					}
					userEmit("addcard", data);
					user.pool.push(cardwon.code);
				}
				cardart.setTexture(getArt(cardwon.code));
				cardart.visible = true;
			}else{
				cardart.visible = false;
			}
		}
		if (game.phase != EndPhase){
			cancel.visible = true;
			maybeSetText(endturn, game.turn == game.player1?(game.phase == PlayPhase ? "End Turn" : "Accept Hand"):"");
			maybeSetText(cancel, game.turn == game.player1?(game.phase != PlayPhase ? "Mulligan" : (targetingMode || discarding) ? "Cancel" : ""):"");
		}
		maybeSetText(turntell, discarding?"Discard":targetingMode?targetingText:game.turn == game.player1?"Your Turn":"Their Turn");
		for(var i=0; i<foeplays.length; i++){
			maybeSetTexture(foeplays[i][1], getCardImage(foeplays[i][0].code));
		}
		cloakgfx.visible = game.player2.isCloaked();
		fgfx.clear();
		if (game.turn == game.player1 && !targetingMode && game.phase != EndPhase){
			for(var i=0; i<game.player1.hand.length; i++){
				var card = game.player1.hand[i].card;
				if (game.player1.canspend(card.costele, card.cost)){
					fgfx.beginFill(elecols[card.costele]);
					fgfx.drawRect(handsprite[0][i].position.x+100, handsprite[0][i].position.y, 20, 20);
					fgfx.endFill();
				}
			}
		}
		fgfx.beginFill(0, 0);
		fgfx.lineStyle(2, 0xffffff);
		for (var j=0; j<2; j++){
			for(var i=0; i<23; i++){
				drawBorder(game.players[j].creatures[i], creasprite[j][i]);
			}
			for(var i=0; i<16; i++){
				drawBorder(game.players[j].permanents[i], permsprite[j][i]);
			}
			drawBorder(game.players[j].weapon, weapsprite[j]);
			drawBorder(game.players[j].shield, shiesprite[j]);
		}
		if (targetingMode){
			fgfx.lineStyle(2, 0xff0000);
			for(var j=0; j<2; j++){
				if (targetingMode(game.players[j])){
					var spr = hptext[j];
					fgfx.drawRect(spr.position.x-spr.width/2, spr.position.y-spr.height/2, spr.width, spr.height);
				}
				for(var i=0; i<game.players[j].hand.length; i++){
					if (targetingMode(game.players[j].hand[i])){
						var spr = handsprite[j][i];
						fgfx.drawRect(spr.position.x, spr.position.y, spr.width, spr.height);
					}
				}
			}
		}
		fgfx.lineStyle(0, 0, 0);
		fgfx.endFill();
		for(var j=0; j<2; j++){
			if (game.players[j].sosa){
				fgfx.beginFill(elecols[Death], .5);
				var spr = hptext[j];
				fgfx.drawRect(spr.position.x-spr.width/2, spr.position.y-spr.height/2, spr.width, spr.height);
				fgfx.endFill();
			}
			if (game.players[j].flatline){
				fgfx.beginFill(elecols[Death], .3);
				fgfx.drawRect(handsprite[j][0].position.x-2, handsprite[j][0].position.y-2, 124, 164);
				fgfx.endFill();
			}
			if (game.players[j].silence){
				fgfx.beginFill(elecols[Aether], .3);
				fgfx.drawRect(handsprite[j][0].position.x-2, handsprite[j][0].position.y-2, 124, 164);
				fgfx.endFill();
			}else if (game.players[j].sanctuary){
				fgfx.beginFill(elecols[Light], .3);
				fgfx.drawRect(handsprite[j][0].position.x-2, handsprite[j][0].position.y-2, 124, 164);
				fgfx.endFill();
			}
			for(var i=0;i<8;i++){
				maybeSetTexture(handsprite[j][i], getCardImage(game.players[j].hand[i]?(j==0||game.player1.precognition?game.players[j].hand[i].card.code:"0"):"1"));
			}
			for(var i=0; i<23; i++){
				var cr = game.players[j].creatures[i];
				if (cr && !(j == 1 && cloakgfx.visible)){
					creasprite[j][i].setTexture(getCreatureImage(cr.card.code));
					creasprite[j][i].visible = true;
					var child = creasprite[j][i].getChildAt(0);
					child.visible = true;
					child.setTexture(getTextImage(cr.activetext() + " " + cr.trueatk()+"|"+cr.truehp(), 12, cr.card.upped?"black":"white"));
					drawStatus(cr, creasprite[j][i]);
				}else creasprite[j][i].visible = false;
			}
			for(var i=0; i<16; i++){
				var pr = game.players[j].permanents[i];
				if (pr && !(j == 1 && cloakgfx.visible && !pr.passives.cloak)){
					permsprite[j][i].setTexture(getPermanentImage(pr.card.code));
					permsprite[j][i].visible = true;
					permsprite[j][i].alpha = pr.status.immaterial?.7:1;
					var child = permsprite[j][i].getChildAt(0);
					child.visible = true;
					if (pr instanceof Pillar){
						child.setTexture(getTextImage("1:"+(pr.active.auto == Actives.pend && pr.pendstate?pr.owner.mark:pr.card.element) + " x"+pr.status.charges, 12, pr.card.upped?"black":"white"));
					}else child.setTexture(getTextImage(pr.activetext().replace(" losecharge","") + (pr.status.charges !== undefined?" "+pr.status.charges:""), 12, pr.card.upped?"black":"white"));
				}else permsprite[j][i].visible = false;
			}
			var wp = game.players[j].weapon;
			if (wp && !(j == 1 && cloakgfx.visible)){
				weapsprite[j].visible = true;
				var child = weapsprite[j].getChildAt(0);
				child.setTexture(getTextImage(wp.activetext() + " " + wp.trueatk(), 12, wp.card.upped?"black":"white"));
				child.visible = true;
				weapsprite[j].setTexture(getPermanentImage(wp.card.code));
				drawStatus(wp, weapsprite[j]);
			}else weapsprite[j].visible = false;
			var sh = game.players[j].shield;
			if (sh && !(j == 1 && cloakgfx.visible)){
				shiesprite[j].visible = true;
				var dr=sh.truedr();
				var child = shiesprite[j].getChildAt(0);
				child.visible = true;
				child.setTexture(getTextImage((sh.status.charges? "x"+sh.status.charges:"") + (sh.active.shield?" "+sh.active.shield.activename:"") + (sh.active.buff?" "+sh.active.buff.activename:"") + (sh.active.cast?casttext(sh.cast, sh.castele)+sh.active.cast.activename:"") + (dr?" "+dr:"")), 12, sh.card.upped?"black":"white");
				shiesprite[j].alpha = sh.status.immaterial?.7:1;
				shiesprite[j].setTexture(getPermanentImage(sh.card.code));
			}else shiesprite[j].visible = false;
			marksprite[j].setTexture(getIcon(game.players[j].mark));
			for(var i=1; i<13; i++){
				maybeSetText(quantatext[j].getChildAt(i-1), game.players[j].quanta[i].toString());
			}
			for(var i=1; i<13; i++){
				quantatext[j].getChildAt(i+12-1).setTexture(getIcon(i));
			}
			maybeSetText(hptext[j], game.players[j].hp + "/" + game.players[j].maxhp);
			maybeSetText(poisontext[j], game.players[j].status.poison + (game.players[j].neuro?"psn!":"psn"));
			maybeSetText(decktext[j], game.players[j].deck.length + "cards");
		}
	}
	gameui = new PIXI.Stage(0x336699, true);
	var cloakgfx = new PIXI.Graphics();
	cloakgfx.beginFill(0);
	cloakgfx.drawRect(130, 20, 660, 280);
	cloakgfx.endFill();
	gameui.addChild(cloakgfx);
	var endturn = new PIXI.Text("Accept Hand", {font: "16px Dosis"});
	var cancel = new PIXI.Text("Mulligan", {font: "16px Dosis"});
	var resign = new PIXI.Text("Resign", {font: "16px Dosis"});
	var turntell = new PIXI.Text("", {font: "16px Dosis"});
	var infotext = new PIXI.Sprite(nopic);
	setInteractive(endturn, cancel, resign);
	endturn.position.set(800, 540);
	endturnFunc = endturn.click = function(e, discard) {
		if (game.winner){
			for (var i=0; i<foeplays.length; i++){
				if (foeplays[i][1].parent){
					foeplays[i][1].parent.removeChild(foeplays[i][1]);
				}
			}
			foeplays.length = 0;
			if (user && game.arena){
				userEmit("modarena", {aname: game.arena, won: game.winner == game.player2});
				delete game.arena;
			}
			game = undefined;
			startMenu();
		}else if (game.turn == game.player1){
			if (game.phase == MulliganPhase1 || game.phase == MulliganPhase2){
				if(!game.player2.ai){
					socket.emit("mulligan", true);
				}
				progressMulligan(game);
				if (game.phase == MulliganPhase2 && game.player2.ai){
					progressMulligan(game);
				}
			}else if (discard == undefined && game.player1.hand.length == 8){
				discarding = true;
			}else{
				discarding = false;
				if(!game.player2.ai){
					socket.emit("endturn", discard);
				}
				game.player1.endturn(discard);
				targetingMode = undefined;
				for (var i=0; i<foeplays.length; i++){
					if (foeplays[i][1].parent){
						foeplays[i][1].parent.removeChild(foeplays[i][1]);
					}
				}
				foeplays.length = 0;
			}
		}
	}
	gameui.addChild(endturn);
	cancel.position.set(800, 500);
	cancelFunc = cancel.click = function() {
		if (resigning){
			resigning = false;
		}else if ((game.phase == MulliganPhase1 || game.phase == MulliganPhase2) && game.turn == game.player1 && game.player1.hand.length>0){
			game.player1.drawhand(game.player1.hand.length-1);
			socket.emit("mulligan");
		}else if (game.turn == game.player1){
			if (targetingMode){
				targetingMode = targetingModeCb = null;
			}else if (discarding){
				discarding = false;
			}
		}
	}
	gameui.addChild(cancel);
	resign.position.set(8, 24);
	var resigning;
	resign.click = function(){
		if (resign.text == "Resign"){
			resign.setText("Confirm");
			resigning = true;
		}else{
			if (!game.player2.ai){
				socket.emit("foeleft");
			}
			startMenu();
		}
	}
	gameui.addChild(resign);
	turntell.position.set(800, 570);
	gameui.addChild(turntell);
	infotext.position.set(100, 584);
	gameui.addChild(infotext);
	function setInfo(obj){
		if(obj){
			infotext.setTexture(getTextImage(obj.info(), 16));
		}
	}
	var handsprite = [new Array(8), new Array(8)];
	var creasprite = [new Array(23), new Array(23)];
	var permsprite = [new Array(16), new Array(16)];
	var weapsprite = [new PIXI.Sprite(nopic), new PIXI.Sprite(nopic)];
	var shiesprite = [new PIXI.Sprite(nopic), new PIXI.Sprite(nopic)];
	var marksprite = [new PIXI.Sprite(nopic), new PIXI.Sprite(nopic)];
	var quantatext = [new PIXI.DisplayObjectContainer(), new PIXI.DisplayObjectContainer()];
	var hptext = [new PIXI.Text("", {font: "18px Dosis"}), new PIXI.Text("", {font: "18px Dosis"})];
	var poisontext = [new PIXI.Text("", {font: "16px Dosis"}), new PIXI.Text("", {font: "16px Dosis"})];
	var decktext = [new PIXI.Text("", {font: "16px Dosis"}), new PIXI.Text("", {font: "16px Dosis"})];
	for (var j=0; j<2; j++){
		(function(_j){
			for (var i=0; i<8; i++){
				handsprite[j][i] = new PIXI.Sprite(nopic);
				handsprite[j][i].position.set(j?20:780, (j?140:300)+20*i);
				(function(_i){
					handsprite[j][i].click = function(){
						if (game.phase != PlayPhase)return;
						var cardinst = game.players[_j].hand[_i];
						if (cardinst){
							if (!_j && discarding){
								endturn.click(null, _i);
							}else if (targetingMode){
								if (targetingMode(cardinst)){
									targetingMode = undefined;
									targetingModeCb(cardinst);
								}
							}else if (!_j && cardinst.canactive()){
								if (cardinst.card.type != SpellEnum){
									console.log("summoning " + _i);
									socket.emit("cast", tgtToBits(cardinst));
									cardinst.useactive();
								}else{
									getTarget(cardinst, cardinst.card.active, function(tgt) {
										socket.emit("cast", tgtToBits(cardinst)|tgtToBits(tgt)<<9);
										cardinst.useactive(tgt);
									});
								}
							}
						}
					}
				})(i);
				gameui.addChild(handsprite[j][i]);
			}
			for (var i=0; i<23; i++){
				creasprite[j][i] = new PIXI.Sprite(nopic);
				var creatext = new PIXI.Sprite(nopic);
				creatext.position.x = 58;
				creatext.anchor.x = 1;
				creasprite[j][i].addChild(creatext);
				creasprite[j][i].anchor.set(.5, .5);
				creasprite[j][i].position = creaturePos(j, i);
				(function(_i){
					creasprite[j][i].click = function(){
						if (game.phase != PlayPhase)return;
						var crea = game.players[_j].creatures[_i];
						if (!crea)return;
						if (targetingMode && targetingMode(crea)){
							targetingMode = undefined;
							targetingModeCb(crea);
						}else if (_j == 0 && !targetingMode && crea.canactive()){
							getTarget(crea, crea.active.cast, function(tgt){
								targetingMode = undefined;
								socket.emit("cast", tgtToBits(crea)|tgtToBits(tgt)<<9);
								crea.useactive(tgt);
							});
						}
					}
				})(i);
				gameui.addChild(creasprite[j][i]);
			}
			for (var i=0; i<16; i++){
				permsprite[j][i] = new PIXI.Sprite(nopic);
				var permtext = new PIXI.Sprite(nopic);
				permtext.position.x = 58;
				permtext.anchor.x = 1;
				permsprite[j][i].addChild(permtext);
				permsprite[j][i].anchor.set(.5, .5);
				permsprite[j][i].position = permanentPos(j, i);
				(function(_i){
					permsprite[j][i].click = function(){
						if (game.phase != PlayPhase)return;
						var perm = game.players[_j].permanents[_i];
						if (!perm)return;
						if (targetingMode && targetingMode(perm)){
							targetingMode = undefined;
							targetingModeCb(perm);
						}else if (_j == 0 && !targetingMode && perm.canactive()){
							getTarget(perm, perm.active.cast, function(tgt){
								targetingMode = undefined;
								socket.emit("cast", tgtToBits(perm)|tgtToBits(tgt)<<9);
								perm.useactive(tgt);
							});
						}
					}
				})(i);
				gameui.addChild(permsprite[j][i]);
			}
			setInteractive.apply(null, handsprite[j]);
			setInteractive.apply(null, creasprite[j]);
			setInteractive.apply(null, permsprite[j]);
			weapsprite[j].anchor.set(.5, .5);
			shiesprite[j].anchor.set(.5, .5);
			marksprite[j].anchor.set(.5, .5);
			weapsprite[j].position.set(690, 530);
			shiesprite[j].position.set(690, 560);
			marksprite[j].position.set(690, 500);
			var weaptext = new PIXI.Sprite(nopic);
			weaptext.position.x = 58;
			weaptext.anchor.x = 1;
			weapsprite[j].addChild(weaptext);
			var shietext = new PIXI.Text(nopic);
			shietext.position.x = 58;
			shietext.anchor.x = 1;
			shiesprite[j].addChild(shietext);
			weapsprite[j].click = function(){
				if (game.phase != PlayPhase)return;
				var weap = game.players[_j].weapon;
				if (!weap)return
				if (targetingMode && targetingMode(weap)){
					targetingMode = undefined;
					targetingModeCb(weap);
				}else if (_j == 0 && !targetingMode && weap.canactive()){
					getTarget(weap, weap.active.cast, function(tgt){
						targetingMode = undefined;
						socket.emit("cast", tgtToBits(weap)|tgtToBits(tgt)<<9);
						weap.useactive(tgt);
					});
				}
			}
			shiesprite[j].click = function(){
				if (game.phase != PlayPhase)return;
				var shie = game.players[_j].shield;
				if (!shie)return
				if (targetingMode && targetingMode(shie)){
					targetingMode = undefined;
					targetingModeCb(shie);
				}else if (_j == 0 && !targetingMode && shie.canactive()){
					getTarget(shie, shie.active.cast, function(tgt){
						targetingMode = undefined;
						socket.emit("cast", tgtToBits(shie)|tgtToBits(tgt)<<9);
						shie.useactive(tgt);
					});
				}
			}
			if (j){
				reflectPos(weapsprite[j]);
				reflectPos(shiesprite[j]);
				reflectPos(marksprite[j]);
			}
			gameui.addChild(weapsprite[j]);
			gameui.addChild(shiesprite[j]);
			gameui.addChild(marksprite[j]);
			hptext[j].anchor.set(.5, .5);
			poisontext[j].anchor.set(.5, .5);
			decktext[j].anchor.set(.5, .5);
			quantatext[j].position.set(j?792:0, j?100:308);
			hptext[j].position.set(50, 560);
			poisontext[j].position.set(50, 580);
			decktext[j].position.set(50, 540);
			if (j){
				reflectPos(hptext[j]);
				reflectPos(poisontext[j]);
				reflectPos(decktext[j]);
			}
			var child;
			for(var k=1; k<13; k++){
				quantatext[j].addChild(child=new PIXI.Text("", {font: "16px Dosis"}));
				child.position.set((k&1)?32:86, Math.floor((k-1)/2)*32+8);
			}
			for(var k=1; k<13; k++){
				quantatext[j].addChild(child=new PIXI.Sprite(nopic));
				child.position.set((k&1)?0:54, Math.floor((k-1)/2)*32);
			}
			hptext[j].mouseover = function(){
				setInfo(game.players[_j]);
			}
			hptext[j].click = function(){
				if (game.phase != PlayPhase)return;
				if (targetingMode && targetingMode(game.players[_j])){
					targetingMode = undefined;
					targetingModeCb(game.players[_j]);
				}
			}
		})(j);
		setInteractive.apply(null, weapsprite);
		setInteractive.apply(null, shiesprite);
		setInteractive.apply(null, hptext);
		gameui.addChild(quantatext[j]);
		gameui.addChild(hptext[j]);
		gameui.addChild(poisontext[j]);
		gameui.addChild(decktext[j]);
	}
	var fgfx = new PIXI.Graphics();
	gameui.addChild(fgfx);
	var cardart = new PIXI.Sprite(nopic);
	cardart.position.set(600, 300);
	gameui.addChild(cardart);
	mainStage = gameui;
	refreshRenderer();
}
function startArenaInfo(info){
	if (!info){
		chatArea.value = "You do not have an arena deck";
	}
	var stage = new PIXI.Stage(0x336699, true);
	var winloss = new PIXI.Text((info.win || 0) + " - " + (info.loss || 0), {font: "16px Dosis"});
	winloss.position.set(200, 200);
	stage.addChild(winloss);
	var bret = new PIXI.Text("Return", {font: "16px Dosis"});
	bret.position.set(200, 400);
	bret.interactive = true;
	bret.click = startMenu;
	stage.addChild(bret);
	var ocard = new PIXI.Sprite(nopic);
	ocard.position.set(600, 300);
	stage.addChild(ocard);
	animCb = function(){
		if (info.card){
			ocard.setTexture(getArt(info.card));
		}
	}
	mainStage = stage;
	refreshRenderer();
}
function startArenaTop(info){
	if (!info){
		chatArea.value = "??";
	}
	var stage = new PIXI.Stage(0x336699, true);
	for(var i=0; i<info.length; i++){
		var infotxt = new PIXI.Text(info[i], {font: "16px Dosis"});
		infotxt.position.set(200, 100+i*20);
		stage.addChild(infotxt);
	}
	var bret = new PIXI.Text("Return", {font: "16px Dosis"});
	bret.position.set(200, 400);
	bret.interactive = true;
	bret.click = startMenu;
	stage.addChild(bret);
	mainStage = stage;
	refreshRenderer();
}
var foeplays = [];
var tximgcache = [];
function getTextImage(text, font, color){
	if (color === undefined)color = "black";
	if(!(font in tximgcache)){
		tximgcache[font] = {};
	}
	if(!(text in tximgcache[font])){
		tximgcache[font][text] = {};
	}else if(color in tximgcache[font][text]){
		return tximgcache[font][text][color];
	}
	var fontprop = {font: font+"px Dosis", fill:color};
	var doc = new PIXI.DisplayObjectContainer();
	var pieces = text.replace(/\|/g," | ").split(/(\d\d?:\d\d?)/);
	var x=0;
	for(var i=0; i<pieces.length; i++){
		var piece = pieces[i];
		if (/^\d\d?:\d\d?$/.test(piece)){
			var parse = piece.split(":");
			var num = parseInt(parse[0]);
			var icon = getIcon(parseInt(parse[1]));
			for(var j=0; j<num; j++){
				var spr = new PIXI.Sprite(icon);
				spr.scale.set(.375, .375);
				spr.position.x = x;
				x+=12;
				doc.addChild(spr);
			}
		}else{
			var txt = new PIXI.Text(piece, fontprop);
			txt.position.x = x;
			x+=txt.width;
			doc.addChild(txt);
		}
	}
	var rtex = new PIXI.RenderTexture(x, 16);
	rtex.render(doc);
	return tximgcache[font][text][color] = rtex;
}
var cmds = {};
cmds.endturn = function(data) {
	game.player2.endturn(data);
}
cmds.cast = function(bits) {
	var c=bitsToTgt(bits&511), t=bitsToTgt((bits>>9)&511);
	console.log("cast: " + c.card.name + " " + (t?(t instanceof Player?t == game.player1:t.card.name):"-"));
	if (c instanceof CardInstance){
		player2summon(c);
	}
	c.useactive(t);
}
var socket = io.connect(location.hostname, {port: 13602});
socket.on("pvpgive", initGame);
socket.on("tradegive", initTrade)
socket.on("foearena", function(data){
	var deck = etg.decodedeck(data.deck);
	chatArea.value = data.name + ": " + deck.join(" ");
	initGame({ first:data.first, deck:deck, urdeck:getDeck(), seed:data.seed, hp:data.hp, cost:data.cost }, aievalopt.checked?aiEvalFunc:aiFunc);
	game.arena = data.name;
	game.gold = 20;
	game.cost = 10;
});
socket.on("arenainfo", startArenaInfo);
socket.on("arenatop", startArenaTop);
socket.on("userdump", function(data){
	user = data;
	if (user.deck){
		user.deck = etg.decodedeck(user.deck);
		deckimport.value = user.deck.join(" ");
	}
	if (user.pool){
		user.pool = etg.decodedeck(user.pool);
	}
	if (user.starter) {
		user.starter = etg.decodedeck(user.starter);
	}
	startMenu();
});
socket.on("passchange", function(data){
	user.auth = data;
	chatArea.value = "Password updated";
});
socket.on("endturn", cmds.endturn);
socket.on("cast", cmds.cast);
socket.on("foeleft", function(data) {
	if (game && !game.player2.ai){
		setWinner(game, game.player1);
	}
});
socket.on("chat", function (data) {
	console.log("message gotten");
	var u = data.u ? data.u + ": " : "";
	var color = "black";
	if (data.mode) {
		if (data.mode == "pm") {
			color= "blue";
		}
		if (data.mode == "info")
			color = "red";
	}
	chatBox.innerHTML += "<font color=" + color + ">" + u + data.message.replace(/</g, "&lt;").replace(/>/g,"&gt;") + "</font>";
	chatBox.innerHTML += "<br>";
	chatBox.scrollTop = chatBox.scrollHeight;
});
socket.on("mulligan", function(data) {
	if (data === true){
		progressMulligan(game);
	}else{
		game.player2.drawhand(game.player2.hand.length-1);
	}
});
socket.on("cardchosen", function (data) {
	player2Card = data.card;
	myTurn = true;
	console.log("Card recieved")
	console.log(player2Card);
});
socket.on("tradedone", function (data) {
	console.log("Trade done!")
	user.pool.push(data.newcard);
	user.pool.splice(user.pool.indexOf(data.oldcard), 1);
	startMenu();
});
socket.on("tradecanceled", function (data) {
	startMenu();
});
function maybeSendChat(e) {
	e.cancelBubble = true;
	if (e.keyCode != 13)return;
	if (chatinput.value && user){
		userEmit("chat", { message: chatinput.value });
		chatinput.value = "";
	}
}
function maybeLogin(e) {
	e.cancelBubble = true;
	if (e.keyCode != 13)return;
	if (username.value){
		loginClick();
	}
}
function maybeChallenge(e) {
	e.cancelBubble = true;
	if (e.keyCode != 13)return;
	if (foename.value){
		challengeClick();
	}
}
function animate() {
	setTimeout(requestAnimate, 40);
	if (animCb){
		animCb();
	}
	for(var i=anims.length-1; i>=0; i--){
		anims[i].next();
	}
	renderer.render(mainStage);
}
function requestAnimate(){ requestAnimFrame(animate); }
startMenu();
requestAnimate();
document.addEventListener("keydown", function(e){
	if (mainStage == gameui){
		if(e.keyCode == 32){
			endturnFunc();
		}else if(e.keyCode == 8){
			cancelFunc();
		}else return;
		e.preventDefault();
	}
});
document.addEventListener("click", function(e){
	if (e.pageX < 900 && e.pageY < 600){
		e.preventDefault();
	}
});
function loginClick(){
	if (!user){
		var xhr = new XMLHttpRequest();
		xhr.open("POST", "auth?u="+encodeURIComponent(username.value)+(password.value.length?"&p="+encodeURIComponent(password.value):""), true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4){
				if (this.status == 200){
					user = JSON.parse(this.responseText);
					if (!user){
						chatArea.value = "No user";
					}else if (!user.pool && !user.starter){
						startElementSelect();
					}else{
						user.deck = etg.decodedeck(user.deck);
						deckimport.value = user.deck.join(" ");
						if (user.pool){
							user.pool = etg.decodedeck(user.pool);
						}
						if (user.starter) {
							user.starter = etg.decodedeck(user.starter);
						}
						startMenu();
					}
				}else if (this.status == 404){
					chatArea.value = "Incorrect password";
				}else if (this.status == 502){
					chatArea.value = "Error verifying password";
				}
			}
		}
		xhr.send();
	}
}
function changeClick(){
	userEmit("passchange", {p: password.value});
}
function challengeClick(){
	if (Cards){
		if (user && user.deck){
			userEmit("foewant", {f: foename.value, deck: user.deck});
		}else{
			var deck = getDeck();
			if ((user && (!user.deck || user.deck.length < 31)) || deck.length < 11){
				startEditor();
				return;
			}
			socket.emit("pvpwant", { deck: deck, room: foename.value });
		}
	}
}
function tradeClick() {
	if (Cards && user)
		userEmit("tradewant", { f: foename.value });
}