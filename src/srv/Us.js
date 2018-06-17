'use strict';
const db = require('./db'),
	users = new Map(),
	usergc = new Set();
exports.users = users;
exports.socks = new Map();
function storeUsers() {
	const margs = ['Users'];
	for (const [u, user] of users) {
		if (user.pool || user.accountbound) {
			margs.push(u, JSON.stringify(user));
		}
	}
	if (margs.length > 1) db.send_command('hmset', margs);
}
exports.storeUsers = storeUsers;
const usergcloop = setInterval(() => {
	storeUsers();
	// Clear inactive users
	for (const u of users.keys()) {
		if (usergc.delete(u)) {
			users.delete(u);
		} else {
			usergc.add(u);
		}
	}
}, 300000);
exports.stop = function() {
	clearInterval(usergcloop);
	storeUsers();
	db.quit();
};
exports.load = function(name) {
	return new Promise((resolve, reject) => {
		const userck = users.get(name);
		if (userck) {
			usergc.delete(name);
			resolve(userck);
		} else {
			db.hget('Users', name, (err, userstr) => {
				if (userstr) {
					const user = JSON.parse(userstr);
					users.set(name, user);
					if (!user.streak) user.streak = [];
					resolve(user);
				} else {
					reject(err);
				}
			});
		}
	});
};
