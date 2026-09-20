/**
 * Competitive Evidence Engine.
 *
 * It reconciles independent evidence streams without turning a heuristic
 * evidence score into a claim of real-world predictive accuracy. Every item
 * has a source system, direction, strength, and provenance. Conflicts remain
 * visible instead of being silently averaged away.
 */
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(n) || 0));

export function reconcileEvidence(streams = []) {
  const items = streams.flatMap(stream => (stream?.items || []).map(item => ({
    ...item,
    system: stream.system || item.system || 'UNKNOWN',
    provenance: item.provenance || stream.provenance || null,
    strength: clamp(item.strength ?? item.score ?? 50),
    direction: item.direction || 'NEUTRAL',
  })));
  const supporting = items.filter(i => i.direction === 'SUPPORT');
  const opposing = items.filter(i => i.direction === 'OPPOSE');
  const systems = [...new Set(items.map(i => i.system))];
  const support = supporting.reduce((s, i) => s + i.strength, 0);
  const oppose = opposing.reduce((s, i) => s + i.strength, 0);
  const net = clamp(50 + (support - oppose) / Math.max(1, items.length));
  return Object.freeze({
    status: items.length ? 'RECONCILED' : 'NO_EVIDENCE',
    systems,
    itemCount: items.length,
    supportingCount: supporting.length,
    opposingCount: opposing.length,
    netEvidenceScore: Number(net.toFixed(3)),
    conflict: supporting.length > 0 && opposing.length > 0,
    items,
    methodology: 'Deterministic evidence reconciliation; score is not probability or empirical accuracy.',
  });
}
