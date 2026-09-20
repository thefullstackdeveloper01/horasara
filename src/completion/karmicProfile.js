/** Rule-transparent karmic/dosha profile. */
export function buildKarmicProfile(result) {
  const doshas = Array.isArray(result.doshas) ? result.doshas : [];
  const names = doshas.map(x => String(x.name || x.type || '')).filter(Boolean);
  const find = terms => doshas.find(x => terms.some(t => String(x.name || x.type || '').toLowerCase().includes(t)));
  return {
    shrapit: find(['shrapit']) || null,
    guruChandal: find(['chandal','guru chandal']) || null,
    vishYoga: find(['vish yoga','visha yoga']) || null,
    nadiDosha: find(['nadi']) || null,
    mangalDosha: result.mangalDoshaDeep || find(['mangal','manglik']) || null,
    detected: names,
    methodology: 'Only detected geometric/rule evidence is reported; absence means no implemented rule matched, not a metaphysical certainty.'
  };
}
