import { ValidationError } from '../../application/errors/JyotishError.js';

/** Small dependency-free schema registry for boundary validation. */
export class SchemaRegistry {
  constructor(schemas = {}) { this.schemas = new Map(Object.entries(schemas)); }
  register(name, validator) {
    if (!name || typeof validator !== 'function') throw new TypeError('Schema requires a name and validator function');
    this.schemas.set(name, validator); return this;
  }
  validate(name, value) {
    const validator = this.schemas.get(name);
    if (!validator) throw new ValidationError(`Unknown schema: ${name}`, { details: { schema: name } });
    try { return validator(value); } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(`Schema ${name} validation failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error, details: { schema: name } });
    }
  }
  has(name) { return this.schemas.has(name); }
  list() { return Object.freeze([...this.schemas.keys()]); }
}

export function objectSchema(required = [], optional = []) {
  return value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('value must be an object');
    for (const key of required) if (value[key] === undefined) throw new Error(`missing required field: ${key}`);
    const allowed = new Set([...required, ...optional]);
    for (const key of Object.keys(value)) if (allowed.size && !allowed.has(key)) throw new Error(`unknown field: ${key}`);
    return true;
  };
}
