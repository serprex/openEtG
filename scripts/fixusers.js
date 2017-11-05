#!/bin/env node
'use strict';
const db = require('redis').createClient();

db.hgetall('Users', function(users) {
	for (var name in users) {
		var user = JSON.parse(users[name]);
		if (!user.qecks) {
			user.qecks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
			users[name] = JSON.stringify(user);
		}
	}
	db.hmset('Users', users, function(err) {
		console.log(err);
		db.quit();
	});
});
