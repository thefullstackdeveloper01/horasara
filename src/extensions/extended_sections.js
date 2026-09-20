// ============================================================
// VEDIC JYOTISH ENGINE v8 — EXTENDED SECTIONS 26-35
// Birth→Now Timeline | 25-Year Forecast | Daily Horoscope
// Life Predictions | Career | Health | Marriage | Remedies
// ============================================================

import {
  SIGNS, SIGN_LORDS, NAKSHATRAS, NAKSHATRA_LORDS,
  DASHA_YEARS, DASHA_ORDER, PLANETS, PLANET_NATURE,
  NATURAL_FRIENDS, NATURAL_ENEMIES, EXALTATION, DEBILITATION, OWN_SIGNS,
  MOOLATRIKONA, GEMSTONE_REMEDIES, LUCKY_DATA, TRANSIT_EFFECTS,
  BINDU_TABLE, TITHIS, VARA_NAMES, getPlanetDignity, HOUSE_SIGNIFICATIONS
} from '../astronomy/constants.js';
import { mod360, signOf, nakshatraOf, jdToDate, formatDate, julianDay } from '../astronomy/utils.js';
import { calcPlanetPosition } from '../astronomy/vsop87.js';
import signCareerThemes from '../../dataset/used/core/sign_career_themes.json' with { type: 'json' };
import { calcVimshottari, calcAntardashas } from '../dasha/vimshottari.js';
import { dashaScore, starsFromDashaScore, starsFromCappedScore, lordshipTheme, occupiedHouseTheme, applyRealisticScoreCap } from '../prediction/lordshipQuality.js';
import { getKPPosition } from '../kp/kp_system.js';

const { sin, cos, floor, abs, PI } = Math;

// ─── UTILITY ──────────────────────────────────────────────────────────────────
function pad(s, n) { s = String(s||''); return s + ' '.repeat(Math.max(0, n - s.length)); }
function col2(a, b) { return '  ' + pad(a, 38) + b; }
function col3(a, b, c) { return '  ' + pad(a, 26) + pad(b, 26) + (c||''); }

// Planet dignity in a sign — imported from astronomy/constants.js
// (was a locally-duplicated copy; see dead-code/duplication audit note there)

// FIX (audit): dasha quality used to be judged ONLY from where a planet
// SITS (occupied house + sign dignity + Ashtakavarga), ignoring what houses
// it RULES from the Ascendant — that produced results like "Jupiter MD ★★
// Bad" for a chart where Jupiter is the 10th lord sitting in the 10th house,
// which classical BPHS can never call a bad dasha. dashQualityScore/
// starsFromScore now live in src/prediction/lordshipQuality.js as
// dashaScore()/starsFromDashaScore(), which read the functional-nature
// (lordship-based) classification engine.js already attaches to every
// planet (p.functionalNature/p.functionalGrade) and use it as the dominant
// factor. See that file's header comment for the full rationale.
function dashQualityScore(planet, house, avPts, dignity, planets) {
  return dashaScore(planet, house, dignity, avPts, planets).score;
}
function starsFromScore(score, planet, house, dignity, avPts, planets) {
  // FIX (bug report audit, Section 21 rating conflict): route through
  // starsFromCappedScore() so this label can never claim a higher tier
  // (e.g. "5 stars/Peak Growth") than the corresponding numeric /10 score
  // would independently support — see that function's header comment.
  return starsFromCappedScore(dashaScore(planet, house, dignity, avPts, planets), { avPts, dignity });
}

// ─── SECTION 26: BIRTH TO NOW LIFE TIMELINE ────────────────────────────────
export function buildBirthToNowTimeline(birthData, planets, houses, dashas, avData, NOW_JD) {
  const { year: birthYear, month: birthMonth, day: birthDay } = birthData;
  const nowDate = jdToDate(NOW_JD);
  const ageNow = nowDate.year - birthYear - (
    (nowDate.month < birthMonth || (nowDate.month === birthMonth && nowDate.day < birthDay)) ? 1 : 0
  );
  
  const lines = [];
  lines.push('');
  lines.push('  Birth-to-Now Life Timeline Analysis');
  lines.push('  From: ' + birthDay + '/' + birthMonth + '/' + birthYear + '  →  Today: ' + nowDate.day + '/' + nowDate.month + '/' + nowDate.year);
  lines.push('  Total Life Span Analyzed: ' + ageNow + ' Years');
  lines.push('');

  // Phase each dasha period that has passed
  const dashaPhases = [
    { ageRange: '0-7',   label: 'Early Childhood', theme: 'Foundation, health, family environment' },
    { ageRange: '7-14',  label: 'Childhood',        theme: 'Education, mental growth, habits' },
    { ageRange: '14-21', label: 'Adolescence',       theme: 'Identity, education, relationships' },
    { ageRange: '21-28', label: 'Young Adult',       theme: 'Career start, marriage, independence' },
    { ageRange: '28-35', label: 'Establishment',     theme: 'Career peak, family building, wealth' },
    { ageRange: '35-42', label: 'Maturity',          theme: 'Authority, leadership, consolidation' },
    { ageRange: '42-49', label: 'Middle Age',        theme: 'Review, spiritual awakening, wisdom' },
    { ageRange: '49-56', label: 'Senior',            theme: 'Legacy, guidance, health focus' },
    { ageRange: '56+',   label: 'Elder',             theme: 'Spirituality, inheritance, moksha' },
  ];

  lines.push('  ── Life Phases (Dasha-based) ──────────────────────────────────────────────');
  lines.push(col3('Age Range', 'Mahadasha', 'Phase Quality | Key Theme'));
  lines.push(col3('─'.repeat(24), '─'.repeat(26), '─'.repeat(28)));

  for (const dasha of dashas) {
    const dStart = jdToDate(dasha.startJD);
    const dEnd   = jdToDate(dasha.endJD);
    const startAge = dStart.year - birthYear;
    const endAge   = dEnd.year   - birthYear;
    if (endAge < 0) continue;
    if (startAge > ageNow + 2) break;

    const signOfPlanet = planets.find(p => p.name === dasha.mahadasha);
    const signName     = signOfPlanet ? SIGNS[signOf(signOfPlanet.siderealLon)] : '?';
    const houseNo      = houses.findIndex(h => h.sign === signName) + 1 || signOfPlanet?.house || 1;
    const dignity      = getPlanetDignity(dasha.mahadasha, signName);
    const avHouse      = (avData?.raw || [])[houseNo - 1] || 25;
    const qScore       = dashQualityScore(dasha.mahadasha, houseNo, avHouse, dignity, planets);
    const stars        = starsFromScore(qScore, dasha.mahadasha, houseNo, dignity, avHouse, planets);

    const phaseLabel = startAge < 7 ? 'Foundation' : startAge < 14 ? 'Childhood' :
      startAge < 21 ? 'Adolescence' : startAge < 28 ? 'Young Adult' :
      startAge < 35 ? 'Establishment' : startAge < 42 ? 'Maturity' :
      startAge < 49 ? 'Middle Age' : 'Elder';

    const isCurrent = dStart.year <= nowDate.year && dEnd.year >= nowDate.year;
    const marker = isCurrent ? ' ◄ CURRENT' : '';

    lines.push(col3(
      `${dStart.year}–${dEnd.year} (${Math.max(0,startAge)}–${Math.max(0,endAge)})`,
      dasha.mahadasha + ' Mahadasha' + marker,
      stars
    ));
    lines.push('     Phase: ' + phaseLabel + ' | Dignity: ' + dignity + ' | H' + houseNo);
  }

  lines.push('');
  lines.push('  ── Key Life Events by Dasha Period ────────────────────────────────────────');
  lines.push('');

  // Generate narrative events per dasha
  const eventMap = {
    Sun:    ['Governement/authority opportunities','Father-related events','Identity and ego','Health vitality peak','Recognition and fame'],
    Moon:   ['Mother-related events','Emotional changes','Home and property','Travel, mental activity','Public interactions'],
    Mars:   ['Physical activity and energy surge','Siblings and courage','Property/land dealings','Surgery or accidents possible','Competitive success'],
    Mercury:['Education and communication','Business ventures','Short travels','Mental agility','Writing, media, commerce'],
    Jupiter:['Wisdom and knowledge expansion','Marriage/children possibility','Guru/teacher connections','Religious activities','Financial growth'],
    Venus:  ['Romance and relationships','Arts and luxury','Marriage timing','Financial comforts','Beauty and creativity'],
    Saturn: ['Hard work and discipline','Karmic lessons','Delays and obstacles first','Long-term stability later','Service and humility'],
    Rahu:   ['Foreign connections','Technology and innovation','Unconventional paths','Sudden changes','Obsessive focus'],
    Ketu:   ['Spiritual awakening','Detachment from material','Research and investigation','Past karma resolution','Hidden knowledge'],
  };

  for (const dasha of dashas) {
    const dStart = jdToDate(dasha.startJD);
    const dEnd   = jdToDate(dasha.endJD);
    const startAge = dStart.year - birthYear;
    const endAge   = dEnd.year   - birthYear;
    if (endAge < 0) continue;
    if (startAge > ageNow + 2) break;

    const events = eventMap[dasha.mahadasha] || [];
    lines.push('  ' + dasha.mahadasha + ' Mahadasha (' + dStart.year + '–' + dEnd.year + ', Age ' + Math.max(0,startAge) + '–' + Math.max(0,endAge) + '):');
    for (const ev of events.slice(0, 3)) lines.push('    • ' + ev);
    lines.push('');
  }

  return lines;
}

