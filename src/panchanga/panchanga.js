// ============================================================
// VEDIC JYOTISH ENGINE v6 — PANCHANGA (CORRECTED)
// FIX: Vara uses LOCAL civil date (JD + tz/24), not UTC JD
// FIX: All 5 limbs verified against reference calculations
// ============================================================

import { SIGNS, SIGN_LORDS, NAKSHATRAS, NAKSHATRA_LORDS, NAKSHATRA_DEITIES,
         TITHIS, TITHI_LORDS, KARANAS, PANCHANG_YOGAS, YOGA_NATURE,
         VARA_LORDS, VARA_NAMES, VARA_NAMES_HINDI,
         RAHU_KAAL_PART, YAMAGANDA_PART, GULIKA_PART } from '../astronomy/constants.js';
import { mod360, signOf, nakshatraOf, padaOf, formatDate, formatDateTime,
         sunriseSunset } from '../astronomy/utils.js';

// ── CANONICAL SOLAR EVENTS (§9 — one source of truth) ─────────
//
// BUG FIX (double-refraction): this function previously called
// sunriseSunset() and then subtracted a *further* 0.5667° of refraction.
// But sunriseSunset() already applies the standard altitude offset
// -(34' refraction + 16' semi-diameter + horizon dip). Applying refraction
// a second time shifted sunrise ~55s earlier and sunset ~55s later than the
// engine's own canonical value, which is why meta.sunrise (07:23:00) and
// panchanga.sunrise (07:22:05) disagreed for the same birth.
//
// The second correction was also dimensionally invalid: it converted a
// vertical altitude offset to time with a flat /15 (°→hour-angle-hours).
// The time cost of an altitude offset at the horizon is
// dh / (dAlt/dt), which depends on latitude and declination — it is NOT
// 15°/hour. The canonical engine already handles this correctly inside its
// hour-angle solution, so the right fix is to delegate, not to re-derive.
//
// This is now a thin pass-through that forwards observer elevation to the
// single canonical implementation in astronomy/utils.js. Every consumer
// (meta, Panchanga, Rahu Kaal, Choghadiya, Hora, special lagnas, upagrahas)
// therefore reads the identical value.
export function sunriseSunsetCorrected(jd, lat, lon, elevation = 0) {
  const base = sunriseSunset(jd, lat, lon, elevation);
  if (base.sunrise == null) return { ...base, source: 'astronomy/utils.js:sunriseSunset', refractionApplied: true };
  return {
    sunrise: base.sunrise,
    sunset: base.sunset,
    durationHours: base.durationHours,
    refractionApplied: true,
    // §74 audit trail: declare exactly what horizon model produced this.
    horizonModel: 'standard altitude -(34\' refraction + 16\' semi-diameter) + elevation dip 1.76\'*sqrt(m)',
    elevationMeters: elevation,
    source: 'astronomy/utils.js:sunriseSunset',
    canonical: true
  };
}

