/**
 * DOSHA CANCELLATION & SEVERITY RULES
 * Sources: BPHS, Parashar's cancellation principles, Jataka Parijata
 */

import { SIGNS, SIGN_LORDS, OWN_SIGNS, EXALTATION } from '../astronomy/constants.js';
import { signOf, mod360 } from '../astronomy/utils.js';

// ── MANGAL DOSHA SEVERITY ─────────────────────────────────────────────────
export function assessMangalSeverity(mangalDosha) {
  if (!mangalDosha?.hasDosha) return { severity: 0, label: 'None', cancelled: false };
  const cnt = mangalDosha.doshaCount || 0;
  const cancs = mangalDosha.cancellations || [];
  const isCancelled = cancs.length > 0;
  let severity = cnt * 25; // 25% per house
  if (isCancelled) severity = Math.max(0, severity - 50);
  return {
    severity: Math.min(100, severity),
    label:    severity >= 75 ? 'Severe' : severity >= 50 ? 'Moderate' : severity >= 25 ? 'Mild' : 'Negligible',
    cancelled: isCancelled,
    cancellations: cancs,
    remedyUrgency: severity >= 75 ? 'Highly Recommended' : severity >= 50 ? 'Recommended' : 'Optional',
  };
}

// ── KALSARPA SEVERITY ─────────────────────────────────────────────────────
export function assessKalsarpaSeverity(ksDosha, planets) {
  if (!ksDosha?.hasDosha) return { severity: 0, label: 'None' };
  const cancellations = [];
  const sun  = planets.find(p => p.name === 'Sun');
  const moon = planets.find(p => p.name === 'Moon');

  // Cancellation 1: If any planet is outside Rahu-Ketu axis (partial)
  if (ksDosha.severity === 'Partial (Anuloma)' || ksDosha.severity === 'Partial (Viloma)') {
    cancellations.push('Partial formation — some planets outside axis, reduces severity by 40%');
  }
  // Cancellation 2: Jupiter or Venus in lagna or kendras
  const kendraHouses = [1,4,7,10];
  if (planets.find(p => p.name==='Jupiter' && kendraHouses.includes(p.house))) {
    cancellations.push('Jupiter in Kendra — reduces malefic effects significantly');
  }
  if (planets.find(p => p.name==='Venus' && kendraHouses.includes(p.house))) {
    cancellations.push('Venus in Kendra — mitigates relationship and comfort impacts');
  }
  // Cancellation 3: Lagna lord strong
  // Cancellation 4: Moon in Swati, Ashwini, or Magha nakshatra (breaks Sarpa)
  // FIX (Phase 3 audit): index 13 in NAKSHATRAS is Chitra, not Swati —
  // Swati is index 14 (Ashwini=0..Bharani=1..Chitra=13,Swati=14). The old
  // array [13,0,9] silently checked Chitra instead of the intended Swati,
  // contradicting its own comment. Corrected to [14,0,9].
  const moonNakIdx = Math.floor(mod360(moon?.siderealLon||0) / (40/3));
  if ([14,0,9].includes(moonNakIdx)) { // Swati=14, Ashwini=0, Magha=9
    cancellations.push('Moon in Swati/Ashwini/Magha nakshatra — traditional Kala Sarpa breaker');
  }

  let severity = ksDosha.type === 'Anuloma' ? 60 : 80;
  const cancelReduction = cancellations.length * 15;
  severity = Math.max(10, severity - cancelReduction);

  return {
    severity,
    label: severity>=70?'Strong':severity>=45?'Moderate':'Mild',
    type: ksDosha.type || 'Full',
    cancellations,
    beneficNote: 'Kala Sarpa gives intense focus; many successful leaders have this yoga.',
    remedy: 'Naga Devata worship, Maha Mrityunjaya mantra, Trimbakeshwar Kala Sarpa Puja.',
  };
}