// ─── SECTION 27: 25-YEAR FUTURE FORECAST ────────────────────────────────────
export function buildFutureForecast(birthData, planets, houses, dashas, avData, NOW_JD, AYANAMSA, dashaMeaningsData, neechaBhangaData = []) {
  const nowDate = jdToDate(NOW_JD);
  const endYear = nowDate.year + 25;
  const lines = [];

  lines.push('');
  lines.push('  25-Year Future Forecast: ' + nowDate.year + ' → ' + endYear);
  lines.push('  Based on: Vimshottari Dasha + Transit Overlay + Ashtakavarga');
  lines.push('');

  // Future dasha periods
  lines.push('  ── Future Dasha Timeline ──────────────────────────────────────────────────');
  lines.push(col3('Year Range', 'Mahadasha / Antardasha', 'Quality | Prediction Theme'));
  lines.push(col3('─'.repeat(24), '─'.repeat(28), '─'.repeat(26)));

  const AREA_PREDICTIONS = {
    Sun_1:  'Career authority, government gains, father health',
    Sun_4:  'Home purchase, mother wellness, vehicle possible',
    Sun_7:  'Marriage or partnership changes',
    Sun_9:  'Spiritual journeys, father prosperity, higher learning',
    Sun_10: 'Promotion, fame, career peak',
    Moon_1: 'Health focus, personality refresh',
    Moon_4: 'Home comfort, mother blessed, domestic peace',
    Moon_7: 'Marriage happiness, public popularity',
    Moon_10:'Career in public domain, media, hospitality',
    Moon_11:'Financial gains, elder sibling benefits',
    Mars_1: 'Physical vitality, new beginnings, surgery possible',
    Mars_5: 'Children focus, speculation gains',
    Mars_7: 'Marriage conflicts or passion, legal matters',
    Mars_10:'Engineering/military career rise',
    Mercury_1:'Communication skills peak, learning',
    Mercury_7:'Business partnerships, negotiations',
    Mercury_10:'Writing, media, technology career',
    Jupiter_1:'Wisdom, body weight, philosophical outlook',
    Jupiter_5:'Children birth/education, speculation gains',
    Jupiter_7:'Blessed marriage, business partnership',
    Jupiter_9:'Pilgrimage, higher education, prosperity',
    Jupiter_10:'Career as advisor, teacher, law',
    Venus_2: 'Wealth accumulation, family harmony',
    Venus_5: 'Romance, arts, children',
    Venus_7: 'Marriage, luxury, pleasure',
    Venus_10:'Arts/beauty career, creative peak',
    Saturn_1:'Discipline, health challenges, self-reinvention',
    Saturn_7:'Marriage tests, business trials → stability later',
    Saturn_10:'Career hard work → promotion after delay',
    Saturn_11:'Long-term gains through consistent effort',
    Rahu_1: 'Identity transformation, foreign influence',
    Rahu_7: 'Foreign spouse possible, unconventional relationship',
    Rahu_9: 'Foreign travel, technology innovations',
    Rahu_10:'Unconventional career rise, technology',
    Ketu_1: 'Spiritual search, health introspection',
    Ketu_5: 'Children challenges, spiritual children',
    Ketu_9: 'Past-life karma from father, spiritual guru',
    Ketu_12:'Liberation, foreign lands, meditation',
  };

  for (const dasha of dashas) {
    const dStart = jdToDate(dasha.startJD);
    const dEnd   = jdToDate(dasha.endJD);
    if (dEnd.year < nowDate.year) continue;
    if (dStart.year > endYear) break;

    const pl = planets.find(p => p.name === dasha.mahadasha);
    const signName = pl ? SIGNS[signOf(pl.siderealLon)] : '?';
    const houseNo  = pl?.house || (houses.findIndex(h => h.sign === signName) + 1) || 1;
    const dignity  = getPlanetDignity(dasha.mahadasha, signName);
    const avPts    = (avData?.raw || [])[houseNo - 1] || 25;
    const qScore   = dashQualityScore(dasha.mahadasha, houseNo, avPts, dignity, planets);
    const stars    = starsFromScore(qScore, dasha.mahadasha, houseNo, dignity, avPts, planets);
    const themeKey = dasha.mahadasha + '_' + houseNo;
    // FIX (audit): fall back to this chart's own house-lordship text (from
    // dasha_meanings.json house_effects, the same authored data Section 47
    // already uses) instead of a static "planet in house" map that only
    // covered a handful of combinations and silently produced a generic,
    // non-personalized line ("General life events...") for everything else —
    // e.g. it had no entry at all for Rahu in the 12th house.
    const dynTheme = lordshipTheme(dasha.mahadasha, houses, dashaMeaningsData).effects[0];
    const occTheme = occupiedHouseTheme(dasha.mahadasha, houseNo, HOUSE_SIGNIFICATIONS, planets);
    const theme    = AREA_PREDICTIONS[themeKey] || dynTheme || occTheme || 'General life events as per ' + dasha.mahadasha + ' in H' + houseNo;

    const isCurrent = dStart.year <= nowDate.year && dEnd.year >= nowDate.year;
    lines.push(col3(
      dStart.year + '–' + dEnd.year,
      dasha.mahadasha + ' MD' + (isCurrent ? ' ◄ CURRENT' : ''),
      stars
    ));
    lines.push('     H' + houseNo + ' | ' + dignity + ' | AV:' + avPts + ' | ' + theme);
    lines.push('');

    // Sub-periods within this dasha that overlap our window
    const antars = calcAntardashas(dasha);
    for (const a of antars) {
      const aStart = jdToDate(a.startJD);
      const aEnd   = jdToDate(a.endJD);
      if (aEnd.year < nowDate.year) continue;
      if (aStart.year > endYear) break;

      const apl   = planets.find(p => p.name === a.antardasha);
      const aSgn  = apl ? SIGNS[signOf(apl.siderealLon)] : '?';
      const aHno  = apl?.house || (houses.findIndex(h => h.sign === aSgn) + 1) || 1;
      const aDig  = getPlanetDignity(a.antardasha, aSgn);
      const aAvPts= (avData?.raw || [])[aHno - 1] || 25;
      const aScore= dashQualityScore(a.antardasha, aHno, aAvPts, aDig, planets);
      const aStars= starsFromScore(aScore, a.antardasha, aHno, aDig, aAvPts, planets);
      const isCurA= a.startJD <= NOW_JD && a.endJD >= NOW_JD;

      lines.push('     ' + pad(aStart.year + ' ' + _mon(aStart.month) + ' – ' + aEnd.year + ' ' + _mon(aEnd.month), 30) +
        a.antardasha + ' AD' + (isCurA ? ' ◄' : '') + '  ' + aStars);
    }
    lines.push('');
  }

  // Annual Score Chart
  lines.push('');
  lines.push('  ── Annual Score Chart (' + nowDate.year + '–' + endYear + ') ─────────────────────────────');
  lines.push('  Year  | Overall Score | Top Area | Advice');
  lines.push('  ' + '─'.repeat(70));

  for (let yr = nowDate.year; yr <= endYear; yr++) {
    const yrJD = julianDay(yr, 6, 15, 0);
    let activeDasha = null, activeAntar = null;
    for (const d of dashas) {
      if (d.startJD <= yrJD && d.endJD >= yrJD) {
        activeDasha = d;
        const antars = calcAntardashas(d);
        for (const a of antars) {
          if (a.startJD <= yrJD && a.endJD >= yrJD) { activeAntar = a; break; }
        }
        break;
      }
    }
    if (!activeDasha) continue;

    const pl  = planets.find(p => p.name === activeDasha.mahadasha);
    const sgn = pl ? SIGNS[signOf(pl.siderealLon)] : '?';
    const hno = pl?.house || 1;
    const dig = getPlanetDignity(activeDasha.mahadasha, sgn);
    const av  = (avData?.raw || [])[hno - 1] || 25;
    let scoreNum = 5 + dashQualityScore(activeDasha.mahadasha, hno, av, dig, planets);
    scoreNum = Math.max(1, Math.min(10, scoreNum));

    // Transit bonus (Jupiter/Saturn position)
    let transitSupportive = true;
    const saturnTransit = calcPlanetPosition('Saturn', yrJD);
    if (saturnTransit) {
      // FIX (Phase 4/5 audit): calcPlanetPosition().lon is ALREADY sidereal
      // (see vsop87.js) — subtracting AYANAMSA again shifted Saturn by a
      // full ayanamsa (~24°), usually into the wrong sign, which fed a
      // wrong transit bonus into this exact yearly score (the one Phase 3
      // added the realistic-score cap to). The cap logic was sound; the
      // sign it was reacting to was not.
      const satTrSign = signOf(mod360(saturnTransit.lon));
      const moonSign  = pl ? signOf(pl.siderealLon) : 0;
      const satHFromMoon = ((satTrSign - moonSign + 12) % 12) + 1;
      if ([1,2,12].includes(satHFromMoon)) { scoreNum = Math.max(1, scoreNum - 1); transitSupportive = false; }
      if ([3,6,11].includes(satHFromMoon)) scoreNum = Math.min(10, scoreNum + 1);
    }

    // SECTION 3 GUARD (Realistic Scoring): low Ashtakavarga or an
    // uncancelled Enemy/Debilitated dasha lord caps the score at 6; a 9-10
    // score requires dignity + Ashtakavarga(>30) + transit to ALL align —
    // prevents an inflated score from reading as "9-10 for N straight years".
    const isCancelledDebil = dig === 'Debilitated' &&
      neechaBhangaData.some(n => n.planet === activeDasha.mahadasha && n.isCancelled);
    const capped = applyRealisticScoreCap(scoreNum, {
      avPts: av, dignity: dig, isCancelled: isCancelledDebil, transitSupportive,
    });
    scoreNum = capped.score;

    const topArea = [1,4,7,10].includes(hno) ? 'Career/Relations' :
                    [2,11].includes(hno) ? 'Finance/Gains' :
                    [5,9].includes(hno) ? 'Education/Luck' : 'Challenges/Growth';
    const advice  = scoreNum >= 7 ? 'Excellent — expand and invest' :
                    scoreNum >= 5 ? 'Good — steady progress' :
                    scoreNum >= 3 ? 'Mixed — proceed with caution' : 'Difficult — patience required';

    const bar = '█'.repeat(scoreNum) + '░'.repeat(10 - scoreNum);
    lines.push('  ' + yr + '  | ' + pad(String(scoreNum) + '/10', 14) + '| ' + pad(topArea, 20) + '| ' + advice + (capped.capped ? '  ⚠' : ''));
    if (capped.capped) lines.push('       (capped: ' + capped.capReason + ')');
    if (yr % 5 === 0) lines.push('       [' + bar + '] ' + activeDasha.mahadasha + '/' + (activeAntar?.antardasha || '') + ' Dasha');
  }

  return lines;
}

