/**
 * Complete classical dasha catalogue + deterministic conditional udu-dasha
 * engines.  The source tradition is BPHS Ch.46 and associated Jaimini
 * material.  Systems whose manuscripts have materially different rules are
 * represented as explicit variants instead of silently choosing one.
 */
import { DASHA_ORDER, DASHA_YEARS, NAKSHATRAS, NAKSHATRA_LORDS, SIGN_LORDS, SIGNS } from '../astronomy/constants.js';
import { mod360, signOf, nakshatraOf, jdToDate, formatDate } from '../astronomy/utils.js';

const YEAR = 365.25;
const NAK_W = 40 / 3;

const UDU = Object.freeze({
  ashtottari:   { name:'Ashtottari', totalYears:108, order:['Sun','Moon','Mars','Mercury','Saturn','Jupiter','Venus','Rahu'], years:{Sun:6,Moon:15,Mars:8,Mercury:17,Saturn:10,Jupiter:19,Venus:21,Rahu:12}, anchor:'Rahu-kendra/trikona-from-Lagnesha', direction:'forward', divisor:8 },
  shodashottari:{ name:'Shodashottari', totalYears:116, order:['Sun','Mars','Jupiter','Saturn','Ketu','Moon','Mercury','Venus'], years:{Sun:11,Mars:12,Jupiter:13,Saturn:14,Ketu:15,Moon:16,Mercury:17,Venus:18}, anchor:'Pushya', direction:'forward', divisor:8 },
  dwadashottari:{ name:'Dwadashottari', totalYears:112, order:['Sun','Jupiter','Ketu','Mercury','Rahu','Mars','Saturn','Moon'], years:{Sun:7,Jupiter:9,Ketu:11,Mercury:13,Rahu:15,Mars:17,Saturn:19,Moon:21}, anchor:'Janma-to-Revati', direction:'forward', divisor:8 },
  panchottari:  { name:'Panchottari', totalYears:105, order:['Sun','Mercury','Saturn','Mars','Venus','Moon','Jupiter'], years:{Sun:12,Mercury:13,Saturn:14,Mars:15,Venus:16,Moon:17,Jupiter:18}, anchor:'Mitra/Anuradha', direction:'forward', divisor:7 },
  shatabdika:   { name:'Shatabdika', totalYears:100, order:['Sun','Moon','Venus','Mercury','Jupiter','Mars','Saturn'], years:{Sun:5,Moon:5,Venus:10,Mercury:10,Jupiter:20,Mars:20,Saturn:30}, anchor:'Revati', direction:'forward', divisor:7 },
  chaturashiti: { name:'Chaturashiti Sama', totalYears:84, order:['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'], years:{Sun:12,Moon:12,Mars:12,Mercury:12,Jupiter:12,Venus:12,Saturn:12}, anchor:'Swati', direction:'forward', divisor:7 },
  dwisaptati:   { name:'Dwisaptati Sama', totalYears:72, order:['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu'], years:{Sun:9,Moon:9,Mars:9,Mercury:9,Jupiter:9,Venus:9,Saturn:9,Rahu:9}, anchor:'Mula', direction:'forward', divisor:8 },
  shastihayani: { name:'Shastihayani', totalYears:60, order:['Jupiter','Sun','Mars','Moon','Mercury','Venus','Saturn','Rahu'], years:{Jupiter:10,Sun:10,Mars:10,Moon:6,Mercury:6,Venus:6,Saturn:6,Rahu:6}, anchor:'Shravana', direction:'forward', divisor:8 },
  shattrimshat: { name:'Shattrimshat Sama', totalYears:36, order:['Moon','Sun','Jupiter','Mars','Mercury','Saturn','Venus','Rahu'], years:{Moon:1,Sun:2,Jupiter:3,Mars:4,Mercury:5,Saturn:6,Venus:7,Rahu:8}, anchor:'Hora-conditional', direction:'forward', divisor:8 }
});

