/**
 * Compact all-life-area overview for the Overall forecast.
 * It reuses the canonical UserPredictionService factor engine; it does not
 * invent a second calculation model.
 */
import { PREFERENCE_KEYS, PREFERENCE_LABELS } from './UserPredictionPreferences.js';

const DEFAULT_AREAS = PREFERENCE_KEYS.filter(k => k !== 'general');

export function buildLifeAreaOverview({ chart, period='year', date, tz=0, makeFactors, localDateToJD } = {}) {
  if (!chart) return [];
  const count = period === 'year' ? 12 : period === 'month' ? 5 : period === 'week' ? 7 : 1;
  const step = period === 'year' ? 30.436875 : period === 'month' ? 7 : 1;
  const rows = [];
  for (const area of DEFAULT_AREAS) {
    const samples = [];
    for (let i = 0; i < count; i++) {
      const jd = localDateToJD(date, 12 + i * step, tz);
      const f = makeFactors(chart, jd, area, { tz });
      samples.push(f);
    }
    const score = Math.round(samples.reduce((a, x) => a + x.score, 0) / Math.max(1, samples.length));
    const tone = score >= 68 ? 'positive' : score >= 48 ? 'neutral' : 'negative';
    const label = score >= 68 ? 'Favorable' : score >= 48 ? 'Neutral' : 'Challenging';
    const drivers = samples.flatMap(x => x.drivers || []).slice(0, 3);
    rows.push({ area, label: PREFERENCE_LABELS[area] || area, score, tone, outlook: label, drivers });
  }
  return rows;
}
