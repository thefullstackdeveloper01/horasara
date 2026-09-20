/** Return the smallest absolute angular distance in degrees. */
export function angularDistance(a, b) {
  const delta = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(delta, 360 - delta);
}
