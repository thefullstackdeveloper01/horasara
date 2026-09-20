/**
 * Basic customer report.
 *
 * Presentation layer over the canonical calculation result. It deliberately
 * does not invent values. Complex engine objects are normalized into readable
 * customer-facing text so CLI/PDF never leak "[object Object]" or raw JSON.
 */
import { SIGN_LORDS } from '../astronomy/constants.js';

const PLANETS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu','Uranus','Neptune','Pluto'];
const safe = (v, fallback = 'Not available') => v === undefined || v === null || v === '' ? fallback : v;
const arr = (v) => Array.isArray(v) ? v : [];
const sum = (v) => arr(v).reduce((a,b) => a + (Number(b) || 0), 0);

const title = (s) => String(s ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Convert engine objects to readable text; never emit [object Object] or JSON. */
export function readableValue(value, depth = 0) {
  if (value === undefined || value === null || value === '') return 'Not available';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (depth > 5) return 'Details available in Full Report';
  if (Array.isArray(value)) {
    if (!value.length) return 'None';
    return value.map(v => readableValue(v, depth + 1)).join('; ');
  }
  if (typeof value === 'object') {
    // Common status/reason object: surface the actual explanation.
    const entries = Object.entries(value);
    return entries.map(([k, v]) => `${title(k)}: ${readableValue(v, depth + 1)}`).join(' | ');
  }
  return String(value);
}

function rowValue(obj, ...keys) {
  for (const key of keys) {
    const v = obj?.[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return 'Not available';
}
function component(R, name) {
  return arr(R.avkahadaPhala).find(x => String(x.component || '').toLowerCase() === name.toLowerCase()) || null;
}
function classicalLife(R) {
  return R.classicalPredictions || {};
}

function lifeValue(R, name) {
  const life = classicalLife(R);
  const bphs = R.bphsPredictions || {};
  const ext = R.extendedReport || {};
  const map = {
    'Character': ['character', 'personality'],
    'Happiness And Fulfillment': ['happiness', 'fulfillment'],
    'Life Style': ['lifestyle', 'lifeStyle'],
    'Career': ['career'],
    'Occupation': ['career'],
    'Health': ['health'],
    'Hobbies': ['hobbies'],
    'Love Matters': ['marriage', 'love'],
    'Finance': ['finance', 'wealth'],
    'Education': ['education'],
  };
  for (const key of map[name] || []) {
    if (life[key] !== undefined) return life[key];
    if (bphs[key] !== undefined) return bphs[key];
    if (ext[key] !== undefined) return ext[key];
  }
  return 'Not available';
}

function sadeRows(R) {
  const cycles = arr(R.sadeSati?.cycles);
  const rows = [];
  for (const [ci, cycle] of cycles.entries()) {
    const phases = arr(cycle.phases);
    if (phases.length) {
      for (const phase of phases) rows.push([
        `${ci + 1}.${rows.filter(r => String(r[0]).startsWith(`${ci + 1}.`)).length + 1}`,
        phase.sign || cycle.shaniRashi || '-', phase.start, phase.end, phase.name || phase.phase || '-'
      ]);
    } else {
      rows.push([ci + 1, cycle.shaniRashi || cycle.rashi || '-', cycle.start, cycle.end, cycle.phase || cycle.name || '-']);
    }
  }
  return rows;
}

function ashtakavargaRows(R) {
  const av = R.ashtakavarga || {};
  const pick = (...keys) => {
    for (const k of keys) if (av?.individual?.[k] ?? av?.bhinna?.[k]) return av.individual?.[k] ?? av.bhinna?.[k];
    return null;
  };
  return [
    ['Sun', pick('Sun')], ['Moon', pick('Moon')], ['Mars', pick('Mars')], ['Merc', pick('Mercury','Merc')],
    ['Jupt', pick('Jupiter','Jupt')], ['Venu', pick('Venus','Venu')], ['Satn', pick('Saturn','Satn')],
    ['Total', av.total ?? sum(av.sarva)]
  ];
}

export function buildBasicReport(R, { elapsedMs = 0, version = '4.1-basic' } = {}) {
  const m = R.meta || {};
  const p = R.panchanga || {};
  const lagna = R.lagna || R.ascendant || {};
  const ascLord = R.ascendantLord || SIGN_LORDS[lagna.sign] || rowValue(R.lagnaLord, 'name', 'planet');
  const rasiLord = SIGN_LORDS[p.moonSign] || R.rasiLord || R.moonSignLord;
  const av = {
    paya: component(R,'Paya'), varna: component(R,'Varna'), yoni: component(R,'Yoni'),
    gana: component(R,'Gana'), vasya: component(R,'Vasya / Vashya') || component(R,'Vasya'), nadi: component(R,'Nadi'),
  };
  const ascDeep = R.ascendantDeepReport || {};
  const nakDeep = R.nakshatraDeepReport || {};
  const traditional = [
    ['Name', m.name], ['Sex', m.sex], ['Date', `${String(m.day).padStart(2,'0')}-${String(m.month).padStart(2,'0')}-${m.year}`],
    ['Day', m.weekday], ['Time of Birth', `${String(m.hour).padStart(2,'0')}:${String(m.min).padStart(2,'0')}:${String(m.sec || 0).padStart(2,'0')}`],
    ['SID', R.sid || m.sid || '-'], ['Julian Day', m.JD], ['Ayan Type', m.ayanamsaMode], ['Ayan', R.ayanamsa?.value],
    ['Place', m.place], ['Longitude', m.lon], ['Latitude', m.lat], ['Asc Lord', ascLord], ['Lagna (Asc)', lagna.sign],
    ['Yoga', p.yoga?.name || p.yoga], ['Tithi', p.tithi?.name || p.tithi], ['Sunset', m.sunset], ['Sunrise', m.sunrise],
    ['Bal. Dasa', R.dashaBalance?.formatted || R.dasha?.balance], ['Karan', p.karana?.name || p.karana],
    ['Star Lord', p.nakshatra?.lord], ['Star Pada', p.nakshatra?.pada], ['Rasi Lord', rasiLord], ['Rasi', p.moonSign],
  ];

  const sections = [
    { id:'basic-details-basic', title:'Basic Details', rows:[
      ['Sex', m.sex], ['Date of Birth', `${String(m.day).padStart(2,'0')}-${String(m.month).padStart(2,'0')}-${m.year}`],
      ['Time of Birth', `${String(m.hour).padStart(2,'0')}:${String(m.min).padStart(2,'0')}:${String(m.sec || 0).padStart(2,'0')}`],
      ['Day of Birth', m.weekday], ['Ishtkaal', m.ishtaKaal?.formatted || m.ishtaKaal], ['Place of Birth', m.place], ['Time Zone', `UTC ${m.tz >= 0 ? '+' : ''}${m.tz}`],
      ['Latitude', m.lat], ['Longitude', m.lon], ['Local Time Correction', `${m.localTimeCorrectionMinutes >= 0 ? '+' : ''}${m.localTimeCorrectionMinutes} minutes`],
      ['War Time Correction', m.warTimeCorrection], ['LMT at Birth', m.localMeanTime], ['GMT at Birth', m.utcAtBirth],
      ['Tithi', p.tithi?.name], ['Hindu Week Day', p.vara?.hindi || p.vara?.name || m.weekdayHindi || m.weekday], ['Paksha', p.tithi?.paksha],
      ['Yoga', p.yoga?.name], ['Karan', p.karana?.name], ['Sunrise', m.sunrise], ['Sunset', m.sunset], ['Day Duration', p.dayDuration],
    ]},
    { id:'avkahada-basic', title:'Avkahada Chakra', rows:[
      ['Paya (Nakshatra Based)', av.paya?.value], ['Varna', av.varna?.value], ['Yoni', av.yoni?.value], ['Gana', av.gana?.value], ['Vasya', av.vasya?.value], ['Nadi', av.nadi?.value],
      ['Dasa Balance', R.dashaBalance?.formatted || R.dasha?.balance], ['Lagna', lagna.sign], ['Lagna Lord', ascLord], ['Rasi', p.moonSign], ['Rasi Lord', rasiLord],
      ['Nakshatra-Pada', p.nakshatra ? `${p.nakshatra.name} - Pada ${p.nakshatra.pada}` : null], ['Nakshatra Lord', p.nakshatra?.lord], ['Julian Day', m.JD],
      ['SunSign (Indian)', R.sunSign?.indian || R.indianSunSign || R.planets?.find(x=>x.name==='Sun')?.sign], ['SunSign (Western)', R.sunSign?.western || R.westernSunSign || R.westernChart?.planets?.find(x=>(x.name||x.planet)==='Sun')?.sign],
      ['Ayanamsa', R.ayanamsa?.value], ['Ayanamsa Name', R.ayanamsa?.name || R.ayanamsa?.active], ['Obliquity', m.obliquity ?? R.obliquity], ['Sideral Time', m.siderealTime ?? R.siderealTime],
    ]},
    { id:'favourable-basic', title:'Favourable Points', rows:Object.entries(R.favourable || {}).map(([k,v]) => [title(k), v]) },
    { id:'ghatak-basic', title:'Ghatak (Malefics)', rows:Object.entries(R.ghatak || {}).map(([k,v]) => [title(k), v]) },
    { id:'traditional-basic', title:'Traditional Details', rows:traditional },
    { id:'charts-basic', title:'Charts', pre:[
      'NORTH INDIAN CHART',
      safe(R.asciiCharts?.northIndian),
      'SOUTH INDIAN CHART',
      safe(R.asciiCharts?.southIndian)
    ]},
    { id:'planetary-basic', title:'Planetary Positions', table:{headers:['Planet','Sign','Longitude','House','Nakshatra','Pada','Motion'], rows:arr(R.planets).filter(x=>PLANETS.includes(x.name)).map(x=>[x.name,x.sign,x.longitude ?? x.dms ?? x.siderealLon,x.house,x.nakshatra,x.pada,x.motion || (x.retrograde ? 'Retrograde' : 'Direct')])}},
    { id:'vimshottari-basic', title:'Vimshottari Dasha', table:{headers:['Period','Years','Start','End'], rows:arr(R.dasha?.timeline).map(x=>[x.lord || x.mahadasha || x.dasha || x.planet, x.years ?? x.duration ?? '', x.start, x.end]).slice(0,9)}},
    { id:'ashtakavarga-basic', title:'Ashtakvarga Table', rows:ashtakavargaRows(R)},
    { id:'chalit-basic', title:'Chalit Table', table:{headers:['Bhav','Rashi','Bhav Begin','Mid Bhav'], rows:arr(R.chalitTable?.houses).map(h=>[h.bhavaNumber,h.sign,h.bhavaBeginning?.dms,h.bhavaMiddleCusp?.dms])}},
    { id:'ascendant-basic', title:'Your Ascendant', rows:[['Ascendant',lagna.sign],['Health',rowValue(ascDeep,'healthSymbolism')],['Temperament & Personality',rowValue(ascDeep,'temperament')],['Physical Appearance',rowValue(ascDeep,'appearance')]]},
    { id:'nakshatra-phal-basic', title:'Nakshatra Phal', rows:[['Your Nakshatra',p.nakshatra?.name],['Your Nakshatra Pada',p.nakshatra?.pada],['Janma Nakshatra Prediction',rowValue(nakDeep,'personality')],['Education & Income',`Education: ${readableValue(nakDeep.education)} | Income: ${readableValue(nakDeep.income)}`],['Family Life',readableValue(nakDeep.family)]]},
    { id:'life-predictions-basic', title:'Life Predictions', rows:['Character','Happiness And Fulfillment','Life Style','Career','Occupation','Health','Hobbies','Love Matters','Finance','Education'].map(n=>[n,lifeValue(R,n)])},
    { id:'manglik-basic', title:'Manglik Details / Mangal Dosha', rows:[
      ['Lagna Chart Status', R.mangalDoshaDeep?.fromLagna ?? R.mangalDoshaDeep?.lagnaChart],
      ['Moon Chart Status', R.mangalDoshaDeep?.fromMoon ?? R.mangalDoshaDeep?.moonChart],
      ['Effects', R.mangalDoshaDeep?.formation !== undefined ? `Mangal Dosha: ${R.mangalDoshaDeep.formation ? 'Present' : 'Not formed'}; Severity: ${safe(R.mangalDoshaDeep.severity,'Not specified')}` : R.mangalDoshaDeep?.effects],
      ['Remedies (Before Marriage)', R.mangalDoshaDeep?.remedy],
      ['Remedies (After Marriage)', R.mangalDoshaDeep?.remedy],
      ['Remedies (Lal Kitab)', R.lalKitabRemedies || R.mangalDoshaDeep?.remedy],
      ['Cancellation / Exceptions', R.mangalDoshaDeep?.cancellationReasons],
    ]},
    { id:'sadesati-basic', title:'Sadesati Report', rows:[], table:{headers:['S.N.','Shani Rashi','Start Date','End Date','Phase'], rows:sadeRows(R)}},
  ];
  // Human-readable normalization is applied once at the report boundary.
  for (const s of sections) {
    if (s.rows) s.rows = s.rows.map(([k,v]) => [k, readableValue(v)]);
    if (s.table) s.table.rows = s.table.rows.map(row => row.map(readableValue));
  }
  return Object.freeze({reportVersion:version,generatedAt:new Date().toISOString(),title:'HoraSaar — Basic Report',input:{name:m.name,sex:m.sex,date:`${m.year}-${m.month}-${m.day}`,time:`${m.hour}:${m.min}`,place:m.place,lat:m.lat,lon:m.lon,tz:m.tz},fingerprint:R.fingerprint || R.meta?.fingerprint || null,calculationTimeMs:elapsedMs,sections});
}
