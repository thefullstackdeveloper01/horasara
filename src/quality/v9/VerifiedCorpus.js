import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import crypto from 'node:crypto';
const ROOT=resolve(new URL('../../../',import.meta.url).pathname);
const iso=v=>{const d=new Date(v);return Number.isNaN(d.valueOf())?null:d.toISOString()};
const hash=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
export function validateVerifiedRecord(r,{kind}={}){
 const e=[]; if(!r?.id)e.push('missing id'); if(r?.verification?.status!=='verified')e.push('verification.status must be verified');
 if(!r?.source?.citation)e.push('missing source.citation'); if(!r?.source?.retrievedAt||!iso(r.source.retrievedAt))e.push('invalid source.retrievedAt');
 if(kind==='chart' && !r?.calculation?.expected)e.push('missing calculation.expected');
 if(kind==='outcome' && (!r?.chartId||!r?.event?.date||!iso(r.event.date)))e.push('outcome requires chartId and event.date');
 return {valid:e.length===0,errors:e};
}
export async function loadJson(file){return JSON.parse(await readFile(resolve(ROOT,file),'utf8'));}
export function corpusDigest(records=[]){return hash(records.map(r=>({id:r.id,source:r.source,verification:r.verification})))}
export function validateCorpusManifest(m){const e=[]; if(!m?.version)e.push('missing version'); if(!Array.isArray(m?.records))e.push('records must be array'); if(m?.records && m.digest!==corpusDigest(m.records))e.push('digest mismatch'); return {valid:e.length===0,errors:e};}
