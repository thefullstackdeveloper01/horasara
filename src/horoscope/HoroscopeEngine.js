/**
 * HoroscopeEngine — the sign-based reading shown on /horoscope.
 *
 * The previous /horoscope page rendered buildGeneralForecast(), which returned
 * a single tone word, an integer score and a list of raw aspect signals. That
 * is a debug view, not a horoscope: a reader has no way to tell what any of it
 * means for their day.
 *
 * This engine produces the shape a reader actually expects — an overall rating,
 * per-life-area ratings with an explanation for each, lucky factors, the Moon's
 * current position, a do/avoid list and a remedy — while keeping every number
 * traceable to a computed transit. Nothing is stored per sign and nothing is
 * random: the same date and sign always produce the same reading, and it
 * changes day to day because the Moon moves about 13° a day.
 *
 * Classical basis:
 *   - Gochara is read from the sign itself (treated as Chandra lagna), per the
 *     standard practice for sign-based horoscopes.
 *   - TRANSIT_GOOD_HOUSES is BPHS Ch. 36's favourable-house list per planet.
 *   - Dignity (exaltation / debilitation / own sign / moolatrikona) adjusts the
 *     weight a planet carries, so a debilitated benefic does not read the same
 *     as an exalted one.
 *   - Retrograde planets are weighted as internalised rather than simply good
 *     or bad, matching how Chesta Bala treats them.
 *
 * This is traditional rule-based interpretation. It is not a scientific
 * prediction and the output labels it as such.
 */

import { getTransitPositions } from '../transit/transits.js';
import { julianDay } from '../astronomy/utils.js';
import {
  SIGNS, SIGN_LORDS, EXALTATION, DEBILITATION, OWN_SIGNS,
  MOOLATRIKONA, TRANSIT_GOOD_HOUSES, PLANET_NATURE,
  NAKSHATRAS, NAKSHATRA_LORDS,
} from '../astronomy/constants.js';

/* ------------------------------------------------------------- reference */

const SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water'];
const QUALITIES = ['Movable', 'Fixed', 'Dual'];

const SIGN_HINDI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
const SIGN_SANSKRIT = ['Meṣa', 'Vṛṣabha', 'Mithuna', 'Karka', 'Siṃha', 'Kanyā', 'Tulā', 'Vṛścika', 'Dhanu', 'Makara', 'Kumbha', 'Mīna'];

/** House → the life areas that house governs, and how strongly (BPHS karakatva). */
const HOUSE_AREAS = {
  1: { health: 1.0, career: 0.4 },
  2: { finance: 1.0, family: 0.8, education: 0.4 },
  3: { career: 0.5, travel: 0.7, family: 0.3 },
  4: { family: 1.0, education: 0.7, health: 0.3 },
  5: { love: 0.9, education: 1.0, finance: 0.4 },
  6: { health: -1.0, career: 0.6, finance: -0.3 },
  7: { love: 1.0, career: 0.5, travel: 0.3 },
  8: { health: -0.8, finance: -0.5, love: -0.3 },
  9: { travel: 1.0, education: 0.8, finance: 0.5, family: 0.4 },
  10: { career: 1.0, finance: 0.5 },
  11: { finance: 1.0, career: 0.7, love: 0.4 },
  12: { health: -0.6, finance: -0.8, travel: 0.6 },
};

const AREAS = [
  { id: 'overall', label: 'Overall', icon: '✦' },
  { id: 'love', label: 'Love & Relationships', icon: '❤️' },
  { id: 'career', label: 'Career & Business', icon: '💼' },
  { id: 'finance', label: 'Money & Finance', icon: '💰' },
  { id: 'health', label: 'Health & Energy', icon: '🌿' },
  { id: 'family', label: 'Family & Home', icon: '🏠' },
  { id: 'education', label: 'Study & Learning', icon: '📚' },
  { id: 'travel', label: 'Travel & Fortune', icon: '🧭' },
];