function _mon(m) { return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]||''; }

// ─── SECTION 28: TODAY'S DAILY HOROSCOPE ────────────────────────────────────
export function buildDailyHoroscope(birthData, natalPlanets, ascSign, moonSign, dashaInfo, AYANAMSA, NOW_JD, avData, canonicalTransitSnapshot = null) {
  const today = jdToDate(NOW_JD);
  const lines = [];

  lines.push('');
  lines.push('  TODAY\'S COMPLETE HOROSCOPE — ' + today.day + ' ' + _mon(today.month) + ' ' + today.year);
  lines.push('  (' + VARA_NAMES[today.weekday || _weekday(NOW_JD)] + ' | Transit analysis from Moon and Lagna)');
  lines.push('');

  // Current transits — consume the engine's immutable canonical snapshot so
  // this section cannot disagree with Today's Forecast/Panchanga.
  const transitPlanets = {};
  const transPlanetNames = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  if (canonicalTransitSnapshot?.planets) {
    for (const pName of transPlanetNames) {
      const tp = canonicalTransitSnapshot.planets[pName];
      if (tp) transitPlanets[pName] = { lon: tp.siderealLon, sign: SIGNS[tp.sign], signIdx: tp.sign, speed: tp.speed || 0 };
    }
    for (const pName of ['Rahu','Ketu']) {
      const tp = canonicalTransitSnapshot.planets[pName];
      if (tp) transitPlanets[pName] = { lon: tp.siderealLon, sign: SIGNS[tp.sign], signIdx: tp.sign, speed: tp.speed || 0 };
    }
  } else {
    for (const pName of transPlanetNames) {
      const pos = calcPlanetPosition(pName, NOW_JD);
      if (pos) {
        const sidLon = mod360(pos.lon);
        transitPlanets[pName] = { lon: sidLon, sign: SIGNS[signOf(sidLon)], signIdx: signOf(sidLon), speed: pos.speed || 0 };
      }
    }
    const rahPos = calcPlanetPosition('Rahu', NOW_JD);
    if (rahPos) {
      const sidLon = mod360(rahPos.lon);
      transitPlanets.Rahu = { lon: sidLon, sign: SIGNS[signOf(sidLon)], signIdx: signOf(sidLon) };
      const ketuLon = mod360(sidLon + 180);
      transitPlanets.Ketu = { lon: ketuLon, sign: SIGNS[signOf(ketuLon)], signIdx: signOf(ketuLon) };
    }
  }

  const moonSignIdx  = SIGNS.indexOf(moonSign);
  const lagnaSignIdx = SIGNS.indexOf(ascSign);

  lines.push('  ── Transit Planets Today ─────────────────────────────────────────────────');
  lines.push(col3('Planet', 'Current Sign', 'House from Moon | House from Lagna'));
  lines.push(col3('─'.repeat(24), '─'.repeat(24), '─'.repeat(30)));

  for (const [pName, tp] of Object.entries(transitPlanets)) {
    const hFromMoon  = ((tp.signIdx - moonSignIdx  + 12) % 12) + 1;
    const hFromLagna = ((tp.signIdx - lagnaSignIdx + 12) % 12) + 1;
    lines.push(col3(pName, tp.sign, 'H' + hFromMoon + ' from Moon  |  H' + hFromLagna + ' from Lagna'));
  }
  lines.push('');

  // Panchanga today
  const sunPos  = transitPlanets['Sun'];
  const moonPos = transitPlanets['Moon'];

  if (sunPos && moonPos) {
    const tithiDeg = mod360(moonPos.lon - sunPos.lon);
    const tithiNum = floor(tithiDeg / 12) + 1;
    const paksha   = tithiDeg < 180 ? 'Shukla (Bright Half)' : 'Krishna (Dark Half)';
    const tithiName= TITHIS ? (TITHIS[((tithiNum - 1) % 30)] || 'Tithi-' + tithiNum) : 'Tithi-' + tithiNum;
    const wd       = _weekday(NOW_JD);
    const varaNm   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][wd];

    const nakIdx   = nakshatraOf(moonPos.lon);
    const nakName  = NAKSHATRAS[nakIdx];
    const nakLord  = NAKSHATRA_LORDS[nakIdx];

    lines.push('  ── Today\'s Panchanga ─────────────────────────────────────────────────────');
    lines.push(col2('Tithi:', tithiName + ' (' + paksha + ')'));
    lines.push(col2('Vara (Weekday):', varaNm));
    lines.push(col2('Moon Nakshatra:', nakName + ' (Lord: ' + nakLord + ')'));
    lines.push(col2('Moon Sign:', moonPos.sign));
    lines.push(col2('Sun Sign:', sunPos.sign));
    lines.push('');
  }

  // Tarabala (transit moon vs natal moon nakshatra)
  if (moonPos) {
    const natalMoon = natalPlanets.find(p => p.name === 'Moon');
    const natalMoonNak = natalMoon ? nakshatraOf(natalMoon.siderealLon) : 0;
    const transNakIdx  = nakshatraOf(moonPos.lon);
    const tara = ((transNakIdx - natalMoonNak + 27) % 9) + 1;
    const TARA_NAMES = ['Janma','Sampat','Vipat','Kshema','Pratyak','Sadhaka','Vadha','Mitra','Parama Mitra'];
    const TARA_NATURE = ['Neutral','Good','Bad','Good','Bad','Good','Bad','Good','Excellent'];
    const taraName = TARA_NAMES[tara - 1] || 'Unknown';
    const taraNature = TARA_NATURE[tara - 1] || 'Mixed';
    lines.push('  ── Tarabala (Moon Transit Compatibility) ─────────────────────────────────');
    lines.push(col2('Birth Nakshatra:', natalMoon ? (natalMoon.nakshatra + ' Pada ' + (natalMoon.pada ?? '?')) : 'NOT_AVAILABLE'));
    lines.push(col2('Today\'s Moon Nakshatra:', NAKSHATRAS[nakshatraOf(moonPos.lon)]));
    lines.push(col2('Tara:', tara + ' – ' + taraName + ' (' + taraNature + ')'));
    lines.push('');
  }

  // Score calculation
  let dayScore = 5; // base
  const moonSignIdxToday = moonPos?.signIdx ?? moonSignIdx;
  const hMoonFromNatal   = ((moonSignIdxToday - moonSignIdx + 12) % 12) + 1;
  if ([1,4,7,10].includes(hMoonFromNatal)) dayScore += 1;
  if ([6,8,12].includes(hMoonFromNatal)) dayScore -= 1;

  const jupPos = transitPlanets['Jupiter'];
  if (jupPos) {
    const hJupFromMoon = ((jupPos.signIdx - moonSignIdx + 12) % 12) + 1;
    if ([2,5,7,9,11].includes(hJupFromMoon)) dayScore += 1;
    if ([6,8,12].includes(hJupFromMoon)) dayScore -= 1;
  }

  const satPos = transitPlanets['Saturn'];
  if (satPos) {
    const hSatFromMoon = ((satPos.signIdx - moonSignIdx + 12) % 12) + 1;
    if ([3,6,11].includes(hSatFromMoon)) dayScore += 1;
    if ([1,2,4,5,7,8,9,10,12].includes(hSatFromMoon)) dayScore -= 1;
  }

  dayScore = Math.max(1, Math.min(10, dayScore));
  const dayGrade = dayScore >= 8 ? 'EXCELLENT' : dayScore >= 6 ? 'GOOD' : dayScore >= 4 ? 'AVERAGE' : 'CHALLENGING';

  lines.push('  ── TODAY\'S OVERALL SCORE ─────────────────────────────────────────────────');
  lines.push('  Score: ' + dayScore + '/10  [' + '█'.repeat(dayScore) + '░'.repeat(10-dayScore) + ']  ' + dayGrade);
  lines.push('');

  // Area-wise forecast
  lines.push('  ── Area-wise Today\'s Forecast ─────────────────────────────────────────────');

  const AREA_TRANSIT_RULES = {
    Career: (h_sun, h_jup, h_sat) => {
      let s = 5;
      if ([10,1,4].includes(h_sun)) s += 1;
      if ([2,5,9,10,11].includes(h_jup)) s += 1;
      if ([10,11,6].includes(h_sat)) s += 1;
      if ([6,8,12].includes(h_sun)) s -= 1;
      if ([6,8,12].includes(h_jup)) s -= 1;
      return Math.max(1, Math.min(10, s));
    },
    Finance: (h_jup, h_ven, av2) => {
      let s = 5;
      if ([2,5,11].includes(h_jup)) s += 1;
      if ([2,11].includes(h_ven)) s += 1;
      if (av2 >= 35) s += 1;
      if ([6,8,12].includes(h_jup)) s -= 1;
      return Math.max(1, Math.min(10, s));
    },
    Health: (h_sun, h_mars, h_sat) => {
      let s = 6;
      if ([6,8,12].includes(h_sun)) s -= 1;
      if ([1,6,8].includes(h_mars)) s -= 1;
      if ([1,8].includes(h_sat)) s -= 1;
      if ([1,3,6,10,11].includes(h_sun)) s += 1;
      return Math.max(1, Math.min(10, s));
    },
    Relationships: (h_ven, h_moon, h_mars) => {
      let s = 5;
      if ([1,2,4,5,7].includes(h_ven)) s += 1;
      if ([7,1,4].includes(h_moon)) s += 1;
      if ([7,8,6].includes(h_mars)) s -= 1;
      if ([5,7,11].includes(h_ven)) s += 1;
      return Math.max(1, Math.min(10, s));
    },
    Spirituality: (h_jup, h_ketu, h_moon) => {
      let s = 5;
      if ([9,12,5,1].includes(h_jup)) s += 2;
      if ([9,12].includes(h_ketu)) s += 1;
      if ([9,12].includes(h_moon)) s += 1;
      return Math.max(1, Math.min(10, s));
    }
  };

  const calcH = (pName) => ((transitPlanets[pName]?.signIdx ?? moonSignIdx) - moonSignIdx + 12) % 12 + 1;
  const h_sun  = calcH('Sun');
  const h_moon = calcH('Moon');
  const h_mars = calcH('Mars');
  const h_jup  = calcH('Jupiter');
  const h_ven  = calcH('Venus');
  const h_sat  = calcH('Saturn');
  const h_ketu = calcH('Ketu');

  const areaScores = {
    Career:       AREA_TRANSIT_RULES.Career(h_sun, h_jup, h_sat),
    Finance:      AREA_TRANSIT_RULES.Finance(h_jup, h_ven, (avData?.raw||[])[1]||25), // FIX (audit): was hardcoded 25 — natal H2 Ashtakavarga points now used, matching the pattern used everywhere else in this file (e.g. buildFutureForecast's av2/av5/av8/av9/av11)
    Health:       AREA_TRANSIT_RULES.Health(h_sun, h_mars, h_sat),
    Relationships:AREA_TRANSIT_RULES.Relationships(h_ven, h_moon, h_mars),
    Spirituality: AREA_TRANSIT_RULES.Spirituality(h_jup, h_ketu, h_moon),
  };

  for (const [area, score] of Object.entries(areaScores)) {
    const bar   = '█'.repeat(score) + '░'.repeat(10 - score);
    const grade = score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Average' : 'Challenging';
    lines.push('  ' + pad(area + ':', 18) + '[' + bar + '] ' + score + '/10  ' + grade);
  }
  lines.push('');

  // Do's and Don'ts
  const GOOD_ACTIVITIES = {
    Sunday:    ['Sun worship, government work, father visit, ruby wearing'],
    Monday:    ['Moon worship, water activities, mother visit, pearl wearing'],
    Tuesday:   ['Hanuman puja, physical exercise, courage-based tasks, coral wearing'],
    Wednesday: ['Mercury worship, education, business, green items'],
    Thursday:  ['Jupiter worship, teaching, learning, yellow sapphire wearing'],
    Friday:    ['Lakshmi puja, luxury purchase, romantic meetings, diamond wearing'],
    Saturday:  ['Shani worship, charity to poor, iron/sesame donation, blue sapphire'],
  };
  const BAD_ACTIVITIES = {
    Sunday:    ['Starting new business, financial speculation'],
    Monday:    ['Confrontations, hard physical work'],
    Tuesday:   ['Legal filings, peace negotiations, new relationships'],
    Wednesday: ['Emotional decisions, confrontations'],
    Thursday:  ['Starting debts, gambling'],
    Friday:    ['Medical surgery, financial risks'],
    Saturday:  ['New beginnings, celebrations'],
  };

  const todayWD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][_weekday(NOW_JD)];
  const goodList = GOOD_ACTIVITIES[todayWD] || [];
  const badList  = BAD_ACTIVITIES[todayWD]  || [];

  lines.push('  ── Today\'s Do\'s and Don\'ts ──────────────────────────────────────────────');
  lines.push('  ✅ DO:');
  for (const g of goodList) lines.push('    • ' + g);
  lines.push('  ❌ AVOID:');
  for (const b of badList) lines.push('    • ' + b);
  lines.push('');

  // Hourly forecast (Hora)
  lines.push('  ── Today\'s Hora (Planetary Hours) ──────────────────────────────────────');
  const HORA_Q = { Sun:'Good', Moon:'Excellent', Mars:'Bad', Mercury:'Good', Jupiter:'Excellent', Venus:'Excellent', Saturn:'Bad' };
  const HORA_SEQ_DAY = [
    ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'],
    ['Moon','Saturn','Jupiter','Mars','Sun','Venus','Mercury'],
    ['Mars','Sun','Venus','Mercury','Moon','Saturn','Jupiter'],
    ['Mercury','Moon','Saturn','Jupiter','Mars','Sun','Venus'],
    ['Jupiter','Mars','Sun','Venus','Mercury','Moon','Saturn'],
    ['Venus','Mercury','Moon','Saturn','Jupiter','Mars','Sun'],
    ['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon'],
  ];
  const wd = _weekday(NOW_JD);
  const dayHoraSeq = HORA_SEQ_DAY[wd];
  lines.push(col3('Hora #', 'Planet', 'Quality'));
  for (let i = 0; i < 12; i++) {
    const p = dayHoraSeq[i % 7];
    lines.push(col3(String(i+1), p, HORA_Q[p]));
  }
  lines.push('');

  // Daily Remedy
  lines.push('  ── TODAY\'S DAILY REMEDY ──────────────────────────────────────────────────');
  const MD = dashaInfo?.mahadasha || 'Sun';
  const AD = dashaInfo?.antardasha || 'Moon';

  const DAILY_REMEDIES = {
    Sun:    ['Offer water to Sun at sunrise with copper vessel', 'Chant: Om Hraam Hreem Hraum Sah Suryaya Namah (108x)', 'Donate wheat/jaggery/copper', 'Wear red/orange, visit Surya temple'],
    Moon:   ['Offer milk to Shiva lingam', 'Chant: Om Shraam Shreem Shraum Sah Chandraya Namah (108x)', 'Donate rice/silver/milk', 'Wear white, fast if possible'],
    Mars:   ['Visit Hanuman temple, offer vermillion/sindoor', 'Chant: Om Kraam Kreem Kraum Sah Bhaumaya Namah (108x)', 'Donate red lentils/copper', 'Wear red, physical exercise'],
    Mercury:['Green donation to students/scholars', 'Chant: Om Braam Breem Braum Sah Budhaya Namah (108x)', 'Feed cows with grass', 'Wear green, do mathematical/logical work'],
    Jupiter:['Offer turmeric to Vishnu/Brihaspati', 'Chant: Om Graam Greem Graum Sah Gurave Namah (108x)', 'Donate yellow cloth/gold/chana', 'Seek blessings of elders/guru'],
    Venus:  ['Offer white flowers to Lakshmi', 'Chant: Om Draam Dreem Draum Sah Shukraya Namah (108x)', 'Donate rice/white cloth/silver', 'Wear white/cream, arts and music'],
    Saturn: ['Light sesame oil lamp in Shani temple', 'Chant: Om Praam Preem Praum Sah Shanaischaraya Namah (108x)', 'Donate black sesame/iron/oil to poor', 'Feed crows, service to elderly'],
    Rahu:   ['Light camphor at Durga/Kali temple', 'Chant: Om Bhraam Bhreem Bhraum Sah Rahave Namah (108x)', 'Donate blue/black cloth, mustard', 'Feed black dog, avoid meat'],
    Ketu:   ['Worship Ganesha with durva grass', 'Chant: Om Straam Streem Straum Sah Ketave Namah (108x)', 'Donate blanket/sesame', 'Light ghee lamp, spiritual reading'],
  };

  lines.push('  Primary Remedy (Mahadasha: ' + MD + '):');
  const mdRemedies = DAILY_REMEDIES[MD] || [];
  for (const r of mdRemedies) lines.push('    ★ ' + r);
  lines.push('');
  lines.push('  Secondary Remedy (Antardasha: ' + AD + '):');
  const adRemedies = (DAILY_REMEDIES[AD] || []).slice(0, 2);
  for (const r of adRemedies) lines.push('    ◆ ' + r);

  return lines;
}

