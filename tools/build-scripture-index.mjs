#!/usr/bin/env node
/**
 * Build the HoraSaar scripture citation index.
 *
 * WHY THIS EXISTS
 * ---------------
 * The raw scripture corpus is 252 books / ~27.5M words / ~328 MB. Searching it
 * at request time meant synchronously JSON.parse-ing multi-megabyte files on
 * every prediction — measured at up to 3.8 s per search, blocking the event
 * loop for every concurrent user, and still returning 0 hits for common terms
 * because ranking only looked at book titles.
 *
 * This script moves that work offline. It scans every book once and extracts
 * real, attributed excerpts for a controlled astrology vocabulary. The output
 * is a compact index that ships inside the core application, so citations keep
 * working with the 328 MB corpus removed.
 *
 * Every snippet in the output is copied verbatim from a real source book and
 * carries its title, creator and date. Nothing here is generated or inferred.
 *
 * Usage:  node tools/build-scripture-index.mjs [--max-per-term N]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE = join(ROOT, 'dataset', 'used', 'core');
const LIBRARY = join(ROOT, 'dataset', 'used', 'library');
const OUT = join(CORE, 'scripture-citation-index.json');

const SNIPPET_CHARS = 160; // shorter excerpt — an identifiable fragment, not a
                            // reproduction of the passage. See copyright note below.
const MAX_PER_TERM = Number(process.argv[process.argv.indexOf('--max-per-term') + 1]) || 6;

// ── Copyright-safety ranking ────────────────────────────────────────────────
// The corpus mixes ancient public-domain shastras (Puranas, BPHS-descended
// texts, undated classical works) with 20th-century named-author translations
// and commentaries that may still be under copyright in some jurisdictions.
// When more than one book matches the same term, this index prefers:
//   1. books whose title matches the astrology vocabulary directly (topically
//      correct — fixes the "career -> Mimamsa Sutras" style false-positive),
//   2. books with no machine-readable date, or a date before 1930 (safer —
//      almost certainly a pre-modern or ancient source),
//   3. otherwise, spread evenly across the remaining books.
// Nothing here is a legal determination; it is a conservative ordering that
// minimizes exposure while keeping citations real and attributed.
const ASTROLOGY_TITLE_WORDS = ['jyotish','astrolog','horary','nadi','jataka','hora',
  'samhita','phala','kundli','varshaphal','prashna','saravali','parashar','bhrigu',
  'lagna','graha','panchang','muhurt','dasha','kerala','deva keralam','chamatkar',
  'bphs','uttar kalamrit'];
function isAstrologyBook(book) {
  const t = String(book.title || book.file).toLowerCase();
  return ASTROLOGY_TITLE_WORDS.some(w => t.includes(w));
}
function isLikelyPublicDomain(book) {
  const y = parseInt(String(book.date || '').match(/\d{4}/)?.[0] || '', 10);
  return !y || y < 1930;
}
function citationSafetyRank(book) {
  // Lower is preferred.
  return (isAstrologyBook(book) ? 0 : 1) + (isLikelyPublicDomain(book) ? 0 : 2);
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const maybe = (name) => { const p = join(CORE, name); return existsSync(p) ? readJson(p) : null; };

/** Build the search vocabulary from the application's own rule datasets, so the
 *  index covers exactly the concepts the prediction engine can actually emit. */
