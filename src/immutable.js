import { hashString } from './util.js';

function hashArray(a) {
	let r = a.length * 108;
	for (let i = 0; i < a.length; i++) {
		r ^= (i * 967) ^ (hash(a[i]) * 619);
	}
	return r;
}

function hash(obj) {
	if (!obj) return 0;
	if (typeof obj === 'number') return obj;
	if (typeof obj === 'string') return hashString(obj);
	if (obj instanceof Array) return hashArray(obj);
	if (obj.hashCode) return obj.hashCode();
	return -1;
}

function iMap(args) {
	this.data = new Map();
	for (const k in args) {
		this.data.set(k, args[k]);
	}
}
function cloneMap(x) {
	const newMap = Object.create(iMap.prototype);
	newMap.data = new Map(x.data);
	return newMap;
}
Object.defineProperty(iMap.prototype, 'size', {
	get() {
		return this.data.size;
	},
});
iMap.prototype.hashCode = function() {
	let r = 69105;
	for (const [k, v] of this.data) {
		r ^= hash(k) ^ (hash(v) * 929);
	}
	return r;
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
	} else if (o instanceof iList) {
		return o.set(p, update(o.data[p], path, idx + 1, f));
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
iMap.prototype.getIn = function(path) {
	let o = this;
	for (const p of path) {
		if (o instanceof iMap) {
			o = o.data.get(p);
		} else if (o instanceof iList) {
			o = o.data[p];
		} else {
			o = o[p];
		}
		if (!o) return o;
	}
	return o;
};
iMap.prototype.filter = function(f) {
	const data = new Map();
	for (const [k, v] of this.data) {
		if (f(v, k)) data.set(k, v);
	}
	const a = Object.create(iMap.prototype);
	a.data = data;
	return a;
};

const emptyList = new iList([]);
function iList(args) {
	if (args === undefined) return emptyList;
	this.data = Array.from(args);
}
function cloneList(x) {
	const newList = Object.create(iList.prototype);
	newList.data = Array.from(x.data);
	return newList;
}
Object.defineProperty(iList.prototype, 'size', {
	get() {
		return this.data.length;
	},
});
iList.prototype.hashCode = function() {
	return hashArray(this.data);
};
iList.prototype.push = function(arg) {
	const a = cloneList(this);
	a.data.push(arg);
	return a;
};
iList.prototype.splice = function(idx, len) {
	const a = cloneList(this);
	a.data.splice(idx, len);
	return a;
};
iList.prototype.concat = function(arg) {
	const a = Object.create(iList.prototype);
	a.data = this.data.concat(arg);
	return a;
};
iList.prototype.get = function(idx) {
	return this.data[idx];
};
iList.prototype.set = function(idx, val) {
	const a = cloneList(this);
	a.data[idx] = val;
	return a;
};
iList.prototype.indexOf = function(val) {
	return this.data.indexOf(val);
};
iList.prototype.forEach = function(f, self) {
	return this.data.forEach(f, self);
};
iList.prototype.map = function(f, self) {
	const a = Object.create(iList.prototype);
	a.data = this.data.map(f, self);
	return a;
};
iList.prototype.filter = function(f, self) {
	const a = Object.create(iList.prototype);
	a.data = this.data.filter(f, self);
	return a;
};
iList.prototype.join = function(sep = ',') {
	return this.data.join(sep);
};
iList.prototype.some = function(f) {
	return this.data.some(f);
};
iList.prototype.every = function(f) {
	return this.data.every(f);
};
iList.prototype.reduce = function(f, z) {
	return this.data.reduce(f, z);
};

function iSet(args) {
	this.data = new Set(args);
}
function cloneSet(x) {
	const newSet = Object.create(iSet.prototype);
	newSet.data = new Set(x.data);
	return newSet;
}
Object.defineProperty(iSet.prototype, 'size', {
	get() {
		return this.data.size;
	},
});
iSet.prototype.hashCode = function() {
	let r = 800344;
	for (const v of this.data) {
		r ^= hash(v);
	}
	return r;
};
iSet.prototype.has = function(x) {
	return this.data.has(x);
};
iSet.prototype.add = function(arg) {
	const newSet = cloneSet(this);
	newSet.data.add(arg);
	return newSet;
};
iSet.prototype.delete = function(arg) {
	const newSet = cloneSet(this);
	newSet.data.delete(arg);
	return newSet;
};

iMap.prototype[Symbol.iterator] = iList.prototype[
	Symbol.iterator
] = iSet.prototype[Symbol.iterator] = function() {
	return this.data[Symbol.iterator]();
};

export default {
	Map: iMap,
	List: iList,
	Set: iSet,
	OrderedSet: iSet,
};
