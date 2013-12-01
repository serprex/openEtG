function loadcards(cb){
	var Cards = {};
	var Targeting = {};
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	var count = 0;
	function maybeCallback(){
		if (++count == names.length+1)cb(Cards, Targeting);
	}
	for(var i=0; i<names.length; i++){
		var xhr = new XMLHttpRequest();
		xhr.open("GET",names[i] + ".csv",true);
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200){
				var csv = this.responseText.split("\n");
				var keys = csv[0].split(",");
				for(var j=1; j<csv.length; j++){
					var card = {type: i};
					var carddata = csv[j].split(",");
					var cardcode = carddata[2];
					for(var k=0; k<carddata.length; k++)card[keys[k].toLowerCase()] = carddata[k];
					card.upped = parseInt(cardcode,32)>6999;
					Cards[carddata[1] in Cards?carddata[1]+"Up":carddata[1]] = Cards[cardcode] = card;
				}
				maybeCallback();
			}
		};
		xhr.send();
	}
	var xhr = new XMLHttpRequest();
	xhr.open("GET","active.csv",true);
	xhr.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200){
			var csv = this.responseText.split("\n");
			for (var i=0; i<csv.length; i++){
				var keypair = csv[i].split(",");
				Targeting[keypair[0]] = parseInt(keypair[1],10);
			}
			maybeCallback();
		}
	}
	xhr.send();
}
function Player(){
	this.owner = this
	this.shield = null;
	this.weapon = null;
	this.poison = 0;
	this.neuro = false;
	this.sosa = 0;
	this.silence = false;
	this.sanctuary = false;
	this.gpull = null;
	this.nova = 0;
	this.nova2 = 0;
	this.maxhp = 100;
	this.hp = 100;
	this.hand = new Array(8);
	this.deck = [];
	this.creatures = new Array(23);
	this.permanents = new Array(23);
	this.quanta = [0]*12;
	this.mark = 0;
}
function summon(card, owner, target){
	var c;
	if (card.type <= Permanent){
		if (card.type == Pillar){
			if (card.upped){
				//bug upped marks grant like quantum tower
				owner.spendquanta(card.element, -1)
			}
			for (var i in owner.permanents){
				if (owner.permanents[i].card.code == card.code){
					owner.permanents[i].charges += 1
					return p
				}
			}
		}
		c = permanent(card, owner)
		if (card.type == Weapon){
			owner.weapon = c
		}else if (card.type == Shield){
			owner.shield = c
			if (card == DimensionalShield || card == PhaseShield){
				c.charges = 3
			}
			else if (card == Wings || card == WingsUp){
				c.charges = 5
			}
		}else{
			owner.permanents.append(c)
		}
	}else if (card.type == Spell){
		owner.card = card
		card.active(owner, target)
		return null;
	}else {
		for(var i=0; i<23; i++){
			if (!owner.creatures[i])owner.creatures[i]=card.code;
		}
	}
	return c;
}
Other = 0;
Entropy = 1;
Death = 2;
Gravity = 3;
Earth = 4;
Life = 5;
Fire = 6;
Water = 7;
Light = 8;
Air = 9;
Time = 10;
Darkness = 11;
Aether = 12;
Pillar = 0;
Weapon = 1;
Shield = 2;
Permanent = 3;
Spell = 4;
Creature = 5;
TrueMarks = ["8pi", "8pj", "8pk", "8pl", "8pm", "8pn", "8po", "8pp", "8pq", "8pr", "8ps", "8pt", "8pu"];
NymphList = [null, null,
	"500", "6ug",
	"534", "71k",
	"568", "74o",
	"59c", "77s",
	"5cg", "7b0",
	"5fk", "7e4",
	"5io", "7h8",
	"5ls", "7kc",
	"5p0", "7ng",
	"5s4", "7qk",
	"5v8", "7to",
	"62c", "80s"];