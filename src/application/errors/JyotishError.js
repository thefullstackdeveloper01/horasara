const ERROR_CODES = Object.freeze({
  INPUT_INVALID: 'INPUT_INVALID', TIME_INVALID: 'TIME_INVALID', LOCATION_INVALID: 'LOCATION_INVALID',
  EPHEMERIS_ERROR: 'EPHEMERIS_ERROR', DATASET_ERROR: 'DATASET_ERROR', CALCULATION_ERROR: 'CALCULATION_ERROR',
  MODULE_ERROR: 'MODULE_ERROR', DEPENDENCY_ERROR: 'MODULE_DEPENDENCY_ERROR', CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR', CANCELLED: 'CANCELLED', UNSUPPORTED: 'UNSUPPORTED', NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
});

export class JyotishError extends Error {
  constructor(message, { code = 'JYOTISH_ERROR', cause, details = {}, module, field, severity = 'ERROR', recoverable = false } = {}) {
    super(message, { cause }); this.name = new.target.name; this.code = code;
    this.module = module ?? details.module ?? null; this.field = field ?? details.field ?? null;
    this.severity = severity; this.recoverable = Boolean(recoverable); this.details = Object.freeze({ ...details });
  }
  toJSON() { return { name: this.name, code: this.code, message: this.message, module: this.module, field: this.field, severity: this.severity, recoverable: this.recoverable, details: this.details }; }
}
export class ValidationError extends JyotishError { constructor(message, options = {}) { super(message, { ...options, code: options.code || ERROR_CODES.VALIDATION_FAILED }); } }
export class ConfigurationError extends JyotishError { constructor(message, options = {}) { super(message, { ...options, code: ERROR_CODES.CONFIGURATION_ERROR }); } }
export class ModuleError extends JyotishError { constructor(message, options = {}) { super(message, { ...options, code: ERROR_CODES.MODULE_ERROR }); } }
export class DependencyError extends JyotishError { constructor(message, options = {}) { super(message, { ...options, code: ERROR_CODES.DEPENDENCY_ERROR }); } }
export class TimeoutError extends JyotishError { constructor(message, options = {}) { super(message, { ...options, code: ERROR_CODES.TIMEOUT }); } }
export class CancellationError extends JyotishError { constructor(message, options = {}) { super(message, { ...options, code: ERROR_CODES.CANCELLED }); } }
export class DatasetError extends JyotishError { constructor(message, options = {}) { super(message, { ...options, code: ERROR_CODES.DATASET_ERROR }); } }
export { ERROR_CODES };
