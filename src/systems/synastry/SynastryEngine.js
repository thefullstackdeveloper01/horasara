import { mod360, signOf } from '../../astronomy/utils.js';
import ruleData from '../../../dataset/used/core/system-rules.json' with { type: 'json' };
import { angularDistance } from '../../core/math/angularDistance.js';
import { calcFullMilan } from '../../milan/ashtakoot.js';

const DEFINITIONS=ruleData.synastry.DEFINITIONS;
const SIGN_ELEMENT=ruleData.synastry.SIGN_ELEMENT;
const HOUSE_KEYS=ruleData.synastry.HOUSE_KEYS;

function planetMap(chart){const list=chart?.planets||chart?.data?.planets||[];return new Map(list.filter(p=>Number.isFinite(Number(p.siderealLon))).map(p=>[p.name,{...p,longitude:Number(p.siderealLon)}]));}
function houseFor(lon,asc){if(!Number.isFinite(lon)||!Number.isFinite(asc))return null;return ((Math.floor(mod360(lon)/30)-Math.floor(mod360(asc)/30)+12)%12)+1;}
function relationshipAspects(a,b,maxOrb){const out=[];for(const pa of a.values())for(const pb of b.values())for(const [name,angle,orb,polarity] of DEFINITIONS){const d=angularDistance(pa.longitude,pb.longitude),error=Math.abs(d-angle);if(error<=Math.min(orb,maxOrb))out.push({a:pa.name,b:pb.name,aspect:name,exactAngle:angle,observedAngle:d,orb:error,polarity});}return out.sort((x,y)=>x.orb-y.orb);}
function moonNakshatra(chart){const m=(chart?.planets||[]).find(p=>p.name==='Moon'); return m?.nakshatra||null;}
function gunaScore(chartA,chartB){const a=chartA?.avkahada?.nadi??chartA?.panchanga?.nakshatra?.nadi, b=chartB?.avkahada?.nadi??chartB?.panchanga?.nakshatra?.nadi; return a&&b?{nadiA:a,nadiB:b,score:a===b?0:8,max:8}:null;}
function bhavaOverlays(A,B){const ascA=A?.ascendant?.longitude??A?.ascendant?.lon, ascB=B?.ascendant?.longitude??B?.ascendant?.lon; const rows=[]; for(const p of (A?.planets||[])){const h=houseFor(p.siderealLon,ascB); if(h)rows.push({from:'A',planet:p.name,intoBHouse:h});} for(const p of (B?.planets||[])){const h=houseFor(p.siderealLon,ascA); if(h)rows.push({from:'B',planet:p.name,intoAHouse:h});} return rows;}
function houseThemeScores(overlays){return Object.fromEntries(Object.entries(HOUSE_KEYS).map(([theme,houses])=>[theme,overlays.filter(o=>houses.includes(o.intoBHouse||o.intoAHouse)).length]));}
function compositeMidpoint(a,b){const x=Math.cos(a*Math.PI/180)+Math.cos(b*Math.PI/180),y=Math.sin(a*Math.PI/180)+Math.sin(b*Math.PI/180); if(Math.abs(x)<1e-12&&Math.abs(y)<1e-12)return null;return mod360(Math.atan2(y,x)*180/Math.PI);}
function addCompositeHouses(planets,asc){return planets.map(p=>({...p,house:houseFor(p.longitude,asc)}));}
function compositeAspects(planets,maxOrb=6){const out=[];for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++)for(const [name,angle,orb,polarity] of DEFINITIONS){const d=angularDistance(planets[i].longitude,planets[j].longitude),e=Math.abs(d-angle);if(e<=Math.min(orb,maxOrb))out.push({a:planets[i].name,b:planets[j].name,aspect:name,orb:e,polarity,exactAngle:angle,observedAngle:d});}return out.sort((a,b)=>a.orb-b.orb);}

