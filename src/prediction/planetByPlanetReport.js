/**
 * PLANET-BY-PLANET FULL REPORT — Section 10
 * =============================================
 * One dedicated report per classical graha (Sun..Saturn, Rahu, Ketu).
 * Every field is assembled from data this chart's own engine already
 * computed elsewhere (R.planetaryMasterTable, R.aspects, R.yogas,
 * R.doshas, R.dasha, R.ashtakavarga, R.shadbala, R.vargas) — this module
 * does no new astronomy, it consolidates. Fields with no reliable source
 * in this engine (divisional-strength-per-varga beyond D9/D10, and
 * transit-activation without a specific target date) are honestly marked
 * NOT CALCULATED with a reason, per the "never fabricate" rule.
 */
function na(reason) {
  return { status: 'NOT CALCULATED', reason };
}

import moduleData from '../../dataset/used/core/planetByPlanetReport.json' with { type: 'json' };
const CLASSICAL_PLANETS = moduleData.CLASSICAL_PLANETS;

/**
 * @param {object} R - the calculated chart object
 * @returns {Array<object>} one full report per classical planet
 */
export function buildPlanetByPlanetReport(R) {
  const masterRows = R.planetaryMasterTable || [];
  const aspects = R.aspects || [];
  const houseEntry = (num) => R.houses?.[String(num - 1)];

  return CLASSICAL_PLANETS.map(name => {
    const p = (R.planets || []).find(pl => pl.name === name);
    const master = masterRows.find(m => m.planet === name);
    if (!p || !master) {
      return { planet: name, status: 'NOT CALCULATED', reason: 'Planet position unavailable in this chart (check node/outer-planet configuration).' };
    }

    const house = p.house;
    const houseData = houseEntry(house);
    const conjunctions = (R.planets || []).filter(o => o.name !== name && o.house === house).map(o => o.name);
    const aspectsReceived = aspects.filter(a => a.to === name).map(a => `${a.from} → ${a.aspectType}`);
    const aspectsGiven = aspects.filter(a => a.from === name).map(a => `${a.aspectType} → ${a.to} (H${a.toHouse})`);

    const relevantYogas = (R.yogas || []).filter(y => (y.planets || '').split(',').map(s => s.trim()).includes(name))
      .map(y => ({ name: y.name, type: y.type, strength: y.strength }));

    const relevantDoshas = [];
    if (R.doshas?.mangal?.hasDosha && name === 'Mars') relevantDoshas.push('Mangal Dosha (this planet is the Mangal Dosha significator)');
    if (R.doshas?.kalsarpa?.hasDosha && ['Rahu', 'Ketu'].includes(name)) relevantDoshas.push(`Kalsarpa Dosha (${R.doshas.kalsarpa.type}) — this planet forms the containing axis`);
    if (R.doshas?.grahan?.doshas?.some(d => d.body === name)) relevantDoshas.push('Grahan (eclipse) Dosha — this planet is within eclipse-causing proximity to a node');

    const dashaActivation = [];
    if (R.dasha?.current?.mahadasha === name) dashaActivation.push('Currently running as Mahadasha lord');
    if (R.dasha?.current?.antardasha === name) dashaActivation.push('Currently running as Antardasha lord');
    if (R.dasha?.current?.pratyantar === name) dashaActivation.push('Currently running as Pratyantardasha lord');

    const ashtakavargaContribution = R.ashtakavarga?.sarva?.[house - 1] ?? na('Ashtakavarga bindu count for this planet\'s house unavailable');

    return {
      planet: name,
      sign: p.sign,
      degree: p.dms,
      nakshatra: p.nakshatra,
      pada: p.pada,
      house,
      houseLordship: Object.entries(R.houses || {}).filter(([, h]) => h.lord === name).map(([, h]) => h.number),
      signLord: master.vedic.signLord,
      naturalRelationship: master.naturalRelationship,
      functionalRelationship: master.vedic.functionalNature,
      dignity: master.vedic.dignity,
      retrograde: master.retrogradeLabel,
      combustion: master.combust,
      avastha: R.grahaAvastha?.[name] ?? na('Avastha calculation not available for this planet in this engine build'),
      dispositor: master.vedic.dispositor,
      nakshatraLord: master.vedic.nakshatraLord,
      conjunctions: conjunctions.length ? conjunctions : ['None'],
      aspectsReceived: aspectsReceived.length ? aspectsReceived : ['None'],
      aspectsGiven: aspectsGiven.length ? aspectsGiven : ['None'],
      divisionalStrength: {
        D9: R.vargas?.[name]?.D9 ? `${R.vargas[name].D9.sign} (${R.vargas[name].D9.lord})` : na('D9 placement unavailable'),
        D10: R.vargas?.[name]?.D10 ? `${R.vargas[name].D10.sign} (${R.vargas[name].D10.lord})` : na('D10 placement unavailable'),
        note: 'Full 16-Varga strength table is available separately in the Shodashvarga section; only D9/D10 are cross-referenced here to avoid duplicating that table.',
      },
      shadbala: R.shadbala?.[name]
        ? { totalRupas: R.shadbala[name].rupas, requiredRupas: R.shadbala[name].required, ratio: R.shadbala[name].ratio, grade: R.shadbala[name].grade }
        : na('Shadbala is not classically calculated for Rahu/Ketu (shadow points have no physical Bala)'),
      ashtakavargaContribution,
      relevantYogas: relevantYogas.length ? relevantYogas : ['None detected'],
      relevantDoshas: relevantDoshas.length ? relevantDoshas : ['None'],
      dashaActivation: dashaActivation.length ? dashaActivation : ['Not currently active in Mahadasha/Antardasha/Pratyantardasha'],
      transitActivation: na('Transit activation requires a specific target date — see the "Today\'s Analysis" / Monthly Forecast sections, which compute this for the current date rather than duplicating it generically here'),
      lifeAreaImpact: houseData ? `Primary house: ${house} (${houseData.sign}) — see Bhava Phala section for House ${house}'s full life-area meaning` : na('House data unavailable'),
      classicalInterpretation: master.vedic.functionalNature
        ? `${name} is a ${master.vedic.functionalNature} for this Lagna (${master.vedic.functionalNature === 'Yogakaraka' ? 'both a Kendra and Trikona lord — the strongest classical benefic status' : 'per BPHS Ch.34 lordship rules'}), placed in ${master.vedic.dignity} dignity.`
        : na('Functional nature unavailable'),
      modernSynthesizedInterpretation: `Combining house (${house}), dignity (${master.vedic.dignity}), and Shadbala strength${R.shadbala?.[name] ? ` (${R.shadbala[name].ratio?.toFixed(2)}x required)` : ''}, this placement's practical weight in the chart is ${
        R.shadbala?.[name]?.ratio >= 1.25 ? 'strong and reliably expressed' : R.shadbala?.[name]?.ratio >= 1 ? 'adequately supported' : R.shadbala?.[name]?.ratio !== undefined ? 'under-supported and may need Dasha timing or remedial support to express fully' : 'not quantifiable via Shadbala for this body'
      }.`,
      strength: R.shadbala?.[name] ? (R.shadbala[name].ratio >= 1 ? 'Above classical minimum requirement' : 'Below classical minimum requirement') : na('Shadbala unavailable for this body'),
      weakness: master.combust ? 'Combust — classically weakened by proximity to the Sun' : (master.vedic.debilitated ? 'Debilitated sign placement' : 'No major classical weakness flag (combustion/debilitation) detected'),
      timing: dashaActivation.length ? `Currently active via ${dashaActivation.join(', ').toLowerCase()} — see Vimshottari Dasha section for exact dates.` : 'Not in an active Dasha period for this planet — see Vimshottari Dasha section for when it next activates.',
      confidence: R.shadbala?.[name] ? "Evidence-based (uses this chart's calculated Shadbala, dignity, and house data; not a calibrated probability)" : 'Evidence-based (dignity/house data present, but no Shadbala for this body)',
      source: 'Consolidated from this chart\'s own Planetary Master Table, Aspects, Yogas, Doshas, Dasha, Shadbala, and Ashtakavarga — no separate recalculation.',
    };
  });
}

export default { buildPlanetByPlanetReport };
