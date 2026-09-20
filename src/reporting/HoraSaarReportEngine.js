/**
 * Canonical HoraSaar customer-report composer.
 *
 * Design rule: this module never recalculates astronomy or astrology. It only
 * composes canonical calculation output into a complete, auditable document.
 * Every important conclusion is represented with source/calculation context,
 * uncertainty and methodology where available.
 */
import { MASTER_REPORT_OUTLINE } from './MasterReportOutline.js';
import { getCanonicalCapabilityRegistry } from '../application/services/CanonicalCapabilityRegistry.js';
import { buildScientificValidation } from '../quality/ScientificValidationSuite.js';
import { auditReportIntegrity } from './ReportIntegrityGate.js';
import { auditReportConsistency } from '../quality/v4/ReportConsistencyEngine.js';
import reportingData from '../../dataset/used/core/reporting-policy.json' with { type: 'json' };
import { buildReportCompleteness } from './ReportCompleteness.js';

const PLANETS = reportingData.planets;
const AREAS = reportingData.lifeAreas;
const arr = v => Array.isArray(v) ? v : [];
const safe = (v, fallback='Not available') => v === undefined || v === null || v === '' ? fallback : v;
const json = v => v == null ? 'Not available' : typeof v === 'string' ? v : JSON.stringify(v);
const value = v => (v && typeof v === 'object' && 'value' in v) ? v.value : v;

function planetRows(R) {
  const source = arr(R.planetaryMasterTable).length ? R.planetaryMasterTable : R.planets;
  return arr(source).map(x => ({
    planet: x.planet || x.name, sign: x.vedic?.sign || x.sign, longitude: x.vedic?.dms || x.dms,
    house: x.vedic?.house ?? x.house, nakshatra: x.vedic?.nakshatra || x.nakshatra,
    pada: x.vedic?.pada ?? x.pada, dignity: x.vedic?.dignity || x.dignity,
    nature: x.vedic?.functionalNature || x.functionalNature, motion: x.retrogradeLabel || x.motion,
    combust: x.combust, kpSubLord: x.kpSubLord, dispositor: x.vedic?.dispositor || x.dispositor,
  }));
}

function predictionRows(R) {
  return arr(R.predictionTruth?.predictions).map(x => ({
    event: x.event || x.area || x.name, area: x.area, status: x.status,
    evidenceScore: x.evidenceScore, probability: x.probability,
    probabilityStatus: x.probabilityStatus, timing: x.timing,
    methodology: x.methodology, components: x.components,
    uncertainty: x.uncertainty, explanation: x.explanation,
  }));
}

function timingRows(R) {
  const rows=[];
  for (const e of arr(R.predictionTruth?.events)) for (const w of arr(e.windows).slice(0, 24)) rows.push([
    e.event, w.start, w.end, w.durationDays, w.dasha || w.activationType || '—', w.evidenceScore ?? '—'
  ]);
  return rows;
}

function capabilities(R = null) {
  const rows = R?._v4CapabilityTruth?.rows?.length === 100 ? R._v4CapabilityTruth.rows : getCanonicalCapabilityRegistry();
  const counts = rows.reduce((a,r) => { a[r.status] = (a[r.status]||0)+1; return a; }, {});
  return { rows, counts };
}

function section(id, title, content = {}) { return { id, title, ...content }; }
function rowsFromObject(o) { return Object.entries(o || {}).map(([k,v]) => [k, json(v)]); }