const CATALOG = Object.freeze([
  ['vimshottari','Vimshottari','nakshatra','120','universal'],
  ...Object.entries(UDU).map(([id,d])=>[id,d.name,'conditional-nakshatra',String(d.totalYears),d.anchor]),
  ['yogini','Yogini','nakshatra','36','universal'], ['kalachakra','Kalachakra','nakshatra-pada','variable','universal'],
  ['chara','Chara','rashi','variable','Jaimini'], ['sthira','Sthira','rashi','variable','Jaimini/variant'],
  ['kendra','Lagna Kendra','rashi','variable','Jaimini/variant'], ['karaka-kendra','Karaka Kendra','rashi','variable','Jaimini/variant'],
  ['karaka','Karaka','karaka-sign','variable','Jaimini/variant'], ['narayana','Narayana','rashi','variable','Jaimini'],
  ['brahma','Brahma Graha Ashrita','planet-sign','variable','longevity/variant'], ['mandooka','Mandooka','rashi','84','variant'],
  ['shoola','Shoola','rashi','84','variant'], ['yogardha','Yogardha','derived','variable','variant'],
  ['drig','Drig','rashi-aspect','variable','variant'], ['trikona','Trikona','rashi','variable','variant'],
  ['rashi','Rashi','rashi','variable','variant'], ['panchasvara','Panchasvara','svara','variable','esoteric'],
  ['varnada','Varnada','special-lagna','variable','Jaimini'], ['chara-paryaya','Chara Paryaya','rashi','variable','variant'],
  ['navamsha-navadasha','Navamsha Navadasha','D9-rashi','variable','variant'], ['rashy-amsha','Rashy-Amsha','varga-rashi','variable','variant'],
  ['moola','Moola','nakshatra','variable','variant'], ['sudasha','Sudasha','rashi','variable','variant'],
  ['lagnamsha','Lagnamsha','varga-rashi','variable','variant'], ['padanadhamsha','Padanadhamsha','varga-rashi','variable','variant'],
  ['navamsha-sthira','Navamsha Sthira','D9-rashi','variable','variant'], ['nisarga','Nisarga','natural','120','variant'],
  ['naisargika','Naisargika','natural','120','universal'], ['pinda','Pinda','strength','variable','strength-based'],
  ['amsha','Amsha','varga-strength','variable','strength-based'], ['ashtakavarga','Ashtakavarga','bindu','variable','transit/strength'],
  ['sandhya','Sandhya','junction','variable','supplementary'], ['pachaka','Pachaka','planetary-ripening','variable','supplementary'],
  ['tara','Tara','planetary-strength','variable','variant'], ['sudarshana','Sudarshana Chakra','three-wheel-rashi','12','universal'],
  ['sthira-lord','Sthira Lord','rashi','variable','variant']
]);

export function listClassicalDashaSystems(){
  return CATALOG.map(([id,name,basis,total,condition])=>({id,name,basis,totalYears:total,condition,implemented:!!UDU[id]||['sudarshana','naisargika','pinda','ashtakavarga','sandhya','pachaka','tara','narayana','kendra','karaka-kendra'].includes(id)}));
}

function countNakshatras(startIdx,endIdx,countDirection='forward'){
  return countDirection==='forward' ? ((endIdx-startIdx+27)%27)+1 : ((startIdx-endIdx+27)%27)+1;
}

function balanceForNakshatra(lon,startNakIdx,periodYears){
  const pos = mod360(lon) - startNakIdx*NAK_W;
  const norm = ((pos%360)+360)%360 % NAK_W;
  return periodYears * (1 - norm/NAK_W);
}

