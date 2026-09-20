/**
 * scriptureLibrary.js — real reader/search engine for the bundled
 * scripture-and-book library (dataset/
 * 15_scripture_and_book_library/), 252 digitized classical texts.
 *
 * WHY THIS EXISTS:
 * An independent audit of this package found that 335MB (81% of the
 * whole 413MB package) was this exact folder, and that zero lines of
 * code anywhere read it — 254 digitized books sitting completely dead.
 * Rather than deleting real reference material or leaving it inert,
 * this module makes it a genuinely queryable resource:
 *
 *   1. At startup it loads only the lightweight index (books_index.json,
 *      a few KB — title/creator/date/word-count per book), never the
 *      330MB of book text up front.
 *   2. `searchScriptureLibrary(query)` full-text-searches book TITLES
 *      first (cheap), then lazily reads and searches the TEXT only of
 *      books whose title/subject plausibly match, returning a short,
 *      attributed snippet per hit (title, creator, date, matched
 *      excerpt) — never a book's full content, and never more than a
 *      handful of snippets, so this stays a citation/lookup tool, not
 *      a way to dump entire copyrighted works.
 *   3. Every result carries its real source citation. If nothing
 *      matches, callers get an empty array — never a fabricated quote.
 *
 * Single responsibility: this file only indexes and searches the
 * library. It does not interpret astrological meaning — callers (e.g.
 * bphsEngine.js) decide what to do with a citation.
 */

import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const CORE_ROOT = join(__dir, '../../dataset/used/core');
const LIB_ROOT = join(__dir, '../../dataset/used/library');
const INDEX_PATH = join(CORE_ROOT, 'books_index.json');

import moduleData from '../../dataset/used/core/scriptureLibrary.json' with { type: 'json' };
import citationIndex from '../../dataset/used/core/scripture-citation-index.json' with { type: 'json' };
const MAX_SNIPPET_CHARS = moduleData.MAX_SNIPPET_CHARS;
const MAX_RESULTS_DEFAULT = moduleData.MAX_RESULTS_DEFAULT;
const MAX_BOOKS_TO_SCAN_TEXT = moduleData.MAX_BOOKS_TO_SCAN_TEXT;

let _index = null; // [{ file, title, creator, date, total_pages, total_words, has_text }]
let _available = null;

function loadIndex() {
  if (_index !== null) return _index;
  try {
    if (!existsSync(INDEX_PATH)) {
      _index = [];
      _available = false;
      return _index;
    }
    _index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
    _available = Array.isArray(_index) && _index.length > 0;
  } catch {
    _index = [];
    _available = false;
  }
  return _index;
}

export function isScriptureLibraryAvailable() {
  loadIndex();
  return !!_available;
}

export function getScriptureLibraryStats() {
  const idx = loadIndex();
  return {
    available: !!_available,
    bookCount: idx.length,
    totalWords: idx.reduce((s, b) => s + (b.total_words || 0), 0),
  };
}

function titleScore(book, terms) {
  const hay = `${book.title || ''} ${(Array.isArray(book.subject) ? book.subject.join(' ') : book.subject || '')}`.toLowerCase();
  return terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
}

function makeSnippet(text, term) {
  const lower = text.toLowerCase();
  const i = lower.indexOf(term.toLowerCase());
  if (i === -1) return null;
  const start = Math.max(0, i - MAX_SNIPPET_CHARS / 2);
  const end = Math.min(text.length, i + MAX_SNIPPET_CHARS / 2);
  let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet = snippet + '…';
  return snippet;
}

/**
 * Search the scripture library for a topic. Returns real, attributed
 * excerpts only — never a fabricated citation, never a full book dump.
 *
 * @param {string[]} keywords - search terms, e.g. ['raja yoga']
 * @param {{maxResults?: number}} opts
 * @returns {Array<{title, creator, date, snippet, matchedTerm}>}
 */