function buildSections(R, elapsedMs, validation, capability) {
  const m=R.meta||{}, p=R.panchanga||{}, planets=planetRows(R), preds=predictionRows(R);
  const completeness = buildReportCompleteness(R);
  const life=AREAS.map(([id,title])=>[title, value(R.lifeAreaScores?.[id]) ?? 'Not calculated']);
  const sections=[];
  sections.push(section('master-report-outline','Master Report Organization — 80 Sections',{ blocks: MASTER_REPORT_OUTLINE.map(([n,title,items]) => ({ title: `${n}. ${title}`, body: items.join(' • ') })) }));
  sections.push(section('executive','Executive Summary',{rows:[
    ['Name',safe(m.name)],['Birth',`${safe(m.day)}/${safe(m.month)}/${safe(m.year)} ${safe(m.hour,'00')}:${safe(m.min,'00')}:${safe(m.sec,'00')}`],
    ['Place',safe(m.place)],['Lagna',`${safe(R.lagna?.sign)} ${safe(R.lagna?.dms)}`],['Moon Sign',safe(p.moonSign)],
    ['Nakshatra',`${safe(p.nakshatra?.name || p.nakshatra)} / Pada ${safe(p.nakshatra?.pada)}`],
    ['Current Dasha',json(R.dasha?.current)],['Calculation fingerprint',safe(R.calculationAuditFinal?.input?.fingerprint || R.calculationAuditFinal?.result?.fingerprint)],
    ['Assurance',validation.calculation.passed?'DETERMINISTIC INVARIANTS PASSED':'CALCULATION VALIDATION DEGRADED'],
  ]}));
  sections.push(section('calculation-audit','Calculation Audit — What Was Actually Calculated',{rows:[
    ['Ephemeris',json(R.ephemerisProvider)],['Ayanamsa',json(R.ayanamsa)],['House system',safe(m.houseSystem)],['Node mode',safe(m.nodeMode)],
    ['Julian Day',safe(m.JD)],['Delta-T',safe(m.deltaT)],['Calculation audit',json(R.calculationAuditFinal)],['Runtime',`${elapsedMs} ms`],
  ]}));
  sections.push(section('basic-details','Basic Details & Panchanga at Birth',{rows:[
    ['Weekday',safe(m.weekday)],['Tithi',json(p.tithi)],['Vara',json(p.vara)],['Nakshatra',json(p.nakshatra)],['Yoga',json(p.yoga)],['Karana',json(p.karana)],
    ['Sunrise',safe(p.sunrise)],['Sunset',safe(p.sunset)],['Ayanamsa',json(R.ayanamsa)],['Lagna',json(R.lagna)],['Birth facts',json(R.birthFacts)],
  ]}));
  sections.push(section('favourable','Ghatak & Favourable Indicators',{rows:[['Ghatak',json(R.ghatak)],['Favourable',json(R.favourable)]]}));
  sections.push(section('planetary-position','Planetary Position — Master Table',{table:{headers:['Planet','Sign','Longitude','House','Nakshatra','Pada','Dignity','Nature','Motion','KP Sub'],rows:planets.map(x=>[x.planet,x.sign,x.longitude,x.house,x.nakshatra,x.pada,x.dignity,x.nature,x.motion,x.kpSubLord])}}));
  sections.push(section('charts','Rashi / House Charts',{pre:[safe(R.asciiCharts?.northIndian),safe(R.asciiCharts?.southIndian)]}));
  sections.push(section('houses','Bhava / House Analysis',{table:{headers:['House','Sign','Planets','Lord','Interpretation'],rows:arr(R.houses).map(h=>[h.house,h.sign,arr(h.planets).join(', '),h.lord,json(h.phala||h.status)])}}));
  sections.push(section('chalit','Bhava Chalit & Bhava Madhya',{rows:rowsFromObject({table:R.chalitTable,aspects:R.bhavaMadhyaAspects})}));
  sections.push(section('lagna-deep','Ascendant / Lagna Deep Analysis',{rows:rowsFromObject(R.ascendantDeepReport)}));
  sections.push(section('moon-deep','Moon Sign Deep Analysis',{rows:rowsFromObject(R.moonSignDeepReport)}));
  sections.push(section('nakshatra-deep','Janma Nakshatra Deep Analysis',{rows:rowsFromObject(R.nakshatraDeepReport)}));
  sections.push(section('planet-by-planet','Planet-by-Planet Interpretation',{blocks:arr(R.planetByPlanetReport).map(x=>({title:safe(x.planet||x.title),body:json(x)}))}));
  sections.push(section('bhava-phala','Bhava Phala — House Significations',{table:{headers:['House','Status','Method','Interpretation'],rows:arr(R.bhavaPhala?.rows).map(x=>[x.house,x.status,x.methodology,json(x.interpretation||x.phala||x)])}}));
  sections.push(section('yogas','Yogas & Doshas',{blocks:[...arr(R.yogas).map(x=>({title:`Yoga: ${safe(x.name||x.id)}`,body:json(x)})),...Object.entries(R.doshas||{}).map(([k,v])=>({title:`Dosha: ${k}`,body:json(v)}))]}));
  sections.push(section('strength','Strength — Shadbala, Bhavabala, Vimshopaka',{table:{headers:['Planet','Shadbala','Bhavabala','Vimshopaka'],rows:PLANETS.map(p=>[p,json(R.shadbala?.[p]),json(R.bhavaBala?.[p]),json(R.vimshopaka?.[p])])}}));
  sections.push(section('ashtakavarga','Ashtakavarga — Sarva & Individual',{rows:[['Sarva',json(R.ashtakavarga?.sarva)],['Sarva Total',json(R.ashtakavarga?.sarvaTotal)],['House Strength',json(R.ashtakavarga?.houseStrength)],['Shodhana',json(R.ashtakavarga?.shodhana)],['Prasthara',json(R.prastharashtakavarga)]]}));
  sections.push(section('vargas','Shodashvarga & High-Sensitivity Divisional Charts',{table:{headers:['Varga','Calculated result'],rows:Object.entries(R.vargas||{}).map(([k,v])=>[k,json(v)])}}));
  sections.push(section('dasha','Dasha — Vimshottari and Other Systems',{rows:[['Balance',json(R.dashaBalance||R.dasha?.balance)],['Current',json(R.dasha?.current)],['Vimshottari',json(R.dasha?.timeline)],['Yogini',json(R.dasha?.yogini)],['Chara',json(R.dasha?.chara)],['Ashtottari',json(R.dasha?.ashtottari)],['Kalachakra',json(R.dasha?.kalachakra)],['Complete suite',json(R.dasha?.completeSuite)]]}));
  sections.push(section('transits','Transit / Gochar & Timing',{rows:[['Current transit',json(R.transitNow||R.gochar)],['Sade Sati',json(R.sadeSati)],['Next ingress',json(R.nextIngress)],['Dasha + transit',json(R.dashaTransit)]]}));
  sections.push(section('prediction','Prediction Engine — Promise → Activation → Trigger → Confirmation → Contradiction → Timing → Outcome',{blocks:preds.map(x=>({title:`${x.event} [${x.status}]`,body:json(x)}))}));
  sections.push(section('timing','Event Timing Report',{table:{headers:['Event','Start','End','Days','Activation','Evidence'],rows:timingRows(R)}}));
  sections.push(section('life-areas','Life-Area Synthesis',{table:{headers:['Area','Calculated value'],rows:life}}));
  sections.push(section('key-points','Key Points For Your Kundli',{rows:[['Insights',json(R.insights)],['Life events',json(R.lifeEvents)],['Five-year action plan',json(R.fiveYearActionPlan)],['Prediction timeline',json(R.unifiedPrediction?.predictionTimeline)]]}));
  sections.push(section('kp-jaimini','KP & Jaimini',{rows:[['KP methodology',json(R.kpMethodology)],['KP chart',json(R.kpChart)],['KP cusp aspects',json(R.kpCuspAspects)],['Jaimini advanced',json(R.jaiminiAdvanced)],['Karakamsha',json(R.karakamsha)],['Arudhas',json(R.arudhas)]]}));
  sections.push(section('tajika','Tajika / Varshaphala',{rows:[['Current year',json(R.varshaphalCurrentYear)],['Table',json(R.varshaphalTable)],['Annual chart',json(R.varshaphal)],['Mudda Dasha / Sahams',json(R.varshaphalCurrentYear?.muddaDasha||R.varshaphalCurrentYear?.sahams)]]}));
  sections.push(section('lalkitab','Lal Kitab — Full Analysis',{rows:[
    ['Status',safe(R.lkFull?.status,'AVAILABLE')],
    ['Planetary-house analysis',json(R.lkFull?.planets || R.lkFull?.planetaryHouseAnalysis)],
    ['Rin / Karmic Debts',json(R.lkFull?.debts)],
    ['Conjunctions',json(R.lkFull?.conjunctions)],
    ['Pakka Ghar',json(R.lkFull?.pakka_ghar)],
    ['Summary',json(R.lkFull?.summary)],
    ['35-Year Timing',json(R.lalKitabTiming?.cycle35)],
    ['Annual Houses',json(R.lalKitabTiming?.annualHouses)],
    ['Grahphal',json(R.lalKitabTiming?.grahphal)],
    ['Remedies',json(R.lalKitabRemedies)],
  ]}));
  sections.push(section('avkahada','Avkahada / Panchanga Phala — Full',{table:{headers:['Component','Value','Classical Meaning','Behaviour / Strengths','Practical Interpretation'],rows:arr(R.avkahadaPhala).map(x=>[x.component,x.value,json(x.classicalMeaning || x.personalityEffect),json(x.behaviouralTendencies || x.strengths || x.challenges),json(x.practicalInterpretation)])}}));
  sections.push(section('prashna-sb','Prashna / Sarvatobhadra',{rows:[['Prashna',json(R.prashna)],['Sarvatobhadra',json(R.sarvatobhadra)]]}));
  sections.push(section('numerology','Numerology — Full Analysis',{rows:[
    ['Name',safe(R.numerology?.name)],['DOB',safe(R.numerology?.dob)],
    ['Driver / Mulank',json(R.numerology?.numbers?.driver)],
    ['Life Path / Life Number',json(R.numerology?.numbers?.lifePath)],
    ['Destiny / Bhagyank',json(R.numerology?.numbers?.destiny)],
    ['Soul Urge',json(R.numerology?.numbers?.soulUrge)],
    ['Personality',json(R.numerology?.numbers?.personality)],
    ['Birthday Number',json(R.numerology?.numbers?.birthday)],
    ['Cheiro Destiny',json(R.numerology?.cheiro)],
    ['Challenge',json(R.numerology?.challenge)],
    ['Master Number',json(R.numerology?.isMasterNumber)],
    ['Lucky Numbers',json(R.numerology?.luckyNumbers)],
  ]}));
  sections.push(section('western','Western / Tropical System',{rows:[['Chart',json(R.westernChart)],['Aspects',json(R.westernAspects)]]}));
  sections.push(section('muhurta-vastu','Muhurta / Panchanga / Vastu',{rows:[['Panchanga',json(R.panchanga)],['Muhurta',json(R.muhurta)],['Vastu',json(R.vastuGuide)]]}));
  sections.push(section('evidence','Evidence Matrix & Contradictions',{rows:[['Evidence Matrix',json(R.evidenceMatrix)],['Multi-system synthesis',json(R.multiSystemSynthesis)],['Confidence',json(R.confidence)],['Prediction audit',json(R.predictionTruth?.audit)]]}));
  sections.push(section('remedies','Remedies & Action Plan',{blocks:[
    {title:'Event remedies',body:json(R.eventRemedies)},{title:'Graha Shanti',body:json(R.grahaShanti)},{title:'Gemstones',body:json(R.gemstoneRecommendations)},
    {title:'Rudraksha',body:json(R.rudrakshaRecommendations)},{title:'Yantra',body:json(R.yantraRecommendations)},{title:'Jadi',body:json(R.jadiRemedies)},
    {title:'Remedy schedule',body:json(R.remedySchedule)},{title:'Ishta Devata',body:json(R.ishtaDevata)},
  ]}));
  sections.push(section('provenance','Rule Provenance, Methodology & Reproducibility',{rows:[
    ['Methodology',safe(m.methodology,'PARASHARI')],['Rule provenance',json(R.ruleProvenance)],['Calculation manifest',json(R.metadata?.manifest)],
    ['Input fingerprint',safe(R.calculationAuditFinal?.input?.fingerprint)],['Result fingerprint',safe(R.calculationAuditFinal?.result?.fingerprint)],
    ['Dataset registry',json(R.datasetRegistry)],['Capability registry release',json(capability.rows[0]?.release||R.liveCapabilityAudit?.release)],
  ]}));
  sections.push(section('report-completeness','Overall Report Completeness — Runtime Truth',{rows:[
    ['Overall completeness',`${completeness.overallPercent}%`],
    ['Status',completeness.status],
    ['Available blocks',`${completeness.available}/${completeness.total}`],
    ['Missing blocks',completeness.missing.length ? completeness.missing.join(', ') : 'None'],
    ['Methodology',completeness.methodology],
  ],table:{headers:['Data Block','Status'],rows:completeness.rows.map(x=>[x.name,x.status])}}));
  sections.push(section('validation','Scientific & Empirical Validation',{rows:[
    ['Numerical validation',json(validation.calculation)],['Reference verification',json(validation.referenceVerification)],['Outcome validation',json(validation.empiricalValidation)],
    ['Scientific boundary',validation.statement],['Calibration',json(R.calibrationEngine||R.predictionTruth?.calibration)],
    ['Astronomy precision note',json(R._accuracy)],
  ]}));
  sections.push(section('capability-registry','Complete Capability Registry — Runtime Truth',{table:{headers:['ID','Capability','Status','Runtime','Verification'],rows:capability.rows.map(x=>[x.id,x.name,x.status,x.runtimeStatus||'STATIC',x.verification||'LEGACY'])}}));
  const completeSystemsSummary = Object.fromEntries(Object.entries(R.completeSystems?.systems || {}).map(([k,v]) => [k, {
    status:v?.status || v?.provenance?.status || 'AVAILABLE',
    variant:v?.variant || v?.methodology?.variantId || null,
    windowCount:v?.windowCount || null,
  }]));
  sections.push(section('v4-upgrade','V4 Upgrade / Remaining Gaps',{rows:[
    ['Capability counts',json(capability.counts)],
    ['Selected variant systems',json(completeSystemsSummary)],
    ['Varga variants',json({count:R.vargaVariants?.variants?.length||0,variants:R.vargaVariants?.variants?.map(x=>x.id)})],
    ['Rectification',json(R.rectification)],
    ['Runtime truth policy',safe(R._v4CapabilityTruth?.policy)],
  ]}));
  sections.push(section('qa','Final Report Quality Gate',{rows:[
    ['Integrity gate', 'PENDING_FINAL_RENDER'],['Calculation validation',validation.calculation.passed?'PASS':'DEGRADED'],['Prediction probability policy','Probability only when EMPIRICALLY_CALIBRATED'],
    ['No-fabrication rule','Unsupported/variant-dependent features remain explicitly labelled'],['Runtime',`${elapsedMs} ms`],
    ['Disclaimer','Jyotish interpretations are traditional/rule-based and are not presented as scientific proof or guaranteed outcomes.'],
  ]}));
  return sections;
}