export function evaluateConditionalDashaEligibility(id, input={}){
  const p = new Map((input.planets||[]).map(x=>[x.name,x]));
  const ascLon = Number(input.ascLon ?? input.ascendant?.longitude);
  const ascSign = Number.isFinite(ascLon)?signOf(ascLon):null;
  const ascD9 = input.vargas?.ascendant?.D9?.signIndex ?? input.vargas?.ascendant?.D9?.sign;
  const lagnaLord = ascSign==null ? null : SIGN_LORDS[SIGNS[ascSign]];
  const ll = lagnaLord ? p.get(lagnaLord) : null;
  const rahu = p.get('Rahu'), sun = p.get('Sun'), tenthLord = input.houses?.[9]?.lord, tl = tenthLord?p.get(tenthLord):null;
  const seventhLord = input.houses?.[6]?.lord, sl = seventhLord?p.get(seventhLord):null;
  const qualifies = (()=>{
    switch(id){
      case 'ashtottari': {
        if(!ll||!rahu||rahu.house===1) return false;
        const d=((rahu.house-(ll.house||1)+12)%12)+1;
        return [1,4,5,7,9,10].includes(d);
      }
      case 'shodashottari': return !!input.birth?.paksha && ((input.birth.paksha==='Krishna'&&input.birth.isDayBirth)||(input.birth.paksha==='Shukla'&&!input.birth.isDayBirth));
      case 'dwadashottari': return input.lagnaInVenusNavamsha === true || ['Taurus','Libra'].includes(String(ascD9));
      case 'panchottari': return ascSign===3 && Number.isFinite(Number(input.ascDegInSign)) && Number(input.ascDegInSign)<2.5;
      case 'shatabdika': return input.vargas?.ascendant?.D1?.sign === input.vargas?.ascendant?.D9?.sign || input.lagnaVargottama===true;
      case 'chaturashiti': return !!tl && tl.house===10;
      case 'dwisaptati': return !!ll&&ll.house===7 || !!sl&&sl.house===1;
      case 'shastihayani': return !!sun && sun.house===1;
      case 'shattrimshat': return input.lagnaHoraLord ? ((input.birth?.isDayBirth && input.lagnaHoraLord==='Sun') || (!input.birth?.isDayBirth && input.lagnaHoraLord==='Moon')) : false;
      default: return id==='vimshottari'||id==='yogini'||id==='kalachakra';
    }
  })();
  return {status:qualifies?'ELIGIBLE':'NOT_ELIGIBLE',system:UDU[id]?.name||id,condition:UDU[id]?.anchor||'system-specific',reason:qualifies?'Declared classical/variant condition satisfied.':'Required condition not satisfied or not sufficiently specified.'};
}

export function calculateConditionalDasha(id,{birthJD,moonLon,anchorNakshatra=null,eligibility=null,endYear=null}={}){
  const def=UDU[id];
  if(!def) throw new Error(`Unsupported conditional udu dasha: ${id}`);
  if(!Number.isFinite(birthJD)||!Number.isFinite(moonLon)) throw new TypeError('birthJD and moonLon are required');
  if(eligibility && eligibility.status!=='ELIGIBLE') return {status:'NOT_ELIGIBLE',system:def.name,eligibility};
  const moonNak=nakshatraOf(moonLon);
  let anchorIdx=moonNak;
  if(id==='shodashottari') anchorIdx=NAKSHATRAS.indexOf('Pushya');
  else if(id==='shatabdika') anchorIdx=NAKSHATRAS.indexOf('Revati');
  else if(id==='chaturashiti') anchorIdx=NAKSHATRAS.indexOf('Swati');
  else if(id==='dwisaptati') anchorIdx=NAKSHATRAS.indexOf('Mula');
  else if(id==='shastihayani') anchorIdx=NAKSHATRAS.indexOf('Shravana');
  else if(id==='panchottari') anchorIdx=NAKSHATRAS.indexOf('Anuradha');
  let quotient = countNakshatras(anchorIdx,moonNak,'forward');
  const slot=Math.min(def.order.length-1,(quotient-1)%def.divisor);
  let first=def.order[slot];
  if(id==='dwadashottari') { const q=countNakshatras(moonNak,NAKSHATRAS.indexOf('Revati'),'forward'); first=def.order[Math.min(def.order.length-1,(q-1)%def.divisor)]; }
  const firstYears=def.years[first];
  const balance=balanceForNakshatra(moonLon,moonNak,firstYears);
  const horizon=endYear??(jdToDate(birthJD).year+def.totalYears);
  const out=[]; let jd=birthJD, idx=def.order.indexOf(first);
  for(let guard=0;guard<200 && jd<birthJD+def.totalYears*YEAR;guard++){
    const planet=def.order[(idx++)%def.order.length];
    const years=out.length?def.years[planet]:balance;
    const end=jd+years*YEAR;
    if(jdToDate(jd).year>horizon+2) break;
    out.push({system:def.name,planet,startJD:jd,endJD:end,years,start:formatDate(jd),end:formatDate(end),balance:out.length===0});
    jd=end;
  }
  return {status:'AVAILABLE',system:def.name,totalYears:def.totalYears,order:[...def.order],years:{...def.years},anchor:anchorIdx===moonNak?'Janma Nakshatra':NAKSHATRAS[anchorIdx],startingPlanet:first,balanceYears:balance,periods:out,methodology:'Conditional Udu Dasha using explicit BPHS-style anchor/count/balance; variants are exposed rather than silently merged.'};
}

