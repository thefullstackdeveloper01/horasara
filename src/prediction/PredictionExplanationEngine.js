/** Converts machine evidence into plain-language, traceable explanations. */
export function explainFactor({ planet, position, house, sign, cause, effect, solution } = {}) {
  const p = planet || 'This planetary factor';
  const where = [sign && `in ${sign}`, house != null && `house ${house}`, position != null && `at ${Number(position).toFixed(2)}°`].filter(Boolean).join(' ');
  return Object.freeze({
    issue: cause ? `${p} ${where} is associated with the configured issue.` : 'No issue was supplied.',
    cause: cause || 'Cause is not available from the supplied evidence.',
    effect: effect || 'Effect must be supported by a configured rule.',
    solution: solution || 'No remedy/action is configured for this evidence.',
    statement: `${p} ${where} is the calculated factor; ${cause || 'no causal rule'}; therefore ${solution || 'no configured solution'}.`,
  });
}

export function buildPredictionExplanation({ event, factors = [], timing = null, methodology = 'PARASHARI' } = {}) {
  const supported = factors.filter(f => f && f.supported !== false);
  const conflicting = factors.filter(f => f && f.supported === false);
  const lines = [
    `${event || 'Event'} — method: ${methodology}.`,
    supported.length ? `Supporting factors: ${supported.length}.` : 'No supporting factors were supplied.',
    conflicting.length ? `Conflicting factors: ${conflicting.length}.` : 'No explicit conflicting factors were supplied.',
    timing ? `Timing window: ${timing.start || 'unknown'} to ${timing.end || 'unknown'}.` : 'No timing window is available.',
  ];
  for (const f of supported.slice(0, 12)) if (f.explanation) lines.push(f.explanation.statement || String(f.explanation));
  return Object.freeze({ summary: lines.join(' '), factors: supported, conflicts: conflicting });
}
