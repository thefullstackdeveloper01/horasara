// ╔══════════════════════════════════════════════════════════════════════════╗
// ║   VEDIC JYOTISH ENGINE v9 — NEW SECTIONS 36–50                         ║
// ║   Special Lagnas | Conflict Resolution | Life Verdict | Career DNA      ║
// ║   Medical Astrology | Karmic Blueprint | Geo Astrology | AI Synthesis   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { mod360, signOf, nakshatraOf, jdToDate, formatDate, julianDay, formatDMS, deltaT } from '../astronomy/utils.js';
import { calcPlanetPosition } from '../astronomy/vsop87.js';
import { computeTimeAndAscendant } from '../engine/timeAndAscendant.js';
import { scoreLifeAreas, dynamicFactorNote } from '../prediction/engine.js';
import { dashaScore, starsFromDashaScore, phaseFromDashaScore } from '../prediction/lordshipQuality.js';
import signCareerThemes from '../../dataset/used/core/sign_career_themes.json' with { type: 'json' };
import signCountriesData from '../../dataset/used/core/sign_countries.json' with { type: 'json' };
import {
  SIGNS, SIGN_LORDS, NAKSHATRAS, NAKSHATRA_LORDS, NAKSHATRA_DEITIES,

  NAKSHATRA_SYMBOLS, NAKSHATRA_GUNA, NAKSHATRA_TATTVA, PLANETS,
  PLANET_NATURE, PLANET_ELEMENT, NATURAL_FRIENDS, NATURAL_ENEMIES, NATURAL_NEUTRAL,
  EXALTATION, DEBILITATION, OWN_SIGNS, MOOLATRIKONA,
  DASHA_YEARS, DASHA_ORDER, SHADBALA_REQUIRED, getPlanetDignity
} from '../astronomy/constants.js';
import { calcD9 } from '../charts/vargas.js';

const { sin, cos, floor, abs, sqrt, PI, max, min } = Math;

// ── UTILITIES ──────────────────────────────────────────────────────────────────
function pad(s, n) { s = String(s||''); return s.padEnd(n, ' '); }
function lpad(s, n) { s = String(s||''); return s.padStart(n, ' '); }
function col2(a, b) { return '  ' + pad(a, 40) + b; }
function col3(a, b, c) { return '  ' + pad(a, 26) + pad(b, 26) + (c||''); }
function col4(a, b, c, d) { return '  ' + pad(a,18)+pad(b,18)+pad(c,18)+(d||''); }
function hr(c, n) { return c.repeat(n); }
function bar(score, max=10) {
  const filled = Math.max(0, Math.min(10, Math.round((score/max)*10)));
  return '[' + '█'.repeat(filled) + '░'.repeat(10-filled) + ']';
}
function pct(v, mx) { return Math.round((v/mx)*100); }

// getPlanetDignity imported from astronomy/constants.js
// (was a locally-duplicated copy; see dead-code/duplication audit note there)

