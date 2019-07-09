import { hashString } from './util.js';

export function hashArray(a) {
	let r = a.length * 108;
	for (let i = 0; i < a.length; i++) {
		r = ((r * 63) ^ hash(a[i])) & 0x7fffffff;
	}
	return r;
}

function hash(obj) {
	if (!obj) return 0;
	if (typeof obj === 'number') return obj & 0x7fffffff;
	if (typeof obj === 'string') return hashString(obj);
	if (obj instanceof Array) return hashArray(obj);
	if (obj.hashCode) return obj.hashCode();
	return -1;
}

function iMap(args) {
	this.data = new Map();
	this.hash = null;
	for (const k in args) {
		this.data.set(k, args[k]);
	}
}
function cloneMap(x) {
	const newMap = Object.create(iMap.prototype);
	newMap.data = new Map(x.data);
	newMap.hash = null;
	return newMap;
}
Object.defineProperty(iMap.prototype, 'size', {
	get() {
		return this.data.size;
	},
});
iMap.prototype.hashCode = function() {
	if (this.hash === null) {
		let r = 69105;
		for (const [k, v] of this.data) {
			r ^= hash(k) ^ (hash(v) * 929);
		}
		this.hash = r;
	}
	return this.hash;
};
iMap.prototype.has = function(k) {
	return this.data.has(k);
};
iMap.prototype.get = function(k, def) {
	return this.data.has(k) ? this.data.get(k) : def;
};
iMap.prototype.set = function(k, v) {
	const a = cloneMap(this);
	a.data.set(k, v);
	return a;
};
iMap.prototype.delete = function(k) {
	const a = cloneMap(this);
	a.data.delete(k);
	return a;
};
iMap.prototype.update = function(k, f) {
	return this.set(k, f(this.data.get(k)));
};
function update(o, path, idx, f) {
	if (idx === path.length) {
		return f(o);
	}
	const p = path[idx];
	if (o instanceof iMap) {
		return o.set(p, update(o.data.get(p), path, idx + 1, f));
	} else if (o instanceof Array) {
		const no = o.slice();
		no[p] = update(o[p], path, idx + 1, f);
		return no;
	} else {
		return {
			...o,
			[p]: update(o[p], path, idx + 1, f),
		};
	}
}
iMap.prototype.updateIn = function(path, f) {
	return update(this, path, 0, f);
};
iMap.prototype.setIn = function(path, val) {
	return this.updateIn(path, () => val);
};
iMap.prototype.filter = function(f) {
	const data = new Map();
	for (const [k, v] of this.data) {
		if (f(v, k)) data.set(k, v);
	}
	const a = Object.create(iMap.prototype);
	a.data = data;
	a.hash = null;
	return a;
};

iMap.prototype[Symbol.iterator] = function() {
	return this.data[Symbol.iterator]();
};

export { iMap as Map };
