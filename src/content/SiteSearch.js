import { listSitePages } from './SitePages.js';
import { listArticles } from './BlogLibrary.js';

/**
 * Site-wide search.
 *
 * The reference library already has its own index, so this searches the things
 * that previously had none — administrative pages, articles and calculators —
 * and merges the reference matches in, keeping every group visible rather than
 * letting the much larger reference corpus bury the four page hits a user was
 * probably looking for.
 */

const tokenize = (query) => String(query || '')
  .toLowerCase()
  .split(/[^a-z0-9\u0900-\u097F]+/)
  .filter(t => t.length > 1)
  .slice(0, 8);

/** Weighted scoring: a title hit matters far more than a body hit. */
function score(tokens, { title = '', description = '', body = '', keywords = '' }) {
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const b = body.toLowerCase();
  const k = keywords.toLowerCase();
  let total = 0;
  for (const token of tokens) {
    if (t === token) total += 40;
    else if (t.startsWith(token)) total += 22;
    else if (t.includes(token)) total += 14;
    if (k.includes(token)) total += 8;
    if (d.includes(token)) total += 5;
    if (b.includes(token)) total += 2;
  }
  // Require every token to appear somewhere, so a two-word query does not match
  // on the commoner word alone.
  const haystack = `${t} ${d} ${b} ${k}`;
  if (!tokens.every(token => haystack.includes(token))) total = Math.floor(total / 4);
  return total;
}

function searchPages(tokens) {
  return listSitePages()
    .map(page => ({
      type: 'page',
      title: page.title,
      description: page.description,
      href: page.path,
      group: page.group,
      score: score(tokens, { title: page.title, description: page.description, keywords: `${page.nav} ${page.group} ${page.lede || ''}` }),
    }))
    .filter(r => r.score > 0);
}

function searchArticles(tokens) {
  return listArticles()
    .map(article => ({
      type: 'article',
      title: article.title,
      description: article.description,
      href: `/blog/${article.slug}`,
      group: 'blog',
      score: score(tokens, { title: article.title, description: article.description, keywords: `${article.tag} ${article.lede || ''}` }),
    }))
    .filter(r => r.score > 0);
}

async function searchCalculators(tokens) {
  try {
    const { buildCalculatorAudit } = await import('../calculators/CalculatorRegistry.js');
    const audit = buildCalculatorAudit();
    return (audit.calculators || [])
      .map(calc => ({
        type: 'calculator',
        title: calc.name || calc.id,
        description: calc.description || `${calc.category || 'Tool'} \u00B7 ${calc.scientificStatus || 'Calculation'}`,
        href: `/tools/${calc.id}`,
        group: 'calculators',
        score: score(tokens, { title: calc.name || calc.id, description: calc.description || '', keywords: `${calc.id} ${calc.category || ''}` }),
      }))
      .filter(r => r.score > 0);
  } catch { return []; }
}

async function searchReferenceLibrary(query, limit) {
  try {
    const { searchReference } = await import('../knowledge/ReferenceLibrary.js');
    const found = searchReference(query, { limit });
    const rows = Array.isArray(found) ? found : (found?.results || found?.matches || []);
    return rows.map(row => ({
      type: 'reference',
      title: row.name || row.title || row.id || 'Reference entry',
      description: row.description || row.group || row.topic || 'Reference library entry',
      href: row.href || row.path || '/knowledge',
      group: 'knowledge',
      score: 10,
    }));
  } catch { return []; }
}

/**
 * @returns {Promise<{query:string, total:number, groups:Array}>}
 */
export async function searchSite(query, { limit = 40 } = {}) {
  const trimmed = String(query || '').trim().slice(0, 120);
  const tokens = tokenize(trimmed);
  if (!tokens.length) return { query: trimmed, total: 0, groups: [] };

  const [calculators, reference] = await Promise.all([
    searchCalculators(tokens),
    searchReferenceLibrary(trimmed, Math.min(limit, 20)),
  ]);

  const byGroup = [
    { id: 'pages', title: 'Pages', results: searchPages(tokens) },
    { id: 'articles', title: 'Articles', results: searchArticles(tokens) },
    { id: 'calculators', title: 'Calculators & tools', results: calculators },
    { id: 'reference', title: 'Reference library', results: reference },
  ]
    .map(group => ({
      ...group,
      results: group.results.sort((a, b) => b.score - a.score).slice(0, limit),
    }))
    .filter(group => group.results.length);

  return {
    query: trimmed,
    total: byGroup.reduce((sum, g) => sum + g.results.length, 0),
    groups: byGroup,
  };
}
