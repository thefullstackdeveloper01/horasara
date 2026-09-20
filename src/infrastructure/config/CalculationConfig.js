import { ConfigurationError } from '../../application/errors/JyotishError.js';
import { deepFreeze } from '../../core/runtime/deepFreeze.js';

export const DEFAULT_CALCULATION_CONFIG = Object.freeze({
  schemaVersion: 3,
  ayanamsaMode: 'lahiri', houseSystem: 'whole', nodeMode: 'true', topocentric: false,
  cache: Object.freeze({ enabled: false, maxEntries: 100, ttlMs: 0 }),
  modules: Object.freeze({ enabled: true, failFast: false, enabledIds: null, timeoutMs: 0, options: Object.freeze({}) }),
  execution: Object.freeze({ timeoutMs: 0, worker: Object.freeze({ enabled: false }) }),
  diagnostics: Object.freeze({ includeTimings: true, explainability: 'NORMAL' }),
  quality: Object.freeze({ strict: false, requireManifest: true, rejectUnsupported: true }),
  deterministic: true,
});

export function mergeCalculationConfig(overrides = {}) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new ConfigurationError('Calculation config must be an object');
  const cfg = {
    ...DEFAULT_CALCULATION_CONFIG, ...overrides,
    cache: { ...DEFAULT_CALCULATION_CONFIG.cache, ...(overrides.cache || {}) },
    modules: { ...DEFAULT_CALCULATION_CONFIG.modules, ...(overrides.modules || {}) },
    execution: { ...DEFAULT_CALCULATION_CONFIG.execution, ...(overrides.execution || {}) },
    diagnostics: { ...DEFAULT_CALCULATION_CONFIG.diagnostics, ...(overrides.diagnostics || {}) },
    quality: { ...DEFAULT_CALCULATION_CONFIG.quality, ...(overrides.quality || {}) },
  };
  cfg.execution.worker = { ...DEFAULT_CALCULATION_CONFIG.execution.worker, ...(overrides.execution?.worker || {}) };
  if (![1, 2, 3].includes(cfg.schemaVersion)) throw new ConfigurationError(`Unsupported calculation config schemaVersion: ${cfg.schemaVersion}`);
  if (!['true', 'mean'].includes(cfg.nodeMode)) throw new ConfigurationError('nodeMode must be "true" or "mean"');
  if (!['NORMAL', 'DETAILED', 'AUDIT', 'DEVELOPER'].includes(cfg.diagnostics.explainability)) throw new ConfigurationError('diagnostics.explainability is invalid');
  for (const [name, value] of [['execution.timeoutMs', cfg.execution.timeoutMs], ['modules.timeoutMs', cfg.modules.timeoutMs], ['cache.maxEntries', cfg.cache.maxEntries], ['cache.ttlMs', cfg.cache.ttlMs]]) {
    if (!Number.isFinite(value) || value < 0) throw new ConfigurationError(`${name} must be >= 0`);
  }
  if (!Number.isInteger(cfg.cache.maxEntries) || cfg.cache.maxEntries < 1) throw new ConfigurationError('cache.maxEntries must be a positive integer');
  if (typeof cfg.deterministic !== 'boolean') throw new ConfigurationError('deterministic must be boolean');
  if (typeof cfg.execution.worker.enabled !== 'boolean') throw new ConfigurationError('execution.worker.enabled must be boolean');
  if (typeof cfg.quality.strict !== 'boolean' || typeof cfg.quality.requireManifest !== 'boolean' || typeof cfg.quality.rejectUnsupported !== 'boolean') throw new ConfigurationError('quality flags must be boolean');
  return deepFreeze(cfg);
}
