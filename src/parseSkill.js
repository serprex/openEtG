import Skill from './Skill.js';
import Skills from './Skills.js';

const cache = new Map();
export default function (name) {
	const skill = Skills[name];
	if (skill) {
		return skill;
	} else if (cache.has(name)) {
		return cache.get(name);
	}
	const [base, ...args] = name.split(' '),
		baseSkill = Skills[base];
	if (!baseSkill) {
		throw new Error(`Unknown active ${base}`);
	}
	const s = new Skill(
		[name],
		baseSkill.func(...args),
		baseSkill.passive,
		baseSkill.target,
	);
	cache.set(name, s);
	return s;
}
