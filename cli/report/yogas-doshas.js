/**
 * yogas-doshas.js — Section 8 (planetary combinations / yogas) and
 * Section 9 (dosha analysis: Mangal, Kalsarpa, Sade Sati, Grahan, Pitru, Nadi).
 */
import { section, sub, kv, table, C } from '../console-ui.js';

// Yoga strength bar: average the constituent planets' real Shadbala
// ratio (rupas/required) into a 0-100% score — Weak <40%, Moderate 40-70%,
// Powerful >70%. Falls back to null if Shadbala data for its planets isn't
// available (caller then uses the yoga's own classical text label alone).
// FIX (Phase 6 audit): now returns {text, dynamicLabel} instead of a plain
// string, so the caller can promote the dynamic label into the headline
// display (see printYogas) rather than only showing it as a secondary line
// that could silently contradict the still-classical-only headline.
function yogaStrengthBar(yoga, shadbala) {
  const names = (yoga.planets || '').split(',').map(s => s.trim()).filter(Boolean);
  const ratios = names
    .map(n => shadbala?.[n])
    .filter(sb => sb && typeof sb === 'object' && sb.required)
    .map(sb => sb.rupas / sb.required);
  if (!ratios.length) return null;
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const pct = Math.max(0, Math.min(100, Math.round(avg * 50))); // ratio 2.0 → 100%
  const dynamicLabel = pct >= 70 ? 'Powerful' : pct >= 40 ? 'Moderate' : 'Weak';
  const color = pct >= 70 ? C.green : pct >= 40 ? C.yellow : C.red;
  const filled = Math.round(pct / 10);
  const text = `${color}[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${pct}% ${dynamicLabel}${C.reset}`;
  return { text, dynamicLabel };
}

// FIX (Phase 6 audit — Section 4 compliance): Vesi, Voshi, and Ubhayachari
// are three structural variations of the same underlying pattern (a planet
// 2nd from the Sun, 12th from the Sun, or both) — the spec explicitly
// calls these out as yogas that must not be listed as independent major
// yogas with equal visual weight, since doing so inflates the apparent
// number of significant yogas in the chart. They're detected the same way
// as before (no change to yogas.js's detection logic) but rendered here
// in a separate, visually lighter "Solar Secondary Yogas" group.
import moduleData from '../../dataset/used/core/yogas-doshas.json' with { type: 'json' };
const MINOR_SOLAR_YOGA_NAMES = moduleData.MINOR_SOLAR_YOGA_NAMES;
function isMinorSolarYoga(y) {
  return MINOR_SOLAR_YOGA_NAMES.some(n => y.name.startsWith(n));
}

export function printYogas(R) {
  section('8. YOGAS — शुभ/अशुभ योग (Planetary Combinations)');
  const allYogas = R.yogas || [];
  const majorYogas = allYogas.filter(y => !isMinorSolarYoga(y));
  const minorSolarYogas = allYogas.filter(y => isMinorSolarYoga(y));

  if (majorYogas.length) {
    for (const y of majorYogas) {
      const bar = yogaStrengthBar(y, R.shadbala);
      const dynamicLabel = bar ? bar.dynamicLabel : null;
      const displayStrength = dynamicLabel || y.strength;
      const normalizeTier = s => (s === 'Strong' ? 'Powerful' : s);
      const reclassified = dynamicLabel && normalizeTier(y.strength) !== dynamicLabel;
      console.log(`  ${C.green}✦${C.reset} ${C.bold}${y.name}${C.reset}  [${y.type}, ${displayStrength}]`);
      console.log(`     ${y.desc}  ${C.dim}(Planets: ${y.planets})${C.reset}`);
      if (bar) {
        console.log(`     Strength (from real Shadbala): ${bar.text}`);
        if (reclassified) {
          console.log(`     ${C.dim}(Classical baseline for this yoga is "${y.strength}" — reclassified to "${dynamicLabel}" for this chart based on actual planetary strength)${C.reset}`);
        }
      }
      if (y.classicalDetail) {
        const cd = y.classicalDetail;
        console.log(`     ${C.magenta}Classical name:${C.reset} ${cd.classicalName} (${cd.category})`);
        if (cd.condition) console.log(`     ${C.magenta}Classical condition:${C.reset} ${cd.condition}`);
        if (cd.effects?.length) console.log(`     ${C.magenta}Classical effects:${C.reset} ${cd.effects.join(', ')}`);
        if (cd.strengthFactors?.length) console.log(`     ${C.magenta}Strength factors:${C.reset} ${cd.strengthFactors.join(', ')}`);
        if (cd.cancellation?.length) console.log(`     ${C.magenta}Classical cancellation conditions:${C.reset} ${cd.cancellation.join(', ')}`);
        console.log(`     ${C.dim}Source: ${cd.source}${C.reset}`);
      }
    }
  } else if (!minorSolarYogas.length) {
    console.log('  No major yogas detected.');
  }

  if (minorSolarYogas.length) {
    sub('Solar Secondary Yogas (minor variations — grouped, not counted as major life-altering yogas)');
    for (const y of minorSolarYogas) {
      console.log(`  ${C.dim}• ${y.name}: ${y.desc}${C.reset}`);
    }
  }

  if (R.neechaBhanga?.length || R.neechaBhanga?.hasCancel) {
    sub('Neecha Bhanga Raja Yoga (Debilitation Cancellation)');
    console.log(JSON.stringify(R.neechaBhanga, null, 2).split('\n').map(l => '  ' + l).join('\n'));
  }
}

