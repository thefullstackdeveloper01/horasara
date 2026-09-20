/** Assert a numeric value is inside an inclusive interval. */
export function assertRange(value, min, max, label = 'value') {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${label} must be in [${min}, ${max}]`);
  return value;
}
