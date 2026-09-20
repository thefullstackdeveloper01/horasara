import { CalculateChart } from './use-cases/CalculateChart.js';
import { CalculationModuleRegistry } from './services/CalculationModuleRegistry.js';
import { InternalEngineAdapter } from '../infrastructure/calculation/InternalEngineAdapter.js';
import { MemoryCalculationCache } from '../infrastructure/cache/MemoryCalculationCache.js';
import { CachedChartCalculator } from '../infrastructure/calculation/CachedChartCalculator.js';
import { WorkerChartCalculator } from '../infrastructure/calculation/WorkerChartCalculator.js';
import { mergeCalculationConfig } from '../infrastructure/config/CalculationConfig.js';
import { InputValidator } from '../infrastructure/validation/InputValidator.js';
import { NoopTelemetry } from '../infrastructure/observability/NoopTelemetry.js';

/** Production-oriented, framework-neutral application kernel. */
export class JyotishKernel {
  constructor({ calculator, modules = [], cache, config = {}, validator, telemetry } = {}) {
    this.config = mergeCalculationConfig(config);
    this.telemetry = telemetry || new NoopTelemetry();
    this.validator = validator || new InputValidator();
    let activeCalculator = calculator || (this.config.execution.worker.enabled
      ? new WorkerChartCalculator({ timeoutMs: this.config.execution.timeoutMs })
      : new InternalEngineAdapter());
    if (this.config.cache.enabled) {
      const activeCache = cache || new MemoryCalculationCache({ maxEntries: this.config.cache.maxEntries, ttlMs: this.config.cache.ttlMs });
      activeCalculator = new CachedChartCalculator({ calculator: activeCalculator, cache: activeCache });
    }
    this.calculator = activeCalculator;
    this.moduleRegistry = new CalculationModuleRegistry(modules);
    this.calculateChart = new CalculateChart({ calculator: this.calculator, moduleRegistry: this.moduleRegistry, validator: this.validator, telemetry: this.telemetry, config: this.config });
  }
  registerModule(module) { this.moduleRegistry.register(module); return this; }
  unregisterModule(id) { this.moduleRegistry.unregister(id); return this; }
  listModules() { return this.moduleRegistry.list(); }
  async calculate(input, options = {}) { return this.calculateChart.execute(input, options); }
}
