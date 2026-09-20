import { parentPort } from 'node:worker_threads';
import { calculateChart } from '../engine.js';

parentPort.on('message', async ({ id, birth }) => {
  try { parentPort.postMessage({ id, ok: true, result: await calculateChart(birth) }); }
  catch (error) { parentPort.postMessage({ id, ok: false, error: { name: error.name, code: error.code, message: error.message, stack: error.stack } }); }
});
