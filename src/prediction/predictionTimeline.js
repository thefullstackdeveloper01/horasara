/**
 * Calculation-backed prediction timeline.
 * ---------------------------------------
 * This module never invents dates and never converts evidence scores into
 * unsupported probabilities. It only assembles windows already produced by
 * the canonical dasha/transit/exact-event calculators and highlights the
 * factors that actually created each window.
 */
export function buildPredictionTimeline({ predictions = {}, exactEventWindows = [], dashaTimeline = [] } = {}) {
  const rows = [];

  for (const [area, prediction] of Object.entries(predictions || {})) {
    for (const w of prediction?.eventTimings || prediction?.timingWindows || []) {
      if (!w) continue;
      rows.push({
        area,
        start: w.start ?? null,
        end: w.end ?? null,
        startJD: Number.isFinite(w.startJD) ? w.startJD : null,
        endJD: Number.isFinite(w.endJD) ? w.endJD : null,
        evidenceScore: Number.isFinite(w.evidenceScore) ? w.evidenceScore : null,
        confidenceLabel: w.confidenceLabel || 'Unrated',
        trigger: w.trigger || w.activationType || 'Calculation-backed timing window',
        highlightedFactors: [
          w.dasha ? `Dasha: ${w.dasha}` : prediction.currentDasha ? `Current Dasha: ${prediction.currentDasha}` : null,
          w.dashaSupport === true ? 'Dasha support' : null,
          ...(Array.isArray(w.triggers) ? w.triggers.map(t => `${t.planet} transit`) : []),
          w.triggerPlanet ? `${w.triggerPlanet} transit` : null,
        ].filter(Boolean),
        source: 'canonical-prediction-window',
      });
    }
  }

  for (const w of exactEventWindows || []) {
    rows.push({
      area: w.event || w.area || 'event',
      start: w.startDateTime || w.start || null,
      end: w.endDateTime || w.end || null,
      startJD: Number.isFinite(w.startJD) ? w.startJD : null,
      endJD: Number.isFinite(w.endJD) ? w.endJD : null,
      evidenceScore: Number.isFinite(w.evidenceScore) ? w.evidenceScore : null,
      confidenceLabel: w.confidenceLabel || 'Unrated',
      trigger: w.activationType || 'Exact-event calculation',
      highlightedFactors: Array.isArray(w.triggers)
        ? w.triggers.map(t => t.planet ? `${t.planet} exact transit factor` : null).filter(Boolean)
        : [],
      source: 'exact-event-engine',
    });
  }

  rows.sort((a, b) => {
    const ax = Number.isFinite(a.startJD) ? a.startJD : Number.POSITIVE_INFINITY;
    const bx = Number.isFinite(b.startJD) ? b.startJD : Number.POSITIVE_INFINITY;
    return ax - bx;
  });

  return {
    status: rows.length ? 'AVAILABLE' : 'NOT_AVAILABLE',
    rows,
    highlighted: rows.filter(r => (r.evidenceScore ?? 0) >= 70),
    methodology: 'Timeline dates are emitted only from canonical Dasha, transit, house-activation, or exact-degree calculations. No fixed +/-N-day prediction window is introduced here.',
    accuracyNotice: 'Timing precision is bounded by the astronomical provider precision, sampling/root-finding method, birth-time quality, and the named classical rule variant.',
    dashaTimeline: Array.isArray(dashaTimeline) ? dashaTimeline : [],
  };
}
