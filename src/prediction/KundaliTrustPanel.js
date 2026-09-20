/**
 * KundaliTrustPanel.js — "Your Kundali, Explained" for end users.
 *
 * Purpose
 * -------
 * Turns the chart's already-computed doshas and yogas (src/dosha/*.js,
 * src/yogas/*.js — classical BPHS/Phaladeepika/Saravali-descended rules,
 * not invented here) into a small number of plain-language cards, each with
 * exactly four parts:
 *
 *   ISSUE     — what pattern is present, in plain words
 *   CAUSE     — why: the specific planetary placement that causes it
 *   SOLUTION  — what it practically means for the person, calmly stated
 *   REMEDY    — the classical remedial measure for it
 *
 * Every field is built from the chart's own computed dosha/yoga object —
 * nothing here is invented or generic. Where the scripture citation index
 * (dataset/used/core/scripture-citation-index.json, built offline by
 * tools/build-scripture-index.mjs from the source book corpus) has a
 * genuinely on-topic excerpt for that exact dosha/yoga, it is attached as
 * supporting evidence so the person can see the classical source, not just
 * take the app's word for it. When no good match exists, evidence is simply
 * omitted — a missing citation is safer than a mismatched one.
 *
 * "Forget the past": permanently-cancelled or inactive items are not shown
 * as problems; a cancelled dosha is reported once, reassuringly, and does not
 * get a remedy card (remedies are never pushed generically).
 */
import { searchScriptureLibrary } from '../reference/scriptureLibrary.js';

const DISCLAIMER =
  'These are classical astrological patterns, not medical, legal or financial diagnoses. ' +
  'Remedies are traditional practices offered for reflection and peace of mind, not guarantees of outcome.';

function firstGoodCitation(termVariants) {
  for (const term of termVariants) {
    const hits = searchScriptureLibrary([term], { maxResults: 1, exact: true });
    if (hits?.length) {
      const h = hits[0];
      return { title: h.title, creator: h.creator, date: h.date, snippet: h.snippet, matchedTerm: h.matchedTerm };
    }
  }
  return null;
}

function card({ id, kind, name, nameHindi, severity, issue, cause, solution, remedy, citationTerms }) {
  if (!remedy) return null; // no remedy text (e.g. "no dosha") -> not a card, it's reassurance
  return {
    id, kind, name, nameHindi: nameHindi || null, severity: severity || null,
    issue, cause, solution, remedy,
    evidence: citationTerms ? firstGoodCitation(citationTerms) : null,
  };
}

function mangalCard(m) {
  if (!m || !m.hasDosha) return null;
  if (m.isCancelled) {
    return {
      id: 'mangal-cancelled', kind: 'reassurance', name: 'Mangal (Kuja) Dosha', nameHindi: 'मंगल दोष',
      issue: 'Mars is placed in a position that classically forms Mangal Dosha.',
      cause: (m.cancellations || []).join('; ') || 'A classical cancellation condition applies in your chart.',
      solution: 'This pattern is present but classically cancelled in your specific chart, so it does not need a remedy.',
      remedy: null, evidence: null,
    };
  }
  const houses = (m.checks || []).filter(c => c.hasDosha).map(c => `${c.houseNum} from ${c.from}`).join(', ');
  return card({
    id: 'mangal', kind: 'dosha', name: 'Mangal (Kuja) Dosha', nameHindi: 'मंगल दोष', severity: m.severity,
    issue: `Mars is placed in a house that classically forms Mangal Dosha (${houses || 'natal placement'}).`,
    cause: `Mars in your chart falls in the 1st, 2nd, 4th, 7th, 8th or 12th house from ${houses ? houses.split(',')[0].split(' from ')[1] : 'Lagna, Moon or Venus'} — the classical trigger for this dosha.`,
    solution: 'It mainly affects the energy and timing around marriage and close partnerships — it is a pattern to plan around, not something to fear.',
    remedy: m.remedy || 'Traditional remedies include worship of Mars (Mangal), Tuesday fasting, and — where matched — marriage to a partner with a compatible chart.',
    citationTerms: ['kuja dosha', 'mangal dosha', 'mangal dosha remedy'],
  });
}

function kalsarpaCard(k) {
  if (!k || !k.hasDosha) return null;
  return card({
    id: 'kalsarpa', kind: 'dosha', name: `Kalsarpa Dosha${k.type ? ` (${k.type})` : ''}`, nameHindi: 'कालसर्प दोष', severity: k.severity,
    issue: `All the main planets fall between Rahu and Ketu in your chart, forming Kalsarpa Dosha (${k.type || 'natal pattern'}).`,
    cause: `Rahu is in ${k.rahuSign} and Ketu is in ${k.ketuSign}, with every other planet positioned on one side of that axis.`,
    solution: 'This pattern is often linked to a life that feels like it moves in delayed bursts rather than steadily — many people with strong charts have it.',
    remedy: (k.remedies && k.remedies.length ? k.remedies.join('; ') : null) || 'Traditional remedies include Rahu-Ketu shanti puja and Mahamrityunjaya mantra japa.',
    citationTerms: ['kaal sarp dosha', 'kalsarpa dosha'],
  });
}

