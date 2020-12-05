import fsCb from 'fs';
const { existsSync, watch, promises } = fsCb,
	fs = promises;

import * as etgutil from '../etgutil.js';
import * as cache from './cache.js';
const mime = {
	css: 'text/css',
	htm: 'text/html',
	html: 'text/html',
	js: 'application/javascript',
	json: 'application/json',
	map: 'application/octet-stream',
	ogg: 'application/ogg',
	png: 'image/png',
	txt: 'text/plain',
	wasm: 'application/wasm',
	webp: 'image/webp',
};
export default async function (url) {
	const contentType = mime[url.slice(url.lastIndexOf('.') + 1)];
	if (!contentType) return reject('Unknown MIME');
	if (url.startsWith('Cards/') && !existsSync(url)) {
		const code = url.match(/^Cards\/([a-v\d]{3})\.webp$/);
		if (code) {
			let icode = parseInt(code[1], 32),
				isShiny = icode & 0x4000;
			if ((icode & 0x3fff) < 5000) {
				icode += 4000;
			}
			if (isShiny) {
				return {
					status: '302',
					head: {
						Location: `/Cards/${etgutil.encodeCode(
							etgutil.asShiny(icode, false),
						)}.webp`,
					},
					date: new Date(),
					buf: '',
				};
			} else {
				const unupped = etgutil.encodeCode(etgutil.asUpped(icode, false));
				if (unupped !== code[1]) {
					return {
						status: '302',
						head: { Location: `/Cards/${unupped}.webp` },
						date: new Date(),
						buf: '',
					};
				}
			}
		}
		reject('ENOENT');
	}
	const path = url.match(/\.(js(.map)?|html?|wasm)$/) ? 'bundle/' + url : url;
	const [stat, buf] = await Promise.all([fs.stat(path), fs.readFile(path)]);
	if (!url.startsWith('hash/')) {
		watch(path, { persistent: false }, function (_e) {
			cache.rm(url);
			this.close();
		});
	}
	stat.mtime.setMilliseconds(0);
	return {
		head: {
			'Content-Type': contentType,
			'Cache-Control': url.startsWith('hash/') ? 'immutable' : 'no-cache',
		},
		date: stat.mtime,
		buf,
	};
}
