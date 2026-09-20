/** Append-only, immutable evidence ledger for traceable interpretations. */
export class EvidenceLedger {
  constructor(entries = []) { this.entries = Object.freeze(entries.map(Object.freeze)); Object.freeze(this); }
  add(entry) {
    if (!entry || typeof entry !== 'object') throw new TypeError('Evidence entry must be an object');
    for (const field of ['predictionId', 'ruleId']) if (!entry[field]) throw new TypeError(`Evidence entry requires ${field}`);
    return new EvidenceLedger([...this.entries, { ...entry, timestamp: entry.timestamp ?? null }]);
  }
  addMany(entries) { return entries.reduce((ledger, entry) => ledger.add(entry), this); }
  forPrediction(predictionId) { return Object.freeze(this.entries.filter(x => x.predictionId === predictionId)); }
  toJSON() { return this.entries.map(x => ({ ...x })); }
}
