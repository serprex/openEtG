export default class Lock {
	constructor() {
		this.q = new Set();
		this.inp = false;
	}

	async enqueue(p) {
		this.q.add(p);
		if (!this.inp) {
			this.inp = true;
			for (const qp of this.q) {
				try {
					await qp;
				} catch (e) {
					console.log(e);
				}
				this.q.delete(qp);
			}
			this.inp = false;
		}
	}

	exec(p) {
		p = p();
		this.enqueue(p);
		return p;
	}
}
