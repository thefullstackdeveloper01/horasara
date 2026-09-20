/**
 * Runtime report completeness.
 *
 * This measures whether the report's required data blocks are actually
 * available at runtime. It is deliberately not a score for astrological
 * correctness, prediction quality, or scientific validity.
 */
const checks = [
  ['nakshatraDeepReport', 'Nakshatra Deep Report'],
  ['lkFull', 'Lal Kitab'],
  ['lalKitabTiming', 'Lal Kitab Timing'],
  ['numerology', 'Numerology'],
  ['avkahadaPhala', 'Avkahada / Panchanga Phala'],
  ['panchanga', 'Birth Panchanga'],
  ['dasha', 'Dasha'],
  ['shadbala', 'Shadbala'],
  ['ashtakavarga', 'Ashtakavarga'],
  ['kpChart', 'KP Chart'],
  ['vargas', 'Varga Charts'],
  ['predictionTruth', 'Prediction Engine'],
  ['remedySchedule', 'Remedy Schedule'],
  ['evidenceMatrix', 'Evidence Matrix'],
  ['multiSystemSynthesis', 'Multi-system Synthesis'],
  ['planetByPlanetReport', 'Planet-by-Planet Report'],
  ['ascendantDeepReport', 'Ascendant Deep Report'],
  ['moonSignDeepReport', 'Moon Sign Deep Report'],
];

function isAvailable(value) {
  if (value === undefined || value === null) return false;
  if (value && typeof value === 'object') {
    if (value.status === 'NOT_CALCULATED' || value.status === 'NOT_AVAILABLE') return false;
    if (value.error) return false;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function buildReportCompleteness(R) {
  const rows = checks.map(([key, name]) => ({
    key,
    name,
    status: isAvailable(R?.[key]) ? 'AVAILABLE' : 'MISSING',
  }));
  const available = rows.filter(x => x.status === 'AVAILABLE').length;
  const total = rows.length;
  const percent = Math.round((available / total) * 10000) / 100;
  return {
    status: available === total ? 'COMPLETE' : 'PARTIAL',
    overallPercent: percent,
    available,
    total,
    missing: rows.filter(x => x.status === 'MISSING').map(x => x.name),
    rows,
    methodology: 'Runtime availability of required report data blocks; not a measure of astrological correctness or prediction accuracy.',
  };
}
