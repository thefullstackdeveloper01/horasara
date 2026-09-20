import { ConfigurationError } from '../errors/JyotishError.js';

export function assertCalculationModule(module) {
  if (!module || typeof module !== 'object') throw new ConfigurationError('Calculation module must be an object');
  if (!module.id || !/^[a-zA-Z0-9._-]+$/.test(module.id)) throw new ConfigurationError('Calculation module id is required and must be safe');
  if (typeof module.execute !== 'function') throw new ConfigurationError(`Module ${module.id} must implement execute(context, options)`);
  if (module.dependencies && (!Array.isArray(module.dependencies) || module.dependencies.some(x => typeof x !== 'string'))) {
    throw new ConfigurationError(`Module ${module.id} dependencies must be string[]`);
  }
  return module;
}
