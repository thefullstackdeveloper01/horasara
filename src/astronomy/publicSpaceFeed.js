/** Public astronomy/space-weather feeds. Network data only; never used as a Jyotish calculation source. */
const CACHE = new Map();
const TTL = 5 * 60 * 1000;
const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const APOD_BASE = 'https://api.nasa.gov/planetary/apod';
const NEO_BASE = 'https://api.nasa.gov/neo/rest/v1/feed';
const DONKI_BASES = [
  process.env.NASA_DONKI_BASE_URL || 'https://ccmc.gsfc.nasa.gov/DONKI-API/get',
  'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get'
];

function cacheKey(k){return String(k)}
async function cached(key, fn, ttl=TTL){
  const k=cacheKey(key), hit=CACHE.get(k), now=Date.now();
  if(hit && now-hit.time<ttl) return hit.value;
  const value=await fn(); CACHE.set(k,{time:now,value}); return value;
}
async function getJson(url, timeout=8000){
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),timeout);
  try { const r=await fetch(url,{signal:c.signal,headers:{accept:'application/json','user-agent':'HoraSaar/1.0'}}); if(!r.ok) throw new Error(`HTTP_${r.status}`); return await r.json(); }
  finally { clearTimeout(t); }
}
function apiUrl(base, params){ const u=new URL(base); for(const [k,v] of Object.entries(params||{})) if(v!=null&&v!=='') u.searchParams.set(k,v); return u.toString(); }

export async function getApod(date){
  if(!NASA_KEY) return {available:false,source:'NASA APOD',reason:'NASA_API_KEY is not configured'};
  try { const d=await cached(`apod:${date}`,()=>getJson(apiUrl(APOD_BASE,{api_key:NASA_KEY,date})),24*60*60*1000); return {available:true,source:'NASA APOD',...d}; }
  catch(e){ return {available:false,source:'NASA APOD',reason:e.message}; }
}
export async function getNeoFeed(startDate,endDate){
  if(!NASA_KEY) return {available:false,source:'NASA NeoWs',reason:'NASA_API_KEY is not configured'};
  try { const d=await cached(`neo:${startDate}:${endDate}`,()=>getJson(apiUrl(NEO_BASE,{api_key:NASA_KEY,start_date:startDate,end_date:endDate})),15*60*1000); return {available:true,source:'NASA NeoWs',...d}; }
  catch(e){ return {available:false,source:'NASA NeoWs',reason:e.message}; }
}
async function donki(path,startDate,endDate){
  let last='UNAVAILABLE';
  for(const base of DONKI_BASES){ try { const d=await cached(`donki:${path}:${startDate}:${endDate}`,()=>getJson(apiUrl(`${base.replace(/\/$/,'')}/${path}`,{startDate,endDate})),10*60*1000); return {available:true,source:'NASA DONKI',data:d}; } catch(e){ last=e.message; } }
  return {available:false,source:'NASA DONKI',reason:last};
}
export async function getSpaceWeather(startDate,endDate){
  const [flares,cmes,storms]=await Promise.all([donki('FLR',startDate,endDate),donki('CME',startDate,endDate),donki('GST',startDate,endDate)]);
  return {flares,cmes,storms};
}
const NOAA_KP='https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
async function getNoaaKp(){ try { const data=await cached('noaa:kp',()=>getJson(NOAA_KP),60*1000); return {available:true,source:'NOAA SWPC',data}; } catch(e){ return {available:false,source:'NOAA SWPC',reason:e.message}; } }

export async function getPublicSpaceFeed({date,startDate,endDate}={}){
  const d=date||new Date().toISOString().slice(0,10), s=startDate||d, e=endDate||d;
  const [apod,neo,spaceWeather,noaaKp]=await Promise.all([getApod(d),getNeoFeed(s,e),getSpaceWeather(s,e),getNoaaKp()]);
  return {date:d,startDate:s,endDate:e,apod,neo,spaceWeather,noaaKp,disclaimer:'NASA/NOAA data are factual astronomy/space-weather feeds. They are not evidence that celestial or space-weather events cause Jyotish outcomes.'};
}