function buildVocabulary() {
  const terms = new Map(); // term -> {term, kind}
  const add = (term, kind) => {
    const t = String(term || '').toLowerCase().trim();
    if (t.length < 4 || t.length > 40) return;
    if (!/^[a-z\u0900-\u097F][a-z\u0900-\u097F\s'-]+$/.test(t)) return; // latin or devanagari phrases
    if (!terms.has(t)) terms.set(t, { term: t, kind });
  };

  for (const y of maybe('yogas.json') || []) add(y.name, 'yoga');
  const doshas = maybe('doshas.json') || {};
  for (const k of Object.keys(doshas)) add(k.replace(/_/g, ' ').toLowerCase(), 'dosha');
  const prefs = maybe('user-prediction-preferences.json') || {};
  for (const id of Object.keys(prefs.labels || {})) add(id, 'topic');
  // Note: deliberately NOT adding the human-readable labels (e.g. "Career",
  // "Love") as standalone search terms — a bare English word like "career"
  // matches almost any book that mentions the word in passing (verified:
  // matched an unrelated Mimamsa Sutras commentary), producing a real but
  // topically meaningless citation. The multi-word technique/dosha/yoga terms
  // below are what the trust panel actually searches on.

  for (const p of ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu',
                   'surya','chandra','mangal','budha','guru','shukra','shani']) add(p, 'planet');
  for (const s of ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio',
                   'sagittarius','capricorn','aquarius','pisces']) add(s, 'sign');
  for (const d of ['vimshottari','mahadasha','antardasha','ashtottari','yogini dasha',
                   'kalachakra','chara dasha']) add(d, 'dasha');
  for (const h of ['lagna','ascendant','bhava','kendra','trikona','dusthana',
                   'upachaya','maraka','badhaka']) add(h, 'house');
  for (const r of ['gemstone','rudraksha','yantra','mantra','daan','graha shanti',
                   'remedial measure','propitiation']) add(r, 'remedy');
  for (const t of ['transit','gochar','sade sati','ashtakavarga','shadbala','varshaphal',
                   'muhurta','panchanga','nakshatra','navamsa','arudha','karakamsa',
                   'raja yoga','dhana yoga','neecha bhanga','kaal sarp',
                   'mangal dosha','pitra dosha','gandmool']) add(t, 'technique');
  for (const t of ['kuja dosha','mangal dosha remedy','kalsarpa dosha','kaal sarp dosha',
                   'grahan dosha','pitru dosha remedy','nadi dosha','shrapit dosha',
                   'kemadruma yoga','gajakesari yoga','budhaditya yoga','panch mahapurusha',
                   'guru chandal','shubh yoga','vipreet raja yoga','viparita raja yoga','ravi yoga',
                   'gemstone remedy','rudraksha remedy','mantra japa','graha shanti',
                   'daan remedy']) add(t, 'remedy-specific');


  // The corpus is roughly half Devanagari (Hindi/Sanskrit). A latin-only
  // vocabulary matched none of those 132 books, so the same concepts are also
  // registered in Devanagari to bring the Hindi/Sanskrit sources into range.
  const DEVANAGARI = {
    planet: ['सूर्य','चन्द्र','चंद्र','मंगल','बुध','गुरु','बृहस्पति','शुक्र','शनि','राहु','केतु'],
    sign: ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'],
    house: ['लग्न','भाव','केन्द्र','त्रिकोण','मारक','बाधक'],
    dasha: ['दशा','महादशा','अन्तर्दशा','विंशोत्तरी'],
    dosha: ['दोष','मंगल दोष','कालसर्प','पितृ दोष','मांगलिक'],
    yoga: ['योग','राजयोग','राज योग','धन योग','नीचभंग'],
    technique: ['नक्षत्र','नवांश','गोचर','मुहूर्त','पंचांग','कुण्डली','कुंडली','ज्योतिष','साढ़े साती','अष्टकवर्ग','फल'],
    remedy: ['उपाय','रत्न','मंत्र','यंत्र','रुद्राक्ष','दान','शान्ति'],
  };
  for (const [kind, list] of Object.entries(DEVANAGARI)) for (const t of list) add(t, kind);
  return [...terms.values()];
}

function makeSnippet(text, term) {
  const i = text.toLowerCase().indexOf(term);
  if (i === -1) return null;
  const start = Math.max(0, i - Math.floor(SNIPPET_CHARS / 2));
  const end = Math.min(text.length, i + Math.ceil(SNIPPET_CHARS / 2));
  let s = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) s = '…' + s;
  if (end < text.length) s += '…';
  return s;
}

const vocab = buildVocabulary();
const allBooks = readJson(join(CORE, 'books_index.json')).filter(b => b.has_text);

