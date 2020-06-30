#!/bin/env node
'use strict';
import * as Us from '../src/srv/Us.js';
Us.load(process.argv[2])
	.then(user => {
		console.log(user);
		user.auth = user.salt = '';
		Us.stop();
	})
	.catch(() => console.log('User not found'));
