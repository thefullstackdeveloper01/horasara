import { JsonStore } from './JsonStore.js';
/** Persist only user configuration; calculation results remain reproducible and are not silently mixed into settings. */
export class UserConfigStore {
  constructor(filePath) { this.store = new JsonStore(filePath); }
  async load(defaults = {}) { return this.store.read(defaults); }
  async save(config) { if (!config || typeof config !== 'object' || Array.isArray(config)) throw new TypeError('User config must be an object'); return this.store.write(config); }
}
