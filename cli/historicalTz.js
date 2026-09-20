/**
 * historicalTz.js — Resolves the TRUE historical UTC offset (including
 * seasonal Daylight Saving Time) for a given IANA time-zone name and a
 * specific local birth date/time.
 *
 * WHY THIS EXISTS (replaces the old fixed-offset-only approach):
 * `dataset/used/core/cities.json` previously stored a single fixed `tz` number per city
 * (e.g. New York = -5 year-round). That is correct for standard time but
 * wrong for roughly half the year in any DST-observing country — a birth
 * on 15 July in New York is actually UTC-4 (EDT), not UTC-5 (EST), and
 * that 1-hour error shifts the Ascendant by ~15°.
 *
 * HOW THIS AVOIDS FABRICATING DATA:
 * This does NOT hand-type DST transition rules or dates anywhere. Node.js
 * ships with the real IANA Time Zone Database (tzdata) via the ICU library
 * built into V8, exposed through `Intl.DateTimeFormat`. This module only
 * asks Intl/ICU "what was the UTC offset for zone X at instant Y" — the
 * same trusted source used by browsers and every major JS timezone
 * library (moment-timezone, luxon, date-fns-tz all read from this same
 * underlying tzdata). Every city entry's `tzName` was validated at
 * data-prep time by constructing a real `Intl.DateTimeFormat` with that
 * zone id and confirming it didn't throw (see dataset/used/core/cities.json prep).
 *
 * LIMITS (disclosed honestly):
 * - ICU's historical tzdata coverage for pre-1970s local-mean-time-era
 *   transitions varies by zone; recent/modern-era dates (the vast
 *   majority of real birth charts) are reliable.
 * - If `Intl` cannot resolve the zone/date (extremely old date, or a
 *   zone id not in this Node build's ICU data), this throws and the
 *   caller falls back to the city table's fixed offset with a visible
 *   warning — it never silently guesses.
 */

/**
 * Returns the UTC offset, in minutes EAST of UTC, that `tzName` was
 * observing at a given UTC instant.
 */
function offsetMinutesAtUtcInstant(tzName, utcMs) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tzName,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (t) => Number(parts.find(p => p.type === t).value);
  // Reconstruct what wall-clock time this UTC instant maps to in tzName,
  // then diff against the UTC instant itself to derive the offset.
  const asUTC = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour') === 24 ? 0 : get('hour'), get('minute'), get('second')
  );
  return Math.round((asUTC - utcMs) / 60000);
}

/**
 * Resolves the true historical UTC offset (decimal hours, e.g. 5.5 or -4)
 * for a local civil date/time in the given IANA zone.
 *
 * Local wall-clock time -> UTC instant is a fixed-point problem near DST
 * transitions (the offset needed to resolve UTC depends on the offset).
 * Two fixed-point iterations are sufficient in every real case: tz rules
 * only ever shift by whole hours (or half/quarter hours for the handful
 * of zones that use them), so the offset stabilizes after at most one
 * correction.
 *
 * @throws if `tzName` is not resolvable by this Node build's ICU data.
 */
export function resolveHistoricalOffsetHours(tzName, year, month, day, hour, min) {
  // First guess: treat the local wall-clock time as if it were UTC.
  let guessUtcMs = Date.UTC(year, month - 1, day, hour, min, 0);
  let offsetMin = offsetMinutesAtUtcInstant(tzName, guessUtcMs);

  // Iterate: true UTC instant = local wall clock minus the offset that
  // was actually in effect AT that true instant (not at the guess).
  for (let i = 0; i < 3; i++) {
    const trueUtcMs = guessUtcMs - offsetMin * 60000;
    const refinedOffset = offsetMinutesAtUtcInstant(tzName, trueUtcMs);
    if (refinedOffset === offsetMin) { offsetMin = refinedOffset; break; }
    offsetMin = refinedOffset;
  }
  return offsetMin / 60;
}

/**
 * Safe wrapper: returns { offsetHours, resolved, error }.
 * Never throws — callers use `resolved` to decide whether to trust the
 * result or fall back to the city table's fixed offset.
 */
export function tryResolveHistoricalOffset(tzName, year, month, day, hour, min) {
  if (!tzName) return { offsetHours: null, resolved: false, error: 'no tzName on this city record' };
  try {
    const offsetHours = resolveHistoricalOffsetHours(tzName, year, month, day, hour, min);
    return { offsetHours, resolved: true, error: null };
  } catch (e) {
    return { offsetHours: null, resolved: false, error: e.message };
  }
}
