export default class AiWorker {
	id: number;
	worker: Promise<Worker>;
	pending: Map<number, Function>;

	constructor() {
		this.id = 0;
		this.pending = new Map();
		this.worker = new Promise(resolve => {
			const worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
				type: 'module',
			});
			worker.addEventListener('message', e => {
				if (e.data === null) {
					resolve(worker);
				} else {
					const pending = this.pending.get(e.data.id);
					if (pending) {
						pending(e);
						this.pending.delete(e.data.id);
					}
				}
			});
		});
	}

	async terminate() {
		for (const resolve of this.pending.values()) {
			resolve();
		}
		return (await this.worker).terminate();
	}

	send(data: any) {
		return new Promise(resolve => {
			const id = this.id;
			this.id = (this.id + 1) | 0;
			this.pending.set(id, resolve);
			this.worker.then(worker => worker.postMessage({ id, data }));
		});
	}
}