function _weekday(jd) { return Math.floor(jd + 1.5) % 7; }

// ─── SECTION 29: LIFE PREDICTIONS (DETAILED) ────────────────────────────────
export function buildLifePredictions(planets, houses, dashas, avData, birthData) {
  const lines = [];
  lines.push('');
  lines.push('  DETAILED LIFE PREDICTIONS');
  lines.push('  Based on: BPHS House Significations + Planetary Yogas + Dasha Timeline');
  lines.push('');

  // Build planet-house map
  const pMap = {};
  for (const p of planets) {
    pMap[p.name] = { sign: SIGNS[signOf(p.siderealLon)], house: p.house, lon: p.siderealLon };
  }
  const lagnaSign = houses[0]?.sign || SIGNS[signOf(planets[0]?.siderealLon || 0)];
  const lagnaLord = SIGN_LORDS[lagnaSign];

  // CAREER
  lines.push('  ── CAREER & PROFESSION ────────────────────────────────────────────────────');
  const d10 = houses[9];
  const d10Lord = SIGN_LORDS[d10?.sign || 'Aries'];
  const d10LordPos = pMap[d10Lord];
  const d1LordPos = pMap[lagnaLord];

  lines.push('  10th House (Career House): ' + (d10?.sign || 'N/A') + ' — Lord: ' + d10Lord);
  lines.push('  10th Lord ' + d10Lord + ' is in: H' + (d10LordPos?.house || '?') + ' (' + (d10LordPos?.sign || '?') + ')');
  lines.push('');

  // Career from planets in 10th
  const planetsIn10 = planets.filter(p => p.house === 10 && !p.outer);
  if (planetsIn10.length > 0) {
    lines.push('  Planets in 10th House: ' + planetsIn10.map(p => p.name).join(', '));
    const CAREER_SIGNIF = {
      Sun:'Government, administration, authority, politics',
      Moon:'Public dealing, hospitality, nursing, food industry',
      Mars:'Military, police, surgery, engineering, sports',
      Mercury:'Communication, writing, IT, accounting, trade',
      Jupiter:'Teaching, law, finance, advisory, spirituality',
      Venus:'Arts, beauty, luxury, entertainment, fashion',
      Saturn:'Labor, construction, mining, judiciary, agriculture',
      Rahu:'Technology, foreign companies, unconventional fields',
      Ketu:'Research, spirituality, medicine, investigation'
    };
    for (const p of planetsIn10) {
      lines.push('  • ' + p.name + ': ' + (CAREER_SIGNIF[p.name] || 'Mixed career signification'));
    }
  }

  const D10_CAREER = signCareerThemes.themes;
  lines.push('');
  lines.push('  Career Direction (from 10th sign ' + (d10?.sign||'?') + '): ' + (D10_CAREER[d10?.sign] || 'Mixed career'));
  lines.push('');

  // Best career periods
  // FIX (audit): this used to scan the whole life's Mahadasha list with zero
  // age filtering, so a dasha running from birth to age 6 (e.g. Mars MD
  // 1993-1999 for a person born 1993) could be printed as a "Best Career
  // Period" — a context-blind prediction, since nobody has a career peak in
  // early childhood. Career-supportive dashas are now only shown once they
  // overlap working age (18+), and are ranked by overlap with the classical
  // "career establishment/peak" window (~28-50) so the most plausible period
  // leads.
  lines.push('  Best Career Periods (Dasha): ');
  const birthYearCareer = birthData?.year ?? null;
  const CAREER_LO = 28, CAREER_HI = 50;
  const careerCandidates = [];
  for (const d of dashas) {
    const pl = planets.find(p => p.name === d.mahadasha);
    if (!pl) continue;
    const h = pl.house;
    if (![1,2,5,9,10,11].includes(h)) continue;
    const dStart = jdToDate(d.startJD);
    const dEnd   = jdToDate(d.endJD);
    const ageStart = birthYearCareer != null ? dStart.year - birthYearCareer : null;
    const ageEnd   = birthYearCareer != null ? dEnd.year - birthYearCareer : null;
    if (ageEnd !== null && ageEnd < 18) continue; // entirely childhood — never a career-peak period
    const overlap = (ageStart !== null && ageEnd !== null)
      ? Math.max(0, Math.min(ageEnd, CAREER_HI) - Math.max(ageStart, CAREER_LO))
      : 0;
    careerCandidates.push({ d, dStart, dEnd, ageStart, ageEnd, h, overlap });
  }
  careerCandidates.sort((a, b) => b.overlap - a.overlap);
  if (careerCandidates.length) {
    for (const c of careerCandidates.slice(0, 5)) {
      const ageNote = c.ageStart != null ? ` (Age ${Math.max(0, c.ageStart)}–${c.ageEnd})` : '';
      const earlyFlag = c.ageStart != null && c.ageStart < 18
        ? '  [starts in minority — career results apply once working age begins]' : '';
      lines.push('    ★ ' + c.d.mahadasha + ' MD (' + c.dStart.year + '–' + c.dEnd.year + ')' + ageNote + ' — H' + c.h + ' — Career advancement likely' + earlyFlag);
    }
  } else {
    lines.push('    (No Mahadasha lord occupies a career-supportive house (1/2/5/9/10/11) during working age in this chart — check Antardasha-level timing in the Future Forecast section instead.)');
  }
  lines.push('');

  // FINANCE
  lines.push('  ── FINANCE & WEALTH ───────────────────────────────────────────────────────');
  const d2 = houses[1]; // 2nd house
  const d11 = houses[10]; // 11th house
  const d2Lord = SIGN_LORDS[d2?.sign || 'Taurus'];
  const d11Lord = SIGN_LORDS[d11?.sign || 'Aquarius'];
  const avH2  = (avData?.raw || [])[1] || 25;
  const avH11 = (avData?.raw || [])[10] || 25;

  lines.push('  2nd House (Wealth): ' + (d2?.sign||'?') + ' — Lord: ' + d2Lord + ' | AV Points: ' + avH2);
  lines.push('  11th House (Gains): ' + (d11?.sign||'?') + ' — Lord: ' + d11Lord + ' | AV Points: ' + avH11);
  lines.push('');

  const wealthLevel = ((avH2 + avH11) / 2) >= 30 ? 'Strong wealth potential' :
                      ((avH2 + avH11) / 2) >= 25 ? 'Moderate wealth, consistent income' :
                      'Wealth through effort and persistence';
  lines.push('  Wealth Assessment: ' + wealthLevel);

  if (avH2 >= 35) lines.push('  H2 Ashtakavarga ' + avH2 + ' pts — Excellent financial house. High income potential.');
  if (avH11 >= 30) lines.push('  H11 Ashtakavarga ' + avH11 + ' pts — Strong gains from multiple sources.');

  // Jupiter in chart
  const jup = pMap['Jupiter'];
  if (jup) {
    const JUP_FINANCE = {
      1:'Jupiter in 1st — Natural wealth through personality',
      2:'Jupiter in 2nd — Excellent wealth, speech, family fortune',
      4:'Jupiter in 4th — Property and inheritance',
      5:'Jupiter in 5th — Speculation gains, children bring wealth',
      7:'Jupiter in 7th — Wealth through partnerships',
      9:'Jupiter in 9th — Fortune, luck, father\'s support',
      10:'Jupiter in 10th — Career brings high income',
      11:'Jupiter in 11th — Multiple income streams, gains'
    };
    const jupFinance = JUP_FINANCE[jup.house];
    if (jupFinance) lines.push('  ' + jupFinance);
  }
  lines.push('');

  // MARRIAGE
  lines.push('  ── MARRIAGE & RELATIONSHIPS ───────────────────────────────────────────────');
  const d7 = houses[6];
  const d7Lord = SIGN_LORDS[d7?.sign || 'Gemini'];
  const d7LordPos = pMap[d7Lord];
  const venusPos  = pMap['Venus'];
  const avH7 = (avData?.raw || [])[6] || 25;

  lines.push('  7th House (Marriage): ' + (d7?.sign||'?') + ' — Lord: ' + d7Lord);
  lines.push('  7th Lord ' + d7Lord + ' in: H' + (d7LordPos?.house||'?') + ' (' + (d7LordPos?.sign||'?') + ')');
  if (venusPos) lines.push('  Venus (Marriage Karaka): H' + venusPos.house + ' (' + venusPos.sign + ')');
  lines.push('  H7 Ashtakavarga: ' + avH7 + ' pts — ' + (avH7 >= 30 ? 'Favorable for marriage' : avH7 >= 25 ? 'Average' : 'Challenges in marriage'));
  lines.push('');

  // Marriage timing from Dasha
  // FIX (audit): this used to scan ALL nine Mahadashas across the full
  // 120-year Vimshottari cycle with no age check, so a Venus MD landing at
  // e.g. age 83 (2076-2096 for a person born ~1993) could be printed as a
  // "Marriage Timing" — an impossible-to-act-on, age-blind prediction.
  // Candidates are now (a) capped to a biologically plausible window and
  // (b) ranked by overlap with the typical first-marriage age range so the
  // most plausible period is shown first; anything past that window is
  // still shown but explicitly labeled as a late-marriage/renewal-era period
  // rather than presented as the primary answer.
  lines.push('  Marriage Timing Indicators:');
  const birthYearMarriage = birthData?.year ?? null;
  const MARRIAGE_LO = 20, MARRIAGE_HI = 38, MARRIAGE_CUTOFF = 60;
  const marriageCandidates = [];
  for (const d of dashas) {
    const pl = planets.find(p => p.name === d.mahadasha);
    if (!pl) continue;
    if (![d7Lord, 'Venus', 'Moon'].includes(d.mahadasha)) continue;
    if (pl.house === 8 || pl.house === 12) continue;
    const dStart = jdToDate(d.startJD);
    const dEnd   = jdToDate(d.endJD);
    const ageStart = birthYearMarriage != null ? dStart.year - birthYearMarriage : null;
    const ageEnd   = birthYearMarriage != null ? dEnd.year - birthYearMarriage : null;
    if (ageStart !== null && ageStart > MARRIAGE_CUTOFF) continue; // implausible tail of the 120-yr cycle
    const overlap = (ageStart !== null && ageEnd !== null)
      ? Math.max(0, Math.min(ageEnd, MARRIAGE_HI) - Math.max(ageStart, MARRIAGE_LO))
      : 0;
    marriageCandidates.push({ d, dStart, dEnd, ageStart, ageEnd, overlap });
  }
  marriageCandidates.sort((a, b) => b.overlap - a.overlap);
  if (marriageCandidates.length) {
    for (const c of marriageCandidates.slice(0, 3)) {
      const ageNote = c.ageStart != null ? ` (Age ${Math.max(0, c.ageStart)}–${c.ageEnd})` : '';
      const lateFlag = c.overlap === 0 && c.ageStart != null && c.ageStart > MARRIAGE_HI
        ? '  [outside the typical first-marriage window — consider this a later marriage / renewal-of-relationship period]' : '';
      lines.push('    ★ ' + c.d.mahadasha + ' MD (' + c.dStart.year + '–' + c.dEnd.year + ')' + ageNote + ' — Marriage/relationship likely' + lateFlag);
    }
  } else {
    lines.push('    (No Mahadasha lord cleanly supports marriage timing in a plausible age window — check Antardasha-level timing in the Future Forecast section instead.)');
  }
  lines.push('');

  // HEALTH
  lines.push('  ── HEALTH & LONGEVITY ─────────────────────────────────────────────────────');
  const d1 = houses[0];
  const d6 = houses[5];
  const d8 = houses[7];
  const avH1 = (avData?.raw || [])[0] || 25;
  const avH8 = (avData?.raw || [])[7] || 25;

  lines.push('  1st House (Vitality): ' + (d1?.sign||'?') + ' | AV: ' + avH1);
  lines.push('  6th House (Disease): ' + (d6?.sign||'?'));
  lines.push('  8th House (Longevity): ' + (d8?.sign||'?') + ' | AV: ' + avH8);
  lines.push('');

  const HEALTH_BY_SIGN = {
    Aries:'Head, brain, eyes — headaches, fever',
    Taurus:'Throat, neck, thyroid — throat issues',
    Gemini:'Lungs, shoulders, arms — respiratory',
    Cancer:'Stomach, breasts, chest — digestive',
    Leo:'Heart, spine, back — cardiac',
    Virgo:'Intestines, digestion — IBS, analysis stress',
    Libra:'Kidneys, lower back — urinary',
    Scorpio:'Reproductive organs, elimination — hidden disorders',
    Sagittarius:'Hips, thighs, liver — liver, accidents',
    Capricorn:'Knees, bones, skin — arthritis, skin',
    Aquarius:'Ankles, circulation, nervous system — anxiety',
    Pisces:'Feet, immune system, lymph — immune disorders'
  };

  lines.push('  Health Vulnerabilities (Lagna ' + lagnaSign + '): ' + (HEALTH_BY_SIGN[lagnaSign] || 'General health'));

  const planetsIn6 = planets.filter(p => p.house === 6 && !p.outer);
  if (planetsIn6.length) {
    lines.push('  Planets in 6th House: ' + planetsIn6.map(p => p.name).join(', ') + ' — Health needs monitoring');
  }

  const sun = pMap['Sun'], moon = pMap['Moon'], mars = pMap['Mars'];
  if (sun?.house === 8) lines.push('  Sun in 8th — Longevity factor needs attention, avoid ego-based conflicts');
  if (moon?.house === 6) lines.push('  Moon in 6th — Mental health, emotional challenges, digestive issues');
  if (mars?.house === 8) lines.push('  Mars in 8th — Surgery possible, accidents possible, strong regeneration');
  lines.push('');

  // SPIRITUAL GROWTH
  lines.push('  ── SPIRITUAL GROWTH ───────────────────────────────────────────────────────');
  const d9Houses = houses[8];
  const d12Houses = houses[11];
  const ketu = pMap['Ketu'];
  const jup2  = pMap['Jupiter'];

  lines.push('  9th House (Dharma): ' + (d9Houses?.sign||'?') + ' — Spiritual path and higher wisdom');
  lines.push('  12th House (Moksha): ' + (d12Houses?.sign||'?') + ' — Liberation and foreign connections');
  if (ketu) lines.push('  Ketu (Spirituality Karaka): H' + ketu.house + ' — ' + (ketu.house >= 9 ? 'Strong spiritual inclination' : 'Spirituality through effort'));
  if (jup2 && [9,12,5,1].includes(jup2.house)) lines.push('  Jupiter in H' + jup2.house + ' — Excellent spiritual placement, dharmic living');
  lines.push('');

  // CHILDREN
  lines.push('  ── CHILDREN (5th House Analysis) ──────────────────────────────────────────');
  const d5 = houses[4];
  const d5Lord = SIGN_LORDS[d5?.sign || 'Leo'];
  const d5LordPos = pMap[d5Lord];
  const jup3 = pMap['Jupiter'];
  const avH5 = (avData?.raw || [])[4] || 25;

  lines.push('  5th House: ' + (d5?.sign||'?') + ' — Lord: ' + d5Lord);
  if (d5LordPos) lines.push('  5th Lord in H' + d5LordPos.house + ' — ' + (d5LordPos.house >= 1 ? 'Children timing from this house' : ''));
  if (jup3) lines.push('  Jupiter (Children Karaka): H' + jup3.house + ' (' + jup3.sign + ') | AV H5: ' + avH5);
  lines.push('');

  return lines;
}

