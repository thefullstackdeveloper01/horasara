import { ValidationError } from '../errors/JyotishError.js';

/** Pre-render quality checks. It fails closed for requested unavailable sections. */
export class ReportQualityGate {
  validate({ result, requestedFeatures = [], capabilityRegistry } = {}) {
    if (!result) throw new ValidationError('Report quality gate requires a calculation result');
    const errors = [];
    if (capabilityRegistry) for (const id of requestedFeatures) {
      const capability = capabilityRegistry.get(id);
      if (capability.calculation === 'UNAVAILABLE' || ['UNSUPPORTED', 'NOT_IMPLEMENTED'].includes(capability.status)) errors.push({ id, code: 'FEATURE_UNAVAILABLE' });
    }
    if (result.metadata?.manifest == null) errors.push({ code: 'MANIFEST_MISSING' });
    if (errors.length) throw new ValidationError('Report quality gate failed', { details: { errors } });
    return Object.freeze({ ok: true, checkedFeatures: [...requestedFeatures] });
  }
}
