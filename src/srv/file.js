'use strict';
const { existsSync, watch, promises } = require('fs'),
	fs = promises,
	gzip = require('./gzip'),
	sutil = require('./sutil'),
	etgutil = require('../etgutil'),
	cache = require('./cache'),
	mime = {
		css: 'text/css',
		htm: 'text/html',
		html: 'text/html',
		js: 'application/javascript',
		json: 'application/json',
		map: 'application/octet-stream',
		ogg: 'application/ogg',
		png: 'image/png',
	};
module.exports = async function(url) {
	const contentType = mime[url.slice(url.lastIndexOf('.') + 1)];
	if (!contentType) return reject('Unknown MIME');
	if (url.startsWith('Cards/') && !existsSync(url)) {
		const code = url.match(/^Cards\/([a-v\d]{3})\.png$/);
		if (code) {
			const icode = parseInt(code[1], 32),
				isShiny = icode & 0x4000;
			if (isShiny) {
				return {
					status: '302',
					head: {
						Location: `/Cards/${etgutil
							.asShiny(icode, false)
							.toString(32)}.png`,
					},
					date: new Date(),
					buf: '',
				};
			} else {
				const unupped = etgutil.asUpped(icode, false).toString(32);
				if (unupped != code[1]) {
					return {
						status: '302',
						head: { Location: `/Cards/${unupped}.png` },
						date: new Date(),
						buf: '',
					};
				}
			}
		}
		reject('ENOENT');
	}
	return Promise.all([
		fs.stat(url),
		fs.readFile(url).then(buf => gzip(buf, { level: 9 })),
	]).then(([stat, zbuf]) => {
		watch(url, { persistent: false }, function(_e) {
			cache.rm(url);
			this.close();
		});
		stat.mtime.setMilliseconds(0);
		return {
			head: { 'Content-Encoding': 'gzip', 'Content-Type': contentType },
			date: stat.mtime,
			buf: zbuf,
		};
	}).catch(err => { throw err.message; });
};
