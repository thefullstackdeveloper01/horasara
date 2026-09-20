export class MemoryCalculationCache {
  constructor({ maxEntries = 100, ttlMs = 0 } = {}) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new TypeError('maxEntries must be >= 1');
    this.maxEntries = maxEntries; this.ttlMs = Math.max(0, ttlMs); this.store = new Map();
  }
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) { this.store.delete(key); return undefined; }
    this.store.delete(key); this.store.set(key, entry); return entry.value;
  }
  async set(key, value) {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: this.ttlMs ? Date.now() + this.ttlMs : 0 });
    while (this.store.size > this.maxEntries) this.store.delete(this.store.keys().next().value);
    return value;
  }
  async delete(key) { return this.store.delete(key); }
  async clear() { this.store.clear(); }
  get size() { return this.store.size; }
}
