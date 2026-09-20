/**
 * ProductionReadinessGate v8
 * Fails closed: a release cannot call itself Production Final while any
 * master requirement is PARTIAL/FAIL or an accuracy claim is unsupported.
 */
import registry from '../../../dataset/used/core/production-capability-registry.json' with { type: 'json' };

export class ProductionReadinessGate {
  constructor(data = registry) { this.data = data; }

  evaluate({ empiricalDatasetAvailable = false, accuracyClaim = false } = {}) {
    const requirements = this.data.requirements;
    const partial = requirements.filter(r => r.currentStatus === 'PARTIAL');
    const failed = requirements.filter(r => r.currentStatus === 'FAIL');
    const accuracyBlocked = accuracyClaim && !empiricalDatasetAvailable;
    const blockers = [
      ...failed.map(r => ({ id:r.id, name:r.name, code:'REQUIREMENT_FAIL' })),
      ...partial.map(r => ({ id:r.id, name:r.name, code:'REQUIREMENT_PARTIAL' })),
      ...(accuracyBlocked ? [{ code:'UNSUPPORTED_ACCURACY_CLAIM' }] : [])
    ];
    return Object.freeze({
      ready: blockers.length === 0,
      releaseStatus: blockers.length === 0 ? 'PRODUCTION_FINAL' : 'NOT_PRODUCTION_FINAL',
      total: requirements.length,
      pass: requirements.length - partial.length - failed.length,
      partial: partial.length,
      fail: failed.length,
      empiricalDatasetAvailable,
      accuracyClaimAllowed: empiricalDatasetAvailable,
      blockers
    });
  }

  assertProductionFinal(options = {}) {
    const result = this.evaluate(options);
    if (!result.ready) {
      const error = new Error(`Production Final gate failed: ${result.blockers.length} blocker(s).`);
      error.details = result;
      throw error;
    }
    return result;
  }
}
