#!/bin/env node
'use strict';
const Us = require('../srv/Us');
Us.load(process.argv[2], user => {
	console.log(user);
	user.auth = user.salt = '';
	Us.stop();
});
