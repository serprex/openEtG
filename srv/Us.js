"use strict";
var db = require("./db");
var users = {}, socks = {}, usergc = new Set();
exports.users = users;
exports.socks = socks;
function storeUsers(){
	var margs = ["Users"];
	for(var u in users){
		var user = users[u];
		if (user.pool || user.accountbound){
			margs.push(u, JSON.stringify(user));
		}
	}
	if (margs.length > 1) db.send_command("hmset", margs);
}
exports.storeUsers = storeUsers;
var usergcloop = setInterval(function(){
	storeUsers();
	// Clear inactive users
	for(var u in users){
		if (usergc.delete(u)){
			delete users[u];
		}else{
			usergc.add(u);
		}
	}
}, 300000);
exports.stop = function(){
	clearInterval(usergcloop);
	storeUsers();
	db.quit();
}
function load(name, cb, errcb){
	usergc.delete(name);
	if (users[name]){
		cb(users[name]);
	}else{
		db.hget("Users", name, function(err, userstr){
			if (err){
				console.log(err.message);
				if (errcb) errcb();
			}else if (userstr){
				var user = users[name] = JSON.parse(userstr);
				if (!user.streak) user.streak = [];
				cb(user);
			}
		});
	}
}
exports.load = load;