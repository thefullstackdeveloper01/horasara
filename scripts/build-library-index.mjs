/**
 * Builds dataset/used/library/_index.json — a compact, load-once catalogue of the
 * classical text corpus so the app never has to read 330 MB to answer a lookup.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'dataset/used/library';
const asList = v => Array.isArray(v) ? v.filter(x => typeof x === 'string')
  : typeof v === 'string' ? [v] : [];
const asText = v => typeof v === 'string' ? v : '';

const books = [];
for (const file of readdirSync(DIR).filter(f => f.endsWith('.json') && f !== '_index.json').sort()) {
  const bytes = statSync(join(DIR, file)).size;
  let d;
  try { d = JSON.parse(readFileSync(join(DIR, file), 'utf8')); }
  catch { books.push({ file, bytes, valid: false }); continue; }
  const text = asText(d.text);
  books.push({
    file,
    id: file.replace(/\.json$/, ''),
    title: asText(d.title) || file.replace(/\.json$/, '').replace(/_/g, ' '),
    creator: asText(d.creator),
    date: asText(d.date),
    description: asText(d.description).slice(0, 400),
    subject: asList(d.subject),
    pages: Number(d.total_pages) || 0,
    words: Number(d.total_words) || 0,
    bytes,
    valid: true,
    // first ~300 chars of body, for previews
    excerpt: text.replace(/\s+/g, ' ').trim().slice(0, 300),
  });
}

const subjects = {};
for (const b of books) for (const s of b.subject || []) {
  const k = s.trim(); if (!k) continue;
  (subjects[k] ||= []).push(b.id);
}

const index = {
  generatedAt: new Date().toISOString(),
  count: books.length,
  totalPages: books.reduce((s, b) => s + (b.pages || 0), 0),
  totalWords: books.reduce((s, b) => s + (b.words || 0), 0),
  totalBytes: books.reduce((s, b) => s + b.bytes, 0),
  subjects: Object.fromEntries(Object.entries(subjects).sort((a, b) => b[1].length - a[1].length)),
  books,
};

writeFileSync(join(DIR, '_index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`library index: ${index.count} texts, ${index.totalPages.toLocaleString()} pages, ${index.totalWords.toLocaleString()} words, ${(index.totalBytes / 1048576).toFixed(1)} MB`);
console.log(`distinct subjects: ${Object.keys(subjects).length}`);
