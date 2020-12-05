import fs from 'fs/promises';
import OrigCardsJson from '../src/vanilla/Cards.json';
import OpenCardsJson from '../src/Cards.json';
import OrigCards from '../src/vanilla/Cards.js';
import OpenCards from '../src/Cards.js';

const source = [
	'#![allow(non_upper_case_globals)]',
	'use crate::card::{Card,CardSet,Cards};use crate::game::{Fx,Stat};use crate::skill::{Event,Skill};',
];
function statusSlice(card) {
	let s = '&[';
	for (const [k, v] of card.status) {
		s += `(Stat::${k},${v}),`;
	}
	s += ']';
	return s;
}
function skillSlice(card) {
	let s = '&[';
	for (const [k, v] of card.active) {
		s += `(Event::${k.startsWith('own') ? 'Own' : ''}${k
			.replace(/^own/, '')
			.replace(/^./, c => c.toUpperCase())},&[${v
			.map(formatSkill)
			.join(',')}]),`;
	}
	s += ']';
	return s;
}
function formatSkill(name) {
	return `Skill::${
		~name.indexOf(' ')
			? name.replace(' ', '(').replaceAll(' ', ',') + ')'
			: name === 'static'
			? 'r#static'
			: name
	}`;
}
const json = {
	Card: {},
	Event: {},
	EventId: {},
	Fx: {},
	Skill: {},
	SkillParams: {},
	Stat: {},
	StatId: {},
};
const names = { open: [], orig: [] };
for (const Cards of [OpenCards, OrigCards]) {
	const open = Cards === OpenCards,
		setname = open ? 'OpenSet' : 'OrigSet';
	source.push(
		`pub const ${setname}:Cards=Cards{set:CardSet::${
			open ? 'Open' : 'Original'
		},data:&[`,
	);
	const codeidx = new Map();
	for (const card of Cards.Codes) {
		if (!card || card.shiny) continue;
		codeidx.set(card.code, codeidx.size);
		json.Card[card.code] = card.name;
		source.push(
			`Card{code:${card.code},kind:${card.type},element:${
				card.element
			},rarity:${card.rarity},attack:${card.attack},health:${
				card.health
			},cost:${card.cost},costele:${card.costele},cast:${card.cast},castele:${
				card.castele
			},status:${statusSlice(card)},skill:${skillSlice(card)}},`,
		);
	}
	source.push(
		`]};pub const ${open ? 'OpenCache' : 'OrigCache'}:[&'static [u16];2]=[`,
	);
	for (let i = 0; i < 2; i++) {
		source.push('&[');
		for (const fc of Cards.filtercache[i]) {
			source.push(`${codeidx.get(fc.code)},`);
		}
		source.push('],');
	}
	source.push('];');
	const namejs = open ? names.open : names.orig;
	for (const [name, card] of Object.entries(Cards.Names)) {
		if (name !== '52Pickup') {
			source.push(`pub const ${open ? '' : 'v_'}${name}:i32=${card.code};`);
			namejs.push(`export const ${name} = ${card.code};`);
		}
	}
}
const [gamers, skillrs] = await Promise.all([
	fs.readFile('./src/rs/src/game.rs', 'utf8'),
	fs.readFile('./src/rs/src/skill.rs', 'utf8'),
]);

for (const ev of skillrs.matchAll(
	/pub const (\w+): Event = Event\(.*?(\d+)\D*\);/g,
)) {
	const lower = ev[1].toLowerCase();
	json.Event[0 | ev[2]] = lower;
	json.Event[128 | ev[2]] = `own${lower}`;
	json.EventId[lower] = 0 | ev[2];
	json.EventId[`own${lower}`] = 128 | ev[2];
}

source.push('pub fn id_skill(s:Skill)->i32{match s{');
const skillprefix = '\npub enum Skill {\n',
	skill0 = skillrs.indexOf(skillprefix) + skillprefix.length;
if (skill0 == skillprefix.length - 1)
	throw new Error("Couldn't find skill declarations");
let skillid = 1;
for (const skill of skillrs
	.slice(skill0, skillrs.indexOf('}', skill0))
	.split(',\n')
	.map(s => s.trim().replace(/^r#/, ''))
	.filter(s => s)) {
	const id = skillid++;
	let params = 0;
	json.Skill[id] = skill.replace(/\(.*\)/g, x => {
		params++;
		for (let i = 0; i < x.length; i++) if (x[i] == ',') params++;
		return '';
	});
	if (params !== 0) json.SkillParams[id] = params;
	source.push(
		`Skill::${skill
			.replace(/\(.*\)/, x => x.replace(/[^(),]+/g, '_'))
			.replace(/^static$/, 'r#static')}=>${id},`,
	);
}
source.push('}}');

const stat_id = ['pub fn stat_id(s:i32)->Option<Stat>{Some(match s{'];
source.push('pub fn id_stat(s:Stat)->i32{match s{');
const statprefix = '\npub enum Stat {\n',
	stat0 = gamers.indexOf(statprefix) + statprefix.length;
let statid = 1;
for (const stat of gamers
	.slice(stat0, gamers.indexOf('}', stat0))
	.split(',\n')
	.map(s => s.trim().replace(/^r#/, ''))
	.filter(s => s)) {
	const id = statid++;
	json.Stat[id] = stat;
	json.StatId[stat] = id;
	source.push(`Stat::${stat}=>${id},`);
	stat_id.push(`${id}=>Stat::${stat},`);
}
source.push('}}');
stat_id.push('_=>return None})}');
source.push(...stat_id);

source.push('pub fn id_fx(s:Fx)->i32{match s{');
const fxprefix = '\npub enum Fx {\n',
	fx0 = gamers.indexOf(fxprefix) + fxprefix.length;
let fxid = 1;
for (const fx of gamers
	.slice(fx0, gamers.indexOf('}', fx0))
	.split(',\n')
	.map(s => s.trim().replace(/^r#/, ''))
	.filter(s => s)) {
	const id = fxid++;
	json.Fx[id] = fx.replace(/\(.*\)$/, '');
	source.push(
		`Fx::${fx.replace(/\(.*\)/, x => x.replace(/[^(),]+/g, '_'))}=>${id},`,
	);
}
source.push('}}');

await Promise.all([
	fs.writeFile('./src/enum.json', JSON.stringify(json), 'utf8'),
	fs.writeFile('./src/OpenNames.js', names.open.join('\n'), 'utf8'),
	fs.writeFile('./src/OriginalNames.js', names.orig.join('\n'), 'utf8'),
	fs.writeFile('./src/rs/src/generated.rs', source.join('\n'), 'utf8'),
]);