// ── SADE SATI SEVERITY ────────────────────────────────────────────────────
export function assessSadeSatiSeverity(sadeSati, moonSign, ascSign) {
  // BUG FIX: this used to check sadeSati.isCurrent / sadeSati.present, but
  // the actual Sade Sati object built in engine.js exposes inSadeSati (see
  // doshas.sadeSati). Those checked fields never existed, so this function
  // silently returned "Not Active" / severity 0 for every chart, even one
  // genuinely in the Peak of Sade Sati.
  if (!sadeSati?.inSadeSati && !sadeSati?.isCurrent && !sadeSati?.present) {
    return { severity: 0, label: 'Not Active' };
  }

  const phase = sadeSati.phase || sadeSati.currentPhase || 'Peak';
  let severity = phase === 'Peak' ? 70 : phase === 'Rising' ? 45 : 35; // Rising/Setting less severe

  // Moon in Taurus, Libra (Venus signs) or Aquarius: reduced impact (Saturn-friendly)
  const MILD_SIGNS = [1,6,10]; // Taurus, Libra, Aquarius
  if (MILD_SIGNS.includes(moonSign)) severity = Math.max(20, severity - 20);

  // Saturn in own sign (Capricorn/Aquarius): somewhat self-limiting
  const cancellations = [];
  if (MILD_SIGNS.includes(moonSign)) cancellations.push('Moon sign is Saturn-friendly — reduced malefic impact');
  if (phase === 'Setting') cancellations.push('Setting phase — karma nearing resolution, gradual relief');

  return {
    severity,
    label: severity>=65?'Strong':severity>=45?'Moderate':'Mild',
    phase,
    cancellations,
    beneficNote: 'Sade Sati builds character, removes what no longer serves. Many achieve greatness after this cycle.',
    remedy: 'Shani mantra Saturdays, black sesame donation, Hanuman Chalisa, iron and oil lamp for Shani.',
  };
}

// ── GRAHAN DOSHA SEVERITY ────────────────────────────────────────────────
export function assessGrahanSeverity(grahanDosha) {
  if (!grahanDosha?.present) return { severity: 0, label: 'None' };
  const orb      = grahanDosha.orb || 10;
  const severity = Math.round((1 - orb/12) * 80);
  const isSun    = grahanDosha.planet === 'Sun';
  return {
    severity: Math.max(20, severity),
    label: severity>=60?'Strong':'Moderate',
    affectedAreas: isSun ? 'Father, career, authority, self-confidence' : 'Mother, mind, home, emotions',
    cancellations: orb>8?['Wide orb — reduced strength']:[], 
    remedy: isSun
      ? 'Surya mantra, offer water to sun, ruby (if advised by astrologer).'
      : 'Chandra mantra, fast Mondays, pearl or moonstone (if advised).',
  };
}

// ── PITRU DOSHA SEVERITY ─────────────────────────────────────────────────
export function assessPitruSeverity(pitruDosha) {
  if (!pitruDosha?.hasDosha) return { severity: 0, label: 'None' };
  const strength = pitruDosha.strength || 'Mild';
  const sevMap   = { Severe:75, Moderate:50, Mild:30 };
  return {
    severity: sevMap[strength] || 30,
    label: strength,
    affectedAreas: 'Children, ancestors, father, dharma, fortune',
    remedy: 'Pitru Tarpan on Amavasya, feed crows and Brahmins, donate food in ancestors\' name during Pitru Paksha.',
    cancellations: ['Remedy is straightforward and highly effective when performed sincerely'],
  };
}

// ── MASTER DOSHA SEVERITY ASSESSMENT ────────────────────────────────────
export function assessAllDoshaSeverity(doshas, planets, moonSignIdx, ascSignIdx) {
  return {
    kalsarpa: assessKalsarpaSeverity(doshas.kalsarpa, planets),
    mangal:   assessMangalSeverity(doshas.mangal),
    sadeSati: assessSadeSatiSeverity(doshas.sadeSati, moonSignIdx, ascSignIdx),
    grahan:   assessGrahanSeverity(doshas.grahan),
    pitru:    assessPitruSeverity(doshas.pitru),
  };
}