/** Plain-language house significations, used to build the explanation text. */
const HOUSE_MEANING = {
  1: 'your own energy and how you come across',
  2: 'income, savings and what you say',
  3: 'effort, courage and short journeys',
  4: 'home, mother and peace of mind',
  5: 'romance, children, study and creative work',
  6: 'work routine, health, debts and competition',
  7: 'partnership, marriage and dealings with others',
  8: 'sudden change, shared money and hidden matters',
  9: 'fortune, long journeys, teachers and belief',
  10: 'career, status and public standing',
  11: 'gains, friends, networks and goals',
  12: 'expenses, rest, distant places and letting go',
};

/** Lucky factors follow the sign lord — the standard remedial mapping. */
const LORD_PROFILE = {
  Sun: { colors: ['Ruby red', 'Saffron', 'Copper orange'], numbers: [1, 10, 19], direction: 'East', metal: 'Gold or Copper', gem: 'Ruby', deity: 'Surya / Rama', mantra: 'ॐ घृणिः सूर्याय नमः', day: 'Sunday', time: 'Sunrise to mid-morning' },
  Moon: { colors: ['Pearl white', 'Silver', 'Cream'], numbers: [2, 11, 20], direction: 'North-west', metal: 'Silver', gem: 'Pearl', deity: 'Shiva / Parvati', mantra: 'ॐ श्रां श्रीं श्रौं सः चन्द्राय नमः', day: 'Monday', time: 'Evening, after sunset' },
  Mars: { colors: ['Deep red', 'Coral', 'Maroon'], numbers: [9, 18, 27], direction: 'South', metal: 'Copper', gem: 'Red Coral', deity: 'Hanuman / Kartikeya', mantra: 'ॐ क्रां क्रीं क्रौं सः भौमाय नमः', day: 'Tuesday', time: 'Early morning' },
  Mercury: { colors: ['Emerald green', 'Turquoise', 'Light olive'], numbers: [5, 14, 23], direction: 'North', metal: 'Bronze', gem: 'Emerald', deity: 'Vishnu / Saraswati', mantra: 'ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः', day: 'Wednesday', time: 'Mid-morning' },
  Jupiter: { colors: ['Golden yellow', 'Saffron', 'Ochre'], numbers: [3, 12, 21], direction: 'North-east', metal: 'Gold', gem: 'Yellow Sapphire', deity: 'Brihaspati / Vishnu', mantra: 'ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः', day: 'Thursday', time: 'Morning' },
  Venus: { colors: ['White', 'Pastel pink', 'Sky blue'], numbers: [6, 15, 24], direction: 'South-east', metal: 'Silver or Platinum', gem: 'Diamond', deity: 'Lakshmi', mantra: 'ॐ द्रां द्रीं द्रौं सः शुक्राय नमः', day: 'Friday', time: 'Sunrise and dusk' },
  Saturn: { colors: ['Indigo', 'Charcoal', 'Deep blue'], numbers: [8, 17, 26], direction: 'West', metal: 'Iron or Panchdhatu', gem: 'Blue Sapphire', deity: 'Shani / Hanuman', mantra: 'ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः', day: 'Saturday', time: 'Late evening' },
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/* --------------------------------------------------------------- helpers */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function signIndexOf(sign) {
  const want = String(sign || '').trim().toLowerCase();
  let i = SIGNS.findIndex(s => s.toLowerCase() === want);
  if (i < 0) i = SIGN_SANSKRIT.findIndex(s => s.toLowerCase() === want);
  if (i < 0) i = SIGN_HINDI.findIndex(s => s === String(sign).trim());
  return i;
}

function isoToParts(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return { y, m, d };
}

function addDaysIso(iso, n) {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Noon Julian Day for a calendar date — the standard sampling point. */
function jdForDate(iso) {
  const { y, m, d } = isoToParts(iso);
  return julianDay(y, m, d, 12, 0, 0);
}

/**
 * Dignity of a planet in the sign it currently occupies. Returns a multiplier
 * applied to the planet's base weight, so an exalted Jupiter carries more than
 * a debilitated one even in the same house.
 */
function dignity(planet, signName, degInSign) {
  const ex = EXALTATION[planet];
  const de = DEBILITATION[planet];
  const mt = MOOLATRIKONA[planet];
  if (mt && mt.sign === signName && degInSign >= mt.from && degInSign <= mt.to) {
    return { label: 'Moolatrikona', factor: 1.4 };
  }
  if (ex && ex.sign === signName) return { label: 'Exalted', factor: 1.5 };
  if (de && de.sign === signName) return { label: 'Debilitated', factor: 0.5 };
  if ((OWN_SIGNS[planet] || []).includes(signName)) return { label: 'Own sign', factor: 1.3 };
  return { label: 'Neutral', factor: 1.0 };
}

/** Natural benefic/malefic weight before house and dignity adjustment. */
function baseWeight(planet) {
  const nature = PLANET_NATURE[planet];
  if (nature === 'Benefic') return 1.0;
  if (nature === 'Malefic') return 0.8;
  return 0.7; // Neutral and shadow planets
}

/**
 * How much a planet matters for a given period. The Moon dominates a daily
 * reading because it is the only body that changes sign within the window;
 * for a year the slow planets carry the reading instead. This is what makes
 * daily / weekly / monthly / yearly genuinely different rather than the same
 * text under four headings.
 */
const PERIOD_WEIGHTS = {
  daily: { Moon: 3.0, Sun: 1.4, Mercury: 1.2, Venus: 1.2, Mars: 1.1, Jupiter: 0.8, Saturn: 0.8, Rahu: 0.7, Ketu: 0.7 },
  weekly: { Moon: 1.8, Sun: 1.5, Mercury: 1.4, Venus: 1.4, Mars: 1.3, Jupiter: 1.0, Saturn: 1.0, Rahu: 0.8, Ketu: 0.8 },
  monthly: { Moon: 0.8, Sun: 1.6, Mercury: 1.3, Venus: 1.4, Mars: 1.4, Jupiter: 1.4, Saturn: 1.3, Rahu: 1.0, Ketu: 1.0 },
  yearly: { Moon: 0.4, Sun: 0.9, Mercury: 0.8, Venus: 1.0, Mars: 1.2, Jupiter: 2.0, Saturn: 2.0, Rahu: 1.5, Ketu: 1.5 },
};

const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };

/* --------------------------------------------------------- signal building */

/**
 * One planet's transit read from the target sign: which house it falls in,
 * whether that house is favourable for it, and the resulting signed score.
 */
function buildSignal(planet, pos, signIdx, period) {
  const house = ((pos.sign - signIdx + 12) % 12) + 1;
  const signName = SIGNS[pos.sign];
  const degInSign = pos.siderealLon % 30;
  const good = (TRANSIT_GOOD_HOUSES[planet] || []).includes(house);
  const dig = dignity(planet, signName, degInSign);
  const periodWeight = PERIOD_WEIGHTS[period]?.[planet] ?? 1;

  // Base direction from the BPHS transit table, scaled by dignity, the
  // planet's natural weight and how much this period cares about it.
  let score = (good ? 1 : -0.6) * baseWeight(planet) * dig.factor * periodWeight;

  // Retrograde: the planet is strong by Chesta Bala but its results turn
  // inward and repeat, so a good transit softens and a hard one lingers.
  if (pos.retrograde) score = score > 0 ? score * 0.75 : score * 1.15;

  return {
    planet, house, sign: signName, nakshatra: pos.nakshatra,
    degree: round1(degInSign), retrograde: !!pos.retrograde,
    favorable: good, dignity: dig.label, score: round1(score),
    meaning: HOUSE_MEANING[house],
  };
}

/** Roll the signals up into a 0–100 score per life area. */
function scoreAreas(signals) {
  const raw = {};
  const weight = {};
  for (const s of signals) {
    const areas = HOUSE_AREAS[s.house] || {};
    for (const [area, w] of Object.entries(areas)) {
      // A negative mapping (6th/8th/12th on health) means a favourable transit
      // there still reads as pressure on that area, so the sign is flipped.
      const contribution = s.score * Math.abs(w) * (w < 0 ? -1 : 1);
      raw[area] = (raw[area] || 0) + contribution;
      weight[area] = (weight[area] || 0) + Math.abs(w);
    }
  }
  const out = {};
  for (const { id } of AREAS) {
    if (id === 'overall') continue;
    const w = weight[id] || 1;
    const normalized = (raw[id] || 0) / w;      // roughly −1.5 … +1.5
    out[id] = Math.round(clamp(50 + normalized * 30, 5, 95));
  }

  // Overall is deliberately not routed through a single house. Reading it off
  // the 1st house alone made it flat for any sign with nothing transiting
  // there, and pinned to 95 for any sign that had one strong planet there.
  // It is instead the mean of the seven life areas blended with the net
  // balance of every signal, so a day with one bright spot and six dull ones
  // does not read as a bright day.
  const areaMean = AREAS.filter(a => a.id !== 'overall')
    .reduce((sum, a) => sum + out[a.id], 0) / (AREAS.length - 1);
  const netSignal = signals.reduce((sum, s) => sum + s.score, 0) / Math.max(signals.length, 1);
  out.overall = Math.round(clamp(areaMean * 0.7 + (50 + netSignal * 28) * 0.3, 5, 95));
  return out;
}

const starsFor = (score) => clamp(Math.round(score / 20), 1, 5);
const toneFor = (score) => (score >= 68 ? 'supportive' : score >= 52 ? 'steady' : score >= 38 ? 'mixed' : 'testing');

const TONE_LABEL = { supportive: 'Favourable', steady: 'Steady', mixed: 'Mixed', testing: 'Needs care' };

/* --------------------------------------------------------------- language */

/** Per-area sentence built from the strongest signal touching that area. */
function areaText(areaId, score, signals) {
  const touching = signals
    .filter(s => Object.keys(HOUSE_AREAS[s.house] || {}).includes(areaId))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const lead = touching[0];
  const tone = toneFor(score);

  const OPENERS = {
    love: { supportive: 'Warmth comes easily and conversations land well.', steady: 'Things hold steady; no dramatic turns expected.', mixed: 'Affection is there, but timing and wording matter today.', testing: 'Patience is the better strategy than pressing a point.' },
    career: { supportive: 'Effort is visible to the people who decide things.', steady: 'Routine work moves along without much friction.', mixed: 'Progress is real but slower than you would like.', testing: 'Hold your position rather than starting something new.' },
    finance: { supportive: 'Money matters tilt in your favour; gains are supported.', steady: 'Income and outgo stay roughly in balance.', mixed: 'Some inflow, some leakage — check the details before committing.', testing: 'Avoid lending, large purchases and speculative moves.' },
    health: { supportive: 'Energy holds up well; recovery is quick.', steady: 'Stamina is normal; keep the usual routine.', mixed: 'Energy dips and returns — do not skip rest or meals.', testing: 'Strain shows quickly. Sleep, food and pace need attention.' },
    family: { supportive: 'Home feels settled and support is available.', steady: 'Domestic matters stay on an even keel.', mixed: 'Small domestic friction is possible; let it pass.', testing: 'Someone at home needs attention more than an argument.' },
    education: { supportive: 'Concentration is sharp and material sticks.', steady: 'Steady study pays off; nothing dramatic either way.', mixed: 'Focus comes and goes — work in shorter blocks.', testing: 'Revision beats new material right now.' },
    travel: { supportive: 'Movement and fortune both support you.', steady: 'Planned journeys proceed as expected.', mixed: 'Travel is possible but confirm arrangements twice.', testing: 'Postpone non-essential journeys if you can.' },
    overall: { supportive: 'The overall pattern supports you today.', steady: 'A steady, workable stretch.', mixed: 'A mixed pattern that rewards judgement over speed.', testing: 'A demanding stretch that rewards restraint.' },
  };

  const opener = OPENERS[areaId]?.[tone] || OPENERS.overall[tone];
  if (!lead) return opener;

  const why = lead.favorable
    ? `${lead.planet} is transiting your ${ordinal(lead.house)} house of ${lead.meaning}, a placement classical transit rules count as supportive for it`
    : `${lead.planet} is transiting your ${ordinal(lead.house)} house of ${lead.meaning}, which classical transit rules treat as a pressure point`;
  const extra = lead.retrograde ? ', and it is retrograde, so the effect turns inward and tends to repeat' : '';
  const dig = lead.dignity !== 'Neutral' ? ` It is ${lead.dignity.toLowerCase()} in ${lead.sign}, which ${lead.dignity === 'Debilitated' ? 'weakens' : 'strengthens'} what it can deliver.` : '';

  return `${opener} ${why}${extra}.${dig}`;
}

/** The main multi-sentence reading shown at the top of the page. */
function buildReading(signName, period, signals, areaScores, moon) {
  const best = [...signals].sort((a, b) => b.score - a.score)[0];
  const worst = [...signals].sort((a, b) => a.score - b.score)[0];
  const overall = areaScores.overall;
  const tone = toneFor(overall);

  const windowWord = { daily: 'today', weekly: 'this week', monthly: 'this month', yearly: 'this year' }[period];

  const para1 = `For ${signName}, ${windowWord} reads as ${TONE_LABEL[tone].toLowerCase()}. `
    + `The Moon is moving through ${moon.sign} in ${moon.nakshatra} nakshatra, which falls in your ${ordinal(moon.house)} house of ${HOUSE_MEANING[moon.house]}. `
    + `That sets the emotional background for the period.`;

  const para2 = best
    ? `The strongest support comes from ${best.planet} in your ${ordinal(best.house)} house, touching ${best.meaning}. `
      + `${best.dignity !== 'Neutral' ? `It is ${best.dignity.toLowerCase()} in ${best.sign}, so it carries more weight than usual. ` : ''}`
      + `Use this for anything that needs backing from other people.`
    : '';

  const para3 = worst && worst.score < 0
    ? `The area that needs care is your ${ordinal(worst.house)} house — ${worst.meaning} — where ${worst.planet} is transiting${worst.retrograde ? ' in retrograde motion' : ''}. `
      + `This does not mean loss; in classical reading it means the matter needs more effort than usual before it yields.`
    : 'No planet is sitting in a clearly difficult position from your sign in this window.';

  const ranked = AREAS.filter(a => a.id !== 'overall')
    .map(a => ({ ...a, score: areaScores[a.id] }))
    .sort((a, b) => b.score - a.score);
  const para4 = `The most supported areas are ${ranked.slice(0, 2).map(a => a.label.toLowerCase()).join(' and ')}; `
    + `the ones asking for patience are ${ranked.slice(-2).map(a => a.label.toLowerCase()).join(' and ')}.`;

  return [para1, para2, para3, para4].filter(Boolean);
}

/** Concrete do / avoid guidance derived from which houses are lit. */
function buildGuidance(signals, areaScores) {
  const dos = [];
  const avoid = [];
  const byHouse = new Map(signals.map(s => [s.house, s]));

  const add = (list, text) => { if (!list.includes(text)) list.push(text); };

  if (areaScores.career >= 60) add(dos, 'Put your case forward at work — it will be heard.');
  if (areaScores.career < 45) add(avoid, 'Avoid confronting a senior or forcing a decision.');
  if (areaScores.finance >= 60) add(dos, 'A good window to collect dues or close a pending payment.');
  if (areaScores.finance < 45) add(avoid, 'Avoid lending money or signing a large commitment.');
  if (areaScores.love >= 60) add(dos, 'Say the thing you have been postponing to someone close.');
  if (areaScores.love < 45) add(avoid, 'Avoid reopening an old argument with a partner.');
  if (areaScores.health < 48) add(avoid, 'Avoid skipping meals, late nights and over-exertion.');
  if (areaScores.health >= 60) add(dos, 'Good time to restart exercise or a health routine.');
  if (areaScores.education >= 58) add(dos, 'Concentration is good — use it for the hardest subject first.');
  if (areaScores.travel < 45) add(avoid, 'Confirm bookings twice; avoid unplanned journeys.');
  if (areaScores.travel >= 62) add(dos, 'Journeys and outdoor plans are supported.');

  for (const h of [6, 8, 12]) {
    const s = byHouse.get(h);
    if (s && s.score < 0) add(avoid, `Keep ${HOUSE_MEANING[h]} low-key while ${s.planet} passes through.`);
  }
  for (const h of [1, 5, 9, 10, 11]) {
    const s = byHouse.get(h);
    if (s && s.score > 0) add(dos, `Lean on ${HOUSE_MEANING[h]} — ${s.planet} supports it right now.`);
  }

  if (!dos.length) add(dos, 'Keep to routine work; steady effort suits this window better than big moves.');
  if (!avoid.length) add(avoid, 'Nothing sharply contraindicated — avoid overcommitting out of optimism.');
  return { do: dos.slice(0, 5), avoid: avoid.slice(0, 5) };
}

/**
 * Remedy keyed to the weakest planet in the reading, following standard
 * graha-shanti practice rather than a generic suggestion.
 */
function buildRemedy(signals, lord) {
  const weakest = [...signals].sort((a, b) => a.score - b.score)[0];
  const target = weakest && weakest.score < 0 ? weakest.planet : lord;
  const p = LORD_PROFILE[target] || LORD_PROFILE[lord] || LORD_PROFILE.Jupiter;
  const shadow = target === 'Rahu' || target === 'Ketu';
  return {
    planet: target,
    reason: weakest && weakest.score < 0
      ? `${target} is the planet under most pressure from your sign in this window.`
      : `${target} rules your sign, so strengthening it supports the whole chart.`,
    deity: shadow ? (target === 'Rahu' ? 'Durga' : 'Ganesha') : p.deity,
    mantra: shadow ? (target === 'Rahu' ? 'ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः' : 'ॐ स्रां स्रीं स्रौं सः केतवे नमः') : p.mantra,
    count: 108,
    day: shadow ? 'Saturday' : p.day,
    action: shadow
      ? 'Feed stray dogs or offer black sesame; recite the mantra after sunset.'
      : `Offer water or a lamp on ${p.day}, and recite the mantra 108 times in the morning.`,
    charity: shadow ? 'Blankets or sesame to those in need' : `Items associated with ${target} — ${p.metal.toLowerCase()}, or food in its colour`,
    note: 'Traditional remedial practice. Offered as devotional guidance, not as a substitute for medical, legal or financial advice.',
  };
}

/** Lucky factors — deterministic from sign lord, weekday and Moon nakshatra. */
function buildLucky(lord, iso, moonNakshatraIndex, areaScores) {
  const p = LORD_PROFILE[lord] || LORD_PROFILE.Jupiter;
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  const { y, m, d } = isoToParts(iso);
  // A stable per-day rotation so the colour and number vary across the week
  // without ever being random.
  const rot = (d + m + y + moonNakshatraIndex) % 3;
  return {
    number: p.numbers[rot],
    alternateNumber: p.numbers[(rot + 1) % 3],
    color: p.colors[rot],
    direction: p.direction,
    time: p.time,
    metal: p.metal,
    gemstone: p.gem,
    deity: p.deity,
    weekday: WEEKDAYS[weekday],
    weekdayLord: WEEKDAY_LORD[weekday],
    bestFor: AREAS.filter(a => a.id !== 'overall').sort((a, b) => areaScores[b.id] - areaScores[a.id])[0].label,
  };
}

/* ------------------------------------------------------------------- API */

/**
 * Full reading for one sign.
 * @param {object} opts
 * @param {string} opts.sign     English, Sanskrit or Hindi sign name
 * @param {string} opts.period   daily | weekly | monthly | yearly
 * @param {string} opts.date     ISO date, defaults to today
 */
export function buildSignHoroscope({ sign = 'Aries', period = 'daily', date } = {}) {
  const iso = date || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw Object.assign(new Error('date must be YYYY-MM-DD'), { code: 'INVALID_REQUEST' });
  }
  const p = PERIOD_DAYS[period] ? period : 'daily';
  const signIdx = signIndexOf(sign);
  if (signIdx < 0) throw Object.assign(new Error(`Unknown rāśi: ${sign}`), { code: 'INVALID_REQUEST' });
  const signName = SIGNS[signIdx];

  // Sample the midpoint of the window so a weekly or monthly reading reflects
  // the whole span rather than only its first morning.
  const span = PERIOD_DAYS[p];
  const midIso = span > 1 ? addDaysIso(iso, Math.floor(span / 2)) : iso;
  const positions = getTransitPositions(jdForDate(midIso));

  const signals = Object.entries(positions)
    .map(([planet, pos]) => buildSignal(planet, pos, signIdx, p))
    .sort((a, b) => b.score - a.score);

  const areaScores = scoreAreas(signals);

  const moonPos = positions.Moon;
  const moonNakIdx = Math.max(0, NAKSHATRAS.indexOf(moonPos.nakshatra));
  const moon = {
    sign: SIGNS[moonPos.sign],
    degree: round1(moonPos.siderealLon % 30),
    nakshatra: moonPos.nakshatra,
    nakshatraLord: NAKSHATRA_LORDS[moonNakIdx] || null,
    pada: Math.floor(((moonPos.siderealLon % (360 / 27)) / (360 / 108))) + 1,
    house: ((moonPos.sign - signIdx + 12) % 12) + 1,
  };

  const lord = SIGN_LORDS[signName];
  const areas = AREAS.map(a => {
    const score = areaScores[a.id];
    return {
      id: a.id, label: a.label, icon: a.icon,
      score, stars: starsFor(score), tone: toneFor(score),
      toneLabel: TONE_LABEL[toneFor(score)],
      text: areaText(a.id, score, signals),
    };
  });

  const endIso = span > 1 ? addDaysIso(iso, span - 1) : iso;

  return {
    version: 2,
    sign: signName,
    sanskrit: SIGN_SANSKRIT[signIdx],
    hindi: SIGN_HINDI[signIdx],
    symbol: SYMBOLS[signIdx],
    signIndex: signIdx,
    lord,
    element: ELEMENTS[signIdx % 4],
    quality: QUALITIES[signIdx % 3],
    period: p,
    date: iso,
    range: { start: iso, end: endIso, days: span, sampledOn: midIso },
    overall: {
      score: areaScores.overall,
      stars: starsFor(areaScores.overall),
      tone: toneFor(areaScores.overall),
      toneLabel: TONE_LABEL[toneFor(areaScores.overall)],
      headline: `${signName} ${p} horoscope — ${TONE_LABEL[toneFor(areaScores.overall)]}`,
      reading: buildReading(signName, p, signals, areaScores, moon),
    },
    areas,
    lucky: buildLucky(lord, iso, moonNakIdx, areaScores),
    moon,
    transits: signals,
    guidance: buildGuidance(signals, areaScores),
    remedy: buildRemedy(signals, lord),
    method: 'Gochara (transit) read from the rāśi as Chandra lagna, using BPHS Ch.36 favourable-house rules weighted by planetary dignity, retrogression and period. Deterministic — the same sign and date always give the same reading.',
    disclaimer: 'Traditional rule-based interpretation. Not a scientific prediction and not a substitute for professional advice.',
  };
}