// ─── SECTION 30: MONTHLY FORECAST ────────────────────────────────────────────
export function buildMonthlyForecast(birthData, natalPlanets, moonSign, ascSign, dashaInfo, AYANAMSA, NOW_JD) {
  const today = jdToDate(NOW_JD);
  const lines = [];

  lines.push('');
  lines.push('  MONTHLY FORECAST — ' + _mon(today.month) + ' ' + today.year);
  lines.push('  Current Dasha: ' + (dashaInfo?.mahadasha||'?') + ' MD / ' + (dashaInfo?.antardasha||'?') + ' AD');
  lines.push('');

  const moonSignIdx  = SIGNS.indexOf(moonSign);
  const lagnaSignIdx = SIGNS.indexOf(ascSign);

  // Week by week
  const WEEKS = ['Week 1 (1–7)', 'Week 2 (8–14)', 'Week 3 (15–21)', 'Week 4 (22–30)'];
  lines.push('  ── Week-by-Week Forecast ──────────────────────────────────────────────────');
  lines.push(col3('Period', 'Focus Area', 'Guidance'));
  lines.push(col3('─'.repeat(22), '─'.repeat(24), '─'.repeat(28)));

  const weekData = [
    ['Career & Ambitions', 'Push forward with plans, good for authority'],
    ['Finance & Gains', 'Review investments, collect dues'],
    ['Health & Relationships', 'Self-care, social activities, healing'],
    ['Spirituality & Inner Work', 'Meditation, reflection, charity'],
  ];
  for (let i = 0; i < 4; i++) {
    lines.push(col3(WEEKS[i], weekData[i][0], weekData[i][1]));
  }
  lines.push('');

  // Month transits summary
  lines.push('  ── Key Transits This Month ─────────────────────────────────────────────────');
  const monthPlanets = ['Sun','Jupiter','Saturn','Rahu'];
  for (const pn of monthPlanets) {
    const pos = calcPlanetPosition(pn, NOW_JD);
    if (!pos) continue;
    // FIX (Phase 4/5 audit): calcPlanetPosition().lon is already sidereal.
    const sidLon = mod360(pos.lon);
    const sgn = SIGNS[signOf(sidLon)];
    const hFromMoon  = ((signOf(sidLon) - moonSignIdx  + 12) % 12) + 1;
    const hFromLagna = ((signOf(sidLon) - lagnaSignIdx + 12) % 12) + 1;
    lines.push('  ' + pad(pn + ' in ' + sgn + ':', 28) + 'H' + hFromMoon + ' from Moon, H' + hFromLagna + ' from Lagna');
  }
  lines.push('');

  // Monthly score
  const md = dashaInfo?.mahadasha || 'Sun';
  const ad = dashaInfo?.antardasha || 'Moon';
  const mdPl = natalPlanets.find(p => p.name === md);
  const adPl = natalPlanets.find(p => p.name === ad);

  let monthScore = 5;
  if (mdPl) {
    const hFromMoon = ((signOf(mdPl.siderealLon) - moonSignIdx + 12) % 12) + 1;
    if ([2,3,6,10,11].includes(hFromMoon)) monthScore += 1;
    if ([1,4,5,7,8,9,12].includes(hFromMoon)) monthScore -= 0;
  }
  if (adPl) {
    const hFromMoon = ((signOf(adPl.siderealLon) - moonSignIdx + 12) % 12) + 1;
    if ([9,11].includes(hFromMoon)) monthScore += 1;
    if ([8,12].includes(hFromMoon)) monthScore -= 1;
  }
  monthScore = Math.max(1, Math.min(10, monthScore));

  lines.push('  Monthly Overall Score: ' + monthScore + '/10 — ' + (monthScore >= 7 ? 'EXCELLENT MONTH' : monthScore >= 5 ? 'GOOD MONTH' : 'CHALLENGING MONTH'));
  lines.push('');

  return lines;
}

