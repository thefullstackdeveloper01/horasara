/** Coherent career/business scoring; all components are auditable. */
export function buildBusinessVerdict(result) {
  const houses = result.houses || [];
  const h10 = houses.find(h=>h.number===10), h7 = houses.find(h=>h.number===7), h11 = houses.find(h=>h.number===11), h6 = houses.find(h=>h.number===6);
  const av = result.ashtakavarga?.houseStrength || [];
  const avScore = n => Math.min(10, Math.max(0, Number(av.find(x=>x.house===n)?.rawPoints ?? 24) / 3.6));
  const strength = p => Number(result.shadbala?.[p]?.rupas ?? result.shadbala?.[p]?.shadBalaRupas ?? 0);
  const business = Math.min(10, 2 + (h7?.lord ? 1 : 0) + (h10?.lord ? 1 : 0) + (h11?.lord ? 1 : 0) + avScore(7)*0.2 + avScore(10)*0.2 + avScore(11)*0.2 + Math.min(1.5,strength('Mercury')/300) + Math.min(1.5,strength('Mars')/300));
  const job = Math.min(10, 2 + (h6?.lord ? 1.2 : 0) + (h10?.lord ? 1.5 : 0) + avScore(6)*0.25 + avScore(10)*0.3 + Math.min(1.5,strength('Saturn')/300));
  const verdict = business > job + 0.6 ? 'BUSINESS_FAVORED' : job > business + 0.6 ? 'EMPLOYMENT_FAVORED' : 'DUAL_PATH';
  const niche = ['technology','consulting','analytics','communications','trading/investment themes','operations','education/advisory'];
  return { businessScore:+business.toFixed(2), employmentScore:+job.toFixed(2), verdict, confidence:+(Math.min(0.95,0.55+Math.abs(business-job)*0.08)).toFixed(2), evidence:{house7:h7?.lord||null,house10:h10?.lord||null,house11:h11?.lord||null,house6:h6?.lord||null}, subSectorThemes:niche, partnership:{recommendedStructure: verdict==='BUSINESS_FAVORED' ? 'defined roles + written governance + financial controls' : 'use employment/contract structure unless independent-business evidence strengthens'}, stockSectorThemes:niche.slice(0,5)};
}
