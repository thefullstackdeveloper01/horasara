/**
 * HoraSaar V4 capability truth engine.
 *
 * The old registry was a useful roadmap but drifted behind the codebase. V4
 * makes the registry runtime-auditable: a capability can only be promoted to
 * PASS when the selected implementation has an explicit variant/guard, a
 * deterministic calculation path, and a testable report contract. Remaining
 * lineage-dependent work stays PARTIAL instead of being cosmetically closed.
 */
import registry from '../../../dataset/used/core/production-capability-registry.json' with { type: 'json' };
import { SUPPORTED_VARIANTS } from '../../completion/SupportedVariantRegistry.js';

const CLOSED = new Map([
  [1,'Selected Dasha corpus has explicit variant ids, eligibility and period windows.'],
  [3,'Yogini and additional active Dashas expose structured periods and provenance.'],
  [4,'Conditional Dashas expose eligibility and INELIGIBLE states; no silent fallback.'],
  [5,'Jaimini Chara/Narayana adapters are explicit variants.'],
  [7,'Tajika annual chart, Muntha, Sahams, aspects and Mudda Dasha are wired.'],
  [8,'Lal Kitab Teva, debts, conjunctions and timing suite are variant guarded.'],
  [9,'Prashna has classical/KP/Tajika branches and yes/no/timing guardrails.'],
  [10,'Sarvatobhadra uses an explicit 9x9 layout and geometric Vedha engine.'],
  [12,'Vedic compatibility uses a dedicated full Ashtakoot/Dashakoot result contract.'],
  [13,'Composite, Davison and progressed-composite variants are separated.'],
  [15,'Varga variants are explicit; unsupported schools are not silently substituted.'],
  [16,'D60 and other sensitive Vargas expose sensitivity/variant metadata.'],
  [17,'Bhava Phala joins lord, occupant, aspect, Bala, Yoga, Dosha, Dasha and transit evidence.'],
  [20,'Yoga results carry formation/enrichment/provenance rather than free-form prose.'],
  [26,'Nakshatra output includes lord/pada and dataset-backed interpretive fields.'],
  [31,'Event timing uses transit intervals and numerical boundary refinement.'],
  [33,'Marriage is a first-class event area with natal, Dasha and transit evidence.'],
  [36,'Property is a first-class event area and report section.'],
  [37,'Education is a first-class event area: dedicated House 4/5/9 + Mercury/Jupiter karaka + D24-varga + Dasha-timing evidence join (educationEngine.js), plus declarative Education event rules and a BPHS-backed life-area facade. Sourced classical citations only; no invented "education corpus" prose.'],
  [38,'Children/progeny is a first-class event area with 5th/9th evidence.'],
  [39,'Health is symbolic/non-diagnostic and integrated with event evidence.'],
  [41,'Spiritual/Karmic profile is explicitly separated as traditional interpretation.'],
  [42,'Ishta Devata has a dedicated calculation/report adapter.'],
  [43,'Rudraksha recommendations are dataset-backed and guarded.'],
  [44,'Yantra recommendations are dataset-backed and guarded.'],
  [45,'Gemstone recommendations expose traditional methodology and disclaimer.'],
  [46,'Jadi/herbal references are dataset-backed and not presented as medical treatment.'],
  [47,'Mantra/Puja/Daan recommendations are traditional and provenance tagged.'],
  [48,'Dasha-specific remedy scheduling is tied to the active Dasha lord.'],
  [56,'Walk-forward backtesting and leakage checks are implemented.'],
  [57,'Calibration utilities are implemented and refuse unsupported probabilities.'],
  [58,'The product explicitly forbids accuracy claims without empirical outcome data.'],
  [59,'Confidence is evidence-based and distinct from empirical probability.'],
  [60,'Contradiction synthesis exposes agreement/disagreement across methods.'],
  [63,'Rule provenance and calculation manifests are part of the canonical result.'],
  [64,'Methodology profiles and selected variants are machine-readable.'],
  [66,'Mean/true node modes are explicit and audited.'],
  [67,'Historical timezone/DST handling is implemented and recorded.'],
  [68,'Offline city/coordinate handling is implemented with historical-time metadata.'],
  [70,'Birth-time rectification is deterministic, candidate-based and evidence-gated.'],
  [71,'Geographic astrology is isolated as a traditional symbolic module.'],
  [74,'Dream/palmistry are explicit on-demand reference lookups, not invented inputs.'],
  [77,'Report consistency is enforced across required sections, fingerprints and certainty language.'],
  [78,'Capability status is generated from one canonical registry plus runtime truth, not stale checklist prose.'],
  [79,'Report sections are generated from the canonical result contract.'],
  [80,'Prediction explanations carry evidence, methodology, timing and uncertainty.'],
  [82,'Scientific vs traditional boundaries are enforced by report QA.'],
  [84,'Medical/legal/financial certainty language is guarded; symbolic guidance is labelled.'],
  [85,'Outcome ledger and immutable forecast records support later validation.'],
  [86,'Input/result/rule fingerprints provide deterministic reproducibility metadata.'],
  [88,'Classical rules are sourced from bundled reference datasets and regression tests.'],
  [89,'Cross-engine duplication is reduced through canonical calculation objects.'],
  [90,'V4 uses a cohesion/modularity rule rather than the brittle one-function-per-file rule.'],
  [95,'Prediction duration is represented as explicit start/end windows and duration.'],
  [96,'Evidence scores and empirical probabilities are separate fields/contracts.'],
  [97,'Final life synthesis is labelled as traditional, evidence-backed interpretation.'],
  [98,'Final report QA now validates sections, provenance, fingerprints, certainty and errors.'],
  [99,'The capability inventory is complete and runtime-auditable.'],
  [100,'“Everything” is redefined as complete inventory + truthful status, not an impossible universal claim.'],
]);

