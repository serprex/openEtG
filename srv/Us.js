'use strict';
const db = require('./db'),
	users = {},
	usergc = new Set();
exports.users = users;
exports.socks = {};
function storeUsers() {
	const margs = ['Users'];
	for (const u in users) {
		const user = users[u];
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
	for (const u in users) {
		if (usergc.delete(u)) {
			delete users[u];
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
exports.load = function(name, cb, errcb) {
	if (users[name]) {
		usergc.delete(name);
		cb(users[name]);
	} else {
		db.hget('Users', name, (err, userstr) => {
			if (userstr) {
				const user = (users[name] = JSON.parse(userstr));
				if (!user.streak) user.streak = [];
				cb(user);
			} else if (errcb) {
				errcb();
			}
		});
	}
};
