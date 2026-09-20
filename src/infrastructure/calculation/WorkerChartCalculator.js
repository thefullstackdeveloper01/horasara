import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export class WorkerChartCalculator {
  constructor({ workerUrl = new URL('../../workers/chart-worker.js', import.meta.url), timeoutMs = 0 } = {}) { this.workerUrl = workerUrl; this.timeoutMs = timeoutMs; }
  calculate(birth, options = {}) {
    return new Promise((resolve, reject) => {
      const id = randomUUID(); const worker = new Worker(fileURLToPath(this.workerUrl)); let timer;
      const cleanup = () => { if (timer) clearTimeout(timer); worker.terminate().catch(() => {}); options.signal?.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); const error = new Error('Calculation cancelled'); error.code = 'CANCELLED'; reject(error); };
      options.signal?.addEventListener('abort', abort, { once: true });
      if (this.timeoutMs > 0) { timer = setTimeout(() => { cleanup(); const error = new Error(`Calculation exceeded ${this.timeoutMs}ms`); error.code = 'TIMEOUT'; reject(error); }, this.timeoutMs); }
      worker.on('message', message => { if (message.id !== id) return; cleanup(); if (message.ok) resolve(message.result); else { const error = new Error(message.error.message); Object.assign(error, message.error); reject(error); } });
      worker.on('error', error => { cleanup(); reject(error); });
      worker.postMessage({ id, birth });
    });
  }
}