export function buildHoraSaarReport(R, { elapsedMs=0, version='3.0' }={}) {
  const capability=capabilities(R);
  const validation=buildScientificValidation({result:R});
  const report={
    reportVersion:version, generatedAt:new Date().toISOString(),
    title:'HoraSaar — Authentic & Powerful Jyotish Calculation + Prediction Report',
    philosophy:'Calculation first; methodology explicit; evidence, timing, contradiction, uncertainty and provenance visible.',
    scientificBoundary:'Astronomical calculations are numerical and testable. Jyotish interpretations are traditional/rule-based interpretations and are not presented as scientific proof.',
    input:R.meta||{}, sections:buildSections(R,elapsedMs,validation,capability),
    predictions:predictionRows(R), capabilitySummary:capability.counts,
    completeness:buildReportCompleteness(R),
    capabilityRegistry:capability.rows, validation,
    v4: { capabilityTruth: R._v4CapabilityTruth ? {counts:R._v4CapabilityTruth.counts, remaining:R._v4CapabilityTruth.rows.filter(x=>x.status==='PARTIAL').map(x=>({id:x.id,name:x.name,gap:x.truth}))} : null, completeSystems:Object.fromEntries(Object.entries(R.completeSystems?.systems || {}).map(([k,v])=>[k,{status:v?.status||null,variant:v?.variant||v?.methodology?.variantId||null,windowCount:v?.windowCount||null}])), rectification:R.rectification || null },
    fingerprint:R.calculationAuditFinal?.input?.fingerprint||R.calculationAuditFinal?.result?.fingerprint||null,
    calculationTimeMs:elapsedMs,
  };
  const integrity=auditReportIntegrity(report);
  const consistency=auditReportConsistency(report,R);
  report.integrity=integrity;
  report.consistency=consistency;
  if (!integrity.pass) throw new Error(`Report integrity gate failed: ${integrity.errors.join('; ')}`);
  if (!consistency.pass) throw new Error(`Report consistency gate failed: ${consistency.errors.join('; ')}`);
  return Object.freeze(report);
}
