/** Explicit capability inventory derived from calculated result objects. */
export function buildClassicalCoverage(result) {
  return { BPHS:!!result.bphsPredictions, KP:!!result.kpChart, Jaimini:!!result.jaiminiAdvanced, Tajika:!!result.varshaphalTable, Shadbala:!!result.shadbala, Ashtakavarga:!!result.ashtakavarga, Prasthara:!!result.prastharashtakavarga, BhavaMadhya:!!result.bhavaMadhyaAspects, Dasha:!!result.dasha, Vargas:!!result.vargas, LalKitab:!!result.lkFull, Muhurta:!!result.remedySchedule, Evidence:!!result.evidenceMatrix, ContradictionResolution:!!result.multiSystemSynthesis, ExactForecast:!!result.forecastCalendar };
}
