/** Normalize supported high-resolution timing values to a finite millisecond number. */
export function normalizeElapsedMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'bigint') return Number(value) / 1e6;
  if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'bigint' && typeof value[1] === 'number') {
    return Number(value[0]) * 1e3 + value[1] / 1e6;
  }
  if (Array.isArray(value) && value.length >= 2 && value.every(Number.isFinite)) {
    return Math.max(0, value[0] * 1e3 + value[1] / 1e6);
  }
  if (value && typeof value === 'object') {
    for (const key of ['elapsedMs', 'milliseconds', 'ms']) {
      if (typeof value[key] === 'number' && Number.isFinite(value[key])) return Math.max(0, value[key]);
    }
    if (typeof value.startNs === 'bigint' && typeof value.endNs === 'bigint') return Number(value.endNs - value.startNs) / 1e6;
  }
  return 0;
}
