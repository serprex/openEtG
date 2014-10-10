var qstring = require("querystring");
var crypto = require("crypto");
var sutil = require("./sutil");
var etg = require("../etg");
var aiDecks = require("../Decks");
var etgutil = require("../etgutil");
var userutil = require("../userutil");
module.exports = function(db, users){
	function loginRespond(res, servuser, pass){
		if(!servuser.name){
			servuser.name = servuser.auth;
		}
		if(!servuser.salt){
			servuser.salt = crypto.pseudoRandomBytes(16).toString("base64");
			servuser.iter = 100000;
		}
		function postHash(err, key){
			if (err){
				res.writeHead(503);
				res.end();
				return;
			}
			key = key.toString("base64");
			if (!servuser.auth){
				servuser.auth = key;
			}else if (servuser.auth != key){
				console.log("Failed login "+servuser.name);
				res.writeHead(404);
				res.end();
				return;
			}
			sutil.useruser(db, servuser, function(user){
				var day = sutil.getDay();
				if (servuser.oracle < day){
					servuser.oracle = day;
					var card = etg.PlayerRng.randomcard(false,
						(function (y) { return function (x) { return x.type != etg.PillarEnum && ((x.rarity != 5) ^ y); } })(Math.random() < .03));
					var ccode = etgutil.asShiny(card.code, card.rarity == 5);
					if (card.rarity > 1) {
						servuser.accountbound = user.accountbound = etgutil.addcard(user.accountbound, ccode);
					}
					else {
						servuser.pool = user.pool = etgutil.addcard(user.pool, ccode);
					}
					servuser.ocard = user.ocard = user.oracle = ccode;
					servuser.daily = user.daily = 0;
					servuser.dailymage = user.dailymage = Math.floor(Math.random() * aiDecks.mage.length);
					servuser.dailydg = user.dailydg = Math.floor(Math.random() * aiDecks.demigod.length);
					if (user.name != "test") db.zadd("wealth", userutil.calcWealth(user.gold, etgutil.deck2pool(user.pool)), user.name);
				}
				res.writeHead(200, {"Content-Type": "application/json"});
				res.end(JSON.stringify(user));
			});
		}
		if (pass && pass.length){
			crypto.pbkdf2(pass, servuser.salt, parseInt(servuser.iter), 64, postHash);
		}else postHash(null, servuser.name);
	}
	function loginAuth(req, res, next){
		var paramstring = req.url.substring(2);
		var params = qstring.parse(paramstring);
		var name = (params.u || "").trim();
		if (!name.length){
			res.writeHead(404);
			res.end();
			return;
		}else if (name in users){
			loginRespond(res, users[name], params.p);
		}else{
			db.hgetall("U:"+name, function (err, obj){
				users[name] = obj || {name: name};
				sutil.prepuser(users[name]);
				loginRespond(res, users[name], params.p);
			});
		}
	}
	return loginAuth;
}