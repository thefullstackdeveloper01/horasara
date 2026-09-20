/** Normalize an angle into [0, 360). */
export function normalizeDegrees(value) {
  if (!Number.isFinite(value)) throw new TypeError('Angle must be finite');
  const result = value % 360;
  return result < 0 ? result + 360 : result;
}