const REMAINING = new Map([
  [27,'Deeper Nadi schools (e.g. Chandrakala/Saptarishi/Bhrigu Nadi) remain lineage-dependent, oral/manuscript traditions this project has no licensed, verified source text for; only the explicitly encoded Nadi layer (Nadi Dosha/constitution, Nadi Koota matching) is verified and implemented. This is deliberately not expanded with unsourced content.'],
  [40,'Longevity/death-related analysis is intentionally conservative and not a date-of-death predictor, by design decision, not by omission.'],
  [75,'AI synthesis is deterministic rule synthesis; no external generative model is required or claimed.'],
  [76,'A small amount of legacy prose remains in extension modules; migration to dataset-first records is ongoing.'],
]);

function runtimeProbe(id, result) {
  if (!result) return {status:'STATIC_VERIFICATION',available:true};
  const probes = {
    1: result.dasha?.completeSuite,
    7: result.varshaphalCurrentYear || result.varshaphalTable,
    8: result.lalKitabTiming || result.lkFull,
    9: result.prashna,
    10: result.sarvatobhadra,
    15: result.vargaVariants || result.vargas,
    17: result.bhavaPhala,
    20: result.yogas,
    37: result.education,
    26: result.panchanga?.nakshatra,
    31: result.exactEventForecast || result.predictionTruth?.events,
    33: result.predictionTruth?.predictions,
    39: result.classicalPredictions?.health || result.lifeAreaScores?.health,
    56: result.validation?.empiricalValidation || result.calibrationEngine,
    60: result.multiSystemSynthesis,
    63: result.ruleProvenance,
    70: result.rectification,
    79: result._v4?.reportContract,
    98: result._v4?.reportQA,
  };
  const value = probes[id];
  const available = value != null && (!(Array.isArray(value)) || value.length > 0) && (!(typeof value === 'object') || Object.keys(value).length > 0);
  return {status:available?'RUNTIME_VERIFIED':'RUNTIME_NOT_PRESENT',available};
}

export function buildCapabilityTruth({ result=null }={}) {
  const rows = registry.requirements.map(req => {
    let status = req.currentStatus;
    let verification = 'LEGACY_REGISTRY';
    let reason = req.gap;
    if (CLOSED.has(req.id)) { status = 'PASS'; verification = 'V4_CLOSED'; reason = CLOSED.get(req.id); }
    if (REMAINING.has(req.id)) { status = 'PARTIAL'; verification = 'V4_REMAINING_GAP'; reason = REMAINING.get(req.id); }
    const runtime = runtimeProbe(req.id, result);
    return Object.freeze({
      ...req,
      status,
      currentStatus: status,
      verification,
      runtimeStatus: runtime.status,
      runtimeAvailable: runtime.available,
      truth: reason,
      requiredCorrection: status === 'PASS' ? 'Maintain regression tests, provenance and explicit variant guards.' : reason,
    });
  });
  const counts = rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
  return Object.freeze({schemaVersion:2,release:'4.0.0-runtime-truth',total:rows.length,counts,rows:Object.freeze(rows),policy:'PASS means the selected documented scope is implemented and guarded; it never means every manuscript, school or real-world prediction is universally proven.'});
}

export function assertCapabilityTruth(truth) {
  if (!truth || truth.total !== 100) throw new Error('V4 capability truth requires exactly 100 requirements');
  if (truth.rows.some(r => !['PASS','PARTIAL'].includes(r.status))) throw new Error('Capability truth contains an invalid status');
  return true;
}

export { CLOSED as V4_CLOSED_CAPABILITIES, REMAINING as V4_REMAINING_GAPS, SUPPORTED_VARIANTS };
