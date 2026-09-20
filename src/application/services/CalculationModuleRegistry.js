import { assertCalculationModule } from '../contracts/CalculationModuleContract.js';
import { DependencyError, ModuleError, TimeoutError, CancellationError } from '../errors/JyotishError.js';

const raceWithTimeout = async (promiseFactory, timeoutMs, signal, moduleId) => {
  if (signal?.aborted) throw new CancellationError(`Calculation cancelled before module ${moduleId}`);
  let timer; let onAbort;
  const cancellation = new Promise((_, reject) => {
    onAbort = () => reject(new CancellationError(`Calculation cancelled in module ${moduleId}`));
    signal?.addEventListener('abort', onAbort, { once: true });
  });
  const timeout = timeoutMs > 0 ? new Promise((_, reject) => { timer = setTimeout(() => reject(new TimeoutError(`Module ${moduleId} exceeded ${timeoutMs}ms`)), timeoutMs); }) : null;
  try { return await Promise.race([promiseFactory(), cancellation, ...(timeout ? [timeout] : [])]); }
  finally { if (timer) clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
};

export class CalculationModuleRegistry {
  constructor(modules = []) { this.modules = new Map(); for (const module of modules) this.register(module); }
  register(module) { assertCalculationModule(module); if (this.modules.has(module.id)) throw new Error(`Calculation module already registered: ${module.id}`); this.modules.set(module.id, module); return this; }
  unregister(id) { this.modules.delete(id); return this; }
  get(id) { return this.modules.get(id); }
  list() { return Object.freeze([...this.modules.keys()]); }

  resolveLevels(ids = [...this.modules.keys()]) {
    const selected = new Set(ids); const visiting = new Set(); const visited = new Set(); const depth = new Map();
    const visit = id => {
      if (!selected.has(id)) return 0;
      if (visiting.has(id)) throw new DependencyError(`Circular module dependency involving ${id}`);
      if (visited.has(id)) return depth.get(id);
      const module = this.modules.get(id); if (!module) throw new DependencyError(`Missing module dependency: ${id}`);
      visiting.add(id);
      let d = 0;
      for (const dep of module.dependencies || []) { if (!this.modules.has(dep)) throw new DependencyError(`Module ${id} requires missing dependency ${dep}`); selected.add(dep); d = Math.max(d, visit(dep) + 1); }
      visiting.delete(id); visited.add(id); depth.set(id, d); return d;
    };
    for (const id of [...selected]) visit(id);
    const levels = [];
    for (const [id, d] of depth) (levels[d] ||= []).push(id);
    return levels.map(level => Object.freeze(level));
  }

  resolveOrder(ids = [...this.modules.keys()]) { return this.resolveLevels(ids).flat(); }

  async executeAll(context, { failFast = false, enabled = undefined, timeoutMs = 0, signal, telemetry, moduleOptions = {} } = {}) {
    const results = {}; const diagnostics = []; const failed = new Set();
    const levels = this.resolveLevels(enabled ? enabled : undefined);
    for (const level of levels) {
      if (signal?.aborted) throw new CancellationError('Calculation cancelled');
      const batch = await Promise.all(level.map(async id => {
        const module = this.modules.get(id);
        const failedDependency = (module.dependencies || []).find(dep => failed.has(dep));
        if (failedDependency) {
          const diagnostic = { module: id, status: 'SKIPPED', code: 'DEPENDENCY_FAILED', message: `Skipped because dependency ${failedDependency} failed` };
          diagnostics.push(diagnostic); failed.add(id); return;
        }
        const span = telemetry?.startSpan?.(`module:${id}`, { module: id, version: module.version || '1.0.0' });
        try {
          const value = await raceWithTimeout(
            () => module.execute({ ...context, results: Object.freeze({ ...results }) }, { signal, options: moduleOptions[id] || {} }),
            timeoutMs || module.timeoutMs || 0, signal, id
          );
          return { id, value, span };
        } catch (error) {
          const wrapped = error instanceof TimeoutError || error instanceof CancellationError || error instanceof ModuleError
            ? error : new ModuleError(`Module ${id} failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error, details: { module: id } });
          diagnostics.push({ module: id, status: 'ERROR', code: wrapped.code, message: wrapped.message });
          failed.add(id); span?.end?.({ status: 'ERROR', code: wrapped.code });
          if (failFast || wrapped instanceof CancellationError) throw wrapped;
          return undefined;
        }
      }));
      for (const item of batch) if (item) { results[item.id] = item.value; item.span?.end?.({ status: 'OK' }); }
    }
    return { results, diagnostics };
  }
}