export function calculateSynastry(chartA,chartB,{maxOrb=6,includeKoota=true}={}){
  if(!chartA?.planets||!chartB?.planets)throw new TypeError('Synastry requires two charts');
  const aspects=relationshipAspects(planetMap(chartA),planetMap(chartB),maxOrb); const overlays=bhavaOverlays(chartA,chartB); const moonA=moonNakshatra(chartA),moonB=moonNakshatra(chartB); const nadi=gunaScore(chartA,chartB);
  const mangal=(c)=>{const Mars=(c.planets||[]).find(p=>p.name==='Mars');return Mars&&[1,4,7,8,12].includes(Mars.house)};
  const koota=includeKoota?{status:'CLASSICAL_COMPONENT_ENGINE',moonNakshatraA:moonA,moonNakshatraB:moonB,nadi,notes:'Ashtakoot/Dashakoot/Papa Samyam/Mangal/Rajju/Vedha are delegated to calcFullMilan; no component is silently replaced by a partial score.',source:'src/milan/ashtakoot.js'}:null;
  const themes=houseThemeScores(overlays); const crossLinks=aspects.filter(a=>['Moon','Sun','Venus','Mars','Jupiter','Saturn'].includes(a.a)||['Moon','Sun','Venus','Mars','Jupiter','Saturn'].includes(a.b)).slice(0,30);
  let fullMilan=null; if(includeKoota){ try { fullMilan=calcFullMilan(chartA,chartB); } catch(e) { fullMilan={status:'ERROR',error:e.message}; } }
  const relationshipSignals={
    luminaryContacts:aspects.filter(a=>['Sun','Moon'].includes(a.a)||['Sun','Moon'].includes(a.b)).length,
    affectionContacts:aspects.filter(a=>['Venus','Moon'].includes(a.a)||['Venus','Moon'].includes(a.b)).length,
    conflictContacts:aspects.filter(a=>['Mars','Saturn'].includes(a.a)||['Mars','Saturn'].includes(a.b)).filter(a=>a.polarity<0).length,
    beneficContacts:aspects.filter(a=>['Jupiter','Venus'].includes(a.a)||['Jupiter','Venus'].includes(a.b)).filter(a=>a.polarity>0).length
  };
  return {type:'synastry',methodology:{westernAspects:'supplied positions; use tropical degrees when explicitly provided by caller',vedicOverlays:'planet-to-house overlay against the other chart',koota:'full Ashtakoot/Dashakoot/Papa Samyam/Mangal/Rajju/Vedha are computed from the same chart objects'},aspects,overlays,koota,fullMilan,manglik:{chartA:mangal(chartA),chartB:mangal(chartB)},themes,crossLinks,relationshipSignals,summary:{total:aspects.length,harmonious:aspects.filter(a=>a.polarity>0).length,challenges:aspects.filter(a=>a.polarity<0).length,strongest:aspects.slice(0,12)}};
}

export function calculateComposite(chartA,chartB,{method='midpoint',includeHouses=true}={}){
  if(!chartA?.planets||!chartB?.planets)throw new TypeError('Composite requires two charts'); const a=planetMap(chartA),b=planetMap(chartB),names=new Set([...a.keys(),...b.keys()]); const planets=[];
  for(const name of names){const la=a.get(name)?.longitude,lb=b.get(name)?.longitude;if(!Number.isFinite(la)||!Number.isFinite(lb))continue; const lon=compositeMidpoint(la,lb); planets.push({name,longitude:lon,midpointType:lon==null?'antipodal-ambiguous':'short-arc-circular-midpoint'});}
  const ascA=Number(chartA.ascendant?.longitude??chartA.ascendant),ascB=Number(chartB.ascendant?.longitude??chartB.ascendant); const asc=Number.isFinite(ascA)&&Number.isFinite(ascB)?compositeMidpoint(ascA,ascB):null; const withHouses=includeHouses&&Number.isFinite(asc)?addCompositeHouses(planets,asc):planets;
  const angles={ascendant:asc,midheaven:(Number.isFinite(asc)?mod360(asc+90):null)};
  const aspects=Number.isFinite(asc)?compositeAspects(withHouses):[];
  const signLords=withHouses.map(p=>({name:p.name,signIndex:Number.isFinite(p.longitude)?signOf(p.longitude):null,signLord:Number.isFinite(p.longitude)?['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'][signOf(p.longitude)]:null}));
  return {type:'composite',method,planets:withHouses,angles,aspects,interpretationInputs:{houseCounted:withHouses.filter(p=>p.house).length,signs:signLords},validation:{status:'GEOMETRIC',note:'Midpoint composite is a mathematical relationship chart. Davison and progressed composite are separate methods and must not be conflated.'}};
}
