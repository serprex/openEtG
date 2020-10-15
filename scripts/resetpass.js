#!/bin/env node
import * as Us from '../src/srv/Us.js';
const user = await Us.load(process.argv[2]);
console.log(user);
user.auth = user.salt = '';
await Us.stop();
