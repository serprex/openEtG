import Skill from './Skill.js';
import Skills from './Skills.js';

const cache = new Map();
export default function(name) {
	if (name in Skills) {
		return Skills[name];
	} else if (cache.has(name)) {
		return cache.get(name);
	}
	const [base, ...args] = name.split(' ');
	if (!(base in Skills)) {
		throw new Error(`Unknown active ${base}`);
	}
	const s = new Skill([name], Skills[base].func(...args), false);
	cache.set(name, s);
	return s;
}
