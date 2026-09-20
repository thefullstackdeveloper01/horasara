/**
 * Dataset-first knowledge facade.
 *
 * Kept for backward compatibility. The original implementation read and
 * stringified every JSON in the dataset root on each call, which meant holding
 * the whole ~330 MB corpus in memory. It now delegates to KnowledgeLibrary,
 * which works off a prebuilt index and a bounded read cache.
 */
import { basename } from 'node:path';
import { listTexts, getText, searchFullText, searchCatalogue } from './KnowledgeLibrary.js';
import { listDatasets, loadDatasetSync, resolveDataset } from '../data/datasetStore.js';

export function listKnowledgeDatasets() {
  return listDatasets().map(d => d.name).sort();
}

export function findKnowledge(topic, { limit = 25 } = {}) {
  const q = String(topic || '').toLowerCase().trim();
  if (!q) return [];
  const out = [];
  // Catalogue hits first — they are exact and instant.
  for (const hit of searchCatalogue(q, { limit })) {
    out.push({ dataset: `${hit.id}.json`, bucket: 'library', match: 'catalogue', title: hit.title, subject: hit.subject });
  }
  if (out.length >= limit) return out.slice(0, limit);
  for (const m of searchFullText(q, { limit: limit - out.length }).matches) {
    out.push({ dataset: `${m.id}.json`, bucket: 'library', match: 'topic-text', title: m.title, occurrences: m.occurrences, sample: m.snippets[0] || '' });
  }
  return out.slice(0, limit);
}

export function readKnowledgeDataset(file) {
  const name = basename(String(file || ''));
  const entry = resolveDataset(name);
  if (!entry) return { status: 'NOT_FOUND', file: name };
  if (entry.bucket === 'library') {
    const t = getText(name.replace(/\.json$/, ''), { includeBody: true });
    return t.status === 'AVAILABLE' ? { status: 'AVAILABLE', file: name, bucket: 'library', data: t } : t;
  }
  return { status: 'AVAILABLE', file: name, bucket: entry.bucket, data: loadDatasetSync(name) };
}

export { listTexts, getText, searchFullText, searchCatalogue };
