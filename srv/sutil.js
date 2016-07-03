"use strict";
exports.mkTask = function(cb){
	const params = {};
	var cbCount = 1;
	function cbCheck(){
		if(!--cbCount) cb(params);
	}
	return function(param){
		if (arguments.length == 0){
			cbCheck();
		}else{
			cbCount++;
			return function(err, res){
				params[param] = res;
				if (err){
					if (!params.err) params.err = {};
					params.err[param] = err;
				}
				cbCheck();
			}
		}
	}
}
exports.initsalt = function(user){
	if (!user.salt){
		user.salt = require("crypto").pseudoRandomBytes(15).toString("base64");
		user.iter = 99999+Math.floor(Math.random()*9999);
	}
}
exports.getDay = function(){
	return Math.floor(Date.now()/86400000);
}
exports.parseJSON = function(x){
	try{
		return JSON.parse(x);
	}catch(e){
		return null;
	}
}