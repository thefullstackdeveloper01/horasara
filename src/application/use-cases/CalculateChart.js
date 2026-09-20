import { BirthData } from '../../domain/models/BirthData.js';
import { CalculationResult } from '../../domain/models/CalculationResult.js';
import { TimeoutError, CancellationError } from '../errors/JyotishError.js';
import { CalculationManifest } from '../../domain/value-objects/CalculationManifest.js';
import { CalculationContext } from '../context/CalculationContext.js';

const withTimeout = async (factory, timeoutMs, signal) => {
  if (signal?.aborted) throw new CancellationError('Calculation cancelled');
  let timer;
  let onAbort;
  const cancellation = new Promise((_, reject) => { onAbort = () => reject(new CancellationError('Calculation cancelled')); signal?.addEventListener('abort', onAbort, { once: true }); });
  const timeout = timeoutMs > 0 ? new Promise((_, reject) => { timer = setTimeout(() => reject(new TimeoutError(`Calculation exceeded ${timeoutMs}ms`)), timeoutMs); }) : null;
  try { return await Promise.race([factory(), cancellation, ...(timeout ? [timeout] : [])]); }
  finally { if (timer) clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
};

export class CalculateChart {
  constructor({ calculator, moduleRegistry, validator, telemetry, config, clock = () => Date.now() }) {
    if (!calculator?.calculate) throw new TypeError('CalculateChart requires calculator.calculate()');
    this.calculator = calculator; this.moduleRegistry = moduleRegistry; this.validator = validator; this.telemetry = telemetry; this.config = config; this.clock = clock;
  }
  async execute(input, options = {}) {
    const birth = input instanceof BirthData ? input : new BirthData(input);
    this.validator?.validate(birth);
    const signal = options.signal;
    const started = this.clock();
    const span = this.telemetry?.startSpan?.('calculate-chart');
    const data = await withTimeout(() => this.calculator.calculate(birth, options), this.config?.execution?.timeoutMs || 0, signal);
    let diagnostics = [];
    let modules = {};
    const context = new CalculationContext({ birth, chart: data, config: this.config, metadata: { startedAt: started } });
    if (this.moduleRegistry && this.config?.modules?.enabled !== false) {
      const output = await this.moduleRegistry.executeAll(context, {
        failFast: options.failFast ?? this.config.modules.failFast,
        enabled: options.enabledModules ?? this.config.modules.enabledIds ?? undefined,
        timeoutMs: options.moduleTimeoutMs ?? this.config.modules.timeoutMs,
        signal,
        telemetry: this.telemetry,
        moduleOptions: options.moduleOptions ?? this.config.modules.options,
      });
      modules = output.results; diagnostics = output.diagnostics;
    }
    if (Object.keys(modules).length) data.modules = modules;
    const elapsedMs = this.clock() - started;
    span?.end?.({ status: diagnostics.length ? 'DEGRADED' : 'OK', elapsedMs });
    const manifest = new CalculationManifest({
      engineVersion: '5.2.0', schemaVersion: 1, config: this.config, input: birth,
      featureSet: options.enabledFeatures || [],
      ephemeris: data?.meta?.ephemeris || null,
    });
    return new CalculationResult({ data, diagnostics, metadata: { elapsedMs, schemaVersion: 2, manifest, explainability: this.config.diagnostics.explainability, deterministic: this.config.deterministic } });
  }
}
