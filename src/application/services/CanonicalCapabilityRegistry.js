/** Canonical capability truth source. Dataset status is authoritative. */
import registry from '../../../dataset/used/core/production-capability-registry.json' with { type: 'json' };

const allowed = new Set(['PASS', 'PARTIAL', 'FAIL']);
const requirements = Object.freeze((registry.requirements || []).map(r => Object.freeze({
  id: Number(r.id), name: String(r.name), status: allowed.has(r.currentStatus) ? r.currentStatus : 'FAIL',
  sourceStatus: r.sourceStatus || '', gap: r.gap || '', requiredCorrection: r.requiredCorrection || '',
})));

export function getCanonicalCapabilityRegistry() { return requirements; }
export function getCapability(idOrName) {
  return requirements.find(r => r.id === Number(idOrName) || r.name.toLowerCase() === String(idOrName).toLowerCase()) || null;
}
export function capabilitySummary() {
  return requirements.reduce((a, r) => { a[r.status] += 1; return a; }, { PASS: 0, PARTIAL: 0, FAIL: 0 });
}
export function assertNoUnknownStatuses() {
  if (requirements.length !== 100) throw new Error(`Expected 100 production capability requirements, found ${requirements.length}`);
  return true;
}
