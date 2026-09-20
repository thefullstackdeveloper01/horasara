/**
 * Education / higher-learning prediction engine.
 *
 * Closes V4 capability #37 ("Education has house/Dasha evidence but not a
 * dedicated, independently verified education corpus"). This module does
 * NOT invent an "education corpus" of unsourced prose. It builds a
 * deterministic evidence join, in the same spirit as bhavaPhala.js,
 * across the classical education houses/karakas/varga/Dasha layers that
 * are already computed elsewhere in the engine, and it pulls real citable
 * text only from bundled classical datasets (BPHS house-effects, BPHS
 * yoga keyword search, and — only as a clearly labelled OCR fallback —
 * the bundled scripture library). Where no genuine source matches, the
 * relevant field is left as an explicit empty array/NOT_AVAILABLE rather
 * than filled with generic astrology prose.
 *
 * Classical basis (standard Parashari house/karaka assignment, not a
 * house invented for this feature):
 *   4th house  — Vidya Sthana: foundational learning, mind, schooling
 *   5th house  — Buddhi/Purva Punya: intelligence, academic merit
 *   9th house  — higher education, Guru, doctoral/advanced study, dharma
 *   Karakas    — Mercury (intellect, learning), Jupiter (wisdom, higher knowledge)
 *   Varga      — D24 Chaturvimshamsha (classical divisional chart for education)
 */
import { getBPHSHouseEffects, getBPHSYogaByKeywords, getBPHSRemedies } from './bphsEngine.js';
import { isScriptureLibraryAvailable, searchScriptureLibrary } from '../reference/scriptureLibrary.js';
import moduleData from '../../dataset/used/core/education_config.json' with { type: 'json' };

const EDU_HOUSES = moduleData.eduHouses;
const EDU_KARAKAS = moduleData.eduKarakas;
const AFFLICTORS = moduleData.afflictors;

function list(v) { return Array.isArray(v) ? v.filter(Boolean) : []; }
function findHouse(houses, n) { return list(houses).find(h => Number(h?.number) === n) || null; }
function findPlanet(planets, name) { return list(planets).find(p => p?.name === name) || null; }

function dashaTimingForLords(dasha, relevantLords) {
  const c = dasha?.current;
  if (!c) return { status: 'NOT_AVAILABLE', windows: [], currentMahadasha: null, currentAntardasha: null };
  const levels = [
    { level: 'Mahadasha', lord: c.mahadasha, start: c.mdStart, end: c.mdEnd },
    { level: 'Antardasha', lord: c.antardasha, start: c.adStart, end: c.adEnd },
    { level: 'Pratyantardasha', lord: c.pratyantar, start: c.ptStart, end: c.ptEnd },
  ].filter(x => x.lord);
  const windows = levels.filter(x => relevantLords.includes(x.lord));
  return {
    status: windows.length ? 'ACTIVE_SUPPORT_FOUND' : 'NO_CURRENT_ACTIVATION',
    windows,
    currentMahadasha: c.mahadasha ?? null,
    currentAntardasha: c.antardasha ?? null,
  };
}

