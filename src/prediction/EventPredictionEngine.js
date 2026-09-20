/**
 * Deterministic event-prediction kernel.
 *
 * This module deliberately does NOT convert heuristic evidence into empirical
 * probability. It builds a reproducible chain:
 * promise -> activation -> astronomical trigger -> confirmation -> conflict
 * -> timing -> uncertainty. A probability is only permitted when calibrated
 * outcome data is supplied by the caller.
 */

const PLANET_WEIGHTS = Object.freeze({
  Sun: 1, Moon: 0.9, Mars: 1, Mercury: 0.9, Jupiter: 1.25,
  Venus: 1.15, Saturn: 1.2, Rahu: 1.0, Ketu: 1.0,
});

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(x) || 0));

function finite(x) { return Number.isFinite(Number(x)); }

function normalizeEvidence(value) {
  return clamp(value);
}

function dashaActivation(period, supportingDasha = []) {
  if (!period) return { score: 0, status: 'NONE', lord: null };
  const lord = period.mahadasha || period.lord || null;
  const supported = lord && supportingDasha.includes(lord);
  return { score: supported ? 100 : 35, status: supported ? 'SUPPORTED' : 'NEUTRAL', lord };
}

function triggerScore(window = {}) {
  const exact = Array.isArray(window.exactTriggers) ? window.exactTriggers.length : 0;
  const triggers = Array.isArray(window.triggers) ? window.triggers : [];
  const activePlanets = triggers.filter(x => finite(PLANET_WEIGHTS[x.planet])).reduce((s, x) => s + PLANET_WEIGHTS[x.planet], 0);
  return clamp(30 + Math.min(35, exact * 12) + Math.min(25, activePlanets * 4) + (window.dashaSupport ? 10 : 0));
}

function uncertaintyScore({ birthTimeConfidence, highSensitivity = false } = {}) {
  const raw = String(birthTimeConfidence ?? '').toLowerCase();
  if (highSensitivity) return 55;
  if (/exact|certificate|record/.test(raw)) return 15;
  if (/approx|memory|estimated/.test(raw)) return 45;
  return 65;
}

function finalEvidence({ promise, activation, trigger, contradictionPenalty, uncertaintyPenalty }) {
  const raw = promise * 0.35 + activation * 0.2 + trigger * 0.35 + (100 - contradictionPenalty) * 0.1 - uncertaintyPenalty;
  return Math.round(clamp(raw));
}

export function buildEventPrediction({
  event,
  ruleMatches = [],
  windows = [],
  dashaTimeline = [],
  currentJD = NaN,
  supportingDasha = [],
  birthTimeConfidence = 'NOT_AVAILABLE',
  highSensitivity = false,
  method = 'PARASHARI',
} = {}) {
  const now = Number(currentJD);
  const matched = ruleMatches.filter(Boolean);
  const promise = matched.length
    ? clamp(matched.reduce((s, r) => s + normalizeEvidence(r.evidence?.classicalRuleScore ?? r.confidence ?? 50), 0) / matched.length)
    : 0;
  const nextWindow = windows
    .filter(w => finite(w.startJD) && (!finite(now) || w.endJD >= now))
    .sort((a, b) => (b.evidenceScore || 0) - (a.evidenceScore || 0) || a.startJD - b.startJD)[0] || null;
  const period = dashaTimeline.find(p => finite(now) && p.startJD <= now && now < p.endJD)
    || dashaTimeline.find(p => finite(now) && p.startJD > now) || null;
  const activation = dashaActivation(period, supportingDasha);
  const trigger = triggerScore(nextWindow || {});
  const contradictionPenalty = Math.min(60, matched.filter(r => r.evidence?.contradiction || r.evidence?.status === 'CONTRADICTED').length * 20);
  const uncertaintyPenalty = uncertaintyScore({ birthTimeConfidence, highSensitivity }) * 0.15;
  const evidence = finalEvidence({ promise, activation: activation.score, trigger, contradictionPenalty, uncertaintyPenalty });

  const status = !matched.length ? 'NO_PROMISE'
    : !nextWindow ? 'PROMISE_WITHOUT_TIMING'
    : evidence >= 75 ? 'STRONG_TIMED_INDICATION'
    : evidence >= 55 ? 'MODERATE_TIMED_INDICATION'
    : 'WEAK_OR_CONFLICTED_INDICATION';

  return Object.freeze({
    version: 2,
    event: event || 'general',
    methodology: method,
    status,
    evidenceScore: evidence,
    probability: null,
    probabilityStatus: 'NOT_CALIBRATED',
    components: {
      promiseScore: Math.round(promise),
      dashaActivationScore: Math.round(activation.score),
      transitTriggerScore: Math.round(trigger),
      contradictionPenalty,
      uncertaintyPenalty: Number(uncertaintyPenalty.toFixed(2)),
    },
    timing: nextWindow ? {
      start: nextWindow.start,
      end: nextWindow.end,
      startJD: nextWindow.startJD,
      endJD: nextWindow.endJD,
      durationDays: nextWindow.durationDays,
      activationType: nextWindow.activationType,
      exactTriggers: nextWindow.exactTriggers || [],
    } : null,
    activeDasha: activation.lord,
    uncertainty: {
      birthTimeConfidence: birthTimeConfidence || 'NOT_AVAILABLE',
      highSensitivity,
      warning: highSensitivity ? 'High-sensitivity factor detected; small birth-time changes may materially change this result.' : null,
    },
    explanation: [
      matched.length ? `${matched.length} deterministic event rule(s) support the event.` : 'No configured event rule matched the supplied chart.',
      period ? `Current/next Dasha: ${activation.lord || 'unknown'} (${activation.status.toLowerCase()}).` : 'No Dasha period was available for timing.',
      nextWindow ? `Astronomical trigger window: ${nextWindow.start} to ${nextWindow.end}.` : 'No astronomical trigger window was found in the requested horizon.',
      contradictionPenalty ? `Contradictory evidence reduced the result by ${contradictionPenalty} points.` : 'No explicit contradiction was recorded by the supplied rules.',
      'Evidence score is not an empirical probability.',
    ],
  });
}

export function calibrateEventProbability(prediction, calibration = {}) {
  if (!prediction || !Array.isArray(calibration.observations) || calibration.observations.length < 30) {
    return Object.freeze({ ...prediction, probability: null, probabilityStatus: 'NOT_CALIBRATED' });
  }
  const observations = calibration.observations.filter(o => finite(o.score) && (o.outcome === 0 || o.outcome === 1));
  if (observations.length < 30) return Object.freeze({ ...prediction, probability: null, probabilityStatus: 'NOT_CALIBRATED' });
  // Monotonic empirical calibration using score-bin observed frequency.
  const score = clamp(prediction.evidenceScore);
  const sameBin = observations.filter(o => Math.abs(Number(o.score) - score) < 10);
  if (sameBin.length < 10) return Object.freeze({ ...prediction, probability: null, probabilityStatus: 'INSUFFICIENT_LOCAL_DATA' });
  const p = sameBin.reduce((s, o) => s + Number(o.outcome), 0) / sameBin.length;
  return Object.freeze({ ...prediction, probability: Number(p.toFixed(4)), probabilityStatus: 'EMPIRICALLY_CALIBRATED', calibrationSample: sameBin.length });
}
