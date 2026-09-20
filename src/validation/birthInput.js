// ============================================================
// validateBirthInput — single responsibility: reject physically
// impossible or nonsensical birth-data inputs BEFORE any astronomical
// calculation runs on them.
// ------------------------------------------------------------
// FIX (error-handling audit): previously hour/minute/second bounds were
// checked ONLY in the CLI layer (cli/birth-input.js's validateTime()),
// and latitude/longitude/timezone were never checked anywhere. That meant
// engine.calculateChart() — the actual library entry point — silently
// accepted e.g. hour=25, min=99, or lat=200 and produced a plausible-
// looking but physically meaningless chart with no warning at all.
// Verified directly: lat=200 silently returned "Ascendant: Cancer"
// instead of failing. Any caller that doesn't go through
// cli/birth-input.js (the standalone Panchang tool's interactive prompt,
// a future API wrapper, a test, direct programmatic use) inherited that
// gap. Validating here, once, at the engine's own boundary, is the
// single-source-of-truth fix — the CLI's own validateTime() can stay as
// an earlier, friendlier prompt-time check, but it's no longer the ONLY
// thing standing between bad input and a fabricated-looking chart.
//
// Deliberately conservative: only rejects values that are physically
// impossible (not just unusual), so it never blocks a legitimate but
// extreme edge case (e.g. a birth at 89.9° latitude, or tz=+14 for
// Kiribati) that a stricter-looking check might wrongly reject.
// ============================================================

export function validateBirthInput(birth) {
  const errors = [];
  const { year, month, day, hour, min, sec = 0, lat, lon, tz, timeZone, elevation = 0 } = birth || {};

  const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);

  if (!isFiniteNum(year) || !Number.isInteger(year) || year < -6000 || year > 6000) {
    errors.push(`year: "${year}" is not a plausible calendar year (expected an integer roughly between -6000 and 6000).`);
  }
  if (!isFiniteNum(month) || !Number.isInteger(month) || month < 1 || month > 12) {
    errors.push(`month: "${month}" must be an integer 1-12.`);
  }
  if (!isFiniteNum(day) || !Number.isInteger(day) || day < 1 || day > 31) {
    // Exact day-of-month-for-that-month/leap-year validity is already
    // enforced downstream by julianDay() (e.g. rejects Feb 30) — this is
    // just the coarse, obviously-impossible-value check done earlier so
    // the failure is reported before any other computation runs on it.
    errors.push(`day: "${day}" must be an integer 1-31.`);
  }
  if (!isFiniteNum(hour) || hour < 0 || hour >= 24) {
    errors.push(`hour: "${hour}" must be 0-23 (24-hour format).`);
  }
  if (!isFiniteNum(min) || min < 0 || min >= 60) {
    errors.push(`min: "${min}" must be 0-59.`);
  }
  if (!isFiniteNum(sec) || sec < 0 || sec >= 60) {
    errors.push(`sec: "${sec}" must be 0-59.`);
  }
  if (!isFiniteNum(lat) || lat < -90 || lat > 90) {
    errors.push(`lat: "${lat}" must be between -90 and 90 degrees.`);
  }
  if (!isFiniteNum(lon) || lon < -180 || lon > 180) {
    errors.push(`lon: "${lon}" must be between -180 and 180 degrees.`);
  }
  if (tz === undefined && !timeZone) errors.push('tz or timeZone: one of these is required.');
  if (tz !== undefined && (!isFiniteNum(tz) || tz < -12 || tz > 14)) errors.push(`tz: "${tz}" must be a real-world UTC offset between -12 and +14 hours.`);
  if (timeZone !== undefined && typeof timeZone !== 'string') errors.push('timeZone must be an IANA timezone string when supplied.');
  if (!isFiniteNum(elevation) || elevation < -500 || elevation > 9000) {
    // Dead Sea shore (~-430m) to just above Everest (~8849m), with margin.
    errors.push(`elevation: "${elevation}" must be between -500 and 9000 meters.`);
  }

  if (errors.length) {
    throw new Error(
      `Invalid birth input — refusing to calculate a chart from physically impossible data:\n  - ` +
      errors.join('\n  - ')
    );
  }
}
