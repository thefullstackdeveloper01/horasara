/**
 * Canonical 12-house Bhava Phala synthesis.
 * Never recalculates a chart: it only joins canonical engine outputs.
 * Every row exposes the evidence used so the report remains auditable.
 */
const HOUSE_KARAKA=Object.freeze({
  1:'Sun',2:'Jupiter',3:'Mars',4:'Moon',5:'Jupiter',6:'Mars',
  7:'Venus',8:'Saturn',9:'Jupiter',10:'Mercury',11:'Jupiter',12:'Saturn'
});
const num=v=>Number.isFinite(Number(v))?Number(v):null;
function list(v){return Array.isArray(v)?v.filter(Boolean):[]}
function dashaEvidence(R,h){
  // BUG FIX: this previously looked for x.lord / x.planet / x.mahadasa (typo)
  // and x.house / x.houseNumber / x.targetHouse on R.dasha.current. The real
  // chart object shape (confirmed against src/engine.js output) is
  // { mahadasha, antardasha, pratyantar, mdStart, mdEnd, adStart, adEnd,
  //   ptStart, ptEnd } with no .lord/.house fields at all, so every field
  // read here previously came back undefined and this evidence source was
  // silently empty for every house on every chart, even though the row's
  // status was reported as 'AVAILABLE'. Fixed to read the real fields and
  // to determine house activation by looking up where each Dasha lord
  // planet actually sits in the natal chart.
  const c=R?.dasha?.current;
  if(!c) return {status:'NOT_AVAILABLE',periods:[]};
  const planets=list(R?.planets);
  const findHouse=name=>planets.find(p=>p?.name===name)?.house??null;
  const levels=[
    {level:'Mahadasha',lord:c.mahadasha,start:c.mdStart,end:c.mdEnd},
    {level:'Antardasha',lord:c.antardasha,start:c.adStart,end:c.adEnd},
    {level:'Pratyantardasha',lord:c.pratyantar,start:c.ptStart,end:c.ptEnd},
  ].filter(x=>x.lord).map(x=>({...x,activatesHouse:findHouse(x.lord)}));
  const periods=levels.filter(x=>x.activatesHouse===h);
  return {status:periods.length?'AVAILABLE':'NO_DIRECT_ACTIVATION',periods};
}
function transitEvidence(R,h){
  const t=R?.transits||R?.transitNow||R?.gochar;
  if(!t||typeof t!=='object')return {status:'NOT_AVAILABLE',items:[]};
  const items=Array.isArray(t)?t:Object.values(t).flatMap(v=>Array.isArray(v)?v:[v]);
  const hits=items.filter(x=>Number(x?.house)===h||Number(x?.toHouse)===h||Number(x?.targetHouse)===h||Number(x?.natalHouse)===h);
  return {status:hits.length?'AVAILABLE':'NO_DIRECT_HIT',items:hits.slice(0,20)};
}
function scoreTone(score){
  const n=num(score);
  if(n===null)return 'Balanced';
  if(n>=60)return 'Strong';
  if(n>30)return 'Balanced';
  return 'Needs support';
}
export function buildBhavaPhala(R){
 const houses=Array.isArray(R?.houses)?R.houses:[], planets=list(R?.planets), bala=R?.bhavaBala||{};
 const yogas=list(R?.yogas), doshaValues=R?.doshas&&typeof R.doshas==='object'?Object.values(R.doshas):[];
 const doshas=doshaValues.flatMap(v=>Array.isArray(v)?v:[]);
 const aspects=list(R?.aspects);
 const rows=Array.from({length:12},(_,i)=>{
   const number=i+1,h=houses.find(x=>Number(x?.number)===number)||{};
   const occupants=planets.filter(p=>Number(p?.house)===number);
   const houseAspects=aspects.filter(a=>Number(a?.house)===number||Number(a?.toHouse)===number||Number(a?.targetHouse)===number);
   const bb=bala[number]??bala[String(number)]??null;
   const yogaFlags=yogas.filter(y=>list(y.houses).map(Number).includes(number)||list(y.participatingHouses).map(Number).includes(number)).map(y=>y.name||y.yoga||y.id).filter(Boolean);
   const doshaFlags=doshas.filter(d=>list(d.houses).map(Number).includes(number)).map(d=>d.name||d.type||d.id).filter(Boolean);
   const dasha=dashaEvidence(R,number),transits=transitEvidence(R,number);
   const evidence=[
     bb?.score!=null?{type:'BHAVA_BALA',value:bb.score}:null,
     ...occupants.map(p=>({type:'OCCUPANT',planet:p.name,longitude:p.siderealLon??p.longitude})),
     ...houseAspects.map(a=>({type:'ASPECT',source:a.planet||a.from||a.source,target:number,angle:a.angle??a.degree??null})),
     ...yogaFlags.map(x=>({type:'YOGA',value:x})),
     ...doshaFlags.map(x=>({type:'DOSHA',value:x})),
     ...dasha.periods.map(x=>({type:'DASHA',...x})),
     ...transits.items.map(x=>({type:'TRANSIT',planet:x.planet||x.name||null,house:x.house??x.targetHouse??null}))
   ].filter(Boolean);
   const tone=scoreTone(bb?.score) + (occupants.length ? `; occupied by ${occupants.map(p=>p.name).join(', ')}` : '');
   return {
     house:number,sign:h.sign??null,lord:h.lord??null,karaka:HOUSE_KARAKA[number],
     occupants:occupants.map(p=>p.name).filter(Boolean),aspects:houseAspects,
     bhavaBala:bb,dasha,transits,yogas:yogaFlags,doshas:doshaFlags,
     evidence,tone,
     interpretation:`House ${number} (${h.sign??'unknown'}) is ruled by ${h.lord??'unknown'}; natural karaka ${HOUSE_KARAKA[number]}. `+
       `${occupants.length?`Occupants: ${occupants.map(p=>p.name).join(', ')}. `:'No natal occupant. '}`+
       `${bb?.score!=null?`Bhava Bala: ${bb.score} (${tone}). `:''}`+
       `${yogaFlags.length?`Yoga links: ${yogaFlags.join(', ')}. `:''}`+
       `${doshaFlags.length?`Dosha links: ${doshaFlags.join(', ')}. `:''}`+
       `${dasha.status==='AVAILABLE'?`Dasha evidence is attached. `:'Dasha evidence unavailable. '}`+
       `${transits.status==='AVAILABLE'?`Transit activation is attached.`:'No direct transit activation was found.'}`
   };
 });
 return {
   status:'AVAILABLE',rows,
   methodology:'Canonical join of house/lord/occupant/aspect/Bhava Bala/Yoga/Dosha/Dasha/Transit objects; no second chart calculation or hardcoded chart outcome.',
   evidencePolicy:'Every conclusion row exposes the source factors used; missing inputs are marked unavailable rather than guessed.',
   naturalKarakaPolicy:'Natural house karakas are explicit metadata and are not treated as a replacement for lordship or chart-specific evidence.'
 };
}
export default {buildBhavaPhala};
