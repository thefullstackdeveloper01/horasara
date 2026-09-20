/**
 * EVENT RULES — declarative, dataset-backed event definitions.
 * Behavioral predicates stay in code; event names, descriptions, lords,
 * confidence metadata and predicate parameters live in dataset/used/core/eventRules.json.
 */
import moduleData from '../../../dataset/used/core/eventRules.json' with { type: 'json' };

function planet(planets, name) {
  return (planets || []).find(p => p.name === name);
}

function matchesTest(planets, test) {
  if (test.type === 'anyHouse' && test.orRules) {
    return (test.planets || []).some(name => (test.houseIn || []).includes(planet(planets, name)?.house))
      || test.orRules.some(r => planet(planets, r.planet)?.house === r.house);
  }
  switch (test.type) {
    case 'anyHouse':
      return (test.planets || []).some(name => planet(planets, name)?.house === test.house);
    case 'dignityOrHouse': {
      const p = planet(planets, test.planet);
      return !!p && ((test.dignities || []).includes(p.dignity) || p.house === test.house);
    }
    case 'houseIn':
      return (test.houses || []).includes(planet(planets, test.planet)?.house);
    case 'dignityIn': {
      const p = planet(planets, test.planet);
      return !!p && (test.dignities || []).includes(p.dignity);
    }
    case 'anyHouseOrDignity':
      return (test.houseRules || []).some(r => planet(planets, r.planet)?.house === r.house)
        || (test.dignityRules || []).some(r => {
          const p = planet(planets, r.planet);
          return !!p && (r.dignities || []).includes(p.dignity);
        });
    case 'houseOrDignity': {
      const p = planet(planets, test.planet);
      return !!p && (p.house === test.house || (test.dignities || []).includes(p.dignity));
    }
    default:
      return false;
  }
}

function matchesRule(planets, rule) {
  return matchesTest(planets, rule.test || {});
}

export const EVENT_RULES = moduleData.rules.map(rule => ({
  ...rule,
  desc: rule.description,
  conf: rule.confidence,
  test: planets => matchesRule(planets, rule),
}));

export default EVENT_RULES;