export function buildEducationProfile(R) {
  const houses = list(R?.houses);
  const planets = list(R?.planets);
  if (!houses.length || !planets.length) {
    return { status: 'NOT_AVAILABLE', reason: 'Chart houses/planets were not supplied to the education engine.' };
  }

  const houseRows = EDU_HOUSES.map(n => {
    const h = findHouse(houses, n) || {};
    const occupants = planets.filter(p => Number(p?.house) === n).map(p => p.name);
    const lordPlanet = h.lord ? findPlanet(planets, h.lord) : null;
    const classicalEffects = getBPHSHouseEffects(n, occupants).shlokas
      .map(s => ({ english: s.english, citation: s.citation }));
    return {
      house: n,
      sign: h.sign ?? null,
      lord: h.lord ?? null,
      lordPlacedInHouse: lordPlanet?.house ?? null,
      lordDignity: lordPlanet?.dignity ?? null,
      occupants,
      classicalEffects,
    };
  });

  const karakaRows = EDU_KARAKAS.map(name => {
    const p = findPlanet(planets, name);
    if (!p) return { planet: name, status: 'NOT_AVAILABLE' };
    return { planet: name, house: p.house ?? null, sign: p.sign ?? null, dignity: p.dignity ?? null };
  });

  const fourthLord = houseRows[0].lord;
  const fifthLord = houseRows[1].lord;
  const fourthLordPlanet = fourthLord ? findPlanet(planets, fourthLord) : null;
  const fifthLordPlanet = fifthLord ? findPlanet(planets, fifthLord) : null;
  const fourthFifthLordConnection = (fourthLordPlanet && fifthLordPlanet) ? {
    fourthLordHouse: fourthLordPlanet.house ?? null,
    fifthLordHouse: fifthLordPlanet.house ?? null,
    conjunct: fourthLord !== fifthLord && fourthLordPlanet.house != null && fourthLordPlanet.house === fifthLordPlanet.house,
    mutualExchange: fourthLordPlanet.house === 5 && fifthLordPlanet.house === 4,
  } : null;

  const contradictions = [4, 5].map(n => {
    const occ = planets.filter(p => Number(p?.house) === n && AFFLICTORS.includes(p.name)).map(p => p.name);
    return occ.length ? {
      house: n, planets: occ,
      note: `${occ.join(' and ')} placed in house ${n} — classically read as a possible source of delay, distraction or interruption to study, not a blockage; weigh against the supporting factors above.`,
    } : null;
  }).filter(Boolean);

  const d24Lagna = R?.vargas?.ascendant?.D24 ?? null;
  const d24Mercury = R?.vargas?.Mercury?.D24 ?? null;
  const d24Jupiter = R?.vargas?.Jupiter?.D24 ?? null;
  const varga = (d24Lagna || d24Mercury || d24Jupiter) ? {
    status: 'AVAILABLE',
    scope: 'D24 Chaturvimshamsha sign placement only — not a full house-relative D24 chart, so lordship/aspect analysis in D24 is not claimed here.',
    lagna: d24Lagna, mercury: d24Mercury, jupiter: d24Jupiter,
  } : { status: 'NOT_AVAILABLE', reason: 'D24 varga data was not present on the calculated chart object.' };

  const relevantLords = [...new Set([fourthLord, fifthLord, houseRows[2].lord, 'Mercury', 'Jupiter'].filter(Boolean))];
  const timing = dashaTimingForLords(R?.dasha, relevantLords);

  const classicalYoga = getBPHSYogaByKeywords(['learning', 'education', 'intellect', 'vidya', 'knowledge']);
  const remedies = getBPHSRemedies(['education', 'saraswati', 'vidya', 'learning']);

  let scriptureNotes = [];
  if (classicalYoga.length === 0 && isScriptureLibraryAvailable()) {
    scriptureNotes = searchScriptureLibrary(['vidya sthana education', 'Saraswati Yoga'], { maxResults: 2 })
      .map(h => ({
        title: h.title, snippet: h.snippet, source: h.source,
        note: 'OCR excerpt from the bundled scripture library — verify against the original edition before quoting; not a structured, proofread rule.',
      }));
  }

  const evidenceCount =
    houseRows.filter(h => h.occupants.length || h.lordDignity).length +
    karakaRows.filter(k => k.dignity).length +
    (fourthFifthLordConnection?.conjunct || fourthFifthLordConnection?.mutualExchange ? 1 : 0);
  const evidenceStrength = evidenceCount >= 4 ? 'Well-supported'
    : evidenceCount >= 2 ? 'Some supporting factors'
    : 'Limited chart evidence';

  return {
    status: 'AVAILABLE',
    scope: 'Traditional Parashari house (4th/5th/9th), karaka (Mercury/Jupiter), D24-varga and Dasha-timing synthesis for learning aptitude and favorable study periods.',
    houses: houseRows,
    karakas: karakaRows,
    fourthFifthLordConnection,
    contradictions,
    varga,
    dashaTiming: timing,
    classicalYoga,
    remedies,
    scriptureNotes,
    evidenceStrength,
    methodology: 'Canonical join of already-calculated houses/planets/varga/Dasha objects; no second chart calculation and no invented combinations beyond standard Parashari house/karaka assignment.',
    disclaimer: 'Symbolic, traditional interpretation of learning aptitude and favorable periods for study. It is not predictive of specific exam scores, admissions decisions or institutional outcomes, and is not a substitute for academic or career counselling.',
  };
}

export default { buildEducationProfile };
