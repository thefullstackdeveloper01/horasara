/** Final platform enrichment boundary. No astronomy is recomputed here. */
import { buildKarmicProfile } from './karmicProfile.js';
import { buildRemedyPlanner } from './remedyPlanner.js';
import { buildBusinessVerdict } from './businessVerdict.js';
import { buildForecastCalendar } from './forecastCalendar.js';
import { buildAyurvedicPrakriti } from './prakritiAdapter.js';
import { buildClassicalCoverage } from './classicalCoverage.js';
import { buildCapabilityTruth } from '../quality/v4/CapabilityTruthEngine.js';

export function enrichCompletePlatform(result, input = {}) {
  const capabilityTruth = result?._v4CapabilityTruth?.total === 100
    ? result._v4CapabilityTruth
    : buildCapabilityTruth({ result });
  return {
    ...result,
    _v4CapabilityTruth: capabilityTruth,
    completion: {
      version: '4.0.0',
      status: 'IMPLEMENTED_WITH_EXPLICIT_VARIANTS',
      // IMPORTANT: the bundled provider is not Swiss Ephemeris. Keep this
      // machine-readable so presentation layers cannot accidentally overclaim.
      astronomy: {
        swissEphemeris: false,
        provider: result?.meta?.ephemerisProvider || result?.ephemerisProvider || 'internal-vsop87-abridged',
        meeusVerification: true,
        trueMeanNode: true,
        historicalTime: true,
        precisionGrade: 'TRUNCATED_INTERNAL_REFERENCE_CALIBRATED',
      },
      classical: buildClassicalCoverage(result),
      karmicProfile: buildKarmicProfile(result),
      remedyPlanner: buildRemedyPlanner(result),
      businessVerdict: buildBusinessVerdict(result),
      forecastCalendar: buildForecastCalendar(result),
      prakriti: buildAyurvedicPrakriti(input, result),
      capabilityTruth: { counts: capabilityTruth.counts, policy: capabilityTruth.policy },
    },
  };
}
