import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Dataset port implementation. Business logic never reads JSON directly. */
export class DatasetRepository {
  constructor({ root }) { this.root = root; this.cache = new Map(); }
  async get(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    const value = JSON.parse(await readFile(join(this.root, name.endsWith('.json') ? name : `${name}.json`), 'utf8'));
    this.cache.set(name, value); return value;
  }
  async list() { return (await readdir(this.root)).filter(x => x.endsWith('.json')); }
}
