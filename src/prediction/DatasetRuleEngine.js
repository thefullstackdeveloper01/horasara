/**
 * DatasetRuleEngine — generic adapter for future rule catalogs.
 * JSON records are data, not executable JavaScript. A rule is applied only
 * when its declared conditions are satisfied by the supplied calculated facts.
 */
const get = (obj, path) => String(path).split('.').reduce((v, k) => v == null ? undefined : v[k], obj);

function conditionMatches(condition, facts) {
  if (!condition || typeof condition !== 'object') return false;
  const value = get(facts, condition.path);
  if (condition.exists === true) return value !== undefined && value !== null;
  if (condition.equals !== undefined) return value === condition.equals;
  if (condition.in) return Array.isArray(condition.in) && condition.in.includes(value);
  if (condition.gte !== undefined) return Number(value) >= Number(condition.gte);
  if (condition.lte !== undefined) return Number(value) <= Number(condition.lte);
  return false;
}

export function evaluateDatasetRules(rules = [], facts = {}) {
  return rules.filter(Boolean).map(rule => {
    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
    const matched = conditions.every(c => conditionMatches(c, facts));
    return Object.freeze({
      ruleId: rule.ruleId || rule.id || null,
      matched,
      provenance: rule.provenance || rule.source || null,
      explanation: matched ? (rule.explanation || rule.effect || null) : null,
      exceptions: rule.exceptions || [],
      raw: rule,
    });
  });
}