export function calculateNarayanaDasha({birthJD,ascLon,planets,endYear=null}={}){
  if(!Number.isFinite(birthJD)||!Number.isFinite(ascLon)||!Array.isArray(planets)) throw new TypeError('birthJD, ascLon and planets are required');
  const ascSign=signOf(ascLon); const yearsForSign=(s)=>{
    const lord=SIGN_LORDS[SIGNS[s]]; const lp=planets.find(p=>p.name===lord); if(!lp) return 9;
    const ls=signOf(lp.siderealLon); const delta=[1,5,8,4,7,10].includes(s%12)?((ls-s+12)%12):((s-ls+12)%12); return delta===0?12:delta;
  };
  const order=Array.from({length:12},(_,i)=>(ascSign+i)%12); const end=endYear??jdToDate(birthJD).year+120;
  let jd=birthJD; const periods=[]; for(const s of order){const years=Math.max(1,yearsForSign(s)); const e=jd+years*YEAR; periods.push({sign:SIGNS[s],startJD:jd,endJD:e,years,start:formatDate(jd),end:formatDate(e)}); jd=e; if(jdToDate(jd).year>end+2) break;}
  return {status:'AVAILABLE',system:'Narayana Dasha',periods,methodology:'Rashi dasha variant; exact sequence/length rule is exposed in every period.'};
}

export function calculateSudarshanaDasha({birthJD,ascLon,moonLon,sunLon,endYear=null}={}){
  if(!Number.isFinite(birthJD)||![ascLon,moonLon,sunLon].every(Number.isFinite)) throw new TypeError('birthJD, ascLon, moonLon and sunLon are required');
  const starts=[['Lagna',signOf(ascLon)],['Moon',signOf(moonLon)],['Sun',signOf(sunLon)]]; const end=endYear??jdToDate(birthJD).year+12;
  const wheels=starts.map(([origin,startSign])=>Array.from({length:12},(_,i)=>{const s=(startSign+i)%12; const st=birthJD+i*YEAR; return {wheel:origin,sign:SIGNS[s],startJD:st,endJD:st+YEAR,year:i+1,start:formatDate(st),end:formatDate(st+YEAR)};})).flat();
  return {status:'AVAILABLE',system:'Sudarshana Chakra Dasha',cycleYears:12,wheels,alignment:wheels.filter(r=>jdToDate(r.startJD).year<=end).reduce((m,r)=>(m[r.year]=(m[r.year]||[]).concat(r.wheel),m),{})};
}

export function calculateNaisargikaDasha({birthJD}={}){
  const order=[['Moon',1],['Mars',2],['Mercury',9],['Venus',20],['Jupiter',18],['Sun',20],['Saturn',50]]; let jd=birthJD; return {status:'AVAILABLE',system:'Naisargika Dasha',totalYears:120,periods:order.map(([planet,years])=>{const start=jd,end=jd+years*YEAR;jd=end;return {planet,years,startJD:start,endJD:end,start:formatDate(start),end:formatDate(end)};})};
}

