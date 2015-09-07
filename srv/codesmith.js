"use strict";
var qstring = require("querystring");
var fs = require("fs");
module.exports = function(db){
	function codeSmithLoop(res, iter, params){
		if (iter == 1000){
			res.writeHead(503);
			res.end();
		}else{
			var code = "";
			for (var i=0; i<8; i++){
				code += String.fromCharCode(33+Math.floor(Math.random()*94));
			}
			db.hexists("CodeHash", code, function(err, exists){
				if (exists){
					codeSmithLoop(res, iter+1, params);
				}else{
					db.hset("CodeHash", code, params.t)
					res.writeHead(200);
					res.end(code);
				}
			});
		}
	}
	return function(req, res){
		var paramstring = req.url.slice(2);
		var params = qstring.parse(paramstring);
		fs.readFile(".codepsw", function(err, data) {
			if (err){
				if (err.code == "ENOENT"){
					data = params.p;
				}else{
					res.writeHead(200);
					res.end(err.message);
					return;
				}
			}
			if (params.p == data){
				codeSmithLoop(res, 0, params);
			}else{
				res.writeHead(404);
				res.end();
			}
		});
	}
}