// ─── SECTION 31: ADVANCED REMEDIES ───────────────────────────────────────────
export function buildAdvancedRemedies(planets, ascSign, moonSign, dashaInfo, doshas, shadbalaData) {
  const lines = [];
  lines.push('');
  lines.push('  ADVANCED REMEDIES SYSTEM');
  lines.push('  Based on: Shadbala deficits + Current Dasha + Doshas + Lagna analysis');
  lines.push('');

  // Identify weak planets from Shadbala
  const weakPlanets = [];
  if (shadbalaData) {
    for (const [planet, data] of Object.entries(shadbalaData)) {
      if (data.grade === 'Very Weak' || data.grade === 'Weak') {
        weakPlanets.push({ planet, rupas: data.rupas, required: data.required, deficit: data.required - data.rupas });
      }
    }
  }

  if (weakPlanets.length > 0) {
    lines.push('  ⚠ TRADITIONAL-ONLY: Gemstones, mantras, fasting and rituals are cultural/Jyotish practices; they are not medical treatment or guaranteed outcomes. Gemstones can have financial/safety implications, so consult a qualified practitioner before use.');
  lines.push('  ── Weak Planets Needing Remedy (from Shadbala) ──────────────────────────');
    lines.push(col3('Planet', 'Rupas/Required', 'Deficit | Gemstone Carat Needed'));
    lines.push(col3('─'.repeat(24), '─'.repeat(24), '─'.repeat(30)));

    for (const wp of weakPlanets) {
      const gem = GEMSTONE_BY_PLANET[wp.planet] || 'N/A';
      lines.push(col3(wp.planet, wp.rupas?.toFixed(2) + '/' + wp.required, wp.deficit?.toFixed(2) + ' deficit | traditional option: ' + gem));
    }
    lines.push('');
  }

  // Current Dasha remedies
  const MD = dashaInfo?.mahadasha || 'Sun';
  const AD = dashaInfo?.antardasha || 'Moon';

  lines.push('  ── Priority Remedies (Current Dasha Period) ──────────────────────────────');

  const FULL_REMEDIES = moduleData.FULL_REMEDIES;

  lines.push('  ★★★ PRIMARY — ' + MD + ' Mahadasha Remedy:');
  const mdRem = FULL_REMEDIES[MD] || {};
  for (const [k, v] of Object.entries(mdRem)) {
    lines.push('    ' + pad(k.charAt(0).toUpperCase() + k.slice(1) + ':', 16) + v);
  }
  lines.push('');

  lines.push('  ◆◆ SECONDARY — ' + AD + ' Antardasha Remedy:');
  const adRem = FULL_REMEDIES[AD] || {};
  const adKeys = ['gemstone','mantra','fasting','deity'];
  for (const k of adKeys) {
    if (adRem[k]) lines.push('    ' + pad(k.charAt(0).toUpperCase() + k.slice(1) + ':', 16) + adRem[k]);
  }
  lines.push('');

  // Dosha-specific remedies
  if (doshas && Object.keys(doshas).length > 0) {
    lines.push('  ── Dosha-Specific Remedies ─────────────────────────────────────────────────');
    if (doshas.mangal?.hasDosha) {
      lines.push('  Mangal Dosha Remedies:');
      lines.push('    • Kumbh Vivah ritual (marry a peepal tree) before marriage');
      lines.push('    • Wear Red Coral after consulting astrologer');
      lines.push('    • Tuesday fast + Hanuman Chalisa recitation');
      lines.push('    • Marry a partner with Mangal Dosha for cancellation');
      lines.push('');
    }
    if (doshas.sadeSati?.inSadeSati) {
      lines.push('  Sade Sati Remedies:');
      lines.push('    • Saturday Shani worship (Tailabhisheka)');
      lines.push('    • Hanuman Chalisa daily');
      lines.push('    • Donate mustard oil, black sesame, blue cloth on Saturdays');
      lines.push('    • Visit Shani Shingnapur or Tirunallar Shani temple');
      lines.push('    • Feed black dog, crow, ants regularly');
      lines.push('');
    }
  }

  // Color therapy
  lines.push('  ── Color & Frequency Therapy ───────────────────────────────────────────────');
  lines.push('  Colors to Wear (by Lagna ' + ascSign + '):');
  const LAGNA_COLORS = {
    Aries:'Red, orange, maroon (Mars colors — add white for balance)',
    Taurus:'White, cream, green, pink (Venus colors)',
    Gemini:'Green, grey, multicolor (Mercury colors)',
    Cancer:'White, silver, cream (Moon colors)',
    Leo:'Gold, orange, red (Sun colors)',
    Virgo:'Green, grey (Mercury colors)',
    Libra:'White, cream, pink, light blue (Venus colors)',
    Scorpio:'Red, maroon, deep orange (Mars colors)',
    Sagittarius:'Yellow, gold, orange (Jupiter colors)',
    Capricorn:'Blue, black, dark grey (Saturn colors)',
    Aquarius:'Blue, electric blue, black (Saturn colors)',
    Pisces:'Yellow, light blue, cream (Jupiter colors)',
  };
  lines.push('    ' + (LAGNA_COLORS[ascSign] || 'Varies by chart'));
  lines.push('');

  // Ayurvedic herbs
  lines.push('  ── Ayurvedic / Herbal Remedies ─────────────────────────────────────────────');
  const HERB_MAP = {
    Sun:'Ashwagandha, Shatavari, Triphala (vitality, immunity)',
    Moon:'Brahmi, Shankhpushpi, Jatamansi (mind, memory, sleep)',
    Mars:'Ashwagandha, Guggul (strength, inflammation)',
    Mercury:'Brahmi, Vacha, Yashtimadhu (intelligence, speech)',
    Jupiter:'Turmeric, Shatavari, Vidari (liver, wisdom, growth)',
    Venus:'Rose, Shatavari, Ashoka (beauty, reproductive health)',
    Saturn:'Triphala, Shilajit, Guggul (joints, bones, detox)',
    Rahu:'Camphor (purification), Tulsi (protection)',
    Ketu:'Ashwagandha, Guggul (spiritual clarity)',
  };
  lines.push('  For ' + MD + ' Mahadasha: ' + (HERB_MAP[MD] || 'General herbs'));
  lines.push('');

  return lines;
}

