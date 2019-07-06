import imm from 'immutable';
import Skill from './Skill.js';
import Skills from './Skills.js';

const cache = new Map();
export default function(name) {
	if (name in Skills) {
		return Skills[name];
	} else if (cache.has(name)) {
		return cache.get(name);
	}
	const spidx = name.indexOf(' ');
	if (spidx === -1) {
		return console.log('Unknown active', name);
	}
	const s = new Skill(
		new imm.List().push(name),
		Skills[name.slice(0, spidx)].func(name.slice(spidx + 1)),
		false,
	);
	cache.set(name, s);
	return s;
}
