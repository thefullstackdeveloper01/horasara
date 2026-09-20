import crypto from 'node:crypto';
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function validateEvidenceRecord(r){const errors=[];if(!r?.id)errors.push('missing id');if(!['calculation','outcome','benchmark','review'].includes(r?.type))errors.push('invalid type');if(r?.status!=='verified')errors.push('status must be verified');if(!r?.source?.citation)errors.push('source.citation required');if(!r?.source?.retrievedAt)errors.push('source.retrievedAt required');return {valid:!errors.length,errors};}
export function buildEvidenceLedger(records=[]){const checks=records.map(validateEvidenceRecord);return {version:'11.0',count:records.length,verified:checks.filter(x=>x.valid).length,invalid:checks.filter(x=>!x.valid).length,valid:checks.every(x=>x.valid),digest:hash(records),records};}
export function evidenceGate(records=[],minimum=1){const r=buildEvidenceLedger(records);return {ready:r.valid&&r.verified>=minimum,count:r.verified,minimum};}
