/** Calendar event projection from existing exact forecast rows. */
export function buildForecastCalendar(result) {
  const source = result.exactEventForecast || result.extendedReport?.futureForecast || result.extendedReport?.monthlyForecast || [];
  const rows = Array.isArray(source) ? source : [];
  return { status:'AVAILABLE', events: rows.map((row,i) => ({ id:`EV-${String(i+1).padStart(4,'0')}`, date:row.date || row.startDate || row.triggerDate || null, endDate:row.endDate || null, event:row.event || row.title || row.description || 'Transit/Dasha activation', evidence:row.evidence || row.triggers || null, confidence:row.confidence ?? null, source:'exact-event-forecast' })).filter(x=>x.date || x.event) };
}
