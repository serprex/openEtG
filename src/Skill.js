export default class Skill {
	constructor(name, func, passive) {
		this.name = name;
		this.func = func;
		this.passive = passive;
	}

	hashCode() {
		return this.name.hashCode();
	}

	toString() {
		return this.name.join(' ');
	}

	static combine(a1, a2) {
		if (!a1) return a2;
		if (!a2) return a1;
		return new Skill(
			a1.name.concat(a2.name),
			(ctx, c, t, data) => {
				const v1 = a1.func(ctx, c, t, data),
					v2 = a2.func(ctx, c, t, data);
				return v1 === undefined
					? v2
					: v2 === undefined
					? v1
					: v1 === true || v2 === true || v1 + v2;
			},
			false,
		);
	}
}
