#!/bin/node --experimental-modules
import redis from 'ioredis';
const db = new redis();

db.hgetall('Users').then(users => {
	for (const name in users) {
		const user = JSON.parse(users[name]);
		if (!user.qecks) {
			user.qecks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
			users[name] = JSON.stringify(user);
		}
	}
	return db.hmset('Users', users).then(() => db.quit());
});
