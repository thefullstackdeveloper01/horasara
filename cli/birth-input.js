/**
 * birth-input.js — Collects birth details (name, sex, DOB, time, place).
 * Single responsibility: turn either --flags or interactive terminal answers
 * into a normalized birth object consumed by the astrology engine.
 */
import readline from 'node:readline';
import { C } from './console-ui.js';
import { loadCities, findCity } from './cities.js';
import { DEFAULT_FALLBACK_PLACE } from '../src/astronomy/constants.js';
import { tryResolveHistoricalOffset } from './historicalTz.js';
import { chooseReportScope } from './report-scope.js';

export function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));
}

// FIX (audit Bug #8): parseFloat('abc') silently returns NaN with no
// exception — that NaN then propagates through dozens of calculations
// until it happens to break something deep inside divisional-chart logic
// (a confusing crash 5 stack frames from the actual bad input). Fail
// fast, at the point of input, with a message that names the field.
function parseFloatOrFail(raw, fieldName) {
  const n = parseFloat(raw);
  if (Number.isNaN(n)) {
    console.error(`\n❌ Invalid ${fieldName}: "${raw}" is not a valid number.\n`);
    process.exit(1);
  }
  return n;
}

// FIX (audit Bug #2): calendar date fields (day/month) are validated
// downstream and correctly reject e.g. 30 Feb, but the equivalent check
// was never written for time fields — hour=24/minute=60/second=60 used
// to pass straight through and silently overflow via floating-point
// arithmetic into the next hour/day instead of being rejected.
function validateTime(hour, min, sec = 0, source = 'input') {
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    console.error(`\n❌ Invalid hour in ${source}: "${hour}". Must be 0–23 (24-hour format).\n`);
    process.exit(1);
  }
  if (!Number.isFinite(min) || min < 0 || min > 59) {
    console.error(`\n❌ Invalid minute in ${source}: "${min}". Must be 0–59.\n`);
    process.exit(1);
  }
  if (!Number.isFinite(sec) || sec < 0 || sec > 59) {
    console.error(`\n❌ Invalid second in ${source}: "${sec}". Must be 0–59.\n`);
    process.exit(1);
  }
}