import moduleData from '../../dataset/used/core/extended_sections.json' with { type: 'json' };
const GEMSTONE_BY_PLANET = moduleData.GEMSTONE_BY_PLANET;

// ─── SECTION 32: COMPATIBILITY PREVIEW ───────────────────────────────────────
export function buildCompatibilityPreview(moonSign, ascSign, moonNakshatra) {
  const lines = [];
  lines.push('');
  lines.push('  PARTNER COMPATIBILITY INDICATORS (Kundali Matching Preview)');
  lines.push('  Based on your chart — key factors for ideal match');
  lines.push('');

  lines.push('  Your Moon Sign: ' + moonSign + '  (Janma Rashi)');
  lines.push('  Your Moon Nakshatra: ' + moonNakshatra);
  lines.push('  Your Lagna: ' + ascSign);
  lines.push('');

  // Guna Milan points by Rashi
  const IDEAL_PARTNERS = {
    Aries:    ['Leo','Sagittarius','Gemini','Aquarius'],
    Taurus:   ['Virgo','Capricorn','Cancer','Pisces'],
    Gemini:   ['Libra','Aquarius','Aries','Leo'],
    Cancer:   ['Scorpio','Pisces','Taurus','Virgo'],
    Leo:      ['Aries','Sagittarius','Gemini','Libra'],
    Virgo:    ['Taurus','Capricorn','Cancer','Scorpio'],
    Libra:    ['Gemini','Aquarius','Leo','Sagittarius'],
    Scorpio:  ['Cancer','Pisces','Virgo','Capricorn'],
    Sagittarius:['Aries','Leo','Libra','Aquarius'],
    Capricorn:['Taurus','Virgo','Scorpio','Pisces'],
    Aquarius: ['Gemini','Libra','Aries','Sagittarius'],
    Pisces:   ['Cancer','Scorpio','Taurus','Capricorn'],
  };

  const idealRashis = IDEAL_PARTNERS[moonSign] || [];
  lines.push('  Ideal Partner Moon Signs: ' + idealRashis.join(', '));
  lines.push('');

  // 36-point Guna Milan categories
  lines.push('  36-Point Guna Milan Categories:');
  const GUNA_TABLE = [
    { name: 'Varna',  points: 1,  desc: 'Spiritual compatibility' },
    { name: 'Vasya',  points: 2,  desc: 'Mutual control & attraction' },
    { name: 'Tara',   points: 3,  desc: 'Health & longevity' },
    { name: 'Yoni',   points: 4,  desc: 'Physical compatibility' },
    { name: 'Graha Maitri', points: 5, desc: 'Mental friendship' },
    { name: 'Gana',   points: 6,  desc: 'Temperament match' },
    { name: 'Bhakoot',points: 7,  desc: 'Family prosperity' },
    { name: 'Nadi',   points: 8,  desc: 'Health & genetic compatibility' },
  ];
  lines.push(col3('Category', 'Max Points', 'Significance'));
  for (const g of GUNA_TABLE) {
    lines.push(col3(g.name, String(g.points), g.desc));
  }
  lines.push('');
  lines.push('  Minimum required for marriage: 18/36 points');
  lines.push('  Above 28/36 = Very compatible | Above 32/36 = Excellent match');
  lines.push('');
  lines.push('  Note: Full Kundali matching requires partner\'s birth details.');
  lines.push('  Use this engine with both charts for complete analysis.');
  lines.push('');

  return lines;
}

// ─── SECTION 33: KP ADVANCED ─────────────────────────────────────────────────
// FIX (bug report audit, Section 40 "COMPLETE KP CUSP ANALYSIS"): this
// section used to just point to Section 13 for cuspal data and compute a
// naive, occupant-only "significators" list with a lazy "Via lords"
// placeholder whenever nothing occupied the relevant houses. Per the
// explicit requirement that Section 40 be a dedicated, standalone
// analysis (not a cross-reference), this now renders its own complete
// KP Cusp Sub-Lord Analysis directly — Star Lords, Sub-Lords, and House
// Significations for all 12 houses — plus genuinely computed 4-level KP
// significators (Occupant / Owner / Nak-lord-of-occupant / Nak-lord-of-
// owner) reusing the real, already-verified kpChart.significators data
// (see src/kp/kp_system.js's getSignificators()) rather than a second,
// weaker re-implementation. No cuspal or significator math is
// recomputed here — this pulls the one correct source and presents it
// completely within this section, as required.
const KP_HOUSE_SIGNIFICATIONS = moduleData.KP_HOUSE_SIGNIFICATIONS;

export function buildKPAdvanced(planets, houses, AYANAMSA, NOW_JD, kpChart = null) {
  const lines = [];
  lines.push('');
  lines.push('  KP (KRISHNAMURTI PADDHATI) ADVANCED ANALYSIS');
  lines.push('  Sub-lord system for precise event timing');
  lines.push('');

  if (!kpChart || !Array.isArray(kpChart.cusps) || !kpChart.cusps.length) {
    lines.push('  KP chart data unavailable for this birth — cannot render cuspal analysis.');
    lines.push('');
    return lines;
  }

  lines.push('  ── KP CUSP SUB-LORD ANALYSIS (' + (kpChart.cusps[0]?.cuspSystem || 'Placidus') + ') ──────────────────');
  lines.push('');
  for (const c of kpChart.cusps) {
    lines.push('  House ' + c.house + ' (' + c.sign + ', cusp ' + c.cusp.toFixed(2) + '°)');
    lines.push('     Star Lord (Nakshatra): ' + (c.kp?.nakLord || '-') +
      '   |   Sub-Lord: ' + (c.kp?.subLord || '-') +
      '   |   Sub-Sub-Lord: ' + (c.kp?.subSubLord || '-'));
    lines.push('     Signification: ' + (KP_HOUSE_SIGNIFICATIONS[c.house] || '-'));
    lines.push('');
  }

  // KP Significators for 7 major life events — real 4-level KP significator
  // logic (Occupant/Owner/Nak-lord-of-occupant/Nak-lord-of-owner), reused
  // directly from kpChart.significators rather than a naive occupant-only
  // re-implementation.
  lines.push('  ── KP SIGNIFICATORS FOR LIFE EVENTS (4-level classical method) ─────────');
  lines.push('');
  const EVENTS = {
    'Marriage':   [2,7,11],
    'Career':     [6,10,11],
    'Finance':    [2,6,10,11],
    'Children':   [2,5,11],
    'Health':     [1,6,12],
    'Foreign':    [3,9,12],
    'Education':  [4,5,9],
  };
  const sig = kpChart.significators || {};
  for (const [event, houseList] of Object.entries(EVENTS)) {
    const combined = [];
    for (const h of houseList) {
      const hs = sig[h];
      if (!hs) continue;
      for (const s of hs.significators) {
        if (!combined.find(c => c.planet === s.planet)) combined.push(s);
      }
    }
    combined.sort((a, b) => a.level - b.level);
    const sigText = combined.length
      ? combined.slice(0, 6).map(s => `${s.planet}(L${s.level})`).join(', ')
      : 'No strong significators found among these houses for this chart';
    lines.push('  ' + pad(event + ':', 18) + 'Houses ' + houseList.join(',') + ' — Significators: ' + sigText);
  }
  lines.push('');

  return lines;
}

