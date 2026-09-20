/** Pure JS append-only outcome ledger for later empirical validation. */
export function validateOutcomeRecord(r = {}) {
  if (!r.event || !Number.isFinite(Number(r.predictionScore)) || ![0,1].includes(Number(r.outcome))) return { valid: false, errors: ['event, numeric predictionScore and binary outcome are required'] };
  return { valid: true, errors: [] };
}
export function appendOutcome(ledger = [], record) {
  const check = validateOutcomeRecord(record);
  if (!check.valid) throw new Error(check.errors.join('; '));
  return Object.freeze([...ledger, Object.freeze({ ...record, outcome: Number(record.outcome), predictionScore: Number(record.predictionScore) })]);
}
export function outcomeSummary(ledger = []) {
  const n = ledger.length;
  const positives = ledger.filter(x => Number(x.outcome) === 1).length;
  return Object.freeze({ n, positives, negatives: n - positives, baseRate: n ? positives / n : null });
}