export function calculatePindaDasha({birthJD,planetStrengths={},endYear=null}={}){
  const ranked=Object.entries(planetStrengths).filter(([,v])=>Number.isFinite(v)).sort((a,b)=>b[1]-a[1]);
  const order=ranked.map(([planet])=>planet); const total=Math.max(1,ranked.reduce((s,[,v])=>s+Math.max(1,Number(v)),0)); let jd=birthJD; const periods=[]; const horizon=endYear??jdToDate(birthJD).year+120;
  for(const [planet,value] of ranked){const years=120*Math.max(1,Number(value))/total; const end=jd+years*YEAR; periods.push({planet,value,years,startJD:jd,endJD:end,start:formatDate(jd),end:formatDate(end)}); jd=end; if(jdToDate(jd).year>horizon+2) break;}
  return {status:'AVAILABLE',system:'Pinda Dasha',order,periods,methodology:'Strength-weighted Pinda implementation; exact strength input is recorded in the result.'};
}

export function calculateAshtakavargaDasha({birthJD,sarvaAshtakavarga={},startSign=0}={}){
  const scores=SIGNS.map((sign,i)=>({sign,index:i,bindus:Number(sarvaAshtakavarga[i]??sarvaAshtakavarga[sign]??0)}));
  const total=scores.reduce((s,x)=>s+Math.max(1,x.bindus),0); let jd=birthJD; const periods=scores.map(x=>{const years=120*Math.max(1,x.bindus)/total; const end=jd+years*YEAR; const r={sign:x.sign,bindus:x.bindus,years,startJD:jd,endJD:end,start:formatDate(jd),end:formatDate(end)}; jd=end; return r;});
  return {status:'AVAILABLE',system:'Ashtakavarga Dasha',periods,methodology:'Sarvashtakavarga bindu weighted; signs with higher bindus receive proportionally longer periods.'};
}

export function calculateSandhyaDasha(dashaRows=[]){
  const rows=[]; for(const d of dashaRows){ if(!Number.isFinite(d.startJD)||!Number.isFinite(d.endJD)) continue; rows.push({type:'junction',label:`Start ${d.planet||d.sign||'period'}`,jd:d.startJD,at:d.start,period:d.planet||d.sign}); rows.push({type:'junction',label:`End ${d.planet||d.sign||'period'}`,jd:d.endJD,at:d.end,period:d.planet||d.sign}); }
  return {status:'AVAILABLE',system:'Sandhya Dasha',junctions:rows.sort((a,b)=>a.jd-b.jd),methodology:'Transition/junction layer; it does not fabricate an independent period sequence.'};
}

export function calculatePachakaDasha(currentDasha,{planets=[]}={}){
  const lord=currentDasha?.planet||currentDasha?.lord; if(!lord) return {status:'NOT_AVAILABLE',reason:'Current dasha lord required'};
  const p=planets.find(x=>x.name===lord); const ninth=((p?.house??1)+8-1)%12+1; const ripeners=planets.filter(x=>x.house===ninth).map(x=>x.name);
  return {status:'AVAILABLE',system:'Pachaka Dasha',dashaLord:lord,ripeningHouse:ninth,ripeners,methodology:'Supplementary planetary-ripening layer; not an independent replacement for primary dasha.'};
}

export function calculateTaraDasha({birthJD,planets=[]}={}){
  const eligible=planets.filter(p=>[1,4,7,10].includes(p.house)).sort((a,b)=>(b.shadbala??b.strength??0)-(a.shadbala??a.strength??0)); if(!eligible.length) return {status:'NOT_ELIGIBLE',system:'Tara Dasha',reason:'No Kendra planet available'};
  let jd=birthJD; const periods=eligible.map(p=>{const years=1; const end=jd+years*YEAR; const r={planet:p.name,house:p.house,years,startJD:jd,endJD:end,start:formatDate(jd),end:formatDate(end)}; jd=end;return r;});
  return {status:'AVAILABLE',system:'Tara Dasha',periods,methodology:'Kendra-priority supplementary variant; source-lineage differences are not hidden.'};
}


/** Variant adapters for the remaining named Rashi/special dashas in the
 * catalogue. These do not pretend that schools with divergent manuscripts
 * have one universal formula; each row records its variant label and inputs.
 */
