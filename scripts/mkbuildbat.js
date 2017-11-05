#!/usr/bin/env node
const fs = require('fs');
fs.readFile(process.argv[3], 'utf8', (err, data) => {
	if (err) throw err;
	data.split('\n').forEach(line => {
		let match = line.match(/^build etgify.js:mkcjs(.*)$/);
		if (match) {
			fs.writeFile(
				process.argv[2],
				'node .\\node_modules\\mkcjs\\mkcjs etgify.js' + match[1],
				err => {
					if (err) throw err;
				},
			);
		}
	});
});