export function printDoshas(R) {
  section('9. DOSHAS — दोष विश्लेषण');
  const d = R.doshas;

  // ── Mangal (Kuja) Dosha — full breakdown so the verdict is never opaque ──
  const m = d.mangal;
  if (m) {
    kv('Mangal (Kuja) Dosha', m.hasDosha ? `YES — ${m.severity}` : 'No');
    if (m.checks?.length) {
      for (const c of m.checks) {
        console.log(`     from ${c.from.padEnd(6)}: Mars in House ${c.houseNum}  →  ${c.hasDosha ? 'Dosha house' : 'Exempt house'}`);
      }
    }
    if (m.cancellations?.length) {
      console.log(`     ${C.dim}Cancellation: ${m.cancellations.join('; ')}${C.reset}`);
    }
    if (m.hasDosha) kv('  Effect / Remedy', `${m.effects} | ${m.remedy}`);
    if (m.classicalRemedy) {
      sub('  Classical Remedies (Manglik/Kuja Dosha)');
      console.log(`     ${C.dim}Also known as: ${m.classicalRemedy.alsoKnownAs.join(', ')}${C.reset}`);
      for (const r of m.classicalRemedy.remedies) console.log(`     • ${r}`);
      console.log(`     ${C.dim}Source: ${m.classicalRemedy.source}${C.reset}`);
    }
  }

  kv('Kalsarpa Dosha', d.kalsarpa?.hasDosha ? `YES — ${d.kalsarpa.type}` : 'No');
  if (d.kalsarpa?.classicalRemedy) {
    sub('  Classical Remedies (Kaal Sarp Dosha)');
    console.log(`     ${C.dim}Also known as: ${d.kalsarpa.classicalRemedy.alsoKnownAs.join(', ')}${C.reset}`);
    for (const r of d.kalsarpa.classicalRemedy.remedies) console.log(`     • ${r}`);
    console.log(`     ${C.dim}Source: ${d.kalsarpa.classicalRemedy.source}${C.reset}`);
  }
  // FIX (audit): a flat "Sade Sati: No" with no further context reads as
  // a contradiction once Section 48 later shows a future Sade Sati window
  // for the same chart — it isn't a calculation error (Sade Sati really
  // isn't active right now), just an incomplete answer. `d.sadeSati.effects`
  // already contains the "next cycle begins <date>" text (computed in
  // engine.js from the same accurate ephemeris Section 48 reads), it was
  // just never printed here. Always show it so "No" is never left dangling.
  kv('Sade Sati', d.sadeSati?.inSadeSati ? `YES — Phase: ${d.sadeSati.currentPhase}` : 'No (not currently active)');
  if (d.sadeSati?.effects) kv('  Detail', d.sadeSati.effects);
  if (d.grahan) kv('Grahan Dosha', d.grahan?.hasDosha ? 'YES' : 'No');
  if (d.pitru) kv('Pitru Dosha', d.pitru?.hasDosha ? 'YES' : 'No');
  if (d.pitru?.classicalRemedy) {
    sub('  Classical Remedies (Pitru Dosha)');
    console.log(`     ${C.dim}Also known as: ${d.pitru.classicalRemedy.alsoKnownAs.join(', ')}${C.reset}`);
    for (const r of d.pitru.classicalRemedy.remedies) console.log(`     • ${r}`);
    console.log(`     ${C.dim}Source: ${d.pitru.classicalRemedy.source}${C.reset}`);
  }
  if (d.nadi) {
    kv('Janma Nakshatra Nadi', d.nadi.nadi || 'NOT_AVAILABLE');
    kv('Nadi Dosha (single-chart status)', 'NOT_DETERMINED — requires the second partner chart');
    if (d.nadi.nakshatra) kv('  Nakshatra Basis', `${d.nadi.nakshatra} → ${d.nadi.nadi}`);
  }

  // Additional named combinations requested by the deep-audit specification.
  const k = d.karmic;
  if (k) {
    sub('Karmic / Named Combination Checks');
    for (const item of [k.shrapit, k.chandal, k.vish]) {
      if (!item) continue;
      const sep = Number.isFinite(item.separationDegrees) ? ` | separation ${item.separationDegrees.toFixed(2)}°` : '';
      console.log(`     ${item.name}: ${item.status}${sep}`);
      console.log(`       Rule used: ${item.definition}`);
      if (item.node) console.log(`       Node: ${item.node}`);
    }
  }

  if (R.sadeSati?.phases?.length) {
    sub('Sade Sati — Full Phase History');
    // BUG FIX: phase objects from sade_sati_accurate.js use the field name
    // `name` (Rising/Peak/Setting), not `phase` — the old code read a
    // field that never existed, so this column printed blank for every
    // chart, always.
    table(['Phase', 'Sign', 'Start', 'End'], R.sadeSati.phases.map(p => [p.name, p.sign, p.start, p.end]));
  }
}
