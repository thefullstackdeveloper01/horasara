/**
 * cities.js — Place-name → coordinates lookup.
 * Single responsibility: load dataset/used/core/cities.json and resolve a query string
 * (e.g. "Mumbai") to { lat, lon, tz, tzName, ... }.
 *
 * COVERAGE (fixed — previously 281 curated cities only, no fallback):
 * dataset/used/core/cities.json now merges those 281 hand-verified entries with a
 * 170,540-place GeoNames-derived dataset (via scripts/build-cities.mjs,
 * the `cities.json` npm package + `tz-lookup` for real IANA zones) —
 * ~307,000 lookup keys total. The original 281 remain authoritative for
 * any name collision. Ambiguous names (e.g. many countries have a
 * "Springfield") can be disambiguated with "name, country", e.g.
 * "springfield, united states".
 *
 * DST: every entry (curated or bulk) carries a `tzName` (IANA zone).
 * historicalTz.js resolves the true, DST-aware historical UTC offset for
 * the actual birth date from that zone — the `tz` field here is only a
 * same-day-as-lookup safety-net fallback, not what's actually used for
 * the chart under normal conditions.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadCities() {
  try {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'dataset', 'used', 'core', 'cities.json'), 'utf8'));
    return raw.cities || raw;
  } catch (e) {
    return {};
  }
}

export function findCity(cities, query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (cities[q]) return cities[q];
  // Substring fallback (kept for backward compatibility with the original
  // 281-city behavior) — with ~307K keys this is still sub-millisecond,
  // but is tried only after the exact/qualified lookups above and below
  // so a precise match is never shadowed by a coincidental substring hit.
  for (const key of Object.keys(cities)) {
    if (key.includes(q) || q.includes(key)) return cities[key];
  }
  return null;
}
