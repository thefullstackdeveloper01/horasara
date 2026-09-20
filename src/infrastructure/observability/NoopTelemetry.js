export class NoopTelemetry {
  startSpan(name, attributes = {}) { const started = Date.now(); return { end: (extra = {}) => ({ name, durationMs: Date.now() - started, attributes: { ...attributes, ...extra } }) }; }
  record(event, attributes = {}) { return { event, attributes, timestamp: new Date().toISOString() }; }
}