/** All twelve signs for one date and period — used by the horoscope index. */
export function buildAllSignHoroscopes({ period = 'daily', date } = {}) {
  const iso = date || new Date().toISOString().slice(0, 10);
  const signs = SIGNS.map((s, i) => {
    const h = buildSignHoroscope({ sign: s, period, date: iso });
    return {
      sign: h.sign, sanskrit: h.sanskrit, hindi: h.hindi, symbol: h.symbol,
      signIndex: i, lord: h.lord, element: h.element,
      score: h.overall.score, stars: h.overall.stars,
      tone: h.overall.tone, toneLabel: h.overall.toneLabel,
      summary: h.areas.find(a => a.id === 'overall').text,
      lucky: { number: h.lucky.number, color: h.lucky.color },
      href: `/horoscope/${s.toLowerCase()}?period=${period}`,
    };
  });
  return {
    version: 2, period, date: iso,
    moon: buildSignHoroscope({ sign: 'Aries', period, date: iso }).moon,
    signs,
    disclaimer: 'Traditional rule-based interpretation. Not a scientific prediction.',
  };
}

export const SIGN_LIST = SIGNS.map((s, i) => ({
  name: s, sanskrit: SIGN_SANSKRIT[i], hindi: SIGN_HINDI[i],
  symbol: SYMBOLS[i], lord: SIGN_LORDS[s], index: i,
  slug: s.toLowerCase(),
}));

export const HOROSCOPE_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];