// FIX (Kundali Milan support): both Kundali Reading (single person) and
// Kundali Milan (groom + bride) need to gather a birth object, but Milan
// needs to gather it TWICE with different flag names so `--date`/`--time`
// don't collide between the two people. Rather than duplicate this whole
// file, fromFlags/fromInteractivePrompt now take an optional `prefix`
// (flag namespace, e.g. 'groom-' / 'bride-') and `label` (prompt heading).
// prefix='' + default label reproduces the exact old single-person
// behavior byte-for-byte — existing --name/--date/--time callers are
// unaffected.
function fromFlags(flags, cities, prefix = '') {
  const get = (k) => flags[prefix + k];
  const flagName = (k) => `--${prefix}${k}`;

  const [day, month, year] = get('date').split(/[-/]/).map(Number);
  const [hour, min] = get('time').split(':').map(Number);
  validateTime(hour, min, 0, `${flagName('time')} "${get('time')}"`);
  let lat = get('lat') ? parseFloatOrFail(get('lat'), flagName('lat')) : null;
  let lon = get('lon') ? parseFloatOrFail(get('lon'), flagName('lon')) : null;
  let tz = get('tz') ? parseFloatOrFail(get('tz'), flagName('tz')) : DEFAULT_FALLBACK_PLACE.tz;
  let place = get('place') || '';
  let resolvedCountry = null;
  let tzResolution = null; // set below if a city with tzName was found

  if ((lat === null || lon === null) && place) {
    const c = findCity(cities, place);
    if (c) {
      lat = c.lat; lon = c.lon; tz = c.tz ?? tz; resolvedCountry = c.country;
      // FIX (DST audit — real fix, not just a warning): resolve the TRUE
      // historical UTC offset for this exact birth date via the IANA
      // tz database (see historicalTz.js) instead of the city table's
      // year-round fixed offset — unless the user explicitly overrode
      // --tz themselves, which always wins.
      if (c.tzName && !get('tz')) {
        tzResolution = tryResolveHistoricalOffset(c.tzName, year, month, day, hour, min);
        if (tzResolution.resolved) tz = tzResolution.offsetHours;
      }
    }
  }
  if (lat === null || lon === null) {
    // FIX (transparency audit): previously silently substituted New Delhi's
    // coordinates with no visible indication anything was defaulted — a
    // wrong birthplace (even a fallback) shifts the Ascendant and every
    // house-based calculation, so this now loudly warns instead of failing
    // quietly. Coordinates are pulled from the single shared constant
    // (DEFAULT_FALLBACK_PLACE) rather than being retyped here.
    lat = DEFAULT_FALLBACK_PLACE.lat;
    lon = DEFAULT_FALLBACK_PLACE.lon;
    tz = flags.tz ? tz : DEFAULT_FALLBACK_PLACE.tz;
    place = place || `${DEFAULT_FALLBACK_PLACE.name} (default — no ${flagName('lat')}/${flagName('lon')}/${flagName('place')} given)`;
    console.warn(
      `\n⚠  No valid birthplace was provided (${flagName('place')} not found and ${flagName('lat')}/${flagName('lon')} missing). ` +
      `Falling back to ${DEFAULT_FALLBACK_PLACE.name} (lat ${DEFAULT_FALLBACK_PLACE.lat}, ` +
      `lon ${DEFAULT_FALLBACK_PLACE.lon}, tz +${DEFAULT_FALLBACK_PLACE.tz}). This WILL produce ` +
      `an incorrect chart if the actual birthplace is different — pass ${flagName('lat')}/${flagName('lon')} or a ` +
      `recognized ${flagName('place')} for an accurate result.\n`
    );
  }

  // FIX (DST audit — real fix): previously this only WARNED that DST
  // might make the fixed city offset wrong. Now the offset is actually
  // resolved from the real IANA tz database above (tzResolution), so the
  // message here reports what was done rather than asking the user to
  // work around a known gap. Falls back to a warning only if resolution
  // genuinely wasn't possible (no tzName on record, or Intl/ICU couldn't
  // resolve it), so nothing is ever silently wrong without notice.
  const explicitDstMinutes = get('dst-minutes') != null ? parseFloatOrFail(get('dst-minutes'), flagName('dst-minutes')) : null;
  const explicitWarMinutes = get('war-time-minutes') != null ? parseFloatOrFail(get('war-time-minutes'), flagName('war-time-minutes')) : null;
  if (explicitDstMinutes !== null) tz += explicitDstMinutes / 60;
  if (explicitWarMinutes !== null) tz += explicitWarMinutes / 60;

  if (tzResolution) {
    if (tzResolution.resolved) {
      console.warn(
        `\nℹ  "${place}" (${resolvedCountry}): historical UTC offset for ${day}-${month}-${year} ` +
        `resolved via the IANA tz database → ${tz >= 0 ? '+' : ''}${tz} (accounts for DST if applicable ` +
        `to this exact date). Pass ${flagName('tz')} explicitly to override.\n`
      );
    } else {
      console.warn(
        `\n⚠  "${place}" (${resolvedCountry}): could not resolve a historical UTC offset ` +
        `(${tzResolution.error}). Falling back to the city table's fixed offset ` +
        `(${tz >= 0 ? '+' : ''}${tz}), which will be WRONG if this date falls in a Daylight ` +
        `Saving period. Pass ${flagName('tz')} explicitly with the correct offset for an accurate chart.\n`
      );
    }
  }

  return {
    name: get('name'),
    sex: (get('sex') || get('gender') || 'M').toUpperCase().startsWith('F') ? 'F' : 'M',
    year, month, day, hour, min, sec: 0, lat, lon, tz, place,
    // Optional — Section 3: Birth-time confidence / Source-input quality.
    // Left undefined (not invented) when the flag isn't passed; the report
    // header then honestly shows STATUS = NOT_AVAILABLE for these two fields.
    reportScope: get('report') || 'complete',
    ephemeris: get('ephemeris') || undefined,
    timeConfidence: get('time-confidence') || undefined,
    timeSource: get('time-source') || undefined,
    dstApplied: String(get('dst') || '').toLowerCase() === 'true' || String(get('dst') || '').toLowerCase() === 'yes',
    dstCorrection: explicitDstMinutes ?? undefined,
    warTimeCorrection: explicitWarMinutes ?? undefined,
  };
}

