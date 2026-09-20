/**
 * KnowledgeLibrary — access to the classical text corpus in dataset/used/library.
 *
 * The corpus is ~330 MB across 253 texts, so nothing here loads it wholesale.
 * Discovery runs entirely off the prebuilt _index.json (≈300 KB, loaded once);
 * full text is read per-title on demand behind a small LRU so a search sweep
 * never holds more than a handful of texts in memory.
 *
 * Rebuild the index with: node scripts/build-library-index.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { bucketDir } from '../dataset/DatasetCatalog.js';

const DIR = bucketDir('library');
const INDEX_PATH = join(DIR, '_index.json');

let index = null;
function getIndex() {
  if (index) return index;
  if (!existsSync(INDEX_PATH)) {
    throw new Error('Library index missing. Run: node scripts/build-library-index.mjs');
  }
  index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  index.byId = new Map(index.books.map(b => [b.id, b]));
  return index;
}

/** Bounded cache so a full-corpus sweep stays flat in memory. */
const MAX_CACHED = 6;
const cache = new Map();
function bodyOf(book) {
  if (cache.has(book.id)) {
    const v = cache.get(book.id);
    cache.delete(book.id); cache.set(book.id, v);
    return v;
  }
  const raw = JSON.parse(readFileSync(join(DIR, book.file), 'utf8'));
  const text = typeof raw.text === 'string' ? raw.text : '';
  cache.set(book.id, text);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value);
  return text;
}

export function libraryStats() {
  const i = getIndex();
  return {
    texts: i.count,
    pages: i.totalPages,
    words: i.totalWords,
    megabytes: +(i.totalBytes / 1048576).toFixed(1),
    subjects: Object.keys(i.subjects).length,
    generatedAt: i.generatedAt,
  };
}

export function listTexts({ subject, limit = 100, offset = 0 } = {}) {
  let books = getIndex().books;
  if (subject) {
    const s = String(subject).toLowerCase();
    books = books.filter(b => (b.subject || []).some(x => x.toLowerCase().includes(s)));
  }
  return {
    total: books.length,
    items: books.slice(offset, offset + limit).map(({ excerpt, ...rest }) => rest),
  };
}

export function listSubjects() {
  return Object.entries(getIndex().subjects).map(([name, ids]) => ({ name, texts: ids.length }));
}

export function getText(id, { includeBody = false, maxBody = 200000 } = {}) {
  const book = getIndex().byId.get(basename(String(id)).replace(/\.json$/, ''));
  if (!book) return { status: 'NOT_FOUND', id };
  const out = { status: 'AVAILABLE', ...book };
  if (includeBody) {
    const text = bodyOf(book);
    out.body = text.slice(0, maxBody);
    out.bodyTruncated = text.length > maxBody;
  }
  return out;
}

/** Metadata-only search: instant, runs off the index. */
export function searchCatalogue(query, { limit = 25 } = {}) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  const out = [];
  for (const b of getIndex().books) {
    const hay = `${b.title} ${b.creator} ${(b.subject || []).join(' ')} ${b.description}`.toLowerCase();
    if (hay.includes(q)) out.push({ id: b.id, title: b.title, creator: b.creator, subject: b.subject, pages: b.pages });
    if (out.length >= limit) break;
  }
  return out;
}

/** Full-text search across the corpus, streamed one text at a time. */
export function searchFullText(query, { limit = 20, snippetsPerText = 2, radius = 160, scanLimit = 253 } = {}) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return { query: '', matches: [], textsScanned: 0 };
  const matches = [];
  let scanned = 0;
  for (const book of getIndex().books) {
    if (matches.length >= limit || scanned >= scanLimit) break;
    scanned++;
    let text;
    try { text = bodyOf(book); } catch { continue; }
    const hay = text.toLowerCase();
    let from = hay.indexOf(q);
    if (from === -1) continue;
    const snippets = [];
    while (from !== -1 && snippets.length < snippetsPerText) {
      snippets.push(text.slice(Math.max(0, from - radius), from + q.length + radius).replace(/\s+/g, ' ').trim());
      from = hay.indexOf(q, from + q.length);
    }
    let occurrences = 0, at = hay.indexOf(q);
    while (at !== -1) { occurrences++; at = hay.indexOf(q, at + q.length); }
    matches.push({ id: book.id, title: book.title, creator: book.creator, pages: book.pages, occurrences, snippets });
  }
  matches.sort((a, b) => b.occurrences - a.occurrences);
  return { query: q, textsScanned: scanned, matches };
}
