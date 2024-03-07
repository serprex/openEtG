#!/usr/bin/node --experimental-modules
import fs from 'fs';
import fsa from 'fs/promises';
import spritesheet from '@pencil.js/spritesheet';

const { json, image } = await spritesheet([
	'assets/cback.png',
	'assets/e0.png',
	'assets/e1.png',
	'assets/e2.png',
	'assets/e3.png',
	'assets/e4.png',
	'assets/e5.png',
	'assets/e6.png',
	'assets/e7.png',
	'assets/e8.png',
	'assets/e9.png',
	'assets/e10.png',
	'assets/e11.png',
	'assets/e12.png',
	'assets/e13.png',
	'assets/e14.png',
	'assets/gold.png',
	'assets/r1.png',
	'assets/r2.png',
	'assets/r3.png',
	'assets/r4.png',
	'assets/sacrifice.png',
	'assets/s0.png',
	'assets/s1.png',
	'assets/s2.png',
	'assets/s3.png',
	'assets/s4.png',
	'assets/s5.png',
	'assets/s6.png',
	'assets/s7.png',
	'assets/sabbath.png',
	'assets/sborder0.png',
	'assets/sborder1.png',
	'assets/sborder2.png',
	'assets/sborder3.png',
	'assets/t0.png',
	'assets/t1.png',
	'assets/t2.png',
	'assets/t3.png',
	'assets/t4.png',
]);

const atlasjson = {};
for (const frame in json.frames) {
	const data = json.frames[frame].frame;
	const name = frame.match(/^assets\/(.*)\.png$/)[1];
	atlasjson[name] = [data.x, data.y, data.w, data.h];
}

await Promise.all([
	fsa.writeFile('assets/atlas.png', image),
	fsa.writeFile('assets/atlas.json', JSON.stringify(atlasjson)),
]);

function addRule(rules, name, ...args) {
	for (const arg of args) {
		if (rules[arg]) rules[arg].push(name);
		else rules[arg] = [name];
	}
}

const bgstrx = [];
for (let i = 2; i < 5; i++) {
	bgstrx.push(
		`background-size:${(json.meta.size.w / i)
			.toFixed(2)
			.replace(/\.?0+$/, '')}px;`,
	);
}
const out = fs.createWriteStream('assets/atlas.css');
out.write(".ico{display:inline-block;background:url('/assets/atlas.webp')}");
const rules = {};
for (const asset in atlasjson) {
	const data = atlasjson[asset];
	addRule(
		rules,
		asset,
		`width:${data[2]}px;height:${data[3]}px`,
		`background-position:-${data[0]}px -${data[1]}px`,
	);
	if (asset.match(/e\d+|cback/)) {
		for (let i = 0; i < 3; i++) {
			const dati = data.map(
					x => +(x / (2 + i)).toFixed(2).replace(/\.?0+$/, ''),
				),
				name =
					(i === 2 ? 's'
					: i === 1 ? 't'
					: 'c') + asset;
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
	if (r1.length === 1) {
		for (const rule2 in rules) {
			if (rule1 > rule2) {
				const r2 = rules[rule2];
				if (r2.length === 1 && r1[0] === r2[0]) {
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