// Some corpus entries are directory/course listings (filenames, download
// links) rather than scripture text — e.g. "Astrology tuitions_audio_video
// _contents" is 369 ".m4v" filenames and pCloud links, not a book. Citing
// them as classical sources would be misleading, so they are detected and
// excluded here rather than indexed.
function looksLikeFileListing(text) {
  const sample = text.slice(0, 6000);
  const extHits = (sample.match(/\.(m4v|mp4|pdf|jhd|doc|mp3|avi|jpg|png)\b/gi) || []).length;
  const urlHits = (sample.match(/https?:\/\//g) || []).length;
  return extHits > 15 || urlHits > 5;
}
const excludedListings = [];
const books = allBooks.filter(book => {
  const path = join(LIBRARY, book.file);
  if (!existsSync(path)) return true; // handled later as "missing"
  let text; try { text = readJson(path).text; } catch { return true; }
  if (text && looksLikeFileListing(text)) { excludedListings.push(book.file); return false; }
  return true;
});
console.log(`vocabulary: ${vocab.length} terms | corpus: ${books.length} books`);

// PASS 1 — collect every (term, book) match in the corpus.
// Snippets are gathered first and selected afterwards, so that selection can
// balance across books. A first-come-first-served scan filled each term's quota
// with whichever books sorted first alphabetically, leaving most of the corpus
// unrepresented.
const allHits = new Map(vocab.map(v => [v.term, []]));
const unreadable = [];
let scanned = 0;

for (const book of books) {
  const path = join(LIBRARY, book.file);
  if (!existsSync(path)) { unreadable.push({ file: book.file, reason: 'missing' }); continue; }
  let text;
  try { text = readJson(path).text; } catch (e) { unreadable.push({ file: book.file, reason: 'unparsable' }); continue; }
  if (!text) { unreadable.push({ file: book.file, reason: 'no text field' }); continue; }
  scanned++;
  const lower = text.toLowerCase();
  for (const { term, kind } of vocab) {
    if (!lower.includes(term)) continue;
    const snippet = makeSnippet(text, term);
    if (!snippet) continue;
    allHits.get(term).push({
      kind,
      title: book.title || book.file,
      creator: book.creator || 'Unknown',
      date: book.date || 'Undated',
      file: book.file,
      snippet,
      _rank: citationSafetyRank(book),
    });
  }
  if (scanned % 25 === 0) console.log(`  scanned ${scanned}/${books.length}…`);
}

// PASS 2 — select citations. Prefer topically-correct, copyright-safer books
// first; among equally-safe candidates, prefer books that are still
// under-represented so the index spreads across as much of the corpus as the
// vocabulary allows instead of a handful of broad books dominating every term.
const perBookCount = new Map();
const byTerm = new Map();
for (const [term, hits] of allHits) {
  if (!hits.length) continue;
  const chosen = [];
  const pool = hits.slice();
  while (chosen.length < MAX_PER_TERM && pool.length) {
    pool.sort((a, b) => {
      const rankA = a._rank, rankB = b._rank;
      if (rankA !== rankB) return rankA - rankB;
      return (perBookCount.get(a.file) || 0) - (perBookCount.get(b.file) || 0);
    });
    const pick = pool.shift();
    chosen.push(pick);
    perBookCount.set(pick.file, (perBookCount.get(pick.file) || 0) + 1);
  }
  byTerm.set(term, chosen.map(({ _rank, ...rest }) => rest));
}
const booksContributing = new Set(perBookCount.keys());
const missing = unreadable.length;

const entries = {};
let citations = 0;
for (const [term, hits] of byTerm) {
  if (!hits.length) continue;
  entries[term] = hits;
  citations += hits.length;
}

const out = {
  version: 1,
  builtAt: new Date().toISOString(),
  note: 'Verbatim attributed excerpts extracted offline from the HoraSaar scripture corpus. Every entry maps to a real source book.',
  corpusBooks: books.length,
  booksScanned: scanned,
  booksContributing: booksContributing.size,
  terms: Object.keys(entries).length,
  citations,
  entries,
};
writeFileSync(OUT, JSON.stringify(out));
console.log('');
console.log(`books scanned      : ${scanned} (${missing} unreadable/missing)`);
console.log(`books contributing : ${booksContributing.size}`);
console.log(`terms with hits    : ${out.terms} / ${vocab.length}`);
console.log(`total citations    : ${citations}`);
console.log(`written            : ${OUT}`);
if (excludedListings.length) {
  console.log('');
  console.log(`excluded (file/course listings, not scripture text): ${excludedListings.length}`);
  for (const f of excludedListings) console.log(`  - ${f}`);
}
if (unreadable.length) {
  console.log('');
  console.log('unreadable books (excluded from the index):');
  for (const u of unreadable) console.log(`  - ${u.file} (${u.reason})`);
}
