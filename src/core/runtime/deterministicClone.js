/** Clone JSON-compatible calculation data while preserving bigint as strings. */
export function deterministicClone(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(deterministicClone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, deterministicClone(value[key])]));
  return value;
}
