/**
 * Universal, deterministic prediction orchestrator.
 * It never invents a planetary cause or remedy: every statement must be backed
 * by supplied calculation/rule evidence or a dataset record.
 */
import { buildUnifiedPrediction } from './UnifiedPredictionPipeline.js';

const asArray = v => Array.isArray(v) ? v : v == null ? [] : [v];

function factorFromPlanet(p = {}, context = {}) {
  const planet = p.planet || p.name || 'Planet';
  const sign = p.signName || p.sign || null;
  const house = p.house ?? null;
  const longitude = Number.isFinite(Number(p.longitude)) ? Number(p.longitude) : null;
  const rule = context.rules?.find(r => r.planet === planet && (r.house == null || r.house === house)) || null;
  return {
    planet, sign, house, longitude,
    supported: rule ? rule.supported !== false : false,
    cause: rule?.cause || null,
    effect: rule?.effect || null,
    solution: rule?.solution || null,
    ruleId: rule?.id || null,
    explanation: rule?.explanation || null,
  };
}

export function buildUniversalPrediction(input = {}) {
  const planets = asArray(input.planets || input.chart?.planets);
  const factors = planets.map(p => factorFromPlanet(p, input));
  const ruleMatches = asArray(input.ruleMatches).map(r => ({
    ...r,
    explanation: r.explanation || (r.planet ? factorFromPlanet(r, input) : undefined),
  }));
  const base = buildUnifiedPrediction({
    ...input,
    factors: factors.length ? factors : (input.factors || ruleMatches),
    ruleMatches,
  });
  const supported = factors.filter(f => f.supported);
  const causes = supported.filter(f => f.cause).map(f => `${f.planet}: ${f.cause}`);
  const effects = supported.filter(f => f.effect).map(f => `${f.planet}: ${f.effect}`);
  const solutions = supported.filter(f => f.solution).map(f => `${f.planet}: ${f.solution}`);
  return Object.freeze({
    ...base,
    userView: Object.freeze({
      whatIsHappening: base.status,
      why: causes.length ? causes : ['No dataset-backed causal statement is available.'],
      likelyEffects: effects.length ? effects : ['No dataset-backed effect statement is available.'],
      whatToDo: solutions.length ? solutions : ['No dataset-backed remedy/action is available.'],
      timing: base.timing,
      evidenceScore: base.evidenceScore,
      probability: base.probability,
      probabilityStatus: base.probabilityStatus,
    }),
    evidenceFactors: factors,
  });
}
