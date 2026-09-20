/**
 * lagna-rashi.js — Section 1 (Lagna/Ascendant) and Section 2 (Rashifal base
 * + today's horoscope for all 12 rashis).
 */
import { section, kv } from '../console-ui.js';

export function printLagna(R) {
  section('1. LAGNA (ASCENDANT) — जन्म लग्न');
  kv('Ascendant Sign / राशि', R.lagna.sign);
  kv('Degree', R.lagna.dms + ` (${(parseFloat(R.lagna.lon) % 30).toFixed(2)}° in sign)`);
  kv('Nakshatra', `${R.lagna.nakshatra}  Pada ${R.lagna.pada}`);
}

export function printRashifal(R) {
  section('2. RASHIFAL BASE — चंद्र राशि व नक्षत्र (Chart Anchor Only)');
  const moonP = R.planets.find(p => p.name === 'Moon');
  const sunP = R.planets.find(p => p.name === 'Sun');
  kv('Moon Sign (Rashi)', moonP?.sign);
  kv('Moon Nakshatra', `${moonP?.nakshatra}  Pada ${moonP?.pada}`);
  kv('Sun Sign', sunP?.sign);
  kv('Sun Nakshatra', `${sunP?.nakshatra}  Pada ${sunP?.pada}`);
  console.log('  This section contains only the permanent chart anchors. Dated horoscope/forecast output is shown once in PART 5.');
}