function grahanCard(g) {
  if (!g || !g.hasDosha) return null;
  return card({
    id: 'grahan', kind: 'dosha', name: 'Grahan (Eclipse) Dosha', nameHindi: 'ग्रहण दोष', severity: g.severity,
    issue: 'A luminary (Sun or Moon) is closely conjunct Rahu or Ketu, forming Grahan Dosha.',
    cause: 'Rahu or Ketu sits within a few degrees of the Sun or Moon at birth — the classical eclipse-axis condition.',
    solution: 'This is mainly read as a clouding effect on confidence (Sun) or the mind (Moon) — awareness of it is usually enough to work around it.',
    remedy: g.remedy || (g.remedies || []).join('; ') || 'Traditional remedy: Rahu/Ketu shanti and the appropriate luminary\'s mantra japa.',
    citationTerms: ['grahan dosha'],
  });
}

function pitruCard(p) {
  if (!p || !p.hasDosha) return null;
  return card({
    id: 'pitru', kind: 'dosha', name: 'Pitru Dosha', nameHindi: 'पितृ दोष', severity: p.severity,
    issue: 'Your chart shows a classical Pitru Dosha indicator (ancestral-line affliction).',
    cause: (p.indicators || []).join('; ') || 'A classical Pitru Dosha placement condition is met in your chart.',
    solution: 'This is traditionally read as a call to honour and remember one\'s ancestors — a spiritual practice, not a curse.',
    remedy: p.remedy || (p.remedies || []).join('; ') || 'Traditional remedy: Pitru Paksha shraddha, tarpan, and charity in ancestors\' memory.',
    citationTerms: ['pitru dosha remedy', 'pitru dosha'],
  });
}

const YOGA_TERM_MAP = [
  [/viparita|vipreet/i, 'viparita raja yoga'],
  [/pancha\s*mahapurusha|panch\s*mahapurusha/i, 'panch mahapurusha'],
  [/gajakesari/i, 'gajakesari yoga'],
  [/budhaditya|budh.?aditya/i, 'budhaditya yoga'],
  [/kemadruma|kemadruna/i, 'kemadruma yoga'],
  [/guru\s*chandal/i, 'guru chandal'],
  [/^raja yoga$|^raja yoga \(/i, 'raja yoga'],
  [/dhana yoga/i, 'dhana yoga'],
];
function yogaCitationTerms(y) {
  const type = String(y.type || '').toLowerCase();
  const name = String(y.name || '').toLowerCase();
  for (const [pattern, term] of YOGA_TERM_MAP) if (pattern.test(type) || pattern.test(name)) return [term];
  return []; // no confident mapping -> no citation, rather than a mismatched one
}

const YOGA_MAX_CARDS = 2;
function yogaCards(yogas) {
  const strong = (yogas || [])
    .filter(y => y?.classicalDetail?.category?.toLowerCase().includes('auspicious') || /raja|dhana|mahapurusha|gajakesari/i.test(y?.name || ''))
    .sort((a, b) => (b.strength === 'Strong') - (a.strength === 'Strong'))
    .slice(0, YOGA_MAX_CARDS);

  return strong.map((y, i) => card({
    id: `yoga-${i}-${(y.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    kind: 'yoga', name: y.name, severity: y.strength,
    issue: `Your chart forms ${y.name} — ${y.desc || 'a classically auspicious combination'}.`,
    cause: y.classicalDetail?.condition || `Formed by ${y.planets || 'the planetary combination'} in your chart.`,
    solution: (y.classicalDetail?.effects || []).slice(0, 2).join('; ') || 'This is a supportive combination — lean into the opportunities it favours.',
    remedy: 'No remedy is needed for a benefic yoga — traditional guidance is simply to actively use its supportive periods (see your Dasha timing) rather than let them pass.',
    citationTerms: yogaCitationTerms(y),
  })).filter(Boolean);
}

/**
 * @param {object} chart - the full computed chart (chart.doshas, chart.yogas)
 * @returns {{hasIssues: boolean, cards: object[], disclaimer: string}}
 */
export function buildKundaliTrustPanel(chart) {
  const d = chart?.doshas || {};
  const cards = [
    mangalCard(d.mangal),
    kalsarpaCard(d.kalsarpa),
    grahanCard(d.grahan),
    pitruCard(d.pitru),
    ...yogaCards(chart?.yogas),
  ].filter(Boolean);

  return {
    hasIssues: cards.some(c => c.kind === 'dosha'),
    cards,
    disclaimer: DISCLAIMER,
  };
}

export default { buildKundaliTrustPanel };
