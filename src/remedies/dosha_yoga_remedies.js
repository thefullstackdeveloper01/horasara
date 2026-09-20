/**
 * dosha_yoga_remedies.js — Section 48 (final section): "Your Kundali's
 * Doshas & Yogas — Timeline & Personalized Remedies".
 *
 * Single responsibility: tell the person plainly —
 *   1. which doshas are ACTIVE now or in the future in their own chart
 *      (never past-only ones — see "forget the past" design note below),
 *   2. which yogas are activating now or in the future via their real
 *      Dasha timeline,
 *   3. and — only where a real dosha exists — which ritual/totka/remedy/
 *      upaya/tantra/mantra/yantra/sadhana actually addresses it.
 *
 * If a person's chart has no active dosha, this section says so plainly
 * and prints NO remedies — remedies are never pushed generically.
 *
 * Design notes:
 *   - "Forget the past": Sade Sati cycles and yoga-activation Dasha windows
 *     that have already fully ended are not shown; only current/future
 *     windows are — this section is a forward-looking action list, not a
 *     history lesson.
 *   - Remedy text is pulled from this chart's own already-computed dosha
 *     objects (real classical remedies from src/dosha/*.js) plus mantras
 *     matched from the bundled remedy source text — the source citation is
 *     intentionally not printed to the user (kept internal for now); this
 *     is a deliberate, easily-reversible choice — see SHOW_SOURCE_CITATION
 *     below.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Flip to true to re-print the underlying printed-book citation at the
// bottom of this section. Left off for now per current product direction —
// the remedy content itself is unaffected either way.
import moduleData from '../../dataset/used/core/dosha_yoga_remedies.json' with { type: 'json' };
const SHOW_SOURCE_CITATION = moduleData.SHOW_SOURCE_CITATION;

let BOOK = null;
function loadBook() {
  if (BOOK) return BOOK;
  try {
    const path = join(__dirname, '..', '..', 'dataset', 'used', 'library',
      'Mantra-Tantra-Sadhana-Laxmi-Narayan-Sharma-1978-1993.json');
    BOOK = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) { BOOK = { chapters: [] }; }
  return BOOK;
}

function ch(book, n) {
  return book.chapters.find(c => c.chapter_number === n);
}

function mantraOf(book, chNum) {
  const c = ch(book, chNum);
  const m = c?.mantras?.[0];
  return m ? { text: m.mantra_text, meaning: m.meaning_english } : null;
}

const GRAHA_GEMSTONE = moduleData.GRAHA_GEMSTONE;

/**
 * Build the full personalized dosha/yoga timeline + conditional remedies
 * section, as an array of print-ready lines.
 */