async function fromInteractivePrompt(cities, label = 'Apni Janm Kundali ki jaankari darj karein (Enter your birth details)') {
  console.log(C.cyan + C.bold + `\n📜  ${label}\n` + C.reset);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const name = (await ask(rl, '  👤 Naam (Name): ')) || 'Jatak';
  let sex = (await ask(rl, '  ⚥  Ling (Gender) [M/F]: ')).toUpperCase();
  sex = sex.startsWith('F') ? 'F' : 'M';

  const dobRaw = await ask(rl, '  📅 Janm Tithi (Date of Birth) DD-MM-YYYY: ');
  const [dd, mm, yyyy] = dobRaw.split(/[-/.]/).map(Number);

  const tobRaw = await ask(rl, '  ⏰ Janm Samay (Time of Birth) HH:MM (24-hr): ');
  const [hh, mi] = tobRaw.split(':').map(Number);
  validateTime(hh, mi, 0, `time "${tobRaw}"`);

  const placeRaw = await ask(rl, '  📍 Janm Sthan (Place of Birth), e.g. Mumbai: ');
  const city = findCity(cities, placeRaw);
  let lat, lon, tz;

  if (city) {
    lat = city.lat; lon = city.lon; tz = city.tz ?? DEFAULT_FALLBACK_PLACE.tz;
    // FIX (DST audit — real fix): resolve the TRUE historical UTC offset
    // for this exact birth date via the IANA tz database instead of the
    // city table's year-round fixed offset (see historicalTz.js).
    if (city.tzName) {
      const res = tryResolveHistoricalOffset(city.tzName, yyyy, mm, dd, hh, mi || 0);
      if (res.resolved) {
        tz = res.offsetHours;
        console.log(C.dim + `     ✓ Found: ${placeRaw} → lat ${lat}, lon ${lon}, TZ ${tz >= 0 ? '+' : ''}${tz} ` +
          `(historical offset resolved for ${dd}-${mm}-${yyyy} via IANA tz database)` + C.reset);
      } else {
        console.log(C.yellow + `     ⚠ Could not resolve historical DST offset (${res.error}); ` +
          `using fixed table offset TZ +${tz} — verify manually if this date may fall in a DST period.` + C.reset);
      }
    } else {
      console.log(C.dim + `     ✓ Found: ${placeRaw} → lat ${lat}, lon ${lon}, TZ +${tz}` + C.reset);
    }
  } else {
    console.log(C.yellow + '     ⚠ City not found in database. Please enter coordinates manually.' + C.reset);
    lat = parseFloatOrFail(await ask(rl, '     Latitude (e.g. 19.076): '), 'Latitude');
    lon = parseFloatOrFail(await ask(rl, '     Longitude (e.g. 72.8777): '), 'Longitude');
    const tzRaw = await ask(rl, '     Timezone offset from UTC (e.g. 5.5 for IST): ');
    tz = tzRaw ? parseFloatOrFail(tzRaw, 'Timezone') : DEFAULT_FALLBACK_PLACE.tz;
  }

  console.log(C.dim + '\n     Optional — press Enter to skip either question:' + C.reset);
  const confidenceRaw = (await ask(rl, '  🎯 Birth time confidence (exact / approximate / estimated): ')) || undefined;
  const sourceRaw = (await ask(rl, '  📄 Source of birth time (birth certificate / hospital / family memory): ')) || undefined;
  const dstRaw = (await ask(rl, '  ☀ DST applied at birth? [yes/no]: ')) || undefined;
  const dstMinutesRaw = (await ask(rl, '  DST correction minutes, if known [0]: ')) || '';
  const warRaw = (await ask(rl, '  ⚔ War-time correction minutes, if applicable [0]: ')) || '';
  const dstApplied = ['yes','y','true'].includes(String(dstRaw).toLowerCase());
  const dstCorrection = dstMinutesRaw ? parseFloatOrFail(dstMinutesRaw, 'DST correction minutes') : undefined;
  const warTimeCorrection = warRaw ? parseFloatOrFail(warRaw, 'War-time correction minutes') : undefined;

  if (dstCorrection != null) tz += dstCorrection / 60;
  if (warTimeCorrection != null) tz += warTimeCorrection / 60;

  rl.close();

  return {
    name, sex, year: yyyy, month: mm, day: dd, hour: hh, min: mi || 0, sec: 0,
    lat, lon, tz, place: placeRaw,
    timeConfidence: confidenceRaw,
    timeSource: sourceRaw,
    reportScope: undefined,
    ephemeris: undefined,
    dstApplied,
    dstCorrection,
    warTimeCorrection,
  };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.prefix] - flag namespace, e.g. 'groom-' or 'bride-'.
 *   '' (default) preserves the original single-person --name/--date/--time flags.
 * @param {string} [opts.label] - heading shown above the interactive prompt.
 */
export async function gatherBirthData(opts = {}) {
  const { prefix = '', label, reportScope } = opts;
  const flags = parseArgs();
  const cities = loadCities();

  // Non-interactive mode: all required flags supplied
  if (flags[`${prefix}name`] && flags[`${prefix}date`] && flags[`${prefix}time`]) {
    const birth = fromFlags(flags, cities, prefix);
    if (reportScope) birth.reportScope = reportScope;
    return birth;
  }

  const birth = label ? await fromInteractivePrompt(cities, label) : await fromInteractivePrompt(cities);
  birth.reportScope = reportScope || await chooseReportScope();
  return birth;
}
