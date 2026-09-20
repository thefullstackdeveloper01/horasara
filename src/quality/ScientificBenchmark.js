/**
 * Scientific/numerical benchmark helpers.
 *
 * This layer measures what can be measured in code:
 * - golden-reference numerical error,
 * - boundary sensitivity,
 * - deterministic reproducibility,
 * - calculation provenance.
 *
 * It deliberately does not convert these metrics into claims about the
 * predictive efficacy of astrology.
 */
import crypto from 'node:crypto';

const hash = x => crypto.createHash('sha256').update(String(x)).digest('hex');

export function angularErrorDeg(actual, expected) {
  const a = ((Number(actual) % 360) + 360) % 360;
  const e = ((Number(expected) % 360) + 360) % 360;
  const d = Math.abs(a - e);
  return Math.min(d, 360 - d);
}

export function benchmarkGoldenPositions(actualRows = [], referenceRows = [], {
  bodies = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'],
  toleranceDeg = 0.1,
} = {}) {
  const byId = new Map(referenceRows.map(r => [String(r.id ?? r.jd), r]));
  const errors = [];
  for (const actual of actualRows) {
    const ref = byId.get(String(actual.id ?? actual.jd));
    if (!ref) continue;
    for (const body of bodies) {
      const a = actual.positions?.[body]?.longitude;
      const e = ref.positions?.[body]?.longitude;
      if (!Number.isFinite(a) || !Number.isFinite(e)) continue;
      errors.push({ id: actual.id ?? actual.jd, body, errorDeg: angularErrorDeg(a,e) });
    }
  }
  const max = errors.length ? Math.max(...errors.map(x=>x.errorDeg)) : null;
  const mean = errors.length ? errors.reduce((s,x)=>s+x.errorDeg,0)/errors.length : null;
  return {
    status: errors.length && max <= toleranceDeg ? 'PASS' : 'FAIL',
    checked: errors.length,
    toleranceDeg,
    maxErrorDeg: max,
    meanErrorDeg: mean,
    worst: errors.slice().sort((a,b)=>b.errorDeg-a.errorDeg).slice(0,10),
  };
}

export function boundarySensitivity(longitude, boundaries = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330], thresholdDeg = 0.01) {
  const x = ((Number(longitude)%360)+360)%360;
  const distances = boundaries.map(b => {
    const d = Math.abs(x-b);
    return Math.min(d,360-d);
  });
  const minDistanceDeg = Math.min(...distances);
  return {
    nearBoundary: minDistanceDeg <= thresholdDeg,
    minDistanceDeg,
    thresholdDeg,
  };
}

export function buildCalculationProvenance({
  algorithmVersion,
  providerId,
  providerVersion,
  input,
  reference = null,
  datasetFingerprints = {},
  variant = null,
} = {}) {
  const canonical = JSON.stringify({algorithmVersion,providerId,providerVersion,input,reference,datasetFingerprints,variant});
  return Object.freeze({
    algorithmVersion: String(algorithmVersion || 'unknown'),
    provider: { id: providerId || 'unknown', version: providerVersion || 'unknown' },
    variant: variant || 'unspecified',
    inputFingerprint: hash(JSON.stringify(input ?? null)),
    datasetFingerprints: {...datasetFingerprints},
    referenceFingerprint: reference ? hash(JSON.stringify(reference)) : null,
    reproducibilityFingerprint: hash(canonical),
  });
}
