var Cards, CardCodes, Targeting, targetingMode, targetingModeCb, targetingText, game, discarding, animCb, user, renderer, endturnFunc, cancelFunc, foeDeck, player2summon;
loadcards(function(cards, cardcodes, targeting) {
	Cards = cards;
	CardCodes = cardcodes;
	Targeting = targeting;
	console.log("Cards loaded");
});
function getTarget(src, active, cb){
	var targetingFilter = Targeting[active.activename];
	if (targetingFilter){
		targetingMode = function(t){ return (t == game.player2 || t.owner == game.player1 || t instanceof CardInstance || t.passives.cloak || !game.player2.isCloaked()) && targetingFilter(src, t); }
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
	pos.x=900-pos.x;
	pos.y=600-pos.y;
}
function centerAnchor(obj){
	obj.anchor.x=obj.anchor.y=.5;
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
	var p = new PIXI.Point(165+Math.floor(i/5)*120+(i%5)*8, 315+(i%5)*30);
	if (j){
		reflectPos(p);
	}
	return p;
}
function permanentPos(j, i){
	var p = new PIXI.Point(165+Math.floor(i/4)*120+(i%4)*8, 475+(i%4)*30);
	if (j){
		reflectPos(p);
	}
	return p;
}
function refreshRenderer(){
	if (renderer){
		leftpane.removeChild(renderer.view);
	}
	renderer = new PIXI.CanvasRenderer(900, 600); // setInfo was causing flickering with webGL
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
loader.load();
var mainStage, menuui, gameui;
var nopic = PIXI.Texture.fromImage("null.png"), eicons, caimgcache = {}, crimgcache = {}, primgcache = {}, artcache = {};
var elecols = [0xa99683,0xaa5999,0x777777,0x996633,0x5f4930,0x50a005,0xcc6611,0x205080,0xa9a9a9,0x337ddd,0xccaa22,0x333333,0x77bbdd];
function lighten(c){
	return (c&255)/2+127|((c>>8)&255)/2+127<<8|((c>>16)&255)/2+127<<16;
}
function getIcon(ele){
	return eicons?eicons[ele]:nopic;
}
function makeArt(card, art){
	var rend = new PIXI.RenderTexture(132, 256);
	var template = new PIXI.Graphics();
	template.beginFill(card.upped?lighten(elecols[card.element]):elecols[card.element]);
	template.drawRect(0, 0, rend.width, rend.height);
	template.endFill();
	if (art){
		var artspr = new PIXI.Sprite(art);
		artspr.position.x = 2;
		artspr.position.y = 20;
		template.addChild(artspr);
	}
	var nametag = new PIXI.Text(card.name, {font: "12px Arial bold", fill:card.upped?"black":"white"});
	nametag.position.x = 2;
	nametag.position.y = 4;
	template.addChild(nametag);
	if (card.cost){
		var text = new PIXI.Text(card.cost, {font: "12px Arial bold", fill:card.upped?"black":"white"});
		text.anchor.x = 1;
		text.position.x = rend.width-20;
		text.position.y = 4;
		template.addChild(text);
		if (card.costele){
			var eleicon = new PIXI.Sprite(getIcon(card.costele));
			eleicon.position.x = rend.width-1;
			eleicon.position.y = 10;
			eleicon.anchor.x = 1;
			eleicon.anchor.y = .5;
			eleicon.scale.x = .5;
			eleicon.scale.y = .5;
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
		wordgfx.position.x = x;
		wordgfx.position.y = y;
		x += wordgfx.width + 4;
		template.addChild(wordgfx);
	}
	rend.render(template);
	return rend;
}
function getArt(code){
	var name=CardCodes[code].asUpped(false).code;
	if (artcache[code])return artcache[code];
	else{
		var loader = new PIXI.AssetLoader(["Cards/"+name+".png"]);
		loader.onComplete = function(){
			artcache[code] = makeArt(CardCodes[code], PIXI.Texture.fromImage("Cards/"+name+".png"));
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
		graphics.beginFill(card?(card.upped?lighten(elecols[card.element]):elecols[card.element]):code=="0"?elecols[0]:elecols[11]);
		graphics.drawRect(0, 0, 100, 20);
		graphics.endFill();
		if (card){
			var clipwidth = 2;
			if (card.cost){
				var text = new PIXI.Text(card.cost, {font: "11px Arial bold", fill:card.upped?"black":"white"});
				text.anchor.x = 1;
				text.position.x = rend.width-20;
				text.position.y = 5;
				graphics.addChild(text);
				clipwidth += text.width + 22;
				if (card.costele){
					var eleicon = new PIXI.Sprite(getIcon(card.costele));
					eleicon.position.x = rend.width-1;
					eleicon.position.y = 10;
					eleicon.anchor.x = 1;
					eleicon.anchor.y = .5;
					eleicon.scale.x = .5;
					eleicon.scale.y = .5;
					graphics.addChild(eleicon);
				}
			}
			var text, loopi=0;
			do text = new PIXI.Text(card.name.substring(0, card.name.length-(loopi++)), {font: "11px Arial bold", fill:card.upped?"black":"white"}); while(text.width>rend.width-clipwidth);
			text.position.x = 2;
			text.position.y = 5;
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
			var text = new PIXI.Text(CardCodes[code].name, {font: "12px Arial bold", fill:card.upped?"black":"white"});
			text.position.x = 2;
			text.position.y = 5;
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
			var text = new PIXI.Text(CardCodes[code].name, {font: "12px Arial bold", fill:card.upped?"black":"white"});
			text.position.x = 2;
			text.position.y = 5;
			graphics.addChild(text);
		}
		rend.render(graphics);
		return primgcache[code] = rend;
	}
}
function initGame(data, ai){
	game = mkGame(data.first, data.seed);
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
function startMenu(){
	var brandai = new PIXI.Text("Dumb AI", {font: "16px Arial bold"});
	var beditor = new PIXI.Text("Editor", {font: "16px Arial bold"});
	var blogout = new PIXI.Text("Logout", {font: "16px Arial bold"});
	var bremove = new PIXI.Text("Delete Account", {font: "16px Arial bold"});
	brandai.position.x = 200;
	brandai.position.y = 250;
	beditor.position.x = 200;
	beditor.position.y = 300;
	blogout.position.x = 200;
	blogout.position.y = 500;
	bremove.position.x = 400;
	bremove.position.y = 500;
	brandai.interactive = true;
	beditor.interactive = true;
	blogout.interactive = true;
	bremove.interactive = true;
	brandai.click = function() {
		if (Cards){
			var urdeck = getDeck();
			if (urdeck.length < 30){
				startEditor();
				return;
			}
			var aideckstring = aideck.value, deck;
			if (aideckstring){
				deck = aideckstring.split(" ");
			}else{
				var e0 = Math.ceil(Math.random()*12), e1=Math.ceil(Math.random()*12);
				deck = [Cards.QuantumPillar, Cards.QuantumPillar, Cards.QuantumPillar, Cards.QuantumPillar];
				var pillar = CardCodes[(5000+e0*100).toString(32)];
				var pl = new Player({rng: new MersenneTwister(Math.random()*40000000)});
				for(var i=0; i<18; i++){
					deck.push(pillar);
				}
				for(var i=0; i<29; i++){
					deck.push(pl.randomcard(Math.random()<.2, function(x){return x.element == e0;}));
				}
				for(var i=0; i<9; i++){
					deck.push(pl.randomcard(Math.random()<.2, function(x){return x.element == e1;}));
				}
				for(var i=0; i<deck.length; i++){
					deck[i] = deck[i].code;
				}
				deck.push(TrueMarks[e1]);
			}
			initGame({ first:Math.random()<.5, deck:deck, urdeck:urdeck, seed:Math.random()*4000000000 },
				function(){
					for(var j=0; j<2; j++){
						for(var i=this.hand.length-1; i>=0; i--){
							if ((this.hand[i].card.type != SpellEnum || (!Targeting[this.hand[i].card.active.activename])) && this.cansummon(i)){
								player2summon(i);
							}
						}
					}
					for(var i=0; i<16; i++){
						var pr = this.permanents[i];
						if (pr && pr.active.cast && !Targeting[pr.active.cast.activename] && pr.canactive()){
							pr.useactive();
						}
					}
					for(var i=0; i<23; i++){
						var cr = this.creatures[i];
						if (cr && cr.active.cast && !Targeting[cr.active.cast.activename] && cr.canactive()){
							cr.useactive();
						}
					}
					this.endturn(this.hand.length==8?0:null);
				}
			);
		}
	}
	beditor.click = startEditor;
	blogout.click = function(){
		socket.emit("logout", {u:user.auth});
		user = undefined;
	}
	bremove.click = function(){
		if (foename.value == user.auth){
			socket.emit("delete", {u:user.auth});
			user = undefined;
		}else{
			chatArea.value = "Input " + user.auth + " into Challenge to delete your account";
		}
	}
	menuui = new PIXI.Stage(0x336699, true);
	menuui.addChild(brandai);
	menuui.addChild(beditor);
	menuui.addChild(blogout);
	menuui.addChild(bremove);
	if (user && user.oracle){
		// todo user.oracle should be a card, not true. The card is the card that the server itself added. This'll only show what was added
		delete user.oracle;
		var card = new Player({rng: new MersenneTwister(Math.random()*40000000)}).randomcard(false).code;
		socket.emit("addcard", {u:user.auth, c:card});
		user.pool.push(card);
		var oracle = new PIXI.Sprite(nopic);
		oracle.position.x = 600;
		oracle.position.y = 250;
		menuui.addChild(oracle);
	}
	animCb = function(){
		bremove.visible = blogout.visible = !!user;
		if (oracle){
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
function startEditor(){
	function adjustCardMinus(code, x){
		if (code in cardminus){
			cardminus[code] += x;
		}else cardminus[code] = x;
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
			for(var i=editordeck.length-1; i>=0; i--){
				var code = editordeck[i];
				if (CardCodes[code].type != PillarEnum){
					var card = CardCodes[code];
					if ((cardminus[card.asUpped(false).code]||0)+(cardminus[card.asUpped(true).code]||0) == 6){
						editordeck.splice(i, 1);
						continue;
					}
				}
				if ((cardminus[code]||0)<(cardpool[code]||0)){
					adjustCardMinus(code, 1);
				}else{
					editordeck.splice(i, 1);
				}
			}
		}
	}
	if (Cards && (!user || user.deck)){
		var usePool = !!(user && user.deck);
		var cardminus, cardpool;
		chatArea.value = "Build a 30-60 card deck";
		var editorui = new PIXI.Stage(0x336699, true), editorelement = 0;
		var bclear = new PIXI.Text("Clear", {font: "16px Arial bold"});
		bclear.position.x = 8;
		bclear.position.y = 8;
		bclear.click = function(){
			if (usePool){
				cardminus = {};
			}
			editordeck.length = 0;
		}
		bclear.interactive = true;
		editorui.addChild(bclear);
		var bsave = new PIXI.Text("Done", {font: "16px Arial bold"});
		bsave.position.x = 8;
		bsave.position.y = 32;
		bsave.click = function(){
			editordeck.push(TrueMarks[editormark]);
			deckimport.value = editordeck.join(" ");
			if (usePool){
				socket.emit("setdeck", {u:user.auth, d:editordeck});
			}
			startMenu();
		}
		bsave.interactive = true;
		editorui.addChild(bsave);
		var bimport = new PIXI.Text("Import", {font: "16px Arial bold"});
		bimport.position.x = 8;
		bimport.position.y = 56;
		bimport.click = function(){
			editordeck = deckimport.value.split(" ");
			processDeck();
		}
		bimport.interactive = true;
		editorui.addChild(bimport);
		var editorcolumns = [];
		var editordecksprites = [];
		var editordeck = getDeck();
		var editormarksprite = new PIXI.Sprite(nopic);
		editormarksprite.position.x = 100;
		editormarksprite.position.y = 210;
		editorui.addChild(editormarksprite);
		var editormark = 0;
		processDeck();
		var editoreleicons = [];
		for(var i=0; i<13; i++){
			var sprite = new PIXI.Sprite(nopic);
			sprite.position.x = 8;
			sprite.position.y = 184 + i*32;
			sprite.interactive = true;
			var marksprite = new PIXI.Sprite(nopic);
			marksprite.position.x = 200+i*32;
			marksprite.position.y = 210;
			marksprite.interactive = true;
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
			sprite.position.x = 100+Math.floor(i/10)*100;
			sprite.position.y = 8+(i%10)*20;
			(function(_i){
				sprite.click = function() {
					if (usePool){
						adjustCardMinus(editordeck[_i], -1);
					}
					editordeck.splice(_i, 1);
				}
				sprite.mouseover = function() {
					editorCardArt.setTexture(getArt(editordeck[_i]));
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
				sprite.position.x = 100+i*130;
				sprite.position.y = 272+j*20;
				if (usePool){
					var sprcount = new PIXI.Text("", {font: "12px Arial"});
					sprcount.position.x = 102;
					sprcount.position.y = 4;
					sprite.addChild(sprcount);
				}
				(function(_i, _j){
					sprite.click = function() {
						if(editordeck.length<60){
							var code = editorcolumns[_i][1][editorelement][_j];
							if (usePool){
								if (!(code in cardpool) || (code in cardminus && cardminus[code] >= cardpool[code])){
									return;
								}
								if (CardCodes[code].type != PillarEnum){
									var card = CardCodes[code];
									if ((cardminus[card.asUpped(false).code]||0)+(cardminus[card.asUpped(true).code]||0) == 6){
										return;
									}
								}
							}
							for(var i=0; i<editordeck.length; i++){
								var cmp = editorCardCmp(editordeck[i], code);
								if (cmp >= 0)break;
							}
							editordeck.splice(i, 0, code);
							if (usePool){
								adjustCardMinus(editordeck[i], 1);
							}
						}
					}
					sprite.mouseover = function() {
						editorCardArt.setTexture(getArt(editorcolumns[_i][1][editorelement][_j]));
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
		var editorCardArt = new PIXI.Sprite(nopic);
		editorCardArt.position.x = 734;
		editorCardArt.position.y = 8;
		editorui.addChild(editorCardArt);
		animCb = function(){
			editormarksprite.setTexture(getIcon(editormark));
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
					var spr = editorcolumns[i][0][j], code = editorcolumns[i][1][editorelement][j];
					spr.visible = true;
					spr.setTexture(getCardImage(code));
					if (usePool){
						var txt = spr.getChildAt(0);
						if ((txt.visible = code in cardpool)){
							maybeSetText(txt, (cardpool[code] - (code in cardminus?cardminus[code]:0)).toString());
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
	var eledesc = new PIXI.Text("", {font: "24px Arial bold"});
	eledesc.position.x = 100;
	eledesc.position.y = 250;
	stage.addChild(eledesc);
	for(var i=0; i<13; i++){
		elesel[i] = new PIXI.Sprite(nopic);
		elesel[i].position.x = 100+i*32;
		elesel[i].position.y = 300;
		(function(_i){
			elesel[_i].mouseover = function(){
				maybeSetText(eledesc, descr[_i]);
			}
			elesel[_i].click = function(){
				var auth = user.auth;
				user = undefined;
				socket.emit("inituser", {u:auth, e: _i});
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
	player2summon = function(handindex, tgt){
		var card = game.player2.hand[handindex].card;
		var sprite = new PIXI.Sprite(nopic);
		sprite.position.x=foeplays.length*90;
		sprite.interactive = true;
		sprite.mouseover = function(){
			if (game.winner != game.player1){
				cardart.setTexture(getArt(card.code));
			}
		}
		gameui.addChild(sprite);
		foeplays.push([card, sprite]);
		game.player2.summon(handindex, tgt);
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
			fgfx.beginFill(obj.aflatoxin?elecols[Darkness]:elecols[Death], .8);
			fgfx.drawRect(x-wid/2+38, y+hei/2-10, 12, 12);
			fgfx.endFill();
		}
		fgfx.lineStyle(0, 0, 0);
	}
	var cardwon;
	function matchStep(){
		var pos=gameui.interactionManager.mouse.global;
		maybeSetText(endturn, game.winner?(game.winner==game.player1?"Won ":"Lost ")+game.ply:"End Turn");
		if (!game.winner || !user){
			var cardartvisible = (pos.x>760 && pos.y>300 && pos.y<300+20*game.player1.hand.length);
			if (!cardartvisible && foeplays.length){ // Really need a better way to manage visibility
				var first = foeplays[0][1], last = foeplays[foeplays.length-1][1];
				cardartvisible = pos.y<last.position.y+last.height && pos.y>last.position.y && pos.x<last.position.x+last.width && pos.x>first.position.x;
			}
			cardart.visible = cardartvisible;
		}else if(game.winner == game.player1){
			if (!cardwon){
				cardwon = foeDeck[Math.floor(Math.random()*foeDeck.length)];
				if (cardwon.passives.ultrarare){
					cardwon = randomcard(cardwon.upped, function(x){ return x.type == PillarEnum && x.element == cardwon.element && !x.passives.ultrarare; });
				}
				socket.emit("addcard", {u:user.auth, c:cardwon.code})
				user.pool.push(cardwon.code);
			}
			cardart.setTexture(getArt(cardwon.code));
			cardart.visible = true;
		}else{
			cardart.visible = false;
		}
		if ((cancel.visible = game.phase != EndPhase)){
			maybeSetText(cancel, game.phase == PlayPhase?"Cancel":"Mulligan");
		}
		maybeSetText(turntell, discarding?"Discard":targetingMode?targetingText:game.turn == game.player1?"Your Turn":"Their Turn");
		for(var i=0; i<foeplays.length; i++){
			maybeSetTexture(foeplays[i][1], getCardImage(foeplays[i][0].code));
		}
		cloakgfx.visible = game.player2.isCloaked();
		fgfx.clear();
		if (game.turn == game.player1 && !targetingMode && game.phase == PlayPhase){
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
				var spr = quantatext[j];
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
					creasprite[j][i].alpha = cr.status.immaterial||cr.status.burrowed?.7:1;
					creasprite[j][i].visible = true;
					var child = creasprite[j][i].getChildAt(0);
					child.visible = true;
					child.setTexture(getTextImage(cr.activetext() + cr.trueatk()+"|"+cr.truehp(), 12));
					drawStatus(cr, creasprite[j][i]);
				}else creasprite[j][i].visible = false;
			}
			for(var i=0; i<16; i++){
				var pr = game.players[j].permanents[i];
				if (pr && !(j == 1 && cloakgfx.visible && !pr.passives.cloak)){
					permsprite[j][i].setTexture(getPermanentImage(pr.card.code));
					permsprite[j][i].alpha = pr.status.immaterial?.7:1;
					permsprite[j][i].visible = true;
					var child = permsprite[j][i].getChildAt(0);
					child.visible = true;
					if (pr instanceof Pillar){
						child.setTexture(getTextImage("1:"+(pr.active == Actives.pend && pr.pendstate?pr.owner.mark:pr.card.element) + " x"+pr.status.charges, 12));
					}else child.setTexture(getTextImage(pr.activetext().replace(" losecharge","") + (pr.status.charges?" "+pr.status.charges:""), 12));
				}else permsprite[j][i].visible = false;
			}
			var wp = game.players[j].weapon;
			if (wp && !(j == 1 && cloakgfx.visible)){
				weapsprite[j].visible = true;
				var child = weapsprite[j].getChildAt(0);
				child.setTexture(getTextImage(wp.activetext() + " " + wp.trueatk(), 12));
				weapsprite[j].alpha = wp.immaterial?.7:1;
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
				child.setTexture(getTextImage((sh.status.charges? "x"+sh.status.charges:"") + (sh.active.shield?" "+sh.active.shield.activename:"") + (sh.active.buff?" "+sh.active.buff.activename:"") + (sh.active.cast?casttext(sh.cast, sh.castele)+sh.active.cast.activename:"") + (dr?" "+dr:"")), 12);
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
	animCb = matchStep;
	gameui = new PIXI.Stage(0x336699, true);
	var cloakgfx = new PIXI.Graphics();
	cloakgfx.beginFill(0);
	cloakgfx.drawRect(300, 20, 490, 220);
	cloakgfx.endFill();
	gameui.addChild(cloakgfx);
	var endturn = new PIXI.Text("End Turn", {font: "16px Arial bold"});
	endturn.position.x = 800;
	endturn.position.y = 540;
	endturn.interactive = true;
	endturnFunc = endturn.click = function(e, discard) {
		if (game.winner){
			for (var i=0; i<foeplays.length; i++){
				gameui.removeChild(foeplays[i][1]);
			}
			foeplays.length = 0;
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
				if (game.phase == PlayPhase){
					if (game.turn == game.player2 && game.player2.ai){
						game.player2.ai();
					}
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
					gameui.removeChild(foeplays[i][1]);
				}
				foeplays.length = 0;
				if(!game.winner && game.player2.ai){
					game.player2.ai();
				}
			}
		}
	}
	gameui.addChild(endturn);
	var cancel = new PIXI.Text("Mulligan", {font: "16px Arial bold"});
	cancel.position.x = 800;
	cancel.position.y = 500;
	cancel.interactive = true;
	cancelFunc = cancel.click = function() {
		if ((game.phase == MulliganPhase1 || game.phase == MulliganPhase2) && game.turn == game.player1 && game.player1.hand.length>0){
			game.player1.drawhand(game.player1.hand.length-1);
			socket.emit("mulligan");
		}else if (game.turn == game.player1){
			if (targetingMode){
				targetingMode = null;
				targetingModeCb = null;
			}else if (discarding){
				discarding = false;
			}
		}
	}
	var turntell = new PIXI.Text("", {font: "16px Arial bold"});
	turntell.position.x = 800;
	turntell.position.y = 570;
	gameui.addChild(turntell);
	gameui.addChild(cancel);
	var infotext = new PIXI.Sprite(nopic);
	infotext.position.x=100;
	infotext.position.y=584;
	gameui.addChild(infotext);
	function setInfo(obj){
		if(obj){
			infotext.setTexture(getTextImage(obj.info(), 16));
		}
	}
	var handsprite = [new Array(8), new Array(8)];
	for (var i=0; i<8; i++){
		handsprite[0][i] = new PIXI.Sprite(nopic);
		handsprite[0][i].position.x=780;
		handsprite[0][i].position.y=300+20*i;
		handsprite[0][i].interactive = true;
		(function(_i){
			handsprite[0][i].mouseover = function(){
				var cardinst = game.player1.hand[_i];
				if (cardinst && game.winner != game.player1){
					cardart.setTexture(getArt(cardinst.card.code));
				}
			}
			handsprite[0][i].click = function(){
				if (game.phase != PlayPhase)return;
				var cardinst = game.player1.hand[_i];
				if (cardinst){
					if (discarding){
						endturn.click(null, _i);
					}else if (targetingMode){
						if (targetingMode(cardinst)){
							targetingMode = undefined;
							targetingModeCb(cardinst);
						}
					}else if (game.player1.cansummon(_i)){
						if (cardinst.card.type != SpellEnum){
							console.log("summoning " + _i);
							socket.emit("summon", _i);
							game.player1.summon(_i);
						}else{
							getTarget(cardinst, cardinst.card.active, function(tgt) {
								socket.emit("summon", _i|tgtToBits(tgt)<<3);
								game.player1.summon(_i, tgt);
							});
						}
					}
				}
			}
		})(i);
		gameui.addChild(handsprite[0][i]);
	}
	for (var i=0; i<8; i++){
		handsprite[1][i] = new PIXI.Sprite(nopic);
		handsprite[1][i].position.x = 20;
		handsprite[1][i].position.y = 40+20*i;
		handsprite[1][i].interactive = true;
		(function(_i){
			handsprite[1][i].mouseover = function(){
				if (game.player1.precognition){
					var cardinst = game.player2.hand[_i];
					if (cardinst && game.winner != game.player1){
						cardart.setTexture(getArt(cardinst.card.code));
					}
				}
			}
			handsprite[1][i].click = function(){
				if (game.phase != PlayPhase)return;
				if (targetingMode){
					var cardinst = game.player2.hand[_i];
					if (cardinst && targetingMode(cardinst)){
						targetingMode = undefined;
						targetingModeCb(cardinst);
					}
				}
			}
		})(i);
		gameui.addChild(handsprite[1][i]);
	}
	var creasprite = [new Array(23), new Array(23)];
	var permsprite = [new Array(16), new Array(16)];
	var weapsprite = [new PIXI.Sprite(nopic), new PIXI.Sprite(nopic)];
	var shiesprite = [new PIXI.Sprite(nopic), new PIXI.Sprite(nopic)];
	var marksprite = [new PIXI.Sprite(nopic), new PIXI.Sprite(nopic)];
	var quantatext = [new PIXI.DisplayObjectContainer(), new PIXI.DisplayObjectContainer()];
	var hptext = [new PIXI.Text("", {font: "18px Arial bold"}), new PIXI.Text("", {font: "18px Arial bold"})];
	var poisontext = [new PIXI.Text("", {font: "16px Arial bold"}), new PIXI.Text("", {font: "16px Arial bold"})];
	var decktext = [new PIXI.Text("", {font: "16px Arial bold"}), new PIXI.Text("", {font: "16px Arial bold"})];
	for (var j=0; j<2; j++){
		(function(_j){
			for (var i=0; i<23; i++){
				creasprite[j][i] = new PIXI.Sprite(nopic);
				var creatext = new PIXI.Sprite(nopic);
				creatext.position.x = 58;
				creatext.anchor.x = 1;
				creasprite[j][i].addChild(creatext);
				centerAnchor(creasprite[j][i]);
				creasprite[j][i].position = creaturePos(j, i);
				creasprite[j][i].interactive = true;
				(function(_i){
					creasprite[j][i].mouseover = function(){
						setInfo(game.players[_j].creatures[_i]);
					}
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
								socket.emit("active", tgtToBits(crea)|tgtToBits(tgt)<<9);
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
				centerAnchor(permsprite[j][i]);
				permsprite[j][i].position = permanentPos(j, i);
				permsprite[j][i].interactive = true;
				(function(_i){
					permsprite[j][i].mouseover = function(){
						setInfo(game.players[_j].permanents[_i]);
					}
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
								socket.emit("active", tgtToBits(perm)|tgtToBits(tgt)<<9);
								perm.useactive(tgt);
							});
						}
					}
				})(i);
				gameui.addChild(permsprite[j][i]);
			}
			centerAnchor(weapsprite[j]);
			centerAnchor(shiesprite[j]);
			centerAnchor(marksprite[j]);
			weapsprite[j].position.x=690;
			weapsprite[j].position.y=530;
			weapsprite[j].interactive = true;
			shiesprite[j].position.x=690;
			shiesprite[j].position.y=560;
			shiesprite[j].interactive = true;
			marksprite[j].position.x = 690;
			marksprite[j].position.y = 500;
			var weaptext = new PIXI.Sprite(nopic);
			weaptext.position.x = 58;
			weaptext.anchor.x = 1;
			weapsprite[j].addChild(weaptext);
			var shietext = new PIXI.Text(nopic);
			shietext.position.x = 58;
			shietext.anchor.x = 1;
			shiesprite[j].addChild(shietext);
			weapsprite[j].mouseover = function(){
				setInfo(game.players[_j].weapon);
			}
			shiesprite[j].mouseover = function(){
				setInfo(game.players[_j].shield);
			}
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
						socket.emit("active", tgtToBits(weap)|tgtToBits(tgt)<<9);
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
						socket.emit("active", tgtToBits(shie)|tgtToBits(tgt)<<9);
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
			centerAnchor(hptext[j]);
			centerAnchor(poisontext[j]);
			centerAnchor(decktext[j]);
			quantatext[j].position.x=j?792:0;
			quantatext[j].position.y=j?100:308;
			hptext[j].position.x=50;
			hptext[j].position.y=560;
			poisontext[j].position.x=50;
			poisontext[j].position.y=580;
			decktext[j].position.x=50;
			decktext[j].position.y=540;
			if (j){
				reflectPos(hptext[j]);
				reflectPos(poisontext[j]);
				reflectPos(decktext[j]);
			}
			var child;
			for(var k=1; k<13; k++){
				quantatext[j].addChild(child=new PIXI.Text("", {font: "16px Arial bold"}));
				child.position.x = (k&1)?32:86;
				child.position.y = Math.floor((k-1)/2)*32+8;
			}
			for(var k=1; k<13; k++){
				quantatext[j].addChild(child=new PIXI.Sprite(nopic));
				child.position.x = (k&1)?0:54;
				child.position.y = Math.floor((k-1)/2)*32;
			}
			hptext[j].interactive = true;
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
		gameui.addChild(quantatext[j]);
		gameui.addChild(hptext[j]);
		gameui.addChild(poisontext[j]);
		gameui.addChild(decktext[j]);
	}
	var fgfx = new PIXI.Graphics();
	gameui.addChild(fgfx);
	var cardart = new PIXI.Sprite(nopic);
	cardart.position.x = 600;
	cardart.position.y = 300;
	gameui.addChild(cardart);
	mainStage = gameui;
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
	var doc = new PIXI.DisplayObjectContainer();
	var pieces = text.split(/(\d+:\d+)/);
	var x=0;
	for(var i=0; i<pieces.length; i++){
		var piece = pieces[i];
		if (/^\d+:\d+$/.test(piece)){
			var parse = piece.split(":");
			var num = parseInt(parse[0]);
			var icon = getIcon(parseInt(parse[1]));
			for(var j=0; j<num; j++){
				var spr = new PIXI.Sprite(icon);
				spr.scale.x = .375;
				spr.scale.y = .375;
				spr.position.x = x;
				x+=12;
				doc.addChild(spr);
			}
		}else{
			var txt = new PIXI.Text(piece, {font: font+"px Arial bold", fill:color});
			txt.position.x = x;
			x+=txt.width;
			doc.addChild(txt);
		}
	}
	var rtex = new PIXI.RenderTexture(x, 16);
	rtex.render(doc);
	return tximgcache[font][text][color] = rtex;
}
var socket = io.connect(location.hostname, {"port:" :13602});
socket.on("pvpgive", initGame);
socket.on("userdump", function(data){
	user = data;
	if (user.deck){
		deckimport.value = user.deck.join(" ");
	}
});
socket.on("endturn", function(data) {
	game.player2.endturn(data);
});
socket.on("summon", function(bits) {
	console.log("summon call: " + bits);
	player2summon(bits&7, bitsToTgt(bits>>3));
});
socket.on("active", function(bits) {
	var c=bitsToTgt(bits&511), t=bitsToTgt((bits>>9)&511);
	console.log("active call: " + bits);
	c.useactive(t);
});
socket.on("foeleft", function(data) {
	if (game && !game.player2.ai){
		setWinner(game, game.player1);
	}
});
socket.on("chat", function(data) {
	chatArea.value = data;
});
socket.on("mulligan", function(data) {
	if (data === true){
		progressMulligan(game);
	}else{
		game.player2.drawhand(game.player2.hand.length-1);
	}
});
function maybeSendChat(e) {
	e.cancelBubble = true;
	if (e.keyCode != 13)return;
	if (chatinput.value){
		socket.emit("chat", chatinput.value);
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
		xhr.open("POST", "auth?"+username.value, true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200){
				user = JSON.parse(this.responseText);
				if (!user){
					chatArea.value = "No user";
				}else if (!user.deck){
					startElementSelect();
				}else{
					startMenu();
				}
			}
		}
		xhr.send();
	}
}
function challengeClick(){
	if (Cards){
		if (user && user.deck){
			socket.emit("foewant", {u: user.auth, f: foename.value, deck: user.deck});
		}else{
			var deck = getDeck();
			if (deck.length < 30){
				startEditor();
				return;
			}
			socket.emit("pvpwant", { deck: deck, room: foename.value });
		}
	}
}