/**
 * Search the scripture library for a topic. Returns real, attributed
 * excerpts only — never a fabricated citation, never a full book dump.
 *
 * Resolution order:
 *   1. The prebuilt citation index (dataset/used/core/scripture-citation-index.json).
 *      Built offline by tools/build-scripture-index.mjs from 242 source books;
 *      ships inside the core application, needs no disk I/O at request time.
 *   2. The raw scripture corpus, when the optional scripture pack is installed.
 *      Only consulted for terms the index does not cover.
 *
 * Step 1 alone answers the vocabulary the prediction engine can emit, so
 * citations keep working with the 328 MB corpus absent. Previously every search
 * synchronously JSON.parse-d up to 40 multi-megabyte books — up to 3.8 s per
 * call, blocking the event loop for all concurrent users.
 *
 * @param {string[]} keywords - search terms, e.g. ['raja yoga']
 * @param {{maxResults?: number, exact?: boolean}} opts - exact:true restricts
 *   matching to the term as indexed, skipping the broad substring fallback
 *   (which can over-match short vocabulary terms embedded in longer phrases,
 *   e.g. "raja yoga" inside "viparita raja yoga — harsha yoga"). Use exact
 *   matching wherever a wrong citation would be worse than none.
 * @returns {Array<{title, creator, date, snippet, matchedTerm, source}>}
 */
export function searchScriptureLibrary(keywords, opts = {}) {
  if (!keywords?.length) return [];
  const maxResults = opts.maxResults || MAX_RESULTS_DEFAULT;
  const exact = !!opts.exact;
  const terms = keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean);
  if (!terms.length) return [];

  const results = [];
  const seenBooks = new Set();
  const entries = citationIndex?.entries || {};

  // 1. Prebuilt index — exact term, then (unless `exact`) substring match
  //    across indexed terms.
  for (const term of terms) {
    if (results.length >= maxResults) break;
    const buckets = entries[term]
      ? [entries[term]]
      : exact ? [] : Object.keys(entries).filter(k => k.includes(term) || term.includes(k)).map(k => entries[k]);
    for (const bucket of buckets) {
      for (const hit of bucket) {
        if (results.length >= maxResults) break;
        if (seenBooks.has(hit.file)) continue; // keep results diverse across books
        seenBooks.add(hit.file);
        results.push({
          title: hit.title,
          creator: hit.creator,
          date: hit.date,
          matchedTerm: term,
          snippet: hit.snippet,
          source: `Scripture library: ${hit.file}`,
        });
      }
    }
  }
  if (results.length >= maxResults) return results.slice(0, maxResults);

  // 2. Optional raw-corpus fallback. Skipped entirely when the scripture pack
  //    is not installed, which is the default for the core distribution.
  const idx = loadIndex();
  if (!_available || exact) return results;
  const candidates = idx
    .filter(b => b.has_text && !seenBooks.has(b.file))
    .map(b => ({ book: b, score: titleScore(b, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_BOOKS_TO_SCAN_TEXT);

  for (const { book } of candidates) {
    if (results.length >= maxResults) break;
    const filePath = join(LIB_ROOT, book.file);
    if (!existsSync(filePath)) continue;
    let text;
    try { text = JSON.parse(readFileSync(filePath, 'utf8')).text; } catch { continue; }
    if (!text) continue;
    for (const term of terms) {
      const snippet = makeSnippet(text, term);
      if (snippet) {
        seenBooks.add(book.file);
        results.push({
          title: book.title, creator: book.creator || 'Unknown', date: book.date || 'Undated',
          matchedTerm: term, snippet, source: `Scripture library: ${book.file}`,
        });
        break;
      }
    }
  }
  return results.slice(0, maxResults);
}

/** Provenance for the citation layer (admin/diagnostics). */
export function getCitationIndexStats() {
  return {
    version: citationIndex?.version ?? null,
    builtAt: citationIndex?.builtAt ?? null,
    terms: citationIndex?.terms ?? 0,
    citations: citationIndex?.citations ?? 0,
    booksContributing: citationIndex?.booksContributing ?? 0,
    rawCorpusInstalled: isScriptureLibraryAvailable(),
  };
}

export default { isScriptureLibraryAvailable, getScriptureLibraryStats, getCitationIndexStats, searchScriptureLibrary };