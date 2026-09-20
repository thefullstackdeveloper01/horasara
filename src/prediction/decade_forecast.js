/**
 * decade_forecast.js — "Next 10 Years" summary.
 *
 * Single responsibility: for each of the next 10 calendar years, resolve the
 * real Mahadasha→Antardasha ruling that year, cross-reference it against
 * which house that Antardasha lord actually rules in THIS chart (via
 * house_effects in dasha_meanings.json), and the real Varshaphal
 * (annual-chart) lord for that year — then compress it into one summary
 * line per year. No year is described from a generic template; each line
 * is built from this specific chart's own house-lord mapping.
 */
import { calcAntardashas } from '../dasha/vimshottari.js';
import { julianDay } from '../astronomy/utils.js';

function findMahaCovering(mahas, jd) {
  return mahas.find(m => jd >= m.startJD && jd < m.endJD);
}

import moduleData from '../../dataset/used/core/decade_forecast.json' with { type: 'json' };
const ORDINAL_LORD_KEY = moduleData.ORDINAL_LORD_KEY;

export function buildNextDecadeForecast(mahas, houses, varshaphalTable, birthYear, dashaMeaningsData) {
  const lines = [];
  const push = (s = '') => lines.push(s);

  const now = new Date();
  const startYear = now.getFullYear();

  push('  Your next 10 years — one summary line per year, from your real Dasha timeline');
  push('  (not a generic forecast — matched to which house each period\'s lord rules in YOUR chart):');
  push('');

  for (let i = 0; i < 10; i++) {
    const y = startYear + i;
    const midJD = julianDay(y, 7, 1, 0, 0, 0, 0);
    const maha = findMahaCovering(mahas, midJD);
    if (!maha) continue;

    let antarLord = maha.mahadasha;
    try {
      const antars = calcAntardashas(maha);
      const a = antars.find(a => midJD >= a.startJD && midJD < a.endJD);
      if (a) antarLord = a.antardasha;
    } catch (e) { /* fall back to mahadasha lord */ }

    // Which house does this Antardasha lord rule in THIS chart?
    const ruledHouses = houses.filter(h => h.lord === antarLord).map(h => h.number);
    const meaning = dashaMeaningsData?.[antarLord];
    let houseEffect = '';
    if (meaning?.house_effects && ruledHouses.length) {
      const key = ORDINAL_LORD_KEY[ruledHouses[0] - 1];
      houseEffect = meaning.house_effects[key] || '';
    }

    const vp = varshaphalTable.find(v => v.year === y);
    const age = y - birthYear;
    const positives = (meaning?.keywords_positive || []).slice(0, 2).join(', ');

    push(`  ${y} (Age ${age}):  ${maha.mahadasha}-${antarLord} Dasha` + (vp ? `  |  Varsha Lord: ${vp.varshaLord}` : ''));
    if (houseEffect) push(`      As your ${ruledHouses.map(h => h + ordinalSuffix(h)).join('/')} house lord: ${houseEffect}`);
    if (positives) push(`      Favorable for: ${positives}`);
    push('');
  }

  return lines;
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
