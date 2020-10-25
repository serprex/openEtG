export default class AsyncWorker {
	constructor(worker) {
		this.id = 0;
		this.worker = worker.then(wcons => {
			const w = new wcons.default();
			return new Promise(resolve => {
				w.addEventListener('message', e => {
					if (e.data === null) {
						resolve(w);
					} else {
						const pending = this.pending.get(e.data.id);
						if (pending) pending(e);
						this.pending.delete(e.id);
					}
				});
			});
		});
		this.pending = new Map();
	}

	terminate() {
		for (const resolve of this.pending.values()) {
			resolve();
		}
		return this.worker.then(w => w.terminate());
	}

	send(data) {
		return this.worker.then(
			worker =>
				new Promise(resolve => {
					this.pending.set(this.id, resolve);
					worker.postMessage({
						id: this.id,
						data,
					});
					this.id = (this.id + 1) | 0;
				}),
		);
	}
}