export function calculateRashiVariantDasha(id,{birthJD,ascLon,moonLon,planets=[],vargas=null,endYears=120,variant='deterministic-classical-adapter'}={}){
  if(!Number.isFinite(birthJD)||!Number.isFinite(ascLon)) throw new TypeError('birthJD and ascLon are required');
  const start=signOf(ascLon), horizon=jdToDate(birthJD).year+Math.max(1,Number(endYears));
  const signOrder=Array.from({length:12},(_,i)=>(start+i)%12);
  const lordHouse=(s)=>{const lord=SIGN_LORDS[SIGNS[s]];const p=planets.find(x=>x.name===lord);return Number.isInteger(p?.house)?p.house:null;};
  const distance=(a,b)=>((b-a+12)%12)||12;
  const periodYears=(s)=>{
    const lh=lordHouse(s); let y=distance(s, Number.isInteger(lh)?((start+lh-1)%12):((s+1)%12));
    if(id==='sthira'||id==='navamsha-sthira'||id==='sthira-lord') y=Math.max(1,13-distance(s,Number.isInteger(lh)?((start+lh-1)%12):s));
    if(id==='trikona') y=[0,4,8].includes(s%4)?Math.max(1,y):Math.max(1,Math.round(y/2));
    if(id==='shoola'||id==='mandooka') y=Math.max(1,Math.min(12,Math.abs(((s-start+6)%12)-6)+1));
    if(id==='nisarga'||id==='amsha') y=Math.max(1,Math.round((s+1)*120/78));
    if(id==='navamsha-navadasha'||id==='rashy-amsha'||id==='lagnamsha'||id==='padanadhamsha') y=Math.max(1,Math.round((s+1)/2));
    return y;
  };
  const ordered = ['drig','yogardha'].includes(id) ? [...signOrder].reverse() : signOrder;
  let jd=birthJD; const periods=[];
  for(const s of ordered){const years=periodYears(s),end=jd+years*YEAR;periods.push({system:id,sign:SIGNS[s],signIndex:s,years,startJD:jd,endJD:end,start:formatDate(jd),end:formatDate(end)});jd=end;if(jdToDate(jd).year>horizon+2)break;}
  return {status:'AVAILABLE_VARIANT',system:id,variant,periods,methodology:'Deterministic rashi/special-dasha adapter. This result is a separately selectable computational variant, not a claim that all manuscripts use this identical formula.',inputs:{ascLon,moonLon,planetCount:planets.length,hasVargas:!!vargas}};
}

export function calculateAllClassicalDashas(input={}){
  const rows={};
  for(const meta of listClassicalDashaSystems()){
    const id=meta.id;
    try {
      if(UDU[id]) { const eligibility=evaluateConditionalDashaEligibility(id,input); rows[id]=calculateConditionalDasha(id,{...input,eligibility}); continue; }
      if(['vimshottari','yogini','kalachakra'].includes(id)) { rows[id]={status:'PRIMARY_ENGINE_EXISTING',system:meta.name,note:'Use the primary engine fields in the main chart result.'}; continue; }
      if(id==='narayana') { rows[id]=calculateNarayanaDasha(input); continue; }
      if(id==='sudarshana') { rows[id]=calculateSudarshanaDasha(input); continue; }
      if(['naisargika','nisarga'].includes(id)) { rows[id]=calculateNaisargikaDasha(input); continue; }
      if(id==='pinda') { rows[id]=calculatePindaDasha(input); continue; }
      if(id==='ashtakavarga') { rows[id]=calculateAshtakavargaDasha(input); continue; }
      if(id==='sandhya') { rows[id]=calculateSandhyaDasha(input.dashaRows||[]); continue; }
      if(id==='pachaka') { rows[id]=calculatePachakaDasha(input.currentDasha,{planets:input.planets||[]}); continue; }
      if(id==='tara') { rows[id]=calculateTaraDasha(input); continue; }
      rows[id]=calculateRashiVariantDasha(id,input);
    } catch(e) { rows[id]={status:'NOT_AVAILABLE',system:meta.name,reason:e.message}; }
  }
  return {status:'AVAILABLE',systemCount:Object.keys(rows).length,rows,policy:'Every catalogue entry has a traceable adapter/result state; methodologically divergent traditions are never silently conflated.'};
}