// ─── SECTION 34: MUHURTA ENGINE ──────────────────────────────────────────────
export function buildMuhurtaEngine(moonSign, ascSign, AYANAMSA, NOW_JD) {
  const lines = [];
  lines.push('');
  lines.push('  MUHURTA ENGINE — Auspicious Timing for Life Events');
  lines.push('  Based on: Tara, Panchaka, Vara, Tithi, Nakshatra compatibility');
  lines.push('');

  const today = jdToDate(NOW_JD);
  const moonPos = calcPlanetPosition('Moon', NOW_JD);
  // FIX (Phase 4/5 audit): calcPlanetPosition().lon is already sidereal —
  // this feeds the Muhurta Engine's Moon-nakshatra check, so the old
  // double-subtraction could recommend/avoid the wrong days for
  // marriage/travel/business-start muhurtas.
  const moonLon = moonPos ? mod360(moonPos.lon) : 0;
  const moonNakIdx = nakshatraOf(moonLon);
  // FIX (audit round 6): removed dead `natalMoonNakIdx` variable. It was never
  // read anywhere else in this function or file (confirmed by grep), and its
  // formula (`SIGNS.indexOf(moonSign) * 9 / 12`) was mathematically broken
  // besides — 27 nakshatras span 12 signs at 2.25 nakshatras/sign, not the
  // 0.75 multiplier used here, and a sign name alone (no exact degree) can't
  // determine a nakshatra anyway. Deleted rather than "fixed" because a
  // sign-only input genuinely cannot produce a correct nakshatra index —
  // computing a fake-precise wrong answer would be worse than not computing
  // one. If a natal-Moon-nakshatra comparison is wanted here in the future,
  // this function needs the exact natal Moon longitude passed in, not moonSign.

  // Good nakshatras for different activities
  const MUHURTA_NAKS = {
    'Marriage':       ['Rohini','Mrigashira','Magha','Uttara Phalguni','Hasta','Swati','Anuradha','Mula','Uttara Ashadha','Uttara Bhadrapada','Revati'],
    'Business Start': ['Ashwini','Rohini','Mrigashira','Punarvasu','Pushya','Hasta','Chitra','Swati','Anuradha','Shravana'],
    'Travel':         ['Ashwini','Mrigashira','Punarvasu','Pushya','Hasta','Anuradha','Shravana','Dhanishtha','Revati'],
    'Education':      ['Ashwini','Mrigashira','Punarvasu','Pushya','Hasta','Chitra','Swati','Shravana','Revati'],
    'Medical':        ['Ashwini','Pushya','Hasta','Chitra','Swati','Anuradha'],
    'Property Buy':   ['Rohini','Uttara Phalguni','Hasta','Swati','Uttara Ashadha','Uttara Bhadrapada'],
  };

  const currNakName = NAKSHATRAS[moonNakIdx];

  lines.push('  Current Moon Nakshatra: ' + currNakName);
  lines.push('');
  lines.push('  Activity Suitability Today:');

  for (const [activity, goodNaks] of Object.entries(MUHURTA_NAKS)) {
    const suitable = goodNaks.includes(currNakName);
    lines.push('  ' + pad(activity + ':', 22) + (suitable ? '✅ FAVORABLE' : '⚠ Wait for better nakshatra'));
  }
  lines.push('');

  // Panchaka check
  const panchakaNaks = ['Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
  const inPanchaka = panchakaNaks.includes(currNakName);
  lines.push('  Panchaka Status: ' + (inPanchaka ? '⚠ IN PANCHAKA — Avoid cremation, construction, travel south' : '✅ Not in Panchaka — Favorable'));
  lines.push('');

  // Abhijit Muhurta (best time of day)
  lines.push('  Abhijit Muhurta: Most auspicious time slot of the day');
  lines.push('  (Approx 48 min around solar noon — best for all auspicious activities)');
  lines.push('');

  // Next 7 days forecast
  lines.push('  ── Next 7 Days Muhurta Calendar ─────────────────────────────────────────');
  lines.push(col3('Date', 'Moon Nakshatra', 'Overall Rating'));
  lines.push(col3('─'.repeat(20), '─'.repeat(22), '─'.repeat(22)));

  for (let d = 0; d < 7; d++) {
    const dayJD = NOW_JD + d;
    const dayDate = jdToDate(dayJD);
    const dayMoonPos = calcPlanetPosition('Moon', dayJD);
    if (!dayMoonPos) continue;
    // FIX (Phase 4/5 audit): same already-sidereal fix as above.
    const dayMoonLon = mod360(dayMoonPos.lon);
    const dayNakIdx  = nakshatraOf(dayMoonLon);
    const dayNakName = NAKSHATRAS[dayNakIdx];

    const GOOD_NAKS = ['Rohini','Mrigashira','Punarvasu','Pushya','Uttara Phalguni','Hasta','Chitra','Swati','Anuradha','Shravana','Dhanishtha','Revati'];
    const BAD_NAKS  = ['Bharani','Krittika','Ardra','Ashlesha','Vishakha','Jyeshtha','Mula','Shatabhisha'];

    const rating = GOOD_NAKS.includes(dayNakName) ? '⭐⭐⭐ Auspicious' :
                   BAD_NAKS.includes(dayNakName) ? '⚠ Inauspicious' : '⭐⭐ Neutral';
    lines.push(col3(dayDate.day + '/' + dayDate.month + '/' + dayDate.year, dayNakName, rating));
  }
  lines.push('');

  return lines;
}

// ─── SECTION 35: PANCH-PAKSHI & TIMING ───────────────────────────────────────
export function buildPanchPakshi(moonNakshatra, VARA_DAY) {
  const lines = [];
  lines.push('');
  lines.push('  PANCH-PAKSHI SHASTRA (Five Bird System)');
  lines.push('  Ancient South Indian system for daily timing optimization');
  lines.push('  Note: birth-bird assignment below uses the sourced classical');
  lines.push('  Nakshatra grouping. The activity-timing windows further below are');
  lines.push('  a simplified approximation, not the full Yamam-by-Yamam classical');
  lines.push('  cycle (which also varies by weekday and lunar Paksha) — treat this');
  lines.push('  section as indicative, not a precise classical Panch Pakshi chart.');
  lines.push('');

  // FIX (Panch Pakshi audit): the bird-per-Nakshatra assignment is a
  // specific, unevenly-grouped classical table (5-6-5-6-5 Nakshatras per
  // bird), NOT a uniform i%5 round-robin as this previously computed —
  // sourced from 2 independent references that agree on the same grouping
  // (findyourfate.com / tuningmymelody.blogspot.com's transcription of the
  // Pancha-Pakshi Shastra Nakshatra table). Uses NAKSHATRAS[] array index
  // order directly (0=Ashwini .. 26=Revati), matching this table's 1-27
  // numbering exactly.
  // NOTE: this fixes the STATIC bird assignment only. The full classical
  // system also has day-of-week and lunar-Paksha (waxing/waning) dependent
  // variants of this grouping, plus a detailed Yamam-by-Yamam activity
  // cycle (Rule/Eat/Walk/Sleep/Death, with fixed but unequal sub-durations
  // per Yamam) that this module does not yet implement faithfully — that
  // would need a single complete authoritative source rather than pieced-
  // together fragments, so it's left as a known, disclosed gap rather than
  // guessed at.
  const BIRDS = ['Vulture','Owl','Crow','Cock','Peacock'];
  const NAK_BIRD_GROUPS = [
    5, // Vulture: Nakshatras 1-5   (Ashwini..Mrigashira)
    6, // Owl:     Nakshatras 6-11  (Ardra..Purva Phalguni)
    5, // Crow:    Nakshatras 12-16 (Uttara Phalguni..Vishakha)
    6, // Cock:    Nakshatras 17-22 (Anuradha..Shravana)
    5, // Peacock: Nakshatras 23-27 (Dhanishtha..Revati)
  ];
  const NAK_BIRD = {};
  {
    let idx = 0;
    for (let b = 0; b < BIRDS.length; b++) {
      for (let n = 0; n < NAK_BIRD_GROUPS[b]; n++) {
        NAK_BIRD[NAKSHATRAS[idx]] = BIRDS[b];
        idx++;
      }
    }
  }

  const birthBird = NAK_BIRD[moonNakshatra] || 'Vulture';

  // Bird activities during the day (5 periods)
  const BIRD_PERIODS = ['Ruling (Best time)','Eating (Good)','Walking (Neutral)','Sleeping (Avoid)','Dying (Very Bad)'];

  // Bird sequence depends on weekday
  const WEEKDAY_RULER = {0:'Sun',1:'Moon',2:'Mars',3:'Mercury',4:'Jupiter',5:'Venus',6:'Saturn'};
  const BIRD_RULER = { Sun:'Vulture',Moon:'Owl',Mars:'Crow',Mercury:'Cock',Jupiter:'Peacock',Venus:'Owl',Saturn:'Vulture' };
  const dayRulerBird = BIRD_RULER[WEEKDAY_RULER[VARA_DAY%7]] || 'Vulture';

  lines.push('  Your Birth Bird: ' + birthBird + ' (from Nakshatra: ' + moonNakshatra + ')');
  lines.push('  Today\'s Ruling Bird: ' + dayRulerBird);
  lines.push('');

  lines.push('  Today\'s Activity Windows (Day = 12 equal parts):');
  lines.push('  • Best Action Time: When your birth bird is Ruling');
  lines.push('  • Avoid Major Decisions: When your birth bird is Sleeping or Dying');
  lines.push('');

  const isSameBird = birthBird === dayRulerBird;
  if (isSameBird) {
    lines.push('  ✅ Your birth bird matches today\'s ruling bird — HIGHLY AUSPICIOUS DAY');
    lines.push('     All important activities can be done throughout the day');
  } else {
    lines.push('  ◆ Your bird (' + birthBird + ') is active during specific periods today');
    lines.push('     Focus on morning for critical activities, avoid late afternoon decisions');
  }
  lines.push('');

  return lines;
}
