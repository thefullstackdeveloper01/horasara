/**
 * panchang-input.js — Collects date + place for a standalone "Daily
 * Panchang" lookup (no name/gender needed — Panchanga is a property of a
 * moment + place, not a person). Mirrors birth-input.js's structure and
 * reuses the same city lookup / coordinate-fallback / DST-warning logic
 * so behavior stays consistent across all three modes.
 */
import readline from 'node:readline';
import { C } from './console-ui.js';
import { loadCities, findCity } from './cities.js';
import { DEFAULT_FALLBACK_PLACE } from '../src/astronomy/constants.js';
import { parseArgs } from './birth-input.js';
import { julianDay, sunriseSunset } from '../src/astronomy/utils.js';

function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));
}

function parseFloatOrFail(raw, fieldName) {
  const n = parseFloat(raw);
  if (Number.isNaN(n)) {
    console.error(`\n❌ Invalid ${fieldName}: "${raw}" is not a valid number.\n`);
    process.exit(1);
  }
  return n;
}

function todayParts() {
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

function fromFlags(flags, cities) {
  const { day: td, month: tm, year: ty } = todayParts();
  let day = td, month = tm, year = ty;
  if (flags.date) {
    [day, month, year] = flags.date.split(/[-/]/).map(Number);
  }

  let lat = flags.lat ? parseFloatOrFail(flags.lat, '--lat') : null;
  let lon = flags.lon ? parseFloatOrFail(flags.lon, '--lon') : null;
  let tz = flags.tz ? parseFloatOrFail(flags.tz, '--tz') : DEFAULT_FALLBACK_PLACE.tz;
  let place = flags.place || '';

  if ((lat === null || lon === null) && place) {
    const c = findCity(cities, place);
    if (c) { lat = c.lat; lon = c.lon; tz = c.tz ?? tz; }
  }
  if (lat === null || lon === null) {
    lat = DEFAULT_FALLBACK_PLACE.lat;
    lon = DEFAULT_FALLBACK_PLACE.lon;
    tz = flags.tz ? tz : DEFAULT_FALLBACK_PLACE.tz;
    place = place || `${DEFAULT_FALLBACK_PLACE.name} (default — no --lat/--lon/--place given)`;
    console.warn(
      `\n⚠  No valid location was provided. Falling back to ${DEFAULT_FALLBACK_PLACE.name} ` +
      `(lat ${DEFAULT_FALLBACK_PLACE.lat}, lon ${DEFAULT_FALLBACK_PLACE.lon}, tz +${DEFAULT_FALLBACK_PLACE.tz}).\n`
    );
  }

  let hour, min;
  if (flags.time) {
    [hour, min] = flags.time.split(':').map(Number);
  } else {
    // FIX (static "6am default" — was a flat guess for every latitude and
    // season): real sunrise for THIS date at THIS place ranges roughly
    // 5am-8am depending on where and when — a fixed 6:00 is wrong most of
    // the year almost everywhere outside the tropics. Compute the actual
    // sunrise dynamically from the already-real sunriseSunset() ephemeris
    // function instead of guessing.
    const sr = computeDefaultSunriseTime(year, month, day, tz, lat, lon);
    if (sr) { hour = sr.hour; min = sr.min; }
    else { hour = 6; min = 0; } // circumpolar (polar day/night) — no real sunrise exists that day, disclosed fallback
  }

  return {
    name: 'Panchang', sex: 'M', year, month, day, hour, min, sec: 0, lat, lon, tz, place,
  };
}

/**
 * Real sunrise time (local civil hour:min) for a given calendar date and
 * place, using the same VSOP87-derived solar-position sunrise formula
 * already used for the birth chart's own sunrise/sunset display and Hora
 * Bala — not a separate, less-accurate approximation.
 */
function computeDefaultSunriseTime(year, month, day, tz, lat, lon) {
  const localMidnightUtJD = julianDay(year, month, day, 0 - tz);
  const { sunrise } = sunriseSunset(localMidnightUtJD, lat, lon);
  if (sunrise == null) return null; // circumpolar day/night — genuinely no sunrise to report
  const utcHourFraction = ((sunrise + 0.5) % 1) * 24;
  let localHourFraction = utcHourFraction + tz;
  if (localHourFraction < 0) localHourFraction += 24;
  if (localHourFraction >= 24) localHourFraction -= 24;
  const hour = Math.floor(localHourFraction);
  const min = Math.round((localHourFraction - hour) * 60);
  return { hour, min: min === 60 ? 0 : min };
}

async function fromInteractivePrompt(cities) {
  console.log(C.cyan + C.bold + '\n📅  Daily Panchang — Din/Sthaan Darj Karein (Enter Date & Place)\n' + C.reset);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const { day: td, month: tm, year: ty } = todayParts();
  const defaultDate = `${String(td).padStart(2, '0')}-${String(tm).padStart(2, '0')}-${ty}`;
  const dobRaw = (await ask(rl, `  📅 Tithi (Date) DD-MM-YYYY [Enter = today, ${defaultDate}]: `)) || defaultDate;
  const [dd, mm, yyyy] = dobRaw.split(/[-/.]/).map(Number);

  const placeRaw = await ask(rl, '  📍 Sthaan (Place), e.g. Mumbai: ');
  const city = findCity(cities, placeRaw);
  let lat, lon, tz;

  if (city) {
    lat = city.lat; lon = city.lon; tz = city.tz ?? DEFAULT_FALLBACK_PLACE.tz;
    console.log(C.dim + `     ✓ Found: ${placeRaw} → lat ${lat}, lon ${lon}, TZ +${tz}` + C.reset);
  } else {
    console.log(C.yellow + '     ⚠ City not found in database. Please enter coordinates manually.' + C.reset);
    lat = parseFloatOrFail(await ask(rl, '     Latitude (e.g. 19.076): '), 'Latitude');
    lon = parseFloatOrFail(await ask(rl, '     Longitude (e.g. 72.8777): '), 'Longitude');
    const tzRaw = await ask(rl, '     Timezone offset from UTC (e.g. 5.5 for IST): ');
    tz = tzRaw ? parseFloatOrFail(tzRaw, 'Timezone') : DEFAULT_FALLBACK_PLACE.tz;
  }

  rl.close();

  const sr = computeDefaultSunriseTime(yyyy, mm, dd, tz, lat, lon);
  const hour = sr ? sr.hour : 6;
  const min = sr ? sr.min : 0;

  return {
    name: 'Panchang', sex: 'M', year: yyyy, month: mm, day: dd,
    hour, min, sec: 0, lat, lon, tz, place: placeRaw || `${DEFAULT_FALLBACK_PLACE.name} (default)`,
  };
}

export async function gatherPanchangData() {
  const flags = parseArgs();
  const cities = loadCities();

  if (flags.date || flags.place || flags.lat) {
    return fromFlags(flags, cities);
  }

  return fromInteractivePrompt(cities);
}
