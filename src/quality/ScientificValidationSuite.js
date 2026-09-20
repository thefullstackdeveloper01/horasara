/**
 * Scientific/engineering validation is intentionally scoped to what code can
 * test: numerical invariants, reproducibility, independent references and
 * empirical outcome validation. It never labels Jyotish interpretation as
 * scientifically proven.
 */

const finite = x => Number.isFinite(Number(x));
const inRange = (x, lo, hi) => finite(x) && Number(x) >= lo && Number(x) <= hi;

export function validateCalculationSurface(result = {}) {
  const checks = [];
  const add = (id, passed, detail) => checks.push({ id, passed: Boolean(passed), detail });

  const planets = Array.isArray(result.planets) ? result.planets : [];
  const houses = Array.isArray(result.houses) ? result.houses : [];
  add('PLANET_COUNT', planets.length >= 9, `planetCount=${planets.length}`);
  add('HOUSE_COUNT', houses.length === 12, `houseCount=${houses.length}`);
  add('LONGITUDE_RANGE', planets.every(p => inRange(p.siderealLon ?? p.longitude, 0, 360)), 'all planetary longitudes in [0,360]');
  add('LATITUDE_RANGE', planets.every(p => !finite(p.latitude) || inRange(p.latitude, -90, 90)), 'all supplied latitudes in [-90,90]');
  add('NO_NAN', !JSON.stringify(result).match(/NaN|Infinity|-Infinity/), 'serialized result contains no NaN/Infinity tokens');
  add('DASHA_INTERVALS', validateDashaIntervals(result.dasha?.timeline || []), 'Dasha intervals are ordered and non-overlapping');
  add('FINGERPRINT', Boolean(result.calculationAuditFinal?.input?.fingerprint || result.calculationAuditFinal?.result?.fingerprint), 'calculation fingerprint present');

  return Object.freeze({ passed: checks.every(x => x.passed), checks });
}

function validateDashaIntervals(timeline) {
  if (!timeline.length) return true;
  for (let i = 0; i < timeline.length; i++) {
    const x = timeline[i];
    if (!finite(x.startJD) || !finite(x.endJD) || x.endJD < x.startJD) return false;
    if (i && timeline[i - 1].endJD > x.startJD + 1e-9) return false;
  }
  return true;
}

export function buildScientificValidation({ result, referenceChecks = [], outcomeValidation = null } = {}) {
  const calculation = validateCalculationSurface(result);
  const references = referenceChecks.map(x => ({ ...x, passed: x?.passed === true, independent: x?.independent === true }));
  const referenceVerified = references.length > 0 && references.every(x => x.passed && x.independent);
  const empirical = Boolean(outcomeValidation?.status === 'PASSED');
  return Object.freeze({
    calculation,
    referenceVerification: { passed: referenceVerified, checks: references },
    empiricalValidation: { passed: empirical, outcomeValidation: outcomeValidation || null },
    scientificProofOfAstrology: false,
    statement: empirical
      ? 'Empirical validation is reported only for the supplied labelled outcome dataset and its stated protocol.'
      : 'Astronomical/numerical calculations can be validated; astrological interpretations are reported as traditional or rule-based and are not treated as scientific proof.',
  });
}
