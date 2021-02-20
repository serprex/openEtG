import fs from 'fs/promises';
import OrigCards from '../src/vanilla/Cards.js';
import OpenCards from '../src/Cards.js';

const json = {
	Card: {},
	Event: {},
	EventId: {},
	Fx: {},
	Skill: {},
	SkillParams: {},
	Stat: {},
	StatId: {},
	Flag: {},
	FlagId: {},
};
const source = [
	'#![allow(non_upper_case_globals)]',
	'use crate::card::{Card,CardSet,Cards};use crate::game::{Flag,Fx,Stat};use crate::skill::{Event,Skill};',
];
function flagSlice(card) {
	const s = [];
	for (const [k, v] of card.status) {
		if (json.FlagId[k] !== undefined) {
			s.push(`Flag::${k}`);
		}
	}
	return `&${s.length === 1 ? s[0] : s.length ? `(${s.join('|')})` : '0'}`;
}
function statusSlice(card) {
	let s = '&[';
	for (const [k, v] of card.status) {
		if (json.StatId[k] !== undefined) {
			s += `(Stat::${k},${v}),`;
		}
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
source.push('}}', ...stat_id, '_=>return None})}');

const flag_id = ['pub fn flag_id(f:i32)->Option<u64>{Some(match f{'];
source.push('pub fn id_flag(f:u64)->i32{match f{');
for (const fl of gamers.matchAll(/pub const ([a-z]+): u64 = 1 << \d\d?;/g)) {
	const id = statid++;
	const key = fl[1];
	json.Flag[id] = key;
	json.FlagId[key] = id;
	source.push(`Flag::${key}=>${id},`);
	flag_id.push(`${id}=>Flag::${key},`);
}
source.push('_=>0}}', ...flag_id, '_=>return None})}');

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
	Cards.Codes.forEach(card => {
		if (!card || card.shiny) return;
		codeidx.set(card.code, codeidx.size);
		json.Card[card.code] = card.name;
		source.push(
			`Card{code:${card.code},kind:${card.type},element:${
				card.element
			},rarity:${card.rarity},attack:${card.attack},health:${
				card.health
			},cost:${card.cost},costele:${card.costele},cast:${card.cast},castele:${
				card.castele
			},flag:${flagSlice(card)},status:${statusSlice(card)},skill:${skillSlice(
				card,
			)}},`,
		);
	});
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

await Promise.all([
	fs.writeFile('./src/enum.json', JSON.stringify(json), 'utf8'),
	fs.writeFile('./src/rs/src/generated.rs', source.join('\n'), 'utf8'),
]);
