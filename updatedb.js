"use strict";
var fs = require("fs");
var urllib = require("urllib");
urllib.request("https://www.google.com/accounts/ClientLogin", {
	type: "post",
	data: {
		service: "wise", accountType: "HOSTED_OR_GOOGLE",
		source: "openEtG"
	}
}, function(err, data, res){
	if (err){
		console.log("Failed to auth ", err.message);
		return;
	}
	var auth = "GoogleLogin auth=" + data.toString();
	function download(gid, cb){
		urllib.request("https://docs.google.com/spreadsheets/d/1dfKGdHqqLAAHdnw2mKBwaYwDIFODjQIjlg8ZPyRFVmA/export?format=csv&id=1dfKGdHqqLAAHdnw2mKBwaYwDIFODjQIjlg8ZPyRFVmA&gid="+gid, {
			headers: {
				Authorization: auth,
				"GData-Version": "3.0"
			}
		}, cb);
	}
	var dbgid = [
		["pillar", "0"],
		["weapon", "1863409466"],
		["shield", "457582620"],
		["permanent", "420516648"],
		["spell", "1605384839"],
		["creature", "1045918250"],
		["active", "657211460"],
	];
	dbgid.forEach(function(pair){
		if (process.argv.length == 2 || process.argv.some(function(x) { return x.indexOf(pair[0]) == 0; })){
			download(pair[1], function(err, data, res){
				if (err){
					console.log("Failed to download " + pair[0], err.message);
					return;
				}
				fs.writeFileSync(pair[0]+".csv", data);
				console.log(pair[0]);
			});
		}
	});
});