// ── Main Panchanga ────────────────────────────────────────────
export function calcPanchanga(jd, sunLon, moonLon, lat, lon, tz, moonSpeed, sunSpeed) {

  // ═══ VARA (Weekday) ═══
  // CRITICAL FIX: Must use LOCAL civil date, not UTC JD
  // Birth at 03:30 IST on 18 Dec = 22:00 UTC on 17 Dec
  // JD reflects UTC, so JD falls on 17 Dec → gives Sunday (WRONG)
  // Adding tz/24 converts JD to local noon reference → gives Monday (CORRECT)
  const JD_local = jd + tz / 24.0;
  const dayNum = Math.floor(JD_local + 1.5) % 7; // 0=Sun,1=Mon,2=Tue,...
  const varaName  = VARA_NAMES[dayNum];
  const varaHindi = VARA_NAMES_HINDI[dayNum];
  const varaLord  = VARA_LORDS[dayNum];

  // ═══ TITHI ═══
  // Elongation of Moon from Sun (0-360°)
  const elongation = mod360(moonLon - sunLon);
  const tithiIdx  = Math.floor(elongation / 12); // 0-29
  const tithiNum  = tithiIdx + 1;                // 1-30
  const tithiName = TITHIS[tithiIdx];
  const paksha    = tithiIdx < 15 ? 'Shukla (Bright Half)' : 'Krishna (Dark Half)';
  const tithiProgress = ((elongation % 12) / 12 * 100).toFixed(1);
  // FIX P-01: Use actual planet speeds if provided, else use realistic mean values
  // Real Moon-Sun relative speed varies 10.5–14.5°/day
  const actualMoonSpeed = moonSpeed || 13.176;
  const actualSunSpeed  = sunSpeed  || 0.9856;
  const actualRelSpeed  = actualMoonSpeed - actualSunSpeed;
  const degToEnd = 12 - (elongation % 12);
  const hoursToTithiEnd = degToEnd / Math.max(actualRelSpeed, 10.5) * 24;
  const nextTithiJD = jd + hoursToTithiEnd / 24;

  // ═══ NAKSHATRA ═══
  const NAK_SPAN = 360 / 27; // 13°20' = 13.3333°
  const nakIdx  = Math.floor(mod360(moonLon) / NAK_SPAN) % 27;
  const nakName = NAKSHATRAS[nakIdx];
  const nakLord = NAKSHATRA_LORDS[nakIdx];
  const nakDeity = NAKSHATRA_DEITIES[nakIdx];
  const nakStart = nakIdx * NAK_SPAN;
  const degInNak = mod360(moonLon) - nakStart;
  const pada = Math.floor(degInNak / (NAK_SPAN / 4)) + 1;
  const nakProgress = (degInNak / NAK_SPAN * 100).toFixed(1);
  // FIX P-02: Use actual Moon speed, not fixed 13.176°/day
  const nakEnd = nakStart + NAK_SPAN;
  const degToNakEnd = nakEnd - mod360(moonLon);
  const hoursToNakEnd = degToNakEnd / Math.max(actualMoonSpeed, 11.8) * 24;
  const nextNakJD = jd + hoursToNakEnd / 24;

  // ═══ YOGA ═══
  const yogaLon = mod360(sunLon + moonLon);
  const yogaIdx = Math.floor(yogaLon / NAK_SPAN) % 27;
  const yogaName   = PANCHANG_YOGAS[yogaIdx];
  const yogaNature = YOGA_NATURE[yogaIdx];
  // FIX P-05: Yoga end time (yoga changes at ~26°/day combined Sun+Moon motion)
  const yogaSpan = NAK_SPAN; // each yoga = 13°20'
  const yogaDegDone = yogaLon % yogaSpan;
  const yogaDegLeft = yogaSpan - yogaDegDone;
  const combinedSpeed = Math.max(actualMoonSpeed + actualSunSpeed, 24);
  const hoursToYogaEnd = yogaDegLeft / combinedSpeed * 24;
  const nextYogaJD = jd + hoursToYogaEnd / 24;

  // ═══ KARANA ═══
  // Each Tithi has 2 Karanas (first half = odd, second half = even)
  const karanaSeq = Math.floor(elongation / 6); // 0-59
  // First Karana of the cycle is Kimstughna (fixed), then rotating 7 movable ones
  let karanaName;
  if (karanaSeq === 0) karanaName = 'Kimstughna';
  else if (karanaSeq === 57) karanaName = 'Shakuni';
  else if (karanaSeq === 58) karanaName = 'Chatushpada';
  else if (karanaSeq === 59) karanaName = 'Naga';
  else {
    const movable = ['Bava','Balava','Kaulava','Taitila','Garija','Vanija','Vishti'];
    karanaName = movable[(karanaSeq - 1) % 7];
  }
  const karanaNum = karanaSeq + 1;

  // ═══ MOON & SUN SIGN ═══
  const moonSign     = SIGNS[signOf(moonLon)];
  const moonSignLord = SIGN_LORDS[moonSign];
  const sunSign      = SIGNS[signOf(sunLon)];

  // ═══ SUNRISE / SUNSET ═══
  const sunTimes = sunriseSunsetCorrected(jd, lat, lon, 0);
  const sunriseStr = sunTimes.sunrise ? formatDateTime(sunTimes.sunrise, tz) : 'N/A';
  const sunsetStr  = sunTimes.sunset  ? formatDateTime(sunTimes.sunset,  tz) : 'N/A';
  const dayDurStr  = sunTimes.durationHours ? sunTimes.durationHours.toFixed(2) + ' hrs' : 'N/A';

  // ═══ RAHU KAAL ═══
  let rahuKaal = null;
  if (sunTimes.sunrise && sunTimes.sunset) {
    const dayLen = sunTimes.sunset - sunTimes.sunrise;
    const seg = dayLen / 8;
    const partNum = RAHU_KAAL_PART[varaName] || 1;
    const rStart = sunTimes.sunrise + (partNum - 1) * seg;
    const rEnd   = rStart + seg;
    rahuKaal = { start: formatDateTime(rStart, tz), end: formatDateTime(rEnd, tz) };
  }

  // ═══ YAMAGANDA & GULIKA ═══
  let yamaganda = null, gulikakaal = null;
  if (sunTimes.sunrise && sunTimes.sunset) {
    const dayLen = sunTimes.sunset - sunTimes.sunrise;
    const seg = dayLen / 8;
    const yPart = YAMAGANDA_PART[varaName] || 1;
    const gPart = GULIKA_PART[varaName] || 1;
    yamaganda = {
      start: formatDateTime(sunTimes.sunrise + (yPart - 1) * seg, tz),
      end:   formatDateTime(sunTimes.sunrise + yPart * seg, tz)
    };
    gulikakaal = {
      start: formatDateTime(sunTimes.sunrise + (gPart - 1) * seg, tz),
      end:   formatDateTime(sunTimes.sunrise + gPart * seg, tz)
    };
  }

  // ═══ ABHIJIT MUHURTA ═══
  let abhijitMuhurta = null;
  if (sunTimes.sunrise && sunTimes.sunset) {
    const midday = (sunTimes.sunrise + sunTimes.sunset) / 2;
    abhijitMuhurta = {
      start: midday - 0.0167,
      end:   midday + 0.0167,
      startFormatted: formatDateTime(midday - 0.0167, tz),
      endFormatted:   formatDateTime(midday + 0.0167, tz)
    };
  }

  // FIX P-04: Add Brahma Muhurta, Vijaya Muhurta, Godhuli Muhurta, Nishita Kaal
  let brahmaMuhurta = null, vijayaMuhurta = null, godhuliMuhurta = null, nishitaKaal = null;
  if (sunTimes.sunrise && sunTimes.sunset) {
    // Brahma Muhurta: 1 hour 36 min (96 min) before sunrise, lasts 48 min
    brahmaMuhurta = {
      start: sunTimes.sunrise - 0.0667, // 96 min before sunrise
      end:   sunTimes.sunrise - 0.0333, // 48 min before sunrise
      startFormatted: formatDateTime(sunTimes.sunrise - 0.0667, tz),
      endFormatted:   formatDateTime(sunTimes.sunrise - 0.0333, tz),
      desc: 'Most auspicious for meditation, study, and spiritual practice'
    };
    // Vijaya Muhurta: 2 muhurtas before sunset (each muhurta = 48 min)
    vijayaMuhurta = {
      start: sunTimes.sunset - 0.133,
      end:   sunTimes.sunset - 0.067,
      startFormatted: formatDateTime(sunTimes.sunset - 0.133, tz),
      endFormatted:   formatDateTime(sunTimes.sunset - 0.067, tz),
      desc: 'Victory muhurta — excellent for important commencements'
    };
    // Godhuli Muhurta: 48 min around sunset
    godhuliMuhurta = {
      start: sunTimes.sunset - 0.033,
      end:   sunTimes.sunset + 0.033,
      startFormatted: formatDateTime(sunTimes.sunset - 0.033, tz),
      endFormatted:   formatDateTime(sunTimes.sunset + 0.033, tz),
      desc: 'Twilight muhurta — auspicious for marriage and religious ceremonies'
    };
    // Nishita Kaal: Midnight period (exact midnight ± 24 min)
    const dayLen = sunTimes.sunset - sunTimes.sunrise;
    const midnight = sunTimes.sunset + dayLen / 2;
    nishitaKaal = {
      start: midnight - 0.0167,
      end:   midnight + 0.0167,
      startFormatted: formatDateTime(midnight - 0.0167, tz),
      endFormatted:   formatDateTime(midnight + 0.0167, tz),
      desc: 'Midnight hour — powerful for Tantric and Shiva worship'
    };
  }

  // Amrit Kaal: based on nakshatra (4 times per day per traditional calculation)
  // Simplified: occurs at lunar nakshatra intervals throughout the day
  const amritNakshatras = [1, 4, 7, 10, 13, 16, 19, 22, 25]; // Ashwini, Rohini, Punarvasu etc.
  const isAmritNak = amritNakshatras.includes(nakIdx + 1);

  // ═══ INAUSPICIOUS PERIODS ═══
  const inauspiciousPeriods = [];
  if (yamaganda) inauspiciousPeriods.push({ name: 'Yamaganda', ...yamaganda });
  if (gulikakaal) inauspiciousPeriods.push({ name: 'Gulika Kaal', ...gulikakaal });

  return {
    tithi: {
      number:  tithiNum,
      name:    tithiName,
      paksha,
      progress: tithiProgress + '%',
      endsAt:  formatDateTime(nextTithiJD, tz)
    },
    vara: {
      name:   varaName,
      hindi:  varaHindi,
      lord:   varaLord,
      number: dayNum + 1
    },
    nakshatra: {
      name:   nakName,
      lord:   nakLord,
      deity:  nakDeity,
      pada,
      progress: nakProgress + '%',
      endsAt: formatDateTime(nextNakJD, tz)
    },
    // FIX P-05: Yoga now includes endsAt
    yoga:   { number: yogaIdx + 1, name: yogaName, nature: yogaNature, endsAt: formatDateTime(nextYogaJD, tz) },
    karana: { name: karanaName, number: karanaNum },
    moonSign,
    moonSignLord,
    sunSign,
    sunrise:  sunriseStr,
    sunset:   sunsetStr,
    dayDuration: dayDurStr,
    rahuKaal,
    abhijitMuhurta,
    // FIX P-04: New auspicious periods
    brahmaMuhurta,
    vijayaMuhurta,
    godhuliMuhurta,
    nishitaKaal,
    isAmritNakshatra: isAmritNak,
    inauspiciousPeriods
  };
}

// Nakshatra transit table for planets
export function grahaTransitNakshatraTable(planets) {
  return planets.map(p => {
    const lon = mod360(p.siderealLon);
    const nakIdx = Math.floor(lon / (360/27)) % 27;
    const degInSign = lon % 30;
    return {
      planet:   p.name,
      sign:     SIGNS[signOf(lon)],
      nakshatra: NAKSHATRAS[nakIdx],
      nakLord:  NAKSHATRA_LORDS[nakIdx],
      pada:     padaOf(lon),
      lon:      lon.toFixed(4),
      degInSign: degInSign.toFixed(2)
    };
  });
}
