"use strict";
var crypto = require("crypto");
var sutil = require("./sutil");
var db = require("./db");
var Us = require("./Us");
var etg = require("../etg");
var aiDecks = require("../Decks");
var etgutil = require("../etgutil");
var RngMock = require("../RngMock");
var userutil = require("../userutil");
module.exports = function(sockEmit){
	function loginRespond(socket, user, pass, authkey){
		function postHash(err, key){
			if (err){
				sockEmit(socket, "login", {err:err.message});
				return;
			}
			key = key.toString("base64");
			if (!user.auth){
				user.auth = key;
			}else if (user.auth != key){
				sockEmit(socket, "login", {err:"Incorrect password"});
				return;
			}else if (!authkey && user.salt.length == 24){
				user.auth = user.salt = "";
				loginRespond(socket, user, pass);
				return;
			}else{
				var day = sutil.getDay();
				if (user.oracle < day){
					user.oracle = day;
					var ocardnymph = Math.random() < .03;
					var card = RngMock.randomcard(false,
						x => x.type != etg.Pillar && ((x.rarity != 5) ^ ocardnymph) && x.code != user.ocard);
					var ccode = etgutil.asShiny(card.code, card.rarity == 5);
					if (card.rarity > 1) {
						user.accountbound = etgutil.addcard(user.accountbound, ccode);
					}
					else {
						user.pool = etgutil.addcard(user.pool, ccode);
					}
					user.ocard = ccode;
					user.daily = 0;
					user.dailymage = Math.floor(Math.random() * aiDecks.mage.length);
					user.dailydg = Math.floor(Math.random() * aiDecks.demigod.length);
				}
				db.zadd("wealth", user.gold + userutil.calcWealth(user.pool), user.name);
			}
			if (socket.readyState == 1){
				Us.socks[user.name] = socket;
				socket.send('{"x":"login",'+JSON.stringify(user, function(key, val){ return this == user && key.match(/^(salt|iter)$/) ? undefined : val }).slice(1));
				if (!user.daily) user.daily = 128;
			}
		}
		sutil.initsalt(user);
		if (authkey){
			postHash(null, authkey);
		}else if (pass){
			crypto.pbkdf2(pass, user.salt, user.iter, 64, postHash);
		}else postHash(null, user.name);
	}
	function loginAuth(data){
		var name = (data.u || "").trim();
		if (!name.length){
			sockEmit(this, "login", {err:"No name"});
			return;
		}else{
			var socket = this;
			Us.load(name, user => {
				loginRespond(socket, user, data.p, data.a);
			}, () => {
				var user = Us.users[name] = {name: name, gold: 0};
				loginRespond(socket, user, data.p, data.a);
			});
		}
	}
	return loginAuth;
}