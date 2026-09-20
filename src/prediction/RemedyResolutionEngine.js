/** Dataset-first remedy resolver. It never invents a remedy when the dataset has no match. */
export function resolveRemedies({ event, issues = [], datasets = [] } = {}) {
  const wanted = new Set([event, ...issues].filter(Boolean).map(String).map(x => x.toLowerCase()));
  const flat = datasets.flatMap(d => Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [d]).filter(Boolean);
  const matches = flat.filter(item => {
    const hay = JSON.stringify(item).toLowerCase();
    return [...wanted].some(w => hay.includes(w));
  });
  return Object.freeze({
    status: matches.length ? 'DATASET_MATCH' : 'NO_DATASET_MATCH',
    remedies: matches.slice(0, 30),
    warning: matches.length ? null : 'No dataset-backed remedy was found; do not fabricate a remedy.',
  });
}