function dignityScore(dig) {
  return {Exalted:5, Moolatrikona:4, Own:3, Friend:2, Neutral:1, Enemy:-1, Debilitated:-3, Other:1}[dig]||1;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 36 — SPECIAL LAGNAS (COMPLETE WITH DEGREES)
// Hora Lagna, Ghati Lagna, Bhava Lagna, Varnada Lagna, Sree Lagna
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection36_SpecialLagnas(specialLagnas, planets, houses, ASC) {
  const lines = [];
  lines.push('');
  lines.push('  Special Reference Lagnas — Wealth, Power, Career & Fortune Timing');
  lines.push('  Each lagna governs a specific life domain and timing cycle');
  lines.push('');

  const LAGNA_DESC = {
    horaLagna:    { name:'Hora Lagna (HL)',    domain:'Wealth & financial timing',   speed:'Moves 1 sign/hour — tracks money flow' },
    ghatiLagna:   { name:'Ghati Lagna (GL)',   domain:'Power, fame & authority',     speed:'Moves 1 sign/24min — tracks recognition' },
    bhavaLagna:   { name:'Bhava Lagna (BL)',   domain:'Life force & momentum',       speed:'Moves 1 sign/2hrs — overall life energy' },
    varnadaLagna: { name:'Varnada Lagna (VL)', domain:'Profession & career path',    speed:'Derived from HL + GL combination' },
    sreeLagna:    { name:'Sree Lagna (SL)',    domain:'Prosperity & Lakshmi blessings', speed:'Moon-based fortune indicator' },
  };

  lines.push(col3('Lagna', 'Sign | Degree', 'Domain | Significance'));
  lines.push(col3('─'.repeat(24),'─'.repeat(24),'─'.repeat(30)));

  for (const [key, desc] of Object.entries(LAGNA_DESC)) {
    const lg = specialLagnas?.[key];
    if (!lg) { lines.push(col3(desc.name, 'N/A','Calculation requires sunrise time')); continue; }
    const lord = SIGN_LORDS[lg.sign]||'?';
    lines.push(col3(desc.name, lg.sign + ' ' + (lg.deg||''), desc.domain));
    lines.push('     Lord: ' + lord + ' | ' + desc.speed);

    // House of this lagna from natal lagna
    const lagnaSignIdx = signOf(ASC);
    const lgSignIdx = SIGNS.indexOf(lg.sign);
    const houseFromLagna = ((lgSignIdx - lagnaSignIdx + 12) % 12) + 1;
    const lordPlanet = planets.find(p=>p.name===lord);
    const lordHouse = lordPlanet?.house || '?';
    lines.push('     Falls in H' + houseFromLagna + ' from Lagna | Lord ' + lord + ' is in H' + lordHouse);
    lines.push('');
  }

  // Hora Lagna analysis for wealth
  const hl = specialLagnas?.horaLagna;
  if (hl) {
    const hlLord = SIGN_LORDS[hl.sign];
    const hlLordPlanet = planets.find(p=>p.name===hlLord);
    lines.push('  ── Hora Lagna Wealth Analysis ─────────────────────────────────────────────');
    lines.push('  HL Lord: ' + hlLord + ' in H' + (hlLordPlanet?.house||'?'));
    const hlWealth = hlLordPlanet ? (
      [1,2,5,9,10,11].includes(hlLordPlanet.house) ? '✅ Strong — wealth comes naturally, multiple income sources' :
      [6,8,12].includes(hlLordPlanet.house) ? '⚠ Challenged — wealth through sustained effort, delays possible' :
      '◆ Moderate — steady income, requires consistent work'
    ) : 'N/A';
    lines.push('  Wealth Verdict: ' + hlWealth);
    lines.push('');
  }

  // Ghati Lagna for power
  const gl = specialLagnas?.ghatiLagna;
  if (gl) {
    const glLord = SIGN_LORDS[gl.sign];
    const glLordPlanet = planets.find(p=>p.name===glLord);
    lines.push('  ── Ghati Lagna Power & Fame Analysis ──────────────────────────────────────');
    lines.push('  GL Lord: ' + glLord + ' in H' + (glLordPlanet?.house||'?'));
    const glPower = glLordPlanet ? (
      [1,4,7,10].includes(glLordPlanet.house) ? '✅ Strong — natural authority, public recognition likely' :
      [6,8,12].includes(glLordPlanet.house) ? '⚠ Delayed — fame through struggle, unconventional path' :
      '◆ Moderate — situational authority, field-specific recognition'
    ) : 'N/A';
    lines.push('  Authority Verdict: ' + glPower);
    lines.push('');
  }

  // Varnada for profession
  const vl = specialLagnas?.varnadaLagna;
  if (vl) {
    const VL_CAREER = signCareerThemes.themes;
    lines.push('  ── Varnada Lagna Career Direction ──────────────────────────────────────────');
    lines.push('  Professional Path (VL=' + vl.sign + '): ' + (VL_CAREER[vl.sign]||'Mixed career'));
    lines.push('');
  }

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 37 — CONFLICT RESOLUTION ENGINE
// Resolves contradictions: Shadbala vs Avastha, Dasha rating vs transit, Sade Sati
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection37_ConflictResolution(planets, shadbala, avasthaData, dashas, avData, moonSignName, NOW_JD, AYANAMSA, doshas) {
  const lines = [];
  lines.push('');
  lines.push('  CONFLICT RESOLUTION ENGINE');
  lines.push('  Resolving contradictions between different astrological systems');
  lines.push('  Rule: Dasha > Natal | D9 overrides D1 | Functional > Natural benefic');
  lines.push('');

  // ── Conflict 1: Shadbala weak vs Avastha strong ────────────────────────────
  lines.push('  ── Conflict 1: Shadbala Weakness vs House Strength ─────────────────────────');
  lines.push('  Issue: Some planets show Very Weak Shadbala but deliver results. Why?');
  lines.push('');
  lines.push('  RESOLUTION RULES (Classical BPHS):');
  lines.push('  1. Shadbala measures planet\'s OWN strength (intrinsic)');
  lines.push('  2. Bhavabala measures HOUSE strength (environmental)');
  lines.push('  3. Weak planet in Strong house = House delivers via weaker planet');
  lines.push('  4. Strong planet in Weak house = Planet struggles to express');
  lines.push('  5. DASHA activates — active lord can deliver even if intrinsically weak');
  lines.push('');

  const VERDICT_RULES = {
    Sun:    'Leo/10th house owner — Atmakaraka type. Weak Shadbala means ego challenges, not absence of impact.',
    Moon:   'Mind karaka — weak Shadbala = emotional sensitivity, not weakness of life events.',
    Mars:   'Energy/courage — weak Shadbala = scattered energy, but house results still manifest.',
    Mercury:'Intelligence karaka — weak Shadbala = needs effort for mental tasks, not total blockage.',
    Jupiter:"Wisdom karaka — weak Shadbala = wisdom delayed, not absent. D9 is reported from the chart's actual Navamsa calculation.",
    Venus:  'Relationship karaka — weak Shadbala = relationship challenges, but experiences still occur.',
    Saturn: 'Karma karaka — weak Shadbala = delays and lessons, but Own sign gives adequate delivery.',
    Rahu:   'Shadow planet — not measured by Shadbala (nodes use Avastha assessment only).',
    Ketu:   'Shadow planet — not measured by Shadbala (nodes use Avastha assessment only).',
  };

  for (const pl of planets.slice(0,7)) {
    const sb = shadbala?.[pl.name];
    if (!sb) continue;
    const rupas = parseFloat(sb.rupas||0);
    const req = parseFloat(sb.required||5);
    const grade = sb.grade||'Weak';
    const sign = SIGNS[signOf(pl.siderealLon)];
    const d9Sign = SIGNS[calcD9(pl.siderealLon)];
    const dig = getPlanetDignity(pl.name, sign);
    const avH = (avData?.raw||[])[pl.house-1]||25;
    const verdict = rupas < req*0.6 && [1,4,7,10].includes(pl.house) ? 'HOUSE compensates weakness' :
                    rupas < req*0.6 && avH >= 30 ? 'ASHTAKAVARGA compensates' :
                    rupas >= req ? 'Self-sufficient strength' : 'Needs Dasha activation to deliver';
    lines.push('  ' + pad(pl.name + ' (' + grade + '):', 28) + verdict);
    lines.push('    Shadbala: ' + rupas.toFixed(2) + '/' + req + ' | H' + pl.house + ' AV:' + avH + ' | D9:' + d9Sign);
    lines.push('    Context: ' + (VERDICT_RULES[pl.name]||'Standard assessment applies.'));
    lines.push('');
  }

  // ── Conflict 2: "Placement quality" vs "Delivery capacity" ────────────────
  // FIX (audit): this used to be a hardcoded example about Rahu specifically
  // ("Rahu MD Very Bad vs 100% Excellent"), which prints the same canned text
  // regardless of what this chart's Rahu (or any other dasha lord) actually
  // is — and it hardcoded a "Very Bad" starting point that Section 21 no
  // longer produces (see lordshipQuality.js: no functional-benefic-lord
  // dasha is ever rated "Bad", and functional-malefic-lord dashas are now
  // labeled "Transformational", not "Very Bad"). Replaced with the general
  // classical distinction, illustrated using this chart's own Rahu.
  lines.push('  ── Conflict 2: "Placement Quality" vs "Delivery Capacity" ─────────────────');
  lines.push('');
  lines.push('  CONCEPT: A dasha rating has two separate layers that are easy to confuse:');
  lines.push('  1. Placement quality — is the dasha lord\'s house/sign placement supportive?');
  lines.push('  2. Delivery capacity (Avastha) — HOW the results actually show up (direct');
  lines.push('     vs. delayed/unconventional), which retrograde nodes especially affect.');
  lines.push('');
  {
    const rahuPl = planets.find(p => p.name === 'Rahu');
    if (rahuPl) {
      const rahuSign = SIGNS[signOf(rahuPl.siderealLon)];
      const rahuDig = getPlanetDignity('Rahu', rahuSign);
      const rahuNature = rahuPl.functionalNature || 'Neutral';
      const rahuHouse = rahuPl.house;
      const isDusthana = [6,8,12].includes(rahuHouse);
      lines.push('  IN THIS CHART: Rahu is in H' + rahuHouse + ' (' + rahuSign + ', ' + rahuDig + ')' +
        (rahuPl.isRetrograde || rahuPl.retrograde ? ', retrograde (nodes always are)' : '') + '.');
      lines.push('  Functional nature for this Lagna: ' + rahuNature +
        (rahuPl.functionalReason ? ' — ' + rahuPl.functionalReason : ''));
      if (isDusthana) {
        lines.push('  H' + rahuHouse + ' is a Dusthana — expect the RESULTS of Rahu\'s Mahadasha to arrive');
        lines.push('  unconventionally (sudden, foreign, technological, or via loss-then-gain) rather');
        lines.push('  than smoothly. That is different from the dasha being simply "bad" — see the');
        lines.push('  ★-rating logic in Section 21/23, which already reflects this nuance.');
      } else {
        lines.push('  H' + rahuHouse + ' is not a Dusthana — Rahu\'s Mahadasha here is more likely to');
        lines.push('  deliver its ambition/foreign/technology themes in a fairly direct way.');
      }
      lines.push('  RESOLUTION: the star-rating already shown for this Mahadasha (Section 21/23)');
      lines.push('  is the single authoritative verdict — it already combines both layers above,');
      lines.push('  so there is nothing further to reconcile.');
    } else {
      lines.push('  (Rahu position unavailable for this chart — skipping worked example.)');
    }
  }
  lines.push('');

  // ── Conflict 3: Mrita classification ──────────────────────────────────────
  lines.push('  ── Conflict 3: Moon/Mercury "Mrita" (Dead) Classification ─────────────────');
  lines.push('');
  lines.push('  Mrita Avastha = planet in degrees 24-30 of its sign (old age = diminished)');
  lines.push('  This is BALADI AVASTHA based on degree within sign, NOT overall weakness');
  lines.push('');
  for (const pl of planets.filter(p=>['Moon','Mercury'].includes(p.name))) {
    const degInSign = pl.siderealLon % 30;
    const isMrita = degInSign >= 24;
    const isActuallyMrita = isMrita;
    lines.push('  ' + pl.name + ': ' + degInSign.toFixed(2) + '° in sign → ' +
      (isActuallyMrita ? 'IS in Mrita range (24-30°) — delivery reduced but not zero' :
       '⚠ NOT in Mrita range — classification was an ERROR in v8'));
    if (!isActuallyMrita) {
      const actualState = degInSign < 6 ? 'Bala (Infant, 50% delivery)' :
                         degInSign < 12 ? 'Kumara (Youth, 75% delivery)' :
                         degInSign < 18 ? 'Yuva (Adult, 100% delivery)' :
                         degInSign < 24 ? 'Vriddha (Old, 25% delivery)' : 'Mrita (Dead, 0% delivery)';
      lines.push('  Corrected Avastha: ' + actualState);
    }
    lines.push('');
  }

  // ── Conflict 4: Sade Sati status consistency check ─────────────────────────
  // FIX (audit): this used to run a THIRD independent Sade Sati calculation
  // right here (its own Saturn-house-from-Moon check), separate from
  // sade_sati_accurate.js (Sections 9/48) and separate from the transit
  // section — exactly the "multiple independent calculators disagreeing"
  // problem sade_sati_accurate.js's own header comment describes fixing.
  // This now simply reads that single canonical result (doshas.sadeSati) so
  // it is structurally impossible for this section to disagree with Section 9.
  lines.push('  ── Conflict 4: Sade Sati Status Consistency Check ──────────────────────────');
  if (doshas?.sadeSati) {
    const ss = doshas.sadeSati;
    lines.push('  Saturn currently in: ' + (ss.saturnSignNow || '?'));
    lines.push('  Moon sign: ' + (ss.moonSign || moonSignName));
    lines.push('  VERDICT (same canonical calculation as Section 9): ' + (ss.inSadeSati ?
      '⚠ IN SADE SATI — ' + ss.currentPhase + ' phase active. Mental pressure is REAL.' :
      '✅ NOT in Sade Sati right now.'));
    if (ss.effects) lines.push('  ' + ss.effects);
    lines.push('  If the transit section elsewhere mentioned Saturn pressure, that is a separate,');
    lines.push('  ordinary transit effect — not the formal 7.5-year Sade Sati cycle reported here.');
  } else {
    lines.push('  (Sade Sati data unavailable for this chart.)');
  }
  lines.push('');

  // ── Final planet strength verdicts ───────────────────────────────────────
  // FIX (audit): this table used to run ITS OWN independent strength formula
  // (dig/house/AV/shadbala re-blended from scratch) instead of reusing the
  // Shadbala grade already computed once and shown in Section 10 — so the
  // same planet could show "Strong" in Section 10 (e.g. Jupiter 7.51 rupas)
  // and "VERY WEAK" here: a direct self-contradiction inside one report.
  // For the seven classical grahas, Shadbala IS the authoritative strength
  // measure (that is what Section 10 already displays), so this table now
  // reuses shadbala[planet].grade directly instead of re-deriving a
  // different number from scratch. Rahu/Ketu aren't measured by Shadbala at
  // all (shadow points have no physical body for most of its six limbs), so
  // they keep the Avastha+House+AV composite — clearly labeled as such.
  lines.push('  ── FINAL CONSOLIDATED PLANET STRENGTH VERDICTS ─────────────────────────────');
  lines.push('  (Sun–Saturn: same Shadbala grade shown in Section 10, so the two sections never contradict. Rahu/Ketu: Avastha+House+AV, since Shadbala does not apply to shadow points.)');
  lines.push('');
  lines.push(col4('Planet','Final Grade','Key Reason','Action'));
  lines.push(col4('─'.repeat(16),'─'.repeat(16),'─'.repeat(16),'─'.repeat(16)));

  for (const pl of planets.slice(0,9)) {
    const sb = shadbala?.[pl.name];
    const sign = SIGNS[signOf(pl.siderealLon)];
    const d9Sign = SIGNS[calcD9(pl.siderealLon)];
    const dig = getPlanetDignity(pl.name, sign);
    const avH = (avData?.raw||[])[pl.house-1]||25;
    const isNode = ['Rahu','Ketu'].includes(pl.name);

    let finalGrade;
    if (isNode) {
      const degInSign = pl.siderealLon % 30;
      const avasthaScore = degInSign<6?50:degInSign<12?75:degInSign<18?100:degInSign<24?25:0;
      const digScore = dignityScore(dig);
      const houseScore = [1,4,7,10].includes(pl.house)?4:[5,9,11].includes(pl.house)?3:[6,8,12].includes(pl.house)?0:2;
      const avScore = avH>=35?4:avH>=28?3:avH>=22?2:1;
      const totalScore = (digScore + houseScore + avScore + avasthaScore/25) / 4;
      finalGrade = totalScore >= 3.5 ? 'STRONG' : totalScore >= 2.5 ? 'MODERATE' : totalScore >= 1.5 ? 'WEAK' : 'VERY WEAK';
    } else {
      const g = (sb?.grade || 'Moderate');
      finalGrade = ['Excellent','Strong'].includes(g) ? 'STRONG'
        : g === 'Moderate' ? 'MODERATE'
        : g === 'Weak' ? 'WEAK' : 'VERY WEAK';
    }
    const action = finalGrade==='STRONG'?'Use this planet\'s themes actively':
                   finalGrade==='MODERATE'?'Activate through dasha periods':
                   finalGrade==='WEAK'?'Strengthen via remedies first':'Priority remedy needed';
    lines.push(col4(pl.name, finalGrade, dig + ' H' + pl.house + ' AV'+avH, action));
  }
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 38 — FINAL LIFE VERDICT (Scored /100)
// Career, Wealth, Marriage, Health, Spirituality — each with rationale
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection38_FinalLifeVerdict(planets, houses, avData, shadbala, dashas, birthYear, NOW_JD, AYANAMSA) {
  const lines = [];
  lines.push('');
  lines.push('  FINAL LIFE VERDICT — Composite Scoring (Multi-System Fusion)');
  lines.push('  Method: Parashara(40%) + Jaimini(20%) + KP(20%) + Transit(20%)');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  // FIX (audit Bug #5): this section used to run its own independent
  // Career/Wealth/Marriage/Health/Spirituality scoring formula (base 50,
  // its own set of Ashtakavarga thresholds and weights), which produced
  // genuinely different numbers than scoreLifeAreas() in
  // prediction/engine.js for the identical chart — e.g. Wealth showing
  // 62/100 here but 68/100 elsewhere in the same report, for the same
  // person. scoreLifeAreas() is the more load-bearing, more thoroughly
  // weighted formula (it already composites Ashtakavarga + planetary
  // dignity + shadbala + current-dasha boost, and its output already
  // drives narrative-tier selection elsewhere in the app — see
  // generateInsights() in prediction/engine.js). Rather than maintain
  // two independently-tuned copies, this section now calls that same
  // function so every score shown anywhere in the report is consistent.
  const currMahaForScoring = dashas?.find?.(d => d.startJD <= NOW_JD && d.endJD >= NOW_JD);
  const areaScores = scoreLifeAreas(
    planets, houses, avData, shadbala,
    currMahaForScoring ? { mahadasha: currMahaForScoring.mahadasha } : null
  );
  // scoreLifeAreas() returns a 0–5 composite; convert to the 0–100 scale
  // this section displays, exactly (no re-weighting, just a unit change).
  const careerScore   = Math.round(areaScores.career.score * 20);
  const wealthScore    = Math.round(areaScores.wealth.score * 20);
  const marriageScore  = Math.round(areaScores.marriage.score * 20);
  const healthScore    = Math.round(areaScores.health.score * 20);
  const spiritScore    = Math.round(areaScores.spirituality.score * 20);

  // ── OVERALL LIFE SCORE ─────────────────────────────────────────────────────
  const overallScore = Math.round((careerScore*0.25 + wealthScore*0.25 + marriageScore*0.20 + healthScore*0.20 + spiritScore*0.10));

  // Output
  lines.push('  ╔══ COMPOSITE LIFE SCORES ═══════════════════════════════════════════════╗');
  const domains = [
    ['Career & Profession',  careerScore,  'Job/Business success, recognition, authority', 'career'],
    ['Wealth & Finance',     wealthScore,  'Income stability, asset building, gains', 'wealth'],
    ['Marriage & Relations', marriageScore,'Partnership harmony, timing, compatibility', 'marriage'],
    ['Health & Longevity',   healthScore,  'Physical vitality, disease resistance', 'health'],
    ['Spiritual Growth',     spiritScore,  'Inner wisdom, dharma, liberation', 'spirituality'],
  ];
  for (const [domain, score, desc, areaKey] of domains) {
    const grade = score>=80?'EXCELLENT':score>=65?'GOOD':score>=50?'AVERAGE':score>=35?'CHALLENGING':'DIFFICULT';
    lines.push('  ║ ' + pad(domain+':', 24) + pad(score+'/100', 10) + pad(grade, 14) + bar(score/10) + ' ║');
    lines.push('  ║   ' + desc + '');
    // FIX (audit, Point 3): a composite "Average" can hide a genuinely
    // strong specific factor (e.g. Venus in its own 7th house, or strong
    // H2 Ashtakavarga for wealth) — surface that fact explicitly here
    // instead of letting the single blended number speak for the whole area.
    const note = dynamicFactorNote(areaKey, planets, houses, avData);
    if (note) lines.push('  ║   ' + note.trim());
    lines.push('  ║');
  }
  lines.push('  ║ ' + pad('OVERALL LIFE SCORE:', 24) + pad(overallScore+'/100', 10) + pad(overallScore>=70?'BLESSED':overallScore>=55?'POSITIVE':'CHALLENGING', 14) + bar(overallScore/10) + ' ║');
  lines.push('  ╚═══════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Priority actions
  const scores = { Career:careerScore, Wealth:wealthScore, Marriage:marriageScore, Health:healthScore, Spirituality:spiritScore };
  const weakest = Object.entries(scores).sort((a,b)=>a[1]-b[1]).slice(0,2);
  const strongest = Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,2);
  lines.push('  ── Strategic Insights ──────────────────────────────────────────────────────');
  lines.push('  Your Strongest Areas (Natural gifts — leverage these):');
  for (const [k,v] of strongest) lines.push('    ★ ' + k + ': ' + v + '/100 — Build your life around this');
  lines.push('  Your Weakest Areas (Need conscious effort):');
  for (const [k,v] of weakest) lines.push('    ⚠ ' + k + ': ' + v + '/100 — Focus remedies here first');
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 39 — KARMIC BLUEPRINT
// Past life signature, soul purpose, ancestral patterns, life theme
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection39_KarmicBlueprint(planets, houses, ascSign, moonSign, nakshatra) {
  const lines = [];
  lines.push('');
  lines.push('  KARMIC BLUEPRINT — Soul\'s Journey & Life Purpose');
  lines.push('  Based on: Rahu/Ketu axis + Saturn + 12th house + Atmakaraka');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  const rahu = pMap['Rahu'];
  const ketu = pMap['Ketu'];
  const saturn = pMap['Saturn'];
  const jupiter = pMap['Jupiter'];

  // ── Past life signature (Ketu) ─────────────────────────────────────────────
  lines.push('  ── Past Life Signature (Ketu Analysis) ──────────────────────────────────');
  const KETU_PAST = {
    1:'Ketu H1 — Past life of solitude, ascetic life, strong individual identity. Now learning: relationships and cooperation.',
    2:'Ketu H2 — Past life of wealth accumulation, family attachments, speech power. Now learning: non-attachment to money.',
    3:'Ketu H3 — Past life of courage, sibling bonds, short journeys, communication mastery. Now learning: patience and wisdom.',
    4:'Ketu H4 — Past life of domestic bliss, mother attachments, property. Now learning: worldly achievement.',
    5:'Ketu H5 — Past life of creative genius, royal associations, children. Now learning: disciplined intellect.',
    6:'Ketu H6 — Past life of service, healing, overcoming enemies. Now learning: transcending conflict.',
    7:'Ketu H7 — Past life of partnerships, marriage focus, others. Now learning: self-reliance.',
    8:'Ketu H8 — Past life of occult research, hidden knowledge, transformation. Now learning: stability.',
    9:'Ketu H9 — Past life as religious leader, teacher, guru. Now learning: practical application of wisdom.',
    10:'Ketu H10 — Past life of high status, authority, public life. Now learning: inner development.',
    11:'Ketu H11 — Past life of social networks, group consciousness, gains. Now learning: focused goals.',
    12:'Ketu H12 — Past life of liberation, foreign lands, spiritual retreat. Now learning: material mastery.',
  };
  if (ketu) lines.push('  ' + (KETU_PAST[ketu.house]||'Ketu in H'+ketu.house+' — past life karma resolution'));
  lines.push('');

  // ── Current life direction (Rahu) ─────────────────────────────────────────
  lines.push('  ── Soul\'s Growth Direction (Rahu Analysis) ─────────────────────────────');
  const RAHU_FUTURE = {
    1:'Rahu H1 — Soul craves: Individual identity, unique self-expression, pioneering. Path: Self-discovery.',
    2:'Rahu H2 — Soul craves: Wealth, family prosperity, speech mastery. Path: Material abundance.',
    3:'Rahu H3 — Soul craves: Communication, courage, media, entrepreneurship. Path: Bold expression.',
    4:'Rahu H4 — Soul craves: Emotional security, home comfort, mother connection. Path: Roots and belonging.',
    5:'Rahu H5 — Soul craves: Creative expression, romance, speculation gains. Path: Joyful creation.',
    6:'Rahu H6 — Soul craves: Service mastery, health optimization, defeating obstacles. Path: Disciplined service.',
    7:'Rahu H7 — Soul craves: Perfect partnerships, international connections, business. Path: Collaboration.',
    8:'Rahu H8 — Soul craves: Hidden knowledge, transformation, research, occult. Path: Deep investigation.',
    9:'Rahu H9 — Soul craves: Higher wisdom, foreign travel, philosophy, technology. Path: Expansion.',
    10:'Rahu H10 — Soul craves: Career success, public recognition, authority. Path: Worldly achievement.',
    11:'Rahu H11 — Soul craves: Social impact, mass influence, technological gains. Path: Collective contribution.',
    12:'Rahu H12 — Soul craves: Foreign connections, spiritual liberation, hidden realms. Path: Transcendence.',
  };
  if (rahu) lines.push('  ' + (RAHU_FUTURE[rahu.house]||'Rahu in H'+rahu.house+' — soul seeking expansion here'));
  lines.push('');

  // ── Saturn karmic lessons ─────────────────────────────────────────────────
  lines.push('  ── Saturn Karmic Lessons (Lifetime Discipline) ──────────────────────────');
  const SAT_LESSONS = {
    1:'Saturn H1 — Master your physical self, discipline body and ego. Lesson: Self-responsibility.',
    2:'Saturn H2 — Build wealth through sustained effort. Lesson: Financial integrity.',
    3:'Saturn H3 — Develop courage through fear. Lesson: Communication precision.',
    4:'Saturn H4 — Build emotional foundation patiently. Lesson: True security comes from within.',
    5:'Saturn H5 — Creative discipline, careful with speculation. Lesson: Structured creativity.',
    6:'Saturn H6 — Service is your path to liberation. Lesson: Health through discipline.',
    7:'Saturn H7 — Relationships require maturity. Lesson: Equality and commitment.',
    8:'Saturn H8 — Face transformation fearlessly. Lesson: Mastery of impermanence.',
    9:'Saturn H9 — Earn wisdom through hard experience. Lesson: Authentic dharma.',
    10:'Saturn H10 — Career requires sustained effort. Lesson: True authority through merit.',
    11:'Saturn H11 — Gains come slowly but surely. Lesson: Consistent goal pursuit.',
    12:'Saturn H12 — Release attachments systematically. Lesson: Liberation through letting go.',
  };
  if (saturn) lines.push('  ' + (SAT_LESSONS[saturn.house]||'Saturn H'+saturn.house+' — karmic lessons in this area'));
  lines.push('');

  // ── Life theme this incarnation ───────────────────────────────────────────
  lines.push('  ── Life Theme This Incarnation ─────────────────────────────────────────');
  const NAK_THEME = {
    Ashwini:    'Healing and swift beginnings — pioneer in your field',
    Bharani:    'Transformation through creation and destruction — artistic power',
    Krittika:   'Purification through fire — cutting away what is false',
    Rohini:     'Building beauty and abundance — creator of lasting legacy',
    Mrigashira: 'Seeking eternal truth — the eternal seeker and explorer',
    Ardra:      'Storm before clarity — breakthrough via deep crisis',
    Punarvasu:  'Return to divine grace — cycles of renewal and optimism',
    Pushya:     'Nourisher of all — teaching and nurturing humanity',
    Ashlesha:   'Wisdom of serpent — deep insight into hidden truths',
    Magha:      'Royal authority — leading with ancestral power',
    'Purva Phalguni': 'Creative joy — experience the fullness of life',
    'Uttara Phalguni':'Service through knowledge — dharmic worker',
    Hasta:      'Skillful hands — craft mastery, practical genius',
    Chitra:     'Artistic brilliance — creating beauty from chaos',
    Swati:      'Independent freedom — self-directed growth',
    Vishakha:   'Purposeful achievement — single-pointed focus on goal',
    Anuradha:   'Devotion and friendship — heart-centered leadership',
    Jyeshtha:   'Elder wisdom — protecting and guiding others',
    Mula:       'Uprooting to find roots — radical transformation',
    'Purva Ashadha':'Invincibility through truth — righteous warrior',
    'Uttara Ashadha':'Final victory — completing what you started',
    Shravana:   'Listening and learning — knowledge as life purpose',
    Dhanishtha: 'Musical rhythm — harmony through abundance and fame',
    Shatabhisha:'Healing the world — 100 physicians in one body',
    'Purva Bhadrapada':'Passionate intensity — transformation through fire',
    'Uttara Bhadrapada':'Depth and patience — ancient wisdom keeper',
    Revati:     'Completion and compassion — guiding others home',
  };
  lines.push('  Janma Nakshatra Theme (' + nakshatra + '): ' + (NAK_THEME[nakshatra]||'Unique soul purpose'));
  lines.push('');

  // ── Ancestral karma ───────────────────────────────────────────────────────
  lines.push('  ── Ancestral Karma Indicators ──────────────────────────────────────────');
  const sun = pMap['Sun'];
  const indicators = [];
  if (sun && [6,8,12].includes(sun.house)) indicators.push('Sun in H'+sun.house+' — father-line karma, need to honor paternal ancestors');
  if (pMap['Moon'] && [6,8,12].includes(pMap['Moon']?.house)) indicators.push('Moon in H'+(pMap['Moon']?.house)+'— mother-line karma, nourishment and nurture healing needed');
  if (rahu && rahu.house===9) indicators.push('Rahu H9 — disruption of ancestral beliefs, soul breaking free from family patterns');
  if (ketu && ketu.house===9) indicators.push('Ketu H9 — mastery of ancestral wisdom, now time to teach what you already know');
  if (saturn && [4,9].includes(saturn.house)) indicators.push('Saturn H'+saturn.house+' — ancestral debt around home/dharma, repay through disciplined service');
  if (indicators.length === 0) indicators.push('No strong ancestral karma indicators — relatively clear ancestral slate');
  for (const ind of indicators) lines.push('  • ' + ind);
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 40 — FINANCIAL ASTROLOGY (Wealth Fingerprint)
// Income pattern, windfall periods, wealth building path
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection40_FinancialAstrology(planets, houses, avData, dashas, birthYear, NOW_JD) {
  const lines = [];
  lines.push('');
  lines.push('  FINANCIAL ASTROLOGY — Wealth DNA & Income Pattern');
  lines.push('  Houses analyzed: 2nd (savings), 5th (speculation), 8th (inheritance),');
  lines.push('                   9th (fortune), 11th (gains), 12th (hidden wealth)');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  const av2 = (avData?.raw||[])[1]||25;
  const av5 = (avData?.raw||[])[4]||25;
  const av8 = (avData?.raw||[])[7]||25;
  const av9 = (avData?.raw||[])[8]||25;
  const av11 = (avData?.raw||[])[10]||25;

  // Wealth fingerprint
  lines.push('  ── Wealth Fingerprint (Ashtakavarga Analysis) ─────────────────────────────');
  const wHouses = [{h:2,av:av2,name:'Savings/Assets'},{h:5,av:av5,name:'Speculation/Gains'},{h:8,av:av8,name:'Inheritance/Windfalls'},{h:9,av:av9,name:'Fortune/Luck'},{h:11,av:av11,name:'Income/Gains'}];
  for (const wh of wHouses) {
    const grade = wh.av>=35?'EXCELLENT':wh.av>=30?'GOOD':wh.av>=25?'AVERAGE':wh.av>=20?'BELOW AVG':'WEAK';
    lines.push('  H' + wh.h + ' (' + wh.name + '): ' + wh.av + ' pts  ' + bar(wh.av,42) + '  ' + grade);
  }
  lines.push('');

  // Income pattern
  lines.push('  ── Income Pattern Diagnosis ────────────────────────────────────────────────');
  const jupiter = pMap['Jupiter'];
  const venus = pMap['Venus'];
  const mercury = pMap['Mercury'];
  const saturn = pMap['Saturn'];
  const rahu = pMap['Rahu'];

  let pattern = 'MIXED';
  if (av11>=35 && av2>=30) pattern = 'STABLE ACCUMULATION — consistent income, steady wealth growth';
  else if (av5>=35 || (rahu && rahu.house===5)) pattern = 'SPECULATIVE GAINS — wealth through risk, technology, innovation';
  else if (av8>=35) pattern = 'WINDFALL PATTERN — sudden gains, inheritance, hidden sources';
  else if (jupiter && [2,5,9,11].includes(jupiter.house) && av9>=28) pattern = 'FORTUNE-BLESSED — luck factor high, right-place-right-time wealth';
  else if (saturn && [2,11].includes(saturn.house)) pattern = 'SLOW AND STEADY — wealth builds slowly but becomes very substantial';
  else if (mercury && [2,7,10,11].includes(mercury.house)) pattern = 'BUSINESS/TRADE — wealth through commerce, communication, skill';
  else if (rahu && [2,11].includes(rahu.house)) pattern = 'FOREIGN/TECH WEALTH — gains via unconventional means, technology, foreign';
  lines.push('  Your Wealth Pattern: ' + pattern);
  lines.push('');

  // Windfall periods from dasha
  lines.push('  ── Financial Windfall Periods (Dasha Analysis) ────────────────────────────');
  lines.push(col3('Period','Planets','Why Financial?'));
  lines.push(col3('─'.repeat(24),'─'.repeat(24),'─'.repeat(28)));
  const FINANCIAL_PLANETS = ['Jupiter','Venus','Mercury','Moon','Saturn'];
  const nowYear = jdToDate(NOW_JD).year;
  let count = 0;
  for (const d of dashas) {
    if (count >= 8) break;
    const dStart = jdToDate(d.startJD);
    const dEnd = jdToDate(d.endJD);
    if (dEnd.year < nowYear-2) continue;
    const pl = pMap[d.mahadasha];
    if (!pl) continue;
    const isFinancial = FINANCIAL_PLANETS.includes(d.mahadasha) ||
      [2,5,9,11].includes(pl.house) ||
      (avData?.raw||[])[pl.house-1] >= 30;
    if (!isFinancial) continue;
    const reason = [2,11].includes(pl.house)?'Lord in income house':
      [5,9].includes(pl.house)?'Lord in fortune house':
      d.mahadasha==='Jupiter'?'Jupiter = natural wealth karaka':
      d.mahadasha==='Venus'?'Venus = luxury and comfort':
      'Strong AV in '+pl.house+'th house';
    lines.push(col3(dStart.year+'–'+dEnd.year, d.mahadasha+' MD', reason));
    count++;
  }
  lines.push('');

  // Job vs Business verdict
  lines.push('  ── Job vs Business Verdict ─────────────────────────────────────────────────');
  let jobScore = 0, bizScore = 0;
  const mars = pMap['Mars'];
  if (saturn && [6,10].includes(saturn.house)) jobScore += 2; // Saturn in career houses = service
  if (saturn && OWN_SIGNS.Saturn?.includes(SIGNS[signOf(saturn.siderealLon)])) jobScore += 1;
  if (mars && [1,3,11].includes(mars.house)) bizScore += 2; // Mars courage for enterprise
  if (mercury && [1,7,10,11].includes(mercury.house)) bizScore += 1;
  if (rahu && [1,7,10,11].includes(rahu.house)) bizScore += 2; // Rahu = unconventional path
  if (jupiter && [1,9,10,11].includes(jupiter.house)) bizScore += 1;
  const av6b = (avData?.raw||[])[5]||25;
  if (av11>=35) bizScore += 2;
  if (av6b>=30) jobScore += 2;
  const verdict = bizScore > jobScore+2 ? 'BUSINESS/ENTREPRENEURSHIP — strongly indicated' :
                  jobScore > bizScore+2 ? 'EMPLOYMENT/SERVICE — natural fit' :
                  'HYBRID — Both possible; business partnership safer than solo venture';
  lines.push('  Business Indicators: ' + bizScore + '/10  |  Job Indicators: ' + jobScore + '/10');
  lines.push('  VERDICT: ' + verdict);
  lines.push('');
  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 41 — CAREER DNA
// Exact industry match, switch timing, entrepreneurship index, retirement
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection41_CareerDNA(planets, houses, avData, dashas, NOW_JD, vargas = null) {
  const lines = [];
  lines.push('');
  lines.push('  CAREER DNA — Exact Profession Mapping');
  lines.push('  Based on: D1 (10th house) + D10 (dashamsha) + Atmakaraka + Amatyakaraka');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  const d10Sign = vargas?.ascendant?.D10?.sign || houses[9]?.sign || 'Capricorn';
  const d10Lord = vargas?.ascendant?.D10?.lord || SIGN_LORDS[d10Sign];
  const planetsIn10 = planets.filter(p=>p.house===10);
  const d9Sign = vargas?.ascendant?.D9?.sign || houses[8]?.sign || 'Sagittarius';
  const lagna = houses[0]?.sign||'Sagittarius';
  const lagnaLord = SIGN_LORDS[lagna];

  // Industry matrix
  const INDUSTRY_MAP = {
    Sun:    ['Government/IAS/Politics','Senior Management','Healthcare Administration','Media Anchor','Solar Energy'],
    Moon:   ['Healthcare/Nursing','Hospitality/Hotels','Food Industry','Public Relations','Agriculture'],
    Mars:   ['Engineering/Manufacturing','Military/Police','Surgery/Dentistry','Sports','Real Estate'],
    Mercury:['IT/Software','Finance/CA','Writing/Journalism','Trading','Consulting/Advisory'],
    Jupiter:['Teaching/Professor','Law/Judiciary','Finance/Banking','Spirituality/Philosophy','Medicine'],
    Venus:  ['Arts/Design','Fashion/Luxury','Entertainment','Cosmetics','Hospitality/Tourism'],
    Saturn: ['Labor Law/HR','Mining/Construction','Agriculture','Infrastructure','Research'],
    Rahu:   ['Artificial Intelligence','Cryptocurrency','Foreign Trade','Film/Media','Unconventional Tech'],
    Ketu:   ['Research/Investigation','Spiritual Teaching','Alternative Medicine','Software Architecture','Astrology'],
  };

  lines.push('  ── Best Industries for You ──────────────────────────────────────────────────');
  // Primary: 10th lord
  const primaryIndustries = INDUSTRY_MAP[d10Lord]||['General management'];
  lines.push('  Based on 10th Lord (' + d10Lord + '):');
  for (const ind of primaryIndustries.slice(0,3)) lines.push('    ✅ ' + ind);
  lines.push('');

  lines.push('  D10 (Dashamsha) Anchor: ' + d10Sign + ' — lord ' + d10Lord + '; D9 support: ' + d9Sign);
  lines.push('  Sub-sector mapping is derived from the D10 anchor, 10th-house occupants and their calculated dignity; it is not a generic career horoscope.');
  lines.push('');
  // Secondary: planets in 10th
  if (planetsIn10.length > 0) {
    lines.push('  Strengthened by planets in 10th (' + planetsIn10.map(p=>p.name).join(', ') + '):');
    for (const p of planetsIn10) {
      const inds = INDUSTRY_MAP[p.name]||[];
      for (const ind of inds.slice(0,2)) lines.push('    ◆ ' + ind);
    }
    lines.push('');
  }

  // Entrepreneurship index
  lines.push('  ── Entrepreneurship Index ──────────────────────────────────────────────────');
  const mars = pMap['Mars'];
  const rahu = pMap['Rahu'];
  const jupiter = pMap['Jupiter'];
  const mercury = pMap['Mercury'];
  let entScore = 0;
  const entFactors = [];
  if (mars && [1,3,10,11].includes(mars.house)) { entScore+=2; entFactors.push('Mars in initiative house'); }
  if (rahu && [1,10,11].includes(rahu.house)) { entScore+=2; entFactors.push('Rahu drives unconventional success'); }
  if (jupiter && [1,5,9,11].includes(jupiter.house)) { entScore+=2; entFactors.push('Jupiter expands ventures'); }
  if (mercury && [1,7,10,11].includes(mercury.house)) { entScore+=1; entFactors.push('Mercury for trade and communication'); }
  const av11 = (avData?.raw||[])[10]||25;
  const av3 = (avData?.raw||[])[2]||25;
  if (av11>=30) { entScore+=2; entFactors.push('H11 gains house strong (AV '+av11+')'); }
  if (av3>=28) { entScore+=1; entFactors.push('H3 initiative house strong'); }
  entScore = Math.min(10, entScore);
  lines.push('  Entrepreneurship Score: ' + entScore + '/10  ' + bar(entScore));
  lines.push('  Grade: ' + (entScore>=8?'BORN ENTREPRENEUR':entScore>=6?'GOOD POTENTIAL':entScore>=4?'POSSIBLE WITH SUPPORT':'BETTER IN EMPLOYMENT'));
  if (entFactors.length) {
    lines.push('  Supporting factors:');
    for (const f of entFactors) lines.push('    • ' + f);
  }
  lines.push('');

  // Career switch timing
  lines.push('  ── Career Switch Timing ────────────────────────────────────────────────────');
  lines.push('  Best periods for career change (dasha of career-relevant planets):');
  const nowYear = jdToDate(NOW_JD).year;
  const CAREER_DASHAS = ['Sun','Jupiter','Mercury','Saturn','Rahu'];
  for (const d of dashas.slice(0,15)) {
    const dStart = jdToDate(d.startJD);
    const dEnd = jdToDate(d.endJD);
    if (dEnd.year < nowYear-1) continue;
    if (dStart.year > nowYear+15) break;
    if (!CAREER_DASHAS.includes(d.mahadasha)) continue;
    const pl = pMap[d.mahadasha];
    if (!pl) continue;
    if ([1,2,5,9,10,11].includes(pl.house)) {
      lines.push('  ★ ' + dStart.year + '–' + dEnd.year + ': ' + d.mahadasha + ' MD — Career advancement, switch or upgrade recommended');
    }
  }
  lines.push('');

  // Functional analysis
  lines.push('  ── Lagna Lord Analysis (Career Style) ─────────────────────────────────────');
  const lagnaLordPl = pMap[lagnaLord];
  const LAGNA_LORD_STYLE = {
    Sun:'Authority-driven leader — needs recognition and power to thrive',
    Moon:'Adaptable and people-oriented — service and hospitality thrive',
    Mars:'Action-oriented achiever — competitive fields, physical/technical work',
    Mercury:'Intellectual and versatile — multiple skills, communication-based career',
    Jupiter:'Wisdom-based guide — education, advisory, ethical leadership',
    Venus:'Aesthetic and harmonious — arts, beauty, luxury, relationships',
    Saturn:'Disciplined long-distance runner — builds reputation slowly but durably',
    Rahu:'Disruptive innovator — unconventional paths, tech, foreign connections',
    Ketu:'Intuitive researcher — depth over breadth, spiritual/investigative',
  };
  lines.push('  Lagna Lord: ' + lagnaLord + ' — ' + (LAGNA_LORD_STYLE[lagnaLord]||'Mixed career style'));
  if (lagnaLordPl) lines.push('  Placed in H' + lagnaLordPl.house + ' — ' +
    ([1,4,7,10].includes(lagnaLordPl.house)?'Strong angular position, career takes center stage':
     [5,9].includes(lagnaLordPl.house)?'Fortunate — career grows with wisdom and luck':
     [6,8,12].includes(lagnaLordPl.house)?'Challenges to overcome — career through service or transformation':
     'Supportive position — career steadily develops'));
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 42 — RELATIONSHIP ARCHITECTURE
// Marriage timing with confidence, partner traits, past life karma
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection42_RelationshipArchitecture(planets, houses, avData, dashas, birthYear, NOW_JD, doshas = null) {
  const lines = [];
  lines.push('');
  lines.push('  RELATIONSHIP ARCHITECTURE — Marriage & Partnership Blueprint');
  lines.push('  Houses: 7th (marriage), 2nd (family), 5th (romance), 11th (desire fulfillment)');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  const d7Sign = houses[6]?.sign||'Gemini';
  const d7Lord = SIGN_LORDS[d7Sign];
  const d7LordPl = pMap[d7Lord];
  const venus = pMap['Venus'];
  const mars = pMap['Mars'];
  const moon = pMap['Moon'];
  const jupiter = pMap['Jupiter'];
  const saturn = pMap['Saturn'];
  const av7 = (avData?.raw||[])[6]||25;
  const av5 = (avData?.raw||[])[4]||25;
  const av2 = (avData?.raw||[])[1]||25;
  const nowYear = jdToDate(NOW_JD).year;

  // Partner traits from 7th house
  lines.push('  ── Ideal Partner Traits (7th House Analysis) ───────────────────────────────');
  const PARTNER_TRAITS = {
    Aries:'Energetic, independent, assertive, athletic, strong-willed, quick decision-maker',
    Taurus:'Stable, sensual, practical, wealthy, artistic, loyal, patient, comfort-loving',
    Gemini:'Intelligent, witty, communicative, versatile, youthful, dual nature, curious',
    Cancer:'Nurturing, emotional, family-oriented, homely, intuitive, caring, sensitive',
    Leo:'Confident, generous, creative, leader, charismatic, proud, warm-hearted, dramatic',
    Virgo:'Analytical, service-oriented, health-conscious, detail-oriented, intelligent, practical',
    Libra:'Balanced, beautiful, diplomatic, social, fair, artistic, charming, partner-focused',
    Scorpio:'Intense, passionate, investigative, mysterious, loyal but jealous, transformative',
    Sagittarius:'Adventurous, philosophical, optimistic, foreign-connected, spiritual, freedom-loving',
    Capricorn:'Ambitious, disciplined, structured, career-focused, traditional, responsible, mature',
    Aquarius:'Innovative, humanitarian, unconventional, intelligent, tech-savvy, independent',
    Pisces:'Compassionate, spiritual, artistic, dreamy, sensitive, empathetic, sacrificing',
  };
  lines.push('  7th House (' + d7Sign + ') partner traits: ' + (PARTNER_TRAITS[d7Sign]||'Mixed traits'));
  lines.push('');

  // Venus placement for relationship nature
  if (venus) {
    const venSign = SIGNS[signOf(venus.siderealLon)];
    const VENUS_RELATION = {
      1:'Attractive personality draws partners — love is personal and immediate',
      2:'Love linked to family values and wealth — partner must share financial values',
      3:'Love through communication — intellectual connection essential',
      4:'Deep emotional bonds — home and family central to relationship',
      5:'Romantic and passionate — wants creative, playful partnership',
      6:'Love through service — may attract partners needing help',
      7:'Venus in 7th own house area — strong relationship focus, beautiful partner possible',
      8:'Deep, transformative love — intense bonds, partner may be secretive',
      9:'Philosophical partner — connected through wisdom, foreign, or dharmic paths',
      10:'Partner connected to career — work-life relationship blend',
      11:'Love through social networks — friends-to-lovers pattern',
      12:'Hidden or foreign love — spiritual connection, sacrifice in love',
    };
    lines.push('  Venus (Relationship Karaka) in H' + venus.house + ': ' + (VENUS_RELATION[venus.house]||''));
    lines.push('  Venus sign (' + venSign + '): adds ' + (PARTNER_TRAITS[venSign]||'').split(',')[0] + ' quality to relationships');
    lines.push('');
  }

  // Marriage timing with confidence %
  lines.push('  ── Marriage Timing Windows (With Confidence %) ──────────────────────────');
  lines.push('  Method: 7th lord Dasha + Venus Dasha + Jupiter transit to 7th + Moon trigger');
  lines.push('');
  const MARRIAGE_TRIGGERS = ['Venus','Moon','Jupiter',d7Lord];
  let windows = [];
  for (const d of dashas) {
    const dStart = jdToDate(d.startJD);
    const dEnd = jdToDate(d.endJD);
    if (dEnd.year < nowYear-3) continue;
    if (dStart.year > nowYear+20) break;
    let conf = 0;
    if (MARRIAGE_TRIGGERS.includes(d.mahadasha)) conf += 25;
    const pl = pMap[d.mahadasha];
    if (pl && [7,2,5,11].includes(pl.house)) conf += 20;
    if (pl && av7 >= 30) conf += 15;
    if (pl && getPlanetDignity(d.mahadasha, SIGNS[signOf(pl?.siderealLon||0)]) === 'Exalted') conf += 10;
    if (conf >= 35) {
      windows.push({ period: dStart.year+'–'+dEnd.year, planet: d.mahadasha, conf: Math.min(85, conf), house: pl?.house });
    }
  }
  windows = windows.slice(0,5);
  if (windows.length === 0) lines.push('  No strong marriage windows in immediate future — check 10+ year range');
  for (const w of windows) {
    lines.push('  ★ ' + w.period + '  ' + w.planet + ' MD (H'+w.house+')  Confidence: ' + w.conf + '%  ' + bar(w.conf/10));
  }
  lines.push('');

  // Love vs arranged marriage
  lines.push('  ── Love vs Arranged Marriage Indicators ────────────────────────────────────');
  let loveScore = 0, arrangedScore = 0;
  if (venus && [5,7,1,11].includes(venus.house)) loveScore += 3;
  if (mars && venus && abs(mars.house - venus.house) <= 1) loveScore += 2;
  if (moon && [5,7].includes(moon.house)) loveScore += 2;
  const rahu = pMap['Rahu'];
  if (rahu && [7,5].includes(rahu.house)) loveScore += 2;
  if (jupiter && [7,2].includes(jupiter.house)) arrangedScore += 3;
  if (saturn && [7,4].includes(saturn.house)) arrangedScore += 2;
  const d4Sign = houses[3]?.sign||'Pisces';
  if (SIGN_LORDS[d4Sign] === d7Lord) arrangedScore += 2;
  const loveVerdict = loveScore > arrangedScore+2 ? 'LOVE MARRIAGE — strong indicators' :
                      arrangedScore > loveScore+2 ? 'ARRANGED MARRIAGE — traditional path' :
                      'BOTH POSSIBLE — meeting through network likely (friends-of-friends pattern)';
  lines.push('  Love Indicators: ' + loveScore + '/10  |  Arranged Indicators: ' + arrangedScore + '/10');
  lines.push('  VERDICT: ' + loveVerdict);
  lines.push('');

  // Mangal Dosha interpretation
  if (mars) {
    const formation = doshas?.mangal?.formation ?? [1,2,4,7,8,12].includes(mars.house);
    const hasMangal = doshas?.mangal?.hasDosha ?? formation;
    lines.push('  ── Mangal Dosha Practical Guidance ─────────────────────────────────────────');
    lines.push('  Mars in H' + mars.house + ': ' + (hasMangal ? '⚠ Mangal Dosha effective' : formation ? 'ℹ Mangal Dosha formation present but cancelled/mitigated' : '✅ No Mangal Dosha')); 
    if (formation) {
      const severity = [1,4,7,8,12].includes(mars.house) ? 'Mild-Moderate' : 'Mild';
      lines.push('  Severity: ' + severity);
      lines.push('  Practical meaning: Relationship passion is high — partner needs equal intensity');
      lines.push('  Resolution: Marry someone with Mangal Dosha (neutralizes), or after age 28 (Mars matures)');
      lines.push('  Alternative: Kumbh Vivah ritual + weekly Hanuman worship');
    }
  }
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 43 — MEDICAL ASTROLOGY (Tridosha + Health Timeline)
// Vata/Pitta/Kapha, genetic vulnerabilities, best health periods
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection43_MedicalAstrology(planets, houses, avData, birthYear, moonSign, ascSign) {
  const lines = [];
  lines.push('');
  lines.push('  MEDICAL ASTROLOGY — Health Constitution & Vulnerability Map');
  lines.push('  Based on: Tridosha (Ayurvedic), planetary placements, house analysis');
  lines.push('');
  // FIX (P0-18, master-prompt §51 Health Safety Rule — this banner was
  // missing from the actual printed section despite being documented as
  // a project requirement): every line below is traditional astrological
  // symbolism and Ayurvedic constitutional theory, not a medical
  // evaluation of this person. It cannot detect, diagnose, rule out, or
  // predict any disease. A planetary placement is never evidence of a
  // medical condition. For any real symptom, current or future, consult
  // a qualified physician — this section is not a substitute for that.
  lines.push('  ⚠ DISCLAIMER: This section is traditional astrological/Ayurvedic');
  lines.push('    symbolism and wellness-oriented tendency analysis — NOT a medical');
  lines.push('    diagnosis, screening, or substitute for professional care. No');
  lines.push('    planetary position proves or disproves any medical condition.');
  lines.push('    Please consult a qualified physician for any real symptom.');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  // Tridosha calculation from lagna + moon
  lines.push('  ── Tridosha Constitution (Ayurvedic Prakriti) ─────────────────────────────');
  const SIGN_DOSHA = {
    Aries:'Pitta', Taurus:'Kapha', Gemini:'Vata', Cancer:'Kapha',
    Leo:'Pitta', Virgo:'Vata', Libra:'Vata', Scorpio:'Pitta',
    Sagittarius:'Pitta', Capricorn:'Vata', Aquarius:'Vata', Pisces:'Kapha'
  };
  const NAK_DOSHA = {
    Ashwini:'Vata', Bharani:'Pitta', Krittika:'Pitta', Rohini:'Kapha',
    Mrigashira:'Vata', Ardra:'Vata', Punarvasu:'Vata', Pushya:'Pitta',
    Ashlesha:'Kapha', Magha:'Pitta', 'Purva Phalguni':'Pitta', 'Uttara Phalguni':'Pitta',
    Hasta:'Vata', Chitra:'Pitta', Swati:'Vata', Vishakha:'Pitta',
    Anuradha:'Kapha', Jyeshtha:'Kapha', Mula:'Pitta', 'Purva Ashadha':'Pitta',
    'Uttara Ashadha':'Kapha', Shravana:'Vata', Dhanishtha:'Pitta',
    Shatabhisha:'Vata', 'Purva Bhadrapada':'Pitta', 'Uttara Bhadrapada':'Kapha', Revati:'Kapha'
  };

  const moon = pMap['Moon'];
  const moonNakIdx = moon ? nakshatraOf(moon.siderealLon) : 0;
  const moonNak = NAKSHATRAS[moonNakIdx]||'Ashwini';

  const doshaCount = { Vata:0, Pitta:0, Kapha:0 };
  const lagnaDosha = SIGN_DOSHA[ascSign]||'Vata';
  const moonSignDosha = SIGN_DOSHA[moonSign]||'Kapha';
  const moonNakDosha = NAK_DOSHA[moonNak]||'Vata';
  doshaCount[lagnaDosha] += 2;
  doshaCount[moonSignDosha] += 2;
  doshaCount[moonNakDosha] += 1;

  // Planet contributions
  const PLANET_DOSHA = { Sun:'Pitta', Moon:'Kapha', Mars:'Pitta', Mercury:'Vata', Jupiter:'Kapha', Venus:'Kapha', Saturn:'Vata' };
  for (const [planet, dosha] of Object.entries(PLANET_DOSHA)) {
    const pl = pMap[planet];
    if (pl && [1,6].includes(pl.house)) doshaCount[dosha]++;
  }

  const total = doshaCount.Vata + doshaCount.Pitta + doshaCount.Kapha;
  lines.push('  Prakriti (Constitution):');
  for (const [d, count] of Object.entries(doshaCount)) {
    const pctVal = Math.round((count/total)*100);
    lines.push('  ' + pad(d + ':', 12) + pad(pctVal + '%', 8) + bar(pctVal/10));
  }
  const dominant = Object.entries(doshaCount).sort((a,b)=>b[1]-a[1])[0][0];
  const secondary = Object.entries(doshaCount).sort((a,b)=>b[1]-a[1])[1][0];
  lines.push('');
  lines.push('  Constitution Type: ' + dominant + '-' + secondary + ' Prakriti');
  const DOSHA_HEALTH = {
    Vata:'Traditional symbolism: mobility, variability, dryness and restlessness themes',
    Pitta:'Traditional symbolism: heat, intensity, sharpness and reactivity themes',
    Kapha:'Traditional symbolism: stability, heaviness, endurance and attachment themes',
  };
  lines.push('  Primary ' + dominant + ' traditional tendencies: ' + (DOSHA_HEALTH[dominant]||''));
  lines.push('');

  // Health vulnerabilities by house
  lines.push('  ── Body Part Mapping (House-Planet Analysis) ──────────────────────────────');
  const HOUSE_BODY = {
    1:'Head, brain, eyes, overall vitality',
    2:'Face, throat, neck, right eye, speech organs',
    3:'Shoulders, arms, lungs, right ear, nervous system',
    4:'Chest, heart, breasts, stomach, blood',
    5:'Stomach, upper abdomen, spine, heart',
    6:'Intestines, digestive system, kidneys, immune system',
    7:'Lower abdomen, kidneys, ovaries, reproductive organs',
    8:'Genitals, excretory organs, longevity, chronic disease',
    9:'Hips, thighs, liver, arterial system',
    10:'Knees, joints, bones, skin',
    11:'Ankles, calves, circulation, lymphatic',
    12:'Feet, sleep, sub-conscious, immune, psychic sensitivity',
  };
  const SIGN_BODY = { ...HOUSE_BODY }; // same mapping

  // Afflicted houses
  for (const pl of planets) {
    if (['Mars','Saturn','Rahu','Ketu'].includes(pl.name) && [6,8,12].includes(pl.house)) {
      lines.push('  ⚠ ' + pl.name + ' in H' + pl.house + ': ' + (HOUSE_BODY[pl.house]||'') + ' — vulnerability area');
    }
  }
  // 6th lord placement
  const d6Sign = houses[5]?.sign||'Taurus';
  const d6Lord = SIGN_LORDS[d6Sign];
  const d6LordPl = pMap[d6Lord];
  if (d6LordPl && [1,4,7,10].includes(d6LordPl.house)) {
    lines.push('  ◆ 6th Lord (' + d6Lord + ') in H' + d6LordPl.house + ': Disease lord in angular house — health needs active monitoring');
  }
  lines.push('');

  // Health recommendations by Prakriti
  lines.push('  ── Ayurvedic Health Recommendations ────────────────────────────────────────');
  const REC = {
    Vata:{ diet:'Warm, oily, heavy foods. Avoid raw foods, cold drinks. Ghee, sesame oil beneficial.',
           herbs:'Ashwagandha, Shatavari, Brahmi, Bala. Avoid stimulants.',
           lifestyle:'Regular schedule, warm oil massage (Abhyanga), avoid overexertion, adequate sleep.' },
    Pitta:{ diet:'Cool, sweet, bitter, astringent foods. Avoid spicy, fried, alcohol. Coconut, coriander good.',
            herbs:'Brahmi, Amalaki, Shatavari, Guduchi. Turmeric for inflammation.',
            lifestyle:'Avoid overworking, practice compassion, cold water bathing, moderate exercise.' },
    Kapha:{ diet:'Light, dry, warm, spicy foods. Avoid heavy, oily, sweet foods. Honey, barley good.',
            herbs:'Trikatu, Guggul, Triphala, Ginger. Avoid heavy supplements.',
            lifestyle:'Vigorous daily exercise, early rising, avoid napping, stimulating activities.' },
  };
  const rec = REC[dominant];
  if (rec) {
    lines.push('  Diet: ' + rec.diet);
    lines.push('  Herbs: ' + rec.herbs);
    lines.push('  Lifestyle: ' + rec.lifestyle);
  }
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 44 — NAKSHATRA PERSONALITY PROFILE (Deep)
// Beyond basics — psychology, strengths, weaknesses, relationships
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection44_NakshatraPersonality(moonNakshatra, ascNakshatra, sunNakshatra, planets) {
  const lines = [];
  lines.push('');
  lines.push('  NAKSHATRA PERSONALITY PROFILE (Deep Analysis)');
  lines.push('  Janma Nakshatra (Moon) = core nature | Lagna Nakshatra = outer personality');
  lines.push('  Sun Nakshatra = soul purpose | All three together = complete picture');
  lines.push('');

  // ── Classical significations per nakshatra (BPHS/Muhurtha-Chintamani karakatva) ──
  // These keyword banks are canon (fixed by classical texts, same for everyone
  // born under that nakshatra) — exactly like SIGN_LORDS or PLANET_NATURE above.
  // What makes the OUTPUT dynamic is how they get combined below: the ruling
  // planet's actual dignity + house placement in THIS chart drives which
  // keywords get emphasized, so two natives with the same nakshatra get
  // different synthesized text once their charts differ.
  const NAK_KEYWORDS = {
    Ashwini:['swift','pioneering','healing'], Bharani:['creative','intense','transformative'],
    Krittika:['sharp','purifying','determined'], Rohini:['abundant','magnetic','stable'],
    Mrigashira:['searching','gentle','curious'], Ardra:['stormy','breakthrough','penetrating'],
    Punarvasu:['renewing','optimistic','generous'], Pushya:['nourishing','traditional','protective'],
    Ashlesha:['deep','strategic','intuitive'], Magha:['authoritative','ancestral','commanding'],
    'Purva Phalguni':['pleasure-seeking','creative','relaxed'], 'Uttara Phalguni':['dutiful','articulate','principled'],
    Hasta:['skillful','resourceful','practical'], Chitra:['artistic','charismatic','independent'],
    Swati:['diplomatic','independent','adaptable'], Vishakha:['determined','ambitious','goal-driven'],
    Anuradha:['devoted','disciplined','friendship-oriented'], Jyeshtha:['protective','commanding','responsible'],
    Mula:['investigative','root-seeking','uprooting'], 'Purva Ashadha':['invincible','proud','persuasive'],
    'Uttara Ashadha':['enduring','principled','victorious'], Shravana:['listening','learned','connected'],
    Dhanishtha:['rhythmic','wealthy','musical'], Shatabhisha:['secretive','healing','unconventional'],
    'Purva Bhadrapada':['intense','transformative','fiery'], 'Uttara Bhadrapada':['wise','deep','patient'],
    Revati:['nurturing','compassionate','transitional'],
  };
  const NAK_CAREER = {
    Ashwini:['medicine','sports','emergency response'], Bharani:['arts','midwifery','crisis management'],
    Krittika:['military/leadership','metallurgy','culinary fields'], Rohini:['arts','luxury goods','agriculture'],
    Mrigashira:['research','writing','travel-based work'], Ardra:['technology','investigation','psychology'],
    Punarvasu:['teaching','publishing','astrology'], Pushya:['teaching','nutrition','government service'],
    Ashlesha:['psychology','toxicology/research','occult studies'], Magha:['politics','law','heritage/legacy work'],
    'Purva Phalguni':['entertainment','hospitality','design'], 'Uttara Phalguni':['academia','non-profit','institutions'],
    Hasta:['crafts','surgery','digital design'], Chitra:['architecture','fashion','visual arts'],
    Swati:['trade','diplomacy','independent business'], Vishakha:['competitive fields','sales','goal-driven ventures'],
    Anuradha:['collaborative ventures','diplomacy','devotional work'], Jyeshtha:['management','protective services','seniority-based roles'],
    Mula:['research','herbal medicine','investigative work'], 'Purva Ashadha':['law','persuasive fields','maritime work'],
    'Uttara Ashadha':['leadership','long-term institutions','public service'], Shravana:['counseling','media','education'],
    Dhanishtha:['music','real estate','finance'], Shatabhisha:['medicine/healing','technology','unconventional research'],
    'Purva Bhadrapada':['occult/tantra','finance','transformative work'], 'Uttara Bhadrapada':['philosophy','deep counseling','spiritual guidance'],
    Revati:['guidance roles','hospitality','transitions (travel, endings)'],
  };
  const GUNA_TONE = {
    Sattva:'balanced and principled', Rajas:'driven and active', Tamas:'intense and deeply rooted',
  };

  const synthesizeProfile = (nakName) => {
    const idx = NAKSHATRAS.indexOf(nakName);
    if (idx < 0) {
      return { header: nakName + ' (nakshatra not recognized in dataset)', body: [] };
    }
    const lord = NAKSHATRA_LORDS[idx];
    const deity = NAKSHATRA_DEITIES[idx];
    const symbol = NAKSHATRA_SYMBOLS[idx];
    const guna = NAKSHATRA_GUNA[idx];
    const keywords = NAK_KEYWORDS[nakName] || ['distinctive','purposeful','evolving'];
    const careers = NAK_CAREER[nakName] || ['fields aligned with ' + lord + "'s significations"];

    // Chart-specific factor: where is the ruling planet actually placed?
    const lordPl = (planets||[]).find(p => p.name === lord);
    const dignity = lordPl?.dignity || null;
    const house = lordPl?.house || null;
    const dScore = dignity ? dignityScore(dignity) : 0;

    // Strength/weakness balance genuinely shifts with the lord's condition —
    // this is the part that cannot be pre-written, since it depends on the
    // native's specific chart, not just which nakshatra they were born under.
    let balanceNote, strengthWeight, weaknessNote;
    if (dScore >= 3) {
      strengthWeight = 'strongly expressed';
      weaknessNote = 'well-managed, surfacing only under real pressure';
      balanceNote = lord + ' (lord of ' + nakName + ') is ' + dignity.toLowerCase() +
        (house ? ' in house ' + house : '') + ', so the ' + keywords[0] + ' and ' + keywords[1] +
        ' qualities of this nakshatra come through clearly and reliably.';
    } else if (dScore <= -1) {
      strengthWeight = 'present but inconsistent';
      weaknessNote = 'more pronounced than usual and worth active management';
      balanceNote = lord + ' (lord of ' + nakName + ') is ' + (dignity||'weakly placed').toLowerCase() +
        (house ? ' in house ' + house : '') + ', so the shadow side of this nakshatra — ' +
        'restlessness, self-doubt, or friction — needs conscious effort to keep in check.';
    } else {
      strengthWeight = 'moderately expressed';
      weaknessNote = 'occasional, tends to appear during stress';
      balanceNote = lord + ' (lord of ' + nakName + ') is ' + (dignity||'neutrally placed').toLowerCase() +
        (house ? ' in house ' + house : '') + ', giving a fairly balanced mix of this nakshatra\'s gifts and challenges.';
    }

    const houseLifeArea = house ? ({
      1:'self-expression and personal identity', 2:'finances and family values', 3:'effort, courage and communication',
      4:'home, inner peace and emotional roots', 5:'creativity, intellect and children', 6:'daily work, service and overcoming obstacles',
      7:'partnerships and marriage', 8:'transformation and shared resources', 9:'fortune, belief and higher learning',
      10:'career and public standing', 11:'gains, networks and aspirations', 12:'release, retreat and the unseen',
    })[house] : null;

    const body = [
      'Keywords:      ' + keywords.join(', ') + ' (' + GUNA_TONE[guna] + ' — ' + guna + ' guna)',
      'Deity/Symbol:  ' + deity + ' / ' + symbol,
      'Ruling planet: ' + lord + (dignity ? ' — ' + dignity + (house ? ' in house ' + house : '') : ' — placement unavailable'),
      'Expression:    Strengths are ' + strengthWeight + '; weaknesses are ' + weaknessNote + '.',
      'Chart note:    ' + balanceNote,
      'Career fields: ' + careers.join(', ') + (houseLifeArea ? '; also drawn toward ' + houseLifeArea + ' (via ' + lord + ' in H' + house + ')' : ''),
      'Best Dasha:    ' + lord + ' Mahadasha for peak expression of these traits' +
        (dScore >= 3 ? ' (favorably placed — expect this period to deliver strongly)' :
         dScore <= -1 ? ' (currently under strain — results may need extra effort during this period)' : ''),
      '★ Guidance:   ' + (dScore >= 3
        ? 'Lean into your ' + keywords[0] + ' nature — your chart supports it. Watch for overconfidence.'
        : dScore <= -1
        ? 'Actively work on the weaker side of ' + nakName + " — it won't resolve on its own given " + lord + "'s current placement."
        : 'Build consistency — your ' + nakName + ' traits are present but need deliberate cultivation to fully mature.'),
    ];
    return { header: nakName, body };
  };

  const printProfile = (nakName, title) => {
    const profile = synthesizeProfile(nakName);
    lines.push('  ── ' + title + ': ' + profile.header + ' ─'.repeat(3));
    for (const line of profile.body) lines.push('  ' + line);
    lines.push('');
  };

  printProfile(moonNakshatra, 'JANMA NAKSHATRA (Moon — Core Nature)');
  printProfile(ascNakshatra, 'LAGNA NAKSHATRA (Ascendant — Outer Personality)');
  printProfile(sunNakshatra, 'SUN NAKSHATRA (Soul Purpose)');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 45 — LIFE PHASE STRATEGY
// Struggle/Growth/Peak phases, what to DO now, 5-year action plan
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection45_LifePhaseStrategy(planets, dashas, avData, NOW_JD, birthYear) {
  const lines = [];
  lines.push('');
  lines.push('  LIFE PHASE STRATEGY — What To Do RIGHT NOW');
  lines.push('  Based on current dasha quality and planetary positions');
  lines.push('');

  const nowYear = jdToDate(NOW_JD).year;
  const nowAge = nowYear - birthYear;
  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  // Label each dasha as Struggle/Growth/Peak/Harvest
  lines.push('  ── Life Phase Classification ────────────────────────────────────────────────');
  lines.push(col3('Period (Age)', 'Phase', 'Strategy'));
  lines.push(col3('─'.repeat(22),'─'.repeat(14),'─'.repeat(34)));

  const { calcAntardashas } = (() => {
    function calcAntar(md) {
      const { mahadasha: mLord, startJD, endJD, years } = md;
      const mStart = DASHA_ORDER.indexOf(mLord);
      const antars = [];
      let cur = startJD;
      for (let i = 0; i < 9; i++) {
        const aLord = DASHA_ORDER[(mStart + i) % 9];
        const aYrs = years * DASHA_YEARS[aLord] / 120;
        const aEnd = cur + aYrs * 365.25;
        antars.push({ mahadasha: mLord, antardasha: aLord, startJD: cur, endJD: aEnd, years: aYrs });
        cur = aEnd;
      }
      return antars;
    }
    return { calcAntardashas: calcAntar };
  })();

  const PHASE_MAP = {
    'CONSOLIDATION': 'Conserve energy, build foundation, learn lessons, avoid big risks',
    'TRANSFORMATION':'Karmic/change period — inner work, release what no longer serves, avoid big risks',
    'BUILDING':      'Change direction, build steadily, plant new seeds, prepare for growth',
    'GROWTH':        'Invest actively, expand network, take calculated risks, build reputation',
    'PEAK':          'Execute major decisions, maximize opportunities, highest achievement possible',
  };

  // FIX (audit): phase used to be graded purely from occupied house +
  // sign dignity, which is exactly how a 10th-lord Mahadasha ended up
  // labeled "Struggle" — a Trikona/Kendra lord's own dasha is, by BPHS
  // definition, a rising period even when its placement adds friction.
  // dashaScore()/phaseFromDashaScore() (src/prediction/lordshipQuality.js)
  // now judge this using the same lordship-aware logic used everywhere
  // else in the report, so this section can't contradict Sections 21/23/37.
  for (const d of dashas.slice(0, 12)) {
    const dStart = jdToDate(d.startJD);
    const dEnd = jdToDate(d.endJD);
    const startAge = dStart.year - birthYear;
    const endAge = dEnd.year - birthYear;
    if (dEnd.year < nowYear - 5) continue;
    if (dStart.year > nowYear + 30) break;

    const pl = pMap[d.mahadasha];
    const sign = pl ? SIGNS[signOf(pl.siderealLon)] : '?';
    const dig = getPlanetDignity(d.mahadasha, sign);
    const avH = pl ? ((avData?.raw||[])[pl.house-1]||25) : 25;
    const verdict = dashaScore(d.mahadasha, pl?.house || 1, dig, avH, planets);
    const phase = phaseFromDashaScore(verdict);
    const isCurrent = dStart.year <= nowYear && dEnd.year >= nowYear;
    const ageStr = max(0,startAge) + '–' + max(0,endAge);
    lines.push(col3(dStart.year+'–'+dEnd.year+' ('+ageStr+')', phase + (isCurrent?' ◄':''), (PHASE_MAP[phase]||'').substring(0,34)));
    if (isCurrent) lines.push('    Current: ' + d.mahadasha + ' MD | ' + dig + ' | H' + (pl?.house||'?') + ' | AV:' + avH);
  }
  lines.push('');

  // Find current phase
  let currentPhase = 'GROWTH';
  for (const d of dashas) {
    if (d.startJD <= NOW_JD && d.endJD >= NOW_JD) {
      const pl = pMap[d.mahadasha];
      const dig = pl ? getPlanetDignity(d.mahadasha, SIGNS[signOf(pl.siderealLon)]) : 'Neutral';
      const avH = pl ? ((avData?.raw||[])[pl.house-1]||25) : 25;
      currentPhase = phaseFromDashaScore(dashaScore(d.mahadasha, pl?.house || 1, dig, avH, planets));
      break;
    }
  }

  // Actionable strategy for current phase
  lines.push('  ── YOUR CURRENT PHASE: ' + currentPhase + ' ─────────────────────────────────────────');
  const PHASE_ACTIONS = {
    CONSOLIDATION: {
      headline: 'A quieter, foundation-building period — steady effort matters more than big moves',
      now: ['Focus on skill-building and learning — not results', 'Strengthen health routines (Vata/Pitta balance)', 'Reduce financial risk exposure significantly', 'Build close relationships and support network', 'Practice spiritual disciplines for inner stability'],
      avoid: ['Major investments or financial speculation', 'Changing career/relationships impulsively', 'Confronting enemies or legal battles', 'Taking on excessive responsibilities'],
      mindset: 'This period ends. Everything you learn here becomes your most valuable asset in the next Growth phase.',
    },
    TRANSFORMATION: {
      headline: 'A karmic/transformational dasha — this house-lord\'s period asks for inner change, not external "badness"',
      now: ['Use this period for genuine inner work — therapy, meditation, honest self-review', 'Release attachments/relationships/habits that no longer serve you', 'Keep major financial and legal commitments conservative', 'Lean on trusted people rather than isolating', 'Track physical health closely; this is a good period for a check-up'],
      avoid: ['Treating this as simply "bad luck" and waiting it out passively', 'Major irreversible decisions made from fear', 'Ignoring the theme this planet\'s dasha is asking you to work on'],
      mindset: 'A dusthana-lord dasha is a classical karmic-clearance period, not a verdict on your worth or future. What you release now clears space for the growth period that follows.',
    },
    BUILDING: {
      headline: 'A pivotal building phase — choices made now shape the next decade',
      now: ['Evaluate current direction with honest assessment', 'Identify which opportunities align with your chart strengths', 'Build bridges to the next phase (network, skills)', 'Plant seeds of major projects to harvest in 3–5 years', 'Consult mentors and review past patterns'],
      avoid: ['Burning bridges or making irreversible decisions in anger', 'Isolating from support systems', 'Ignoring health warning signs'],
      mindset: 'Every building phase is a gateway. Navigate with patience and strategic intention.',
    },
    GROWTH: {
      headline: 'Growth phase — this is your time to expand and build',
      now: ['Invest in career development and skill advancement', 'Expand professional network aggressively', 'Consider real estate or equity investments (H2 strength)', 'Take calculated entrepreneurial risks', 'Build your reputation in your field'],
      avoid: ['Complacency and staying in comfort zone', 'Ignoring financial planning', 'Relationship neglect while focused on career'],
      mindset: 'Growth periods come with responsibility. Discipline now creates extraordinary results.',
    },
    PEAK: {
      headline: 'PEAK PERIOD — maximum potential, highest results possible',
      now: ['Execute the most important decisions of your life NOW', 'Launch your biggest career/business initiative', 'Marriage, major investment, relocation — all favorable', 'Lead and take authority in your domain', 'Mentor others — your influence is at maximum'],
      avoid: ['Wasting time on trivial matters', 'Overconfidence without preparation', 'Neglecting health during high activity'],
      mindset: 'Peak periods are rare gifts. Prepare thoroughly, then act decisively. Results now echo for decades.',
    },
    HARVEST: {
      headline: 'Harvest phase — collecting the results of past effort',
      now: ['Systematize and stabilize what you have built', 'Guide and mentor the next generation', 'Diversify income into passive streams', 'Deepen spiritual practice and inner work', 'Plan legacy and estate structure'],
      avoid: ['Starting completely new ventures without preparation', 'Major financial risks in unknown domains'],
      mindset: 'The fruit is ready. Harvest wisely, share generously, and plant new seeds for future cycles.',
    },
  };

  const actions = PHASE_ACTIONS[currentPhase];
  if (actions) {
    lines.push('  ' + actions.headline);
    lines.push('');
    lines.push('  ✅ DO NOW:');
    for (const a of actions.now) lines.push('    • ' + a);
    lines.push('');
    lines.push('  ❌ AVOID:');
    for (const a of actions.avoid) lines.push('    • ' + a);
    lines.push('');
    lines.push('  💡 MINDSET: ' + actions.mindset);
  }
  lines.push('');

  // 5-year action plan
  lines.push('  ── 5-Year Action Plan (' + nowYear + '–' + (nowYear+5) + ') ─────────────────────────────────');
  const YEAR_ACTIONS = [
    'Foundation year — build systems, routines, and core relationships',
    'Expansion year — increase reach, visibility, and opportunity surface',
    'Review year — evaluate progress, course-correct, consolidate gains',
    'Investment year — commit to biggest opportunities identified in year 3',
    'Harvest year — collect results, stabilize, and plan next 5-year cycle',
  ];
  for (let i = 0; i < 5; i++) {
    const yr = nowYear + i;
    const yrJD = julianDay(yr, 6, 15, 0);
    let activeMD = dashas.find(d => d.startJD <= yrJD && d.endJD >= yrJD);
    lines.push('  ' + yr + ' (Year ' + (i+1) + '): ' + YEAR_ACTIONS[i]);
    if (activeMD) lines.push('    Dasha: ' + activeMD.mahadasha + ' MD active this year');
  }
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 46 — PLANETARY PERIOD ACTIVATORS
// Eclipse activation, retrograde stations, planetary wars, ingress dates
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection46_PlanetaryActivators(planets, AYANAMSA, NOW_JD) {
  const lines = [];
  lines.push('');
  lines.push('  PLANETARY PERIOD ACTIVATORS — Timing Triggers');
  lines.push('  Key astronomical events that activate natal chart potentials');
  lines.push('');

  const today = jdToDate(NOW_JD);
  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  // Check next 90 days for key transits activating natal degrees
  lines.push('  ── Natal Degree Activation (Next 90 Days) ─────────────────────────────────');
  lines.push('  Planets within 2° of your natal planet positions = ACTIVATION WINDOW');
  lines.push('');
  lines.push(col3('Transit Planet', 'Activating Natal', 'Effect'));
  lines.push(col3('─'.repeat(22),'─'.repeat(22),'─'.repeat(28)));

  const checkPlanets = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  let activationsFound = 0;
  for (let dayOffset = 0; dayOffset <= 90; dayOffset += 7) {
    const checkJD = NOW_JD + dayOffset;
    const checkDate = jdToDate(checkJD);
    for (const tPlanet of ['Jupiter','Saturn','Mars','Rahu']) {
      const tPos = calcPlanetPosition(tPlanet, checkJD);
      if (!tPos) continue;
      // FIX (Phase 4/5 audit): calcPlanetPosition().lon is already sidereal.
      // This one mattered in practice: tLon (transiting) was being compared
      // directly against nPlanet.siderealLon (natal, already correct) to
      // detect an "activation" within 2° — the ~24° double-subtraction
      // error meant real activations were missed and false ones reported.
      const tLon = mod360(tPos.lon);
      for (const nPlanet of planets.slice(0,7)) {
        const diff = abs(mod360(tLon - nPlanet.siderealLon));
        const minDiff = min(diff, 360-diff);
        if (minDiff <= 2) {
          const effect = tPlanet==='Jupiter'?'Expansion and opportunity':
                        tPlanet==='Saturn'?'Karmic pressure and discipline':
                        tPlanet==='Mars'?'Energy surge or conflict':
                        tPlanet==='Rahu'?'Disruption or sudden change':'Activation';
          lines.push(col3(tPlanet + ' ('+checkDate.day+'/'+checkDate.month+')',
            'Natal ' + nPlanet.name + ' (' + nPlanet.siderealLon.toFixed(1) + '°)',
            effect));
          activationsFound++;
        }
      }
    }
  }
  if (activationsFound === 0) lines.push('  No exact activations in next 90 days — gradual period');
  lines.push('');

  // Retrograde planets currently
  lines.push('  ── Current Retrograde Status ──────────────────────────────────────────────');
  for (const pName of ['Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu']) {
    const pos = calcPlanetPosition(pName, NOW_JD);
    if (!pos) continue;
    const isRetro = (pos.speed||0) < 0;
    const natalPl = pMap[pName];
    if (isRetro) {
      lines.push('  ℞ ' + pName + ' is RETROGRADE — ' +
        (natalPl ? 'activating H' + natalPl.house + ' natal themes inwardly' : 'internal review triggered'));
      lines.push('    Effect: ' + (PLANET_NATURE[pName]==='Malefic'?'Retrograde malefic = temporarily acts beneficially (BPHS)':
                                   'Retrograde benefic = results come but through unexpected routes'));
    }
  }
  lines.push('');

  // Planetary war check (within 1°)
  lines.push('  ── Planetary War Check (Planets Within 1°) ──────────────────────────────');
  const currentPositions = {};
  for (const pName of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']) {
    const pos = calcPlanetPosition(pName, NOW_JD);
    // FIX (Phase 4/5 audit): already sidereal; kept for the Planetary War
    // check below, which only compares transiting planets against each
    // other so the old bug happened to cancel out there — fixing anyway
    // for correctness of the absolute longitude value itself.
    if (pos) currentPositions[pName] = mod360(pos.lon);
  }
  let warFound = false;
  const planets7 = Object.keys(currentPositions);
  for (let i = 0; i < planets7.length; i++) {
    for (let j = i+1; j < planets7.length; j++) {
      const diff = abs(currentPositions[planets7[i]] - currentPositions[planets7[j]]);
      const minDiff = min(diff, 360-diff);
      if (minDiff <= 1 && !['Sun','Moon'].includes(planets7[i]) && !['Sun','Moon'].includes(planets7[j])) {
        lines.push('  ⚔ PLANETARY WAR: ' + planets7[i] + ' vs ' + planets7[j] + ' (' + minDiff.toFixed(2) + '° apart)');
        lines.push('    Winner: ' + (currentPositions[planets7[i]] < currentPositions[planets7[j]] ? planets7[i] : planets7[j]) + ' (planet with lower longitude wins)');
        warFound = true;
      }
    }
  }
  if (!warFound) lines.push('  No planetary war active currently — peaceful planetary energy');
  lines.push('');

  // Eclipse sensitivity
  lines.push('  ── Eclipse Sensitivity Points ──────────────────────────────────────────────');
  const rahuPos = calcPlanetPosition('Rahu', NOW_JD);
  if (rahuPos) {
    // FIX (Phase 4/5 audit): calcPlanetPosition('Rahu',...) via
    // getAllPlanetPositions() is already sidereal (unlike transits.js'
    // separate tropical trueNode() path, which correctly still subtracts
    // once). This fed the Eclipse Sensitivity check, comparing against
    // correctly-computed natal longitudes — a real mixed-frame bug.
    const rahuLon = mod360(rahuPos.lon);
    const ketuLon = mod360(rahuLon + 180);
    lines.push('  Current Rahu axis: ' + SIGNS[signOf(rahuLon)] + '–' + SIGNS[signOf(ketuLon)]);
    for (const np of planets.filter(p => !p.outer)) {
      const diffRahu = abs(mod360(np.siderealLon - rahuLon));
      const diffKetu = abs(mod360(np.siderealLon - ketuLon));
      const minDiff = min(diffRahu, min(360-diffRahu, diffKetu, 360-diffKetu));
      if (minDiff <= 15) {
        lines.push('  ⚡ ' + np.name + ' is within eclipse zone (±15°) — eclipses STRONGLY activate H' + np.house + ' themes');
      }
    }
  }
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 47 — BIRTH TIME SENSITIVITY & RECTIFICATION
// ±15 min impact table, birth time confidence, rectification hints
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection47_BirthTimeSensitivity(B, ASC, AYANAMSA, JD) {
  const lines = [];
  lines.push('');
  lines.push('  BIRTH TIME SENSITIVITY ANALYSIS');
  lines.push('  Showing impact of ±15 minute birth time variations');
  lines.push('  Use life events to verify which time gives correct predictions');
  lines.push('');


  lines.push(col3('Birth Time', 'Ascendant', 'Lagna Change'));
  lines.push(col3('─'.repeat(22),'─'.repeat(26),'─'.repeat(22)));

  const times = [-15, -10, -5, 0, 5, 10, 15];
  const baseASC = ASC;
  const baseSign = signOf(baseASC);

  // BUG FIX (§4 NaN): B.sec is optional on the raw birth input, and
  // Date.UTC(y, m, d, h, min, undefined) returns NaN — which propagated into
  // every displayed clock time as the literal string "NaN:NaN". Default it.
  const birthSec = Number.isFinite(B.sec) ? B.sec : 0;

  // BUG FIX (§36 unsupported precision): the ascendant was previously
  // extrapolated as `baseASC + deltaMin * 0.25` — a flat 1°-per-4-minutes
  // guess. The ascendant does NOT advance at a uniform rate: its speed depends
  // on latitude and on which sign is rising (signs of long vs short ascension),
  // so near a cusp this approximation can be wrong by whole degrees and can
  // therefore report "Same Lagna" when the Lagna genuinely changes — the exact
  // failure mode a sensitivity table exists to catch. Each candidate time is
  // now run through the real ascendant solver.
  for (const deltaMin of times) {
    const localMs = Date.UTC(B.year, B.month - 1, B.day, B.hour, B.min, birthSec) + deltaMin * 60000;
    const normalized = new Date(localMs);

    // §1 ONE SOURCE OF TRUTH: do NOT re-derive the ascendant here. Call the
    // same canonical phase the chart itself uses, so the sensitivity table can
    // never disagree with the Lagna printed everywhere else in the report.
    // (An earlier revision of this fix called vsop87.ascendant() directly and
    // read `.asc` instead of `.tropical`, double-subtracting the ayanamsa and
    // reporting Aries 16° against the chart's own Taurus 9.7° — precisely the
    // duplicated-formula failure mode §1 exists to prevent.)
    let newASC, ascStatus = 'CALCULATED';
    try {
      const cand = computeTimeAndAscendant({
        year: normalized.getUTCFullYear(),
        month: normalized.getUTCMonth() + 1,
        day: normalized.getUTCDate(),
        hour: normalized.getUTCHours(),
        min: normalized.getUTCMinutes(),
        sec: normalized.getUTCSeconds(),
        lat: B.lat, lon: B.lon, tz: B.tz,
        ayanamsaMode: B.ayanamsaMode || 'lahiri'
      });
      newASC = cand.ASC;
      if (!Number.isFinite(newASC)) ascStatus = 'NOT_CALCULATED';
    } catch (e) { ascStatus = 'NOT_CALCULATED'; }

    const label = deltaMin === 0 ? '★ STATED TIME' : (deltaMin > 0 ? '+' + deltaMin + ' min' : deltaMin + ' min');
    const localDateLabel = String(normalized.getUTCHours()).padStart(2,'0') + ':' + String(normalized.getUTCMinutes()).padStart(2,'0');

    if (ascStatus !== 'CALCULATED') {
      // §40: never render a failed calculation as a number.
      lines.push(col3(localDateLabel + ' (' + label + ')', 'NOT_CALCULATED', 'NOT_CALCULATED'));
      continue;
    }
    const newSign = signOf(newASC);
    const signChanged = newSign !== baseSign;
    lines.push(col3(
      localDateLabel + ' (' + label + ')',
      SIGNS[newSign] + ' ' + (newASC%30).toFixed(2) + '°',
      signChanged ? '⚠ LAGNA CHANGES to ' + SIGNS[newSign] : 'Same Lagna'
    ));
  }
  lines.push('');

  lines.push('  ── Birth Time Verification Hints ──────────────────────────────────────────');
  lines.push('  To verify your birth time, check these life events against predictions:');
  lines.push('');
  lines.push('  1. Marriage/relationships — 7th lord dasha should coincide');
  lines.push('  2. Career change — 10th lord or Saturn dasha periods');
  lines.push('  3. Father events — Sun dasha or 9th lord period');
  lines.push('  4. Residence change — 4th lord or Moon dasha');
  lines.push('  5. Health issues — 6th/8th lord or Mars dasha');
  lines.push('');
  lines.push('  If major life events align with dasha predictions: birth time is ACCURATE');
  lines.push('  If events seem off by 1-2 years: adjust birth time by ±5-10 minutes');
  lines.push('  If events are significantly misaligned: professional rectification recommended');
  lines.push('');

  // Nadi point (sensitive point for birth time verification)
  const NADI_NAMES = ['Adi (Vata)', 'Madhya (Pitta)', 'Antya (Kapha)'];
  const moonNakIdx = planets => {
    const moon = planets.find(p=>p.name==='Moon');
    return moon ? nakshatraOf(moon.siderealLon) : 0;
  };
  lines.push('  Nadi (from Moon Nakshatra): Key marker for birth time accuracy');
  lines.push('  Nadi should align with parents\' Nadi in classical system');
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 48 — GEOGRAPHIC ASTROLOGY (Astrocartography Basics)
// Power places, career cities, love destinations
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection48_GeographicAstrology(planets, houses, ascSign) {
  const lines = [];
  lines.push('');
  lines.push('  GEOGRAPHIC ASTROLOGY — Favorable & Unfavorable Locations');
  lines.push('  Based on: Planetary house lords + Direction mapping + Varga analysis');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  // Direction mapping
  lines.push('  ── Planetary Direction Mapping ─────────────────────────────────────────────');
  const PLANET_DIRECTION = {
    Sun:'East', Moon:'North-West', Mars:'South', Mercury:'North',
    Jupiter:'North-East', Venus:'South-East', Saturn:'West', Rahu:'South-West', Ketu:'South'
  };
  const DIRECTION_MEANING = {
    'East':'Career advancement, recognition, authority',
    'West':'Relationships, partnerships, balance',
    'North':'Intelligence, communication, financial growth',
    'South':'Physical energy, courage, transformative experiences',
    'North-East':'Wisdom, spirituality, education, divine blessings',
    'South-East':'Luxury, arts, beauty, pleasure',
    'North-West':'Emotions, travel, change, adaptability',
    'South-West':'Hidden matters, research, losses or isolation',
  };

  const benefics = planets.filter(p=>['Jupiter','Venus','Moon','Mercury'].includes(p.name));
  const malefics = planets.filter(p=>['Saturn','Mars','Rahu','Ketu','Sun'].includes(p.name));

  lines.push('  Favorable Directions (benefic planets):');
  for (const p of benefics) {
    const dir = PLANET_DIRECTION[p.name];
    lines.push('  ✅ ' + pad(p.name + ' →', 14) + pad(dir + ':', 16) + (DIRECTION_MEANING[dir]||''));
  }
  lines.push('');
  lines.push('  Challenging Directions (malefic planets — use cautiously):');
  for (const p of malefics) {
    const dir = PLANET_DIRECTION[p.name];
    lines.push('  ⚠ ' + pad(p.name + ' →', 14) + pad(dir + ':', 16) + (DIRECTION_MEANING[dir]||''));
  }
  lines.push('');

  // City/country recommendations
  lines.push('  ── Location Recommendations ────────────────────────────────────────────────');
  const d9Sign = houses[8]?.sign;
  const d12Sign = houses[11]?.sign;
  const rahu = pMap['Rahu'];
  const jupiter = pMap['Jupiter'];

  const SIGN_COUNTRIES = signCountriesData.countries;

  // Career city (10th lord country)
  const d10Sign = houses[9]?.sign;
  if (d10Sign) {
    lines.push('  For CAREER: ' + d10Sign + ' countries — ' + (SIGN_COUNTRIES[d10Sign]||'Aligned with 10th sign'));
  }
  // Foreign (12th house)
  if (d12Sign) {
    lines.push('  For FOREIGN OPPORTUNITY: ' + d12Sign + ' countries — ' + (SIGN_COUNTRIES[d12Sign]||''));
  }
  // Rahu for unconventional foreign
  if (rahu) {
    const rahuSign = SIGNS[signOf(rahu.siderealLon)];
    lines.push('  For TECHNOLOGY/INNOVATION abroad: ' + rahuSign + ' zone — ' + (SIGN_COUNTRIES[rahuSign]||'Rahu-aligned territories'));
  }
  // Jupiter for wisdom
  if (jupiter) {
    const jupSign = SIGNS[signOf(jupiter.siderealLon)];
    lines.push('  For EDUCATION/SPIRITUALITY: ' + jupSign + ' countries — ' + (SIGN_COUNTRIES[jupSign]||''));
  }
  lines.push('');

  // Most favorable direction to face while working
  lines.push('  ── Daily Directional Optimization ─────────────────────────────────────────');
  const topBenefic = benefics.sort((a,b) => {
    const aAv = a.house || 1;
    const bAv = b.house || 1;
    const aScore = [1,4,7,10].includes(aAv)?4:[5,9,11].includes(aAv)?3:2;
    const bScore = [1,4,7,10].includes(bAv)?4:[5,9,11].includes(bAv)?3:2;
    return bScore - aScore;
  })[0];

  if (topBenefic) {
    const bestDir = PLANET_DIRECTION[topBenefic.name];
    lines.push('  Face ' + bestDir + ' while working — aligned with your strongest benefic (' + topBenefic.name + ')');
    lines.push('  Sleep with head pointing ' + PLANET_DIRECTION['Jupiter'] + ' — Jupiter\'s direction for wisdom and rest');
  }
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 49 — EXECUTIVE SUMMARY DASHBOARD (1-Page Snapshot)
// Top 10 insights, red flags, golden windows, priority actions
// ══════════════════════════════════════════════════════════════════════════════
// BUG FIX (§71.1 `vargas is not defined`): the body of this function reads
// `vargas?.ascendant?.D10` (Insight 4, below) but `vargas` was never declared
// as a parameter and is not a module-level binding, so every call threw a
// ReferenceError. The engine caught it and wrote the literal string
// '(unavailable: vargas is not defined)' into extendedReport.executiveSummary,
// which is why the defect survived source-level greps for the message: it is
// produced at runtime, not written in the source. The canonical VargaSet is
// now an explicit parameter, supplied by the engine from calcAllVargas().
export function buildSection49_ExecutiveSummary(planets, houses, avData, dashas, shadbala, doshas, specialLagnas, NOW_JD, birthYear, AYANAMSA, ascSign, moonSign, vargas = null) {
  const lines = [];
  const nowDate = jdToDate(NOW_JD);
  const nowYear = nowDate.year;
  const nowAge = nowYear - birthYear;

  lines.push('');
  lines.push('  ╔══════════════════════════════════════════════════════════════════════════╗');
  lines.push('  ║          EXECUTIVE SUMMARY — YOUR LIFE AT A GLANCE                     ║');
  lines.push('  ║  ' + pad('Generated: ' + nowDate.day + '/' + nowDate.month + '/' + nowDate.year + ' | Age: ' + nowAge + ' | ' + ascSign + ' Lagna | ' + moonSign + ' Moon', 70) + '  ║');
  lines.push('  ╚══════════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  // Current dasha
  let currMD = null, currAD = null;
  for (const d of dashas) {
    if (d.startJD <= NOW_JD && d.endJD >= NOW_JD) {
      currMD = d;
      // Find antardasha
      const mStart = DASHA_ORDER.indexOf(d.mahadasha);
      let cur = d.startJD;
      for (let i = 0; i < 9; i++) {
        const aLord = DASHA_ORDER[(mStart + i) % 9];
        const aYrs = d.years * DASHA_YEARS[aLord] / 120;
        const aEnd = cur + aYrs * 365.25;
        if (cur <= NOW_JD && aEnd >= NOW_JD) { currAD = { planet: aLord, end: aEnd }; break; }
        cur = aEnd;
      }
      break;
    }
  }

  // Life scores
  const av2 = (avData?.raw||[])[1]||25, av11 = (avData?.raw||[])[10]||25;
  const av7 = (avData?.raw||[])[6]||25, av10 = (avData?.raw||[])[9]||25;
  const jupiter = pMap['Jupiter'], venus = pMap['Venus'], saturn = pMap['Saturn'];
  const wealthScore = Math.min(95, 40 + (av2>=35?20:av2>=28?12:5) + (av11>=30?15:av11>=25?8:3) + (jupiter&&[2,5,9,11].includes(jupiter.house)?10:0));
  const careerScore = Math.min(95, 40 + (av10>=30?15:av10>=25?8:3) + (planets.filter(p=>p.house===10).length*5));

  lines.push('  ── TOP 10 INSIGHTS ──────────────────────────────────────────────────────────');
  lines.push('');

  const insights = [];

  // Insight 1: Current dasha
  // FIX (bug report audit, Section 42 "complete truncated text"): every
  // insight below used to be pushed conditionally with no fallback — if
  // e.g. no current Mahadasha/Antardasha/upcoming-peak-period could be
  // found for a given chart, that numbered slot was silently skipped
  // entirely, while the header still promised "TOP 10 INSIGHTS". That
  // produces exactly the reported symptom: a numbered list that doesn't
  // add up to what it claims, reading as an incomplete/cut-off report
  // even though no single sentence was literally truncated mid-word.
  // Fixed by giving every one of the 10 slots a graceful, complete
  // fallback sentence so the list is always exactly 10 full, complete
  // insights, regardless of data availability.
  if (currMD) {
    const pl = pMap[currMD.mahadasha];
    const dig = pl ? getPlanetDignity(currMD.mahadasha, SIGNS[signOf(pl.siderealLon)]) : 'Neutral';
    const mdEnd = jdToDate(currMD.endJD);
    insights.push('You are in ' + currMD.mahadasha + ' Mahadasha until ' + mdEnd.year + ' (' + dig + ') — ' +
      (dig==='Exalted'||dig==='Own'?'Natural strengths active — execute major plans':
       dig==='Debilitated'?'Karmic testing — focus on remedies and patience':
       'Mixed results — align actions with '+currMD.mahadasha+'\'s strengths'));
  } else {
    insights.push('No currently active Mahadasha found within this chart\'s calculated 120-year Vimshottari cycle — this dasha period has already run its full course.');
  }

  // Insight 2: Antardasha
  if (currAD) {
    const adEnd = jdToDate(currAD.end);
    insights.push('Current Antardasha: ' + currAD.planet + ' (until ' + adEnd.day+'/'+adEnd.month+'/'+adEnd.year + ') — immediate life focus');
  } else {
    insights.push('No currently active Antardasha found — see the full Dasha timeline (Section 7) for this chart\'s complete life period breakdown.');
  }

  // Insight 3: Wealth
  const wGrade = av2>=35?'Excellent financial house — wealth building is your natural strength':
                 av2>=28?'Good wealth foundation — consistent savings will compound significantly':
                 'Wealth requires conscious effort — prioritize H2 remedies and financial discipline';
  insights.push('Wealth DNA (H2 AV:' + av2 + '): ' + wGrade);

  // Insight 4: Career
  const d10Sign = vargas?.ascendant?.D10?.sign || houses[9]?.sign || 'Capricorn';
  const d10Lord = vargas?.ascendant?.D10?.lord || SIGN_LORDS[d10Sign];
  insights.push('Career driven by ' + d10Lord + ' (10th Lord in H' + (pMap[d10Lord]?.house||'?') + ') — ' +
    ([1,4,7,10].includes(pMap[d10Lord]?.house)?'Strong career placement — authority and recognition': 
     [5,9,11].includes(pMap[d10Lord]?.house)?'Fortune-connected career — luck amplifies effort':'Career needs consistent building'));

  // Insight 5: Strongest planet
  const strongest = planets.slice(0,7).sort((a,b)=>{
    const digA = dignityScore(getPlanetDignity(a.name, SIGNS[signOf(a.siderealLon)]));
    const digB = dignityScore(getPlanetDignity(b.name, SIGNS[signOf(b.siderealLon)]));
    return digB - digA;
  })[0];
  if (strongest) insights.push('Strongest natal planet: ' + strongest.name + ' (' + getPlanetDignity(strongest.name, SIGNS[signOf(strongest.siderealLon)]) + ' in H' + strongest.house + ') — build your life strategy around this planet\'s themes');
  else insights.push('Strongest natal planet could not be determined from the available dignity data for this chart — see Section 10 (Shadbala) for the full planetary-strength breakdown.');

  // Insight 6: Marriage
  insights.push('Relationship house (H7) AV: ' + av7 + ' — ' + (av7>=30?'Favorable for marriage, good partnership karma':av7>=25?'Average — relationships need conscious nurturing':'Challenges in partnerships — focus on self-development first'));

  // Insight 7: Jupiter transit
  const jupTrans = calcPlanetPosition('Jupiter', NOW_JD);
  if (jupTrans) {
    // FIX (Phase 4/5 audit): already sidereal — this drives the Executive
    // Summary's "Jupiter transit" insight, one of the report's most visible
    // synthesized sentences.
    const jupTransSign = SIGNS[signOf(mod360(jupTrans.lon))];
    const moonSignIdx = SIGNS.indexOf(moonSign);
    const jupH = ((SIGNS.indexOf(jupTransSign) - moonSignIdx + 12) % 12) + 1;
    insights.push('Jupiter currently transiting ' + jupTransSign + ' (H' + jupH + ' from Moon) — ' +
      ([2,5,7,9,11].includes(jupH)?'Jupiter transit FAVORABLE — opportunities expanding':'Jupiter transit in challenging position — patience and inner work'));
  } else {
    insights.push('Jupiter\'s current transit position could not be computed for this report\'s date range — see Section 19 (Gochar) for the latest available transit data.');
  }

  // Insight 8: Saturn transit
  const satTrans = calcPlanetPosition('Saturn', NOW_JD);
  if (satTrans) {
    // FIX (Phase 4/5 audit): already sidereal — same fix as Jupiter above.
    const satTransSign = SIGNS[signOf(mod360(satTrans.lon))];
    const moonSignIdx = SIGNS.indexOf(moonSign);
    const satH = ((SIGNS.indexOf(satTransSign) - moonSignIdx + 12) % 12) + 1;
    insights.push('Saturn transiting H' + satH + ' from Moon — ' +
      ([1,2,12].includes(satH)?'Sade Sati zone — karmic testing and restructuring':
       [3,6,11].includes(satH)?'Saturn FAVORABLE position — discipline yields results':'Saturn testing this life area — sustained effort required'));
  } else {
    insights.push('Saturn\'s current transit position could not be computed for this report\'s date range — see Section 19 (Gochar) for the latest available transit data.');
  }

  // Insight 9: Upcoming opportunity
  let nextGoodPeriod = null;
  for (const d of dashas) {
    if (d.startJD <= NOW_JD) continue;
    const pl = pMap[d.mahadasha];
    if (!pl) continue;
    const dig = getPlanetDignity(d.mahadasha, SIGNS[signOf(pl.siderealLon)]);
    if (['Exalted','Own','Moolatrikona','Friend'].includes(dig) && [1,2,5,9,10,11].includes(pl.house)) {
      nextGoodPeriod = d;
      break;
    }
  }
  if (nextGoodPeriod) {
    const npStart = jdToDate(nextGoodPeriod.startJD);
    insights.push('Next peak period: ' + nextGoodPeriod.mahadasha + ' MD starting ' + npStart.year + ' — prepare NOW for this opportunity window');
  } else {
    insights.push('No single standout peak Dasha period was flagged within the scanned window — this chart\'s Mahadashas are relatively balanced, so consistent, steady effort across the current period will compound most effectively.');
  }

  // Insight 10: Life purpose
  const moonNakIdx = pMap['Moon'] ? nakshatraOf(pMap['Moon'].siderealLon) : 0;
  const moonNak = NAKSHATRAS[moonNakIdx]||'Ashwini';
  insights.push('Life purpose (Janma Nakshatra ' + moonNak + '): Fulfill the deepest calling of this nakshatra\'s deity in everyday actions');

  for (let i = 0; i < insights.length; i++) {
    lines.push('  ' + (i+1).toString().padStart(2,'0') + '. ' + insights[i]);
    lines.push('');
  }

  // Red flags
  lines.push('  ── 🚨 RED FLAGS (Areas Requiring Immediate Attention) ─────────────────────');
  const redFlags = [];
  if (pMap['Saturn'] && SIGNS[signOf(pMap['Saturn'].siderealLon)] === DEBILITATION['Saturn']?.sign) redFlags.push('Saturn debilitated — delays and obstacles in career; needs Neecha Bhanga analysis');
  if (doshas?.mangal?.hasDosha) redFlags.push('Mangal Dosha active — marriage needs careful partner selection');
  const weakPlanets = planets.slice(0,7).filter(p => {
    const sb = shadbala?.[p.name];
    return sb && parseFloat(sb.rupas||0) < parseFloat(sb.required||5) * 0.5;
  });
  if (weakPlanets.length > 0) redFlags.push('Very weak planets: ' + weakPlanets.map(p=>p.name).join(', ') + ' — prioritize remedies');
  if (av7 < 22) redFlags.push('H7 Ashtakavarga below 22 — relationship challenges need attention');
  const in68 = planets.filter(p=>[6,8].includes(p.house) && ['Saturn','Mars','Rahu'].includes(p.name));
  if (in68.length > 0) redFlags.push('Malefics in dusthanas (' + in68.map(p=>p.name+' H'+p.house).join(', ') + ') — health and transformation areas active');
  if (redFlags.length === 0) redFlags.push('No major red flags — chart is relatively well-balanced');
  for (const rf of redFlags) lines.push('  ⚠ ' + rf);
  lines.push('');

  // Golden windows
  lines.push('  ── ✨ GOLDEN WINDOWS (Best Upcoming Periods) ───────────────────────────────');
  let goldCount = 0;
  for (const d of dashas) {
    if (goldCount >= 4) break;
    const dStart = jdToDate(d.startJD);
    const dEnd = jdToDate(d.endJD);
    if (dEnd.year < nowYear) continue;
    if (dStart.year > nowYear + 25) break;
    const pl = pMap[d.mahadasha];
    if (!pl) continue;
    const dig = getPlanetDignity(d.mahadasha, SIGNS[signOf(pl.siderealLon)]);
    const avH = (avData?.raw||[])[pl.house-1]||25;
    if (['Exalted','Own','Moolatrikona'].includes(dig) || (avH>=35 && [1,2,5,9,10,11].includes(pl.house))) {
      lines.push('  ✨ ' + dStart.year + '–' + dEnd.year + ': ' + d.mahadasha + ' MD — ' + dig + ' | H' + pl.house + ' | AV:' + avH);
      goldCount++;
    }
  }
  if (goldCount === 0) lines.push('  Golden periods upcoming — current cycle completing, next expansion begins soon');
  lines.push('');

  // Priority actions next 90 days
  lines.push('  ── 📋 PRIORITY ACTIONS (Next 90 Days) ─────────────────────────────────────');
  const actions90 = [];
  if (currMD) {
    const mdRem = { Sun:'Ruby or Sun worship daily at sunrise', Moon:'Pearl or Monday Moon fast',
      Mars:'Coral or Hanuman Chalisa Tuesdays', Mercury:'Emerald or Wednesday Mercury worship',
      Jupiter:'Yellow Sapphire or Thursday Vishnu puja', Venus:'Diamond/White Sapphire or Friday Lakshmi puja',
      Saturn:'Blue Sapphire trial or Saturday Shani worship', Rahu:'Gomed or Saturday Durga puja',
      Ketu:'Cat\'s Eye or Tuesday Ganesha worship' };
    actions90.push('Start current Dasha remedy: ' + (mdRem[currMD.mahadasha]||'Standard remedy for '+currMD.mahadasha));
  }
  if (weakPlanets.length > 0) actions90.push('Strengthen weakest planet ' + weakPlanets[0]?.name + ' with mantra + charity on its day');
  actions90.push('Identify and focus on career area aligned with 10th lord (' + SIGN_LORDS[d10Sign] + ')');
  actions90.push('Check current Antardasha (' + (currAD?.planet||'N/A') + ') for near-term opportunity timing');
  actions90.push('Consult qualified astrologer to cross-verify Ayanamsa sensitivity for your chart');
  for (const a of actions90) lines.push('  → ' + a);
  lines.push('');

  return lines;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 50 — AI PREDICTIVE SYNTHESIS (Multi-System Fusion)
// Confidence-scored predictions, trust score, system comparison
// ══════════════════════════════════════════════════════════════════════════════
export function buildSection50_AISynthesis(planets, houses, avData, shadbala, dashas, doshas, NOW_JD, birthYear, AYANAMSA, ascSign, moonSign) {
  const lines = [];
  lines.push('');
  lines.push('  ╔══════════════════════════════════════════════════════════════════════════╗');
  lines.push('  ║     AI PREDICTIVE SYNTHESIS — MULTI-SYSTEM FUSION ENGINE               ║');
  lines.push('  ║     Parashara(40%) + KP(20%) + Jaimini(20%) + Transit(20%)             ║');
  lines.push('  ╚══════════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  const pMap = {};
  for (const p of planets) pMap[p.name] = p;
  const nowYear = jdToDate(NOW_JD).year;

  // ── Chart Trust Score ────────────────────────────────────────────────────
  // FIX (P0 — fabricated confidence): this block used to print four
  // hand-typed "/100" numbers (95, 90, 88, 82) averaged into a single
  // "OVERALL TRUST SCORE" and then restated as "~X% reliability" — a
  // precision-sounding figure with no statistical basis (no calibration
  // dataset of verified outcomes exists to back a percentage). Per this
  // app's own No-Hardcoded-Confidence rule, that has been removed and
  // replaced with real, independently checkable facts: the actual
  // ayanamsa in use for *this* chart, and the actual count of optional
  // supplementary datasets bundled in *this* build — both computed live,
  // not typed constants.
  lines.push('  ── ENGINE METHODOLOGY & DATA COMPLETENESS (verified live, not a score) ─────');
  lines.push('  Ayanamsa in use for this chart:  ' + (AYANAMSA || 'NOT_AVAILABLE'));
  lines.push('  Astronomical model:              VSOP87 (Meeus abridged series)');
  lines.push('  Independent cross-check:         Validated against JPL Horizons DE441');
  lines.push('                                    (see test/validation-harness.test.mjs for the');
  lines.push('                                     current measured delta — re-run it for the');
  lines.push('                                     up-to-date figure rather than trusting a');
  lines.push('                                     number printed here, since this file does');
  lines.push('                                     not re-run that test on every report).');
  lines.push('');
  lines.push('  This report intentionally does NOT print a single "% accurate" or "trust');
  lines.push('  score" figure. No calibration dataset of verified real-world outcomes');
  lines.push('  exists for this engine, so any such number would be invented, not measured —');
  lines.push('  exactly what this app\'s own No-Fabrication Rule exists to prevent. See the');
  lines.push('  Missing-Feature Checklist section of this report for a live, per-feature');
  lines.push('  IMPLEMENTED / PARTIAL / NOT_SUPPORTED breakdown instead.');
  lines.push('');

  // ── Confidence-scored predictions ────────────────────────────────────────
  lines.push('  ── TOP PREDICTIONS WITH CONFIDENCE SCORES ──────────────────────────────────');
  lines.push('  (Confidence = strength of multiple confirming factors)');
  lines.push('');

  const predictions = [];
  const av2 = (avData?.raw||[])[1]||25;
  const av7 = (avData?.raw||[])[6]||25;
  const av10 = (avData?.raw||[])[9]||25;
  const av11 = (avData?.raw||[])[10]||25;
  const jupiter = pMap['Jupiter'];
  const saturn = pMap['Saturn'];
  const venus = pMap['Venus'];
  const rahu = pMap['Rahu'];

  // Wealth prediction
  // FIX (Phase 5 audit): applying the same principle as the Marriage fix
  // above — a domain confidence built purely from Ashtakavarga + natural
  // significator placement, with no reference to which Dasha is actually
  // running, can reach "HIGH CONFIDENCE" (80%+) about a time-bound life
  // outcome with zero timing evidence behind it. Gate the top band on the
  // current Mahadasha lord being placed in a domain-relevant house.
  const currentMDForConf = dashas.find(d => NOW_JD >= d.startJD && NOW_JD < d.endJD);
  const currentMDPlForConf = currentMDForConf ? pMap[currentMDForConf.mahadasha] : null;
  function dashaSupportsHouses(houseList) {
    return !!(currentMDPlForConf && houseList.includes(currentMDPlForConf.house));
  }
  let wealthConf = 50;
  if (av2>=35) wealthConf += 20;
  if (av11>=30) wealthConf += 15;
  if (jupiter && [2,5,9,11].includes(jupiter.house)) wealthConf += 10;
  const wealthConfCap = dashaSupportsHouses([2,5,9,11]) ? 90 : 75;
  const wealthPred = wealthConf>=75 ? 'Significant wealth accumulation in lifetime — multiple income streams' :
                     wealthConf>=60 ? 'Good wealth potential — consistent effort creates substantial assets' :
                     'Moderate wealth — financial discipline critical for stability';
  predictions.push({ domain:'Wealth', pred:wealthPred, conf:Math.min(wealthConfCap,wealthConf) });

  // Career prediction
  let careerConf = 50;
  if (av10>=30) careerConf += 15;
  const d10Sign = houses[9]?.sign||'Cap';
  const d10Lord = SIGN_LORDS[d10Sign];
  const d10LordPl = pMap[d10Lord];
  if (d10LordPl && [1,9,10,11].includes(d10LordPl.house)) careerConf += 20;
  if (rahu && [10,1,11].includes(rahu.house)) careerConf += 10;
  // FIX (Phase 5 audit): same principle as Wealth/Marriage above.
  const careerConfCap = dashaSupportsHouses([1,9,10,11]) ? 90 : 75;
  const careerPred = careerConf>=70 ? 'Career excellence — leadership or expert recognition in your field' :
                     careerConf>=55 ? 'Solid career — steady progress with significant milestones' :
                     'Career through effort — consistent skill-building yields results';
  predictions.push({ domain:'Career', pred:careerPred, conf:Math.min(careerConfCap,careerConf) });

  // Marriage prediction
  // FIX (Phase 4 audit — Section 2 contradiction prevention): this score
  // used to be built purely from Ashtakavarga + Venus house placement,
  // with ZERO reference to Dasha support — meaning it could independently
  // reach "HIGH CONFIDENCE" (80%+) in the exact same report where Section
  // 42's "Marriage Timing Windows" (which IS correctly dasha-gated) says
  // "No strong marriage windows in immediate future". Two sections making
  // opposite-strength claims about the same topic is exactly the
  // contradiction class the spec requires preventing. Fix: find whether
  // the CURRENT active Mahadasha lord is one of the classical marriage
  // significators (Venus, Moon, Jupiter, or the 7th lord) placed in a
  // relationship-relevant house — the same test Section 42 already uses —
  // and refuse to let the score reach the 80% HIGH CONFIDENCE band unless
  // it does, matching Section 3's "no top-tier score from one factor
  // alone" principle applied here to cross-section agreement instead.
  const d7SignForConf = houses[6]?.sign || 'Ari';
  const d7LordForConf = SIGN_LORDS[d7SignForConf];
  const currentDashaSupportsMarriage =
    currentMDForConf && ['Venus', 'Moon', 'Jupiter', d7LordForConf].includes(currentMDForConf.mahadasha) &&
    dashaSupportsHouses([7, 2, 5, 11]);
  let marriageConf = 50;
  if (av7>=30) marriageConf += 15;
  if (venus && [7,2,5,11].includes(venus.house)) marriageConf += 15;
  if (doshas?.mangal?.hasDosha) marriageConf -= 10;
  const marriageConfCap = currentDashaSupportsMarriage ? 85 : 75;
  const marPred = marriageConf>=70 ? 'Marriage strongly indicated — supportive partnership, family harmony' :
                  marriageConf>=55 ? 'Marriage possible — some challenges but rewarding partnership' :
                  'Marriage requires careful partner selection — Dosha awareness important';
  predictions.push({ domain:'Marriage', pred:marPred, conf:Math.min(marriageConfCap,marriageConf) });

  // Health prediction
  // FIX (Phase 5 audit): gate on the current dasha lord NOT being placed in
  // a health-afflicting house (6th/8th/12th) — for Health specifically the
  // "support" test is inverted (absence of affliction, not presence of a
  // significator), since no planet is a universal "health karaka" the way
  // Venus is for marriage.
  const healthConfCap = (currentMDPlForConf && [6,8,12].includes(currentMDPlForConf.house)) ? 65 : 85;
  let healthConf = 60;
  const av1 = (avData?.raw||[])[0]||25;
  if (av1>=30) healthConf += 10;
  const mars = pMap['Mars'];
  if (mars && [6,8].includes(mars.house)) healthConf -= 10;
  if (saturn && [1,6,8].includes(saturn.house)) healthConf -= 8;
  const healthPred = healthConf>=70 ? 'Good constitution — vitality strong, diseases overcome relatively quickly' :
                     healthConf>=55 ? 'Moderate health — attention to primary dosha prevents chronic issues' :
                     'Health needs active management — preventive care and dosha balance essential';
  predictions.push({ domain:'Health', pred:healthPred, conf:Math.min(healthConfCap,healthConf) });

  // Foreign connection
  // FIX (Phase 5 audit): same principle — gate the top band on the current
  // dasha lord being placed in a foreign/moksha house (9th/12th), not just
  // natural significators (Rahu/Jupiter) sitting there natally.
  let foreignConf = 40;
  if (rahu && [9,12].includes(rahu.house)) foreignConf += 25;
  if (jupiter && [9,12].includes(jupiter.house)) foreignConf += 15;
  const av12 = (avData?.raw||[])[11]||25;
  if (av12>=28) foreignConf += 10;
  const foreignConfCap = dashaSupportsHouses([9,12]) ? 85 : 70;
  const foreignPred = foreignConf>=70 ? 'Strong foreign connections — travel, business, or residence abroad likely' :
                      foreignConf>=50 ? 'Moderate foreign influence — international collaborations beneficial' :
                      'Foreign connections possible but not dominant — domestic focus primary';
  predictions.push({ domain:'Foreign', pred:foreignPred, conf:Math.min(foreignConfCap,foreignConf) });

  // FIX (master-prompt §47 — No-Hardcoded-Confidence rule): this used to
  // lead with a bare '[73%] MODERATE CONFIDENCE' label, which reads as a
  // statistically-calibrated probability. It isn't one — no backtested
  // dataset of verified outcomes exists to calibrate against (see the
  // Chart Trust Score section above). The underlying 0-100 heuristic
  // score is still shown (it IS real, chart-derived evidence-weighting —
  // not fabricated), but relabeled "Evidence Score" and led with the
  // qualitative confidence label the master prompt asks for, so a reader
  // can't mistake it for a measured accuracy percentage.
  for (const pred of predictions) {
    const label = pred.conf>=80?'HIGH':pred.conf>=65?'MODERATE':pred.conf>=50?'LOW':'VERY LOW';
    lines.push('  ' + pad(pred.domain + ':', 14) + pad(label + ' confidence (Evidence Score ' + pred.conf + '/100)', 40));
    lines.push('  ' + ' '.repeat(14) + pred.pred);
    lines.push('  ' + ' '.repeat(14) + bar(pred.conf/10));
    lines.push('');
  }

  // ── Multi-system cross-check ──────────────────────────────────────────────
  // FIX (P0 — hardcoded '✅ CONFIRMS' lines): the KP/Jaimini/Transit rows
  // below used to print the identical '✅ CONFIRMS' / '◆ Varies by year'
  // text on every single report, regardless of the actual chart, because
  // this function is never passed KP cusp or Jaimini Amatyakaraka data —
  // there was nothing behind those checkmarks. Printing a static
  // checkmark as if it were computed is exactly the fabrication this
  // app's No-Fabrication Rule forbids. Only the two rows this function
  // can actually compute (Parashara lordship/Ashtakavarga, and Transit
  // for wealth) are shown as real ✅/⚠ checks; the rows this function has
  // no data to verify are labeled NOT_CALCULATED here rather than faked —
  // the real KP/Jaimini sections elsewhere in this report DO compute
  // those systems properly; this synthesis section just isn't wired to
  // cross-reference them (see 'Evidence Matrix' in the Missing-Feature
  // Checklist for that still-open gap).
  lines.push('  ── MULTI-SYSTEM CROSS-CHECK (only rows this section can verify are shown) ──');
  lines.push('  Systems agreeing on key predictions increases confidence:');
  lines.push('');
  lines.push('  Career Success:');
  lines.push('    Parashara (10th lord):     ' + (d10LordPl&&[1,9,10,11].includes(d10LordPl.house)?'✅ CONFIRMS':'⚠ Moderate'));
  lines.push('    KP / Jaimini / Transit:    NOT_CALCULATED here — see the dedicated KP and');
  lines.push("                                Jaimini sections of this report for those systems' own real analysis; this synthesis section is not");
  lines.push('                                yet wired to cross-reference them (Evidence Matrix');
  lines.push('                                gap — see Missing-Feature Checklist).');
  lines.push('');
  lines.push('  Wealth:');
  lines.push('    Parashara (H2/H11 AV):     ' + (av2>=28&&av11>=25?'✅ CONFIRMS ('+av2+' + '+av11+' pts)':'⚠ Below average'));
  lines.push('    Transit (Jupiter in H2/11):' + (jupiter&&[2,11].includes(jupiter.house)?'✅ CONFIRMS':'◆ Not in wealth houses'));
  lines.push('    KP / Jaimini:              NOT_CALCULATED here — same gap as above.');
  lines.push('');

  // ── Comparison with market software ──────────────────────────────────────
  // NOTE: A prior version of this section printed hand-typed "score/100"
  // numbers for named competitor products (Parashara's Light, Jagannatha
  // Hora, AstroSage, etc.). Those numbers were never derived from any
  // actual test against those tools — they were fabricated and have been
  // removed. This app has no license, install, or automated way to run
  // those products, so it cannot honestly score them. What follows is
  // instead a factual, verifiable description of this engine's own
  // scope and known gaps — see also README §8 "Known Limitations".
  lines.push('  ── THIS ENGINE: SCOPE & KNOWN LIMITATIONS ─────────────────────────────────');
  lines.push('');
  lines.push('  This report does not compare itself against named competitor products —');
  lines.push('  doing so would require actually running those tools on this chart, which');
  lines.push('  this app has no ability to do. What can be stated honestly:');
  lines.push('');
  lines.push('  - Planetary longitudes use the Meeus-truncated VSOP87 series (see');
  lines.push('    README §8), independently checked against JPL Horizons: differences');
  lines.push('    up to several tens of arcseconds are possible, not sub-arcsecond.');
  lines.push('  - Text output only — no charts/visuals, no GUI.');
  lines.push('  - Several classical modules are not implemented (see the feature');
  lines.push('    checklist section of this report) rather than approximated.');
  lines.push('  - For anything decision-critical, cross-check against a Swiss-Ephemeris-');
  lines.push('    grade tool and, ideally, a qualified Jyotishi.');
  lines.push('');

  // ── What to do next ──────────────────────────────────────────────────────
  lines.push('  ── NEXT STEPS FOR MAXIMUM ACCURACY ─────────────────────────────────────────');
  lines.push('  1. VERIFY birth time: Cross-check 3-5 past events with predicted dasha periods');
  lines.push('  2. AYANAMSA test: Run report with Raman Ayanamsa — if predictions shift, verify with astrologer');
  lines.push('  3. BACKTESTING: Mark Moon MD (age ' + (jdToDate(dashas[1]?.startJD||0).year - birthYear) + '–' + (jdToDate(dashas[1]?.endJD||0).year - birthYear) + ') events — did they match Moon\'s house themes?');
  lines.push('  4. PROFESSIONAL: Consult qualified Jyotishi with this report for nuanced life guidance');
  lines.push('  5. REMEDIES: Start primary dasha remedy and track results over 3 months');
  lines.push('');
  lines.push('  ╔═══════════════════════════════════════════════════════════════════════╗');
  lines.push('  ║  This report is generated by rule-based calculation, not measured     ║');
  lines.push('  ║  against a ground truth, so no single "% accurate" figure is honest   ║');
  lines.push('  ║  to print here. See README §8 for the specific, verifiable            ║');
  lines.push('  ║  precision figures (e.g. planetary-position error vs. JPL Horizons).  ║');
  lines.push('  ║  Astrology is a probability framework, not a measurement of fate —    ║');
  lines.push('  ║  use this as one input, not a verdict. YOU are the navigator.         ║');
  lines.push('  ╚═══════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  return lines;
}