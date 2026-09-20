import crypto from 'node:crypto';

const iso=v=>{const d=new Date(v);return Number.isNaN(d.valueOf())?null:d.toISOString()};
const hash=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');

export function validateOutcomeCase(c){
 const e=[]; if(!c?.id)e.push('missing id'); if(c?.verification?.status!=='verified')e.push('verification.status must be verified');
 if(!c?.chartId)e.push('missing chartId'); if(!c?.cutoff||!iso(c.cutoff))e.push('invalid cutoff'); if(!Array.isArray(c.events)||!c.events.length)e.push('events must be non-empty');
 for(const ev of c.events||[]){if(!ev.type)e.push('event.type missing');if(!iso(ev.date))e.push('event.date invalid');if(iso(ev.date)&&iso(c.cutoff)&&new Date(ev.date)<new Date(c.cutoff))e.push(`event ${ev.type} precedes cutoff`);if(!ev.source?.citation)e.push(`event ${ev.type} missing source.citation`);}
 return {valid:e.length===0,errors:e};
}
export function validateOutcomeCorpus(cases=[]){const rows=cases.map(validateOutcomeCase);return {cases:cases.length,valid:rows.every(x=>x.valid),invalid:rows.filter(x=>!x.valid).length,errors:rows.flatMap((r,i)=>r.errors.map(e=>`${cases[i]?.id||i}: ${e}`)),digest:hash(cases)}}
export function evaluateWalkForward(cases=[],predict){if(typeof predict!=='function')throw new TypeError('predict required');const rows=[];for(const c of [...cases].sort((a,b)=>new Date(a.cutoff)-new Date(b.cutoff))){const allowed=(c.events||[]).filter(e=>new Date(e.date)>=new Date(c.cutoff));const p=predict(c)||{};const types=new Set(p.eventTypes||[]);const hits=allowed.filter(e=>types.has(e.type));rows.push({id:c.id,cutoff:c.cutoff,predicted:[...types],eligibleEvents:allowed.length,hits:hits.length,hit:Boolean(hits.length)});}const n=rows.length,h=rows.filter(x=>x.hit).length;return {cases:n,hits:h,misses:n-h,hitRate:n?h/n:null,rows,leakageChecked:true};}
export function calibrationBins(rows=[],bins=10){const out=Array.from({length:bins},(_,i)=>({bin:i,lower:i/bins,upper:(i+1)/bins,count:0,observed:0}));for(const r of rows){const p=Math.max(0,Math.min(.999999,Number(r.probability)||0));const i=Math.min(bins-1,Math.floor(p*bins));out[i].count++;out[i].observed+=r.hit?1:0;}return out.map(x=>({...x,observedRate:x.count?x.observed/x.count:null}));}