export function buildDoshaYogaRemedies(name, planets, houses, doshas, yogas, mahas, nowJD, dashaMeaningsData, sadeSatiCycles) {
  const book = loadBook();
  const lines = [];
  const push = (s = '') => lines.push(s);
  const currentYear = new Date().getFullYear();

  push(`  ${name || 'आपकी'} Kundali — Active Doshas & Yogas (current + future only) and matching remedies`);
  push('');

  // ── 1. DOSHA TIMELINE — only current/future-relevant doshas ────────────
  push('  ── YOUR DOSHAS — TIME FRAME ─────────────────────────────────────────────────');
  const activeDoshas = [];

  if (doshas?.mangal?.hasDosha && !doshas.mangal.isCancelled) {
    activeDoshas.push({
      name: 'Mangal (Kuja) Dosha', timeframe: 'Lifelong (natal placement — permanent unless matched by an equally-dosha partner)',
      severity: doshas.mangal.severity, remedy: doshas.mangal.remedy,
    });
  } else if (doshas?.mangal?.hasDosha && doshas.mangal.isCancelled) {
    push('  • Mangal Dosha is technically present in your chart but is CANCELLED by classical rules — no remedy needed for it.');
  }

  if (doshas?.kalsarpa?.hasDosha) {
    activeDoshas.push({
      name: `Kalsarpa Dosha (${doshas.kalsarpa.type || ''})`, timeframe: 'Lifelong (natal Rahu-Ketu axis placement)',
      severity: doshas.kalsarpa.severity, remedy: (doshas.kalsarpa.remedies || []).join('; '),
    });
  }

  if (doshas?.grahan?.hasDosha) {
    activeDoshas.push({ name: 'Grahan (Eclipse) Dosha', timeframe: 'Lifelong (natal placement)', remedy: doshas.grahan.remedy || (doshas.grahan.remedies || []).join('; ') });
  }
  if (doshas?.pitru?.hasDosha) {
    activeDoshas.push({ name: 'Pitru Dosha', timeframe: 'Lifelong (natal placement)', remedy: doshas.pitru.remedy || (doshas.pitru.remedies || []).join('; ') });
  }
  if (doshas?.nadi?.hasDosha) {
    activeDoshas.push({ name: 'Nadi Dosha', timeframe: 'Lifelong (natal placement)', remedy: doshas.nadi.remedy || (doshas.nadi.remedies || []).join('; ') });
  }

  // Sade Sati — only current or upcoming cycles, never past-only ones.
  const relevantSadeSati = (sadeSatiCycles || [])
    .filter(c => (c.endYear ?? 9999) >= currentYear)
    .map(c => ({
      label: c.isCurrent ? `Sade Sati — currently running (Cycle ${c.cycle})` : `Sade Sati — upcoming (Cycle ${c.cycle})`,
      timeframe: `${c.start} → ${c.end}`,
      phases: c.phases,
      isCurrent: c.isCurrent,
    }));

  if (activeDoshas.length === 0 && relevantSadeSati.length === 0) {
    push('  ✓ No major dosha is currently active or upcoming in your chart.');
    push(`     ${name || 'Aapki'} kundali is clean of Mangal/Kalsarpa/Grahan/Pitru/Nadi Dosha and not in Sade Sati right now.`);
    push('     → No remedy is required. Ritual/mantra/gemstone remedies below are skipped intentionally —');
    push('       this app never recommends remedies you don\'t actually need.');
  } else {
    for (const d of activeDoshas) {
      push(`  • ${d.name}   [Severity: ${d.severity || 'Present'}]`);
      push(`     Time frame: ${d.timeframe}`);
      push('');
    }
    for (const s of relevantSadeSati) {
      push(`  • ${s.label}`);
      push(`     Time frame: ${s.timeframe}`);
      if (s.phases?.length) {
        for (const ph of s.phases) push(`       - ${ph.name} phase (${ph.start} → ${ph.end}): ${ph.effect}`);
      }
      push('');
    }
  }
  push('');

  // ── 2. YOGA TIMELINE — only yogas whose activating Dasha is now/future ─
  push('  ── YOUR YOGAS — ACTIVATION TIME FRAME ───────────────────────────────────────');
  const activeYogas = [];
  const YOGA_HORIZON_JD = nowJD + 40 * 365.25; // only show activations within next ~40 years
  for (const y of (yogas || [])) {
    const yogaPlanets = (y.planets || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const p of yogaPlanets) {
      const period = mahas.find(m => m.mahadasha === p && m.endJD >= nowJD && m.startJD <= YOGA_HORIZON_JD);
      if (period) {
        activeYogas.push({ yoga: y, planet: p, start: period.start, end: period.end, isCurrent: nowJD >= period.startJD });
        break; // one activation window is enough to list the yoga
      }
    }
  }

  if (activeYogas.length === 0) {
    push('  Your detected yogas already expressed through Dasha periods earlier in life.');
    push('  (Per "focus on present & future" — past-only activation windows are not listed here.)');
  } else {
    for (const a of activeYogas) {
      push(`  • ${a.yoga.name}  [${a.yoga.strength}]  —  ${a.yoga.desc}`);
      push(`     Activates via ${a.planet} Mahadasha: ${a.start} → ${a.end}  ${a.isCurrent ? '(RUNNING NOW)' : '(upcoming)'}`);
      push('');
    }
  }
  push('');

  // ── 3. PERSONALIZED REMEDIES — only for doshas that actually exist ─────
  if (activeDoshas.length > 0 || relevantSadeSati.length > 0) {
    push('  ── YOUR PERSONALIZED REMEDIES — उपाय / टोटके / रत्न / मंत्र / तंत्र / यंत्र / साधना ───');
    push('');

    for (const d of activeDoshas) {
      push(`  ▸ For ${d.name}:`);
      if (d.remedy) push(`     Classical remedy: ${d.remedy}`);
      // Match a book mantra where one exists for this dosha type
      if (d.name.startsWith('Mangal')) {
        const m = mantraOf(book, 6); // Batuk Bhairav — classical Mars-affliction protection deity
        if (m) push(`     Supporting mantra: ${m.text}  (${m.meaning})`);
      }
      if (d.name.startsWith('Kalsarpa')) {
        const m = mantraOf(book, 8); // Bagalamukhi — obstacle/enemy removal
        if (m) push(`     Supporting mantra: ${m.text}  (${m.meaning})`);
      }
      push('');
    }

    if (relevantSadeSati.length > 0) {
      const shani = dashaMeaningsData?.Saturn;
      push('  ▸ For Sade Sati:');
      if (shani?.mantra) push(`     Shani mantra: ${shani.mantra}`);
      push(`     Gemstone (consult astrologer first): ${GRAHA_GEMSTONE.Saturn}`);
      const hanuman = mantraOf(book, 7); // Hanuman — classical Saturn-affliction remedy deity
      if (hanuman) push(`     Supporting mantra (Hanuman): ${hanuman.text}  (${hanuman.meaning})`);
      push('     Practical: Saturdays — donate black sesame/mustard oil/iron; recite Hanuman Chalisa; serve the needy and elderly.');
      push('');
    }
  }

  if (SHOW_SOURCE_CITATION) {
    push('  ── SOURCE ──────────────────────────────────────────────────────────────────');
    push(`  ${book.title} — ${book.author} (${book.publisher})`);
  }

  return lines;
}
