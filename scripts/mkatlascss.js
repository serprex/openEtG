#!/usr/bin/node --experimental-modules
import fs from 'fs';
import assets from '../assets/atlas.json';
let pngw = 0,
	pngh = 0,
	pngp = 0;
const png = fs.createReadStream(process.argv[3], { start: 16, end: 23 });
png.on('data', function(data) {
	for (let i = 0; i < data.length; i++) {
		const b = data.readUInt8(i);
		if (pngp < 4) pngw += b << ((3 - pngp) << 3);
		else pngh += b << ((7 - pngp) << 3);
		pngp++;
	}
});
png.on('end', function() {
	console.log(pngw, pngh);
	const bgstrx = [
		`background-size:${(pngw / 2).toFixed(2)}px;`,
		`background-size:${(pngw / 3).toFixed(2)}px;`,
		`background-size:${(pngw / 4).toFixed(2)}px;`,
	];
	const out = fs.createWriteStream(process.argv[2]);
	out.write(".ico{display:inline-block;background:url('atlas.png')}");
	const rules = {};
	for (const asset in assets) {
		const data = assets[asset];
		addRule(
			rules,
			asset,
			`width:${data[2]}px;height:${data[3]}px`,
			`background-position:-${data[0]}px -${data[1]}px`,
		);
		if (asset.match(/e\d+|cback/)) {
			for (let i = 0; i < 3; i++) {
				const dati = data.map(x => +(x / (2 + i)).toFixed(2)),
					name = (i === 2 ? 's' : i === 1 ? 't' : 'c') + asset;
				addRule(
					rules,
					name,
					`${bgstrx[i]}width:${dati[2]}px;height:${dati[3]}px`,
					`background-position:-${dati[0]}px -${dati[1]}px`,
				);
			}
		}
	}
	const droprule = new Set();
	const newrules = {};
	for (const rule1 in rules) {
		const r1 = rules[rule1];
		if (r1.length == 1) {
			for (const rule2 in rules) {
				if (rule1 > rule2) {
					const r2 = rules[rule2];
					if (r2.length == 1 && r1[0] == r2[0]) {
						droprule.add(rule1).add(rule2);
						newrules[`${rule1};${rule2}`] = r1;
					}
				}
			}
		}
	}
	for (const rule in rules) {
		if (!droprule.has(rule)) {
			out.write(rules[rule].map(x => '.' + x).join() + `{${rule}}`);
		}
	}
	for (const rule in newrules) {
		out.write(newrules[rule].map(x => '.' + x).join() + `{${rule}}`);
	}
	out.end();
});
function addRule(rules, name, ...args) {
	for (const arg of args) {
		if (rules[arg]) rules[arg].push(name);
		else rules[arg] = [name];
	}
}
