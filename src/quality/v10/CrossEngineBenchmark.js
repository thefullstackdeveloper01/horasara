import crypto from 'node:crypto';
export const ENGINE_CONTRACT={version:'10.0',fields:['input','calculation','conventions','output','tolerance','source']};
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function compareValues(a,b,tolerance=0){if(typeof a==='number'&&typeof b==='number')return {match:Math.abs(a-b)<=tolerance,delta:Math.abs(a-b)};return {match:JSON.stringify(a)===JSON.stringify(b),delta:null};}
export function benchmarkEngines(cases=[],engines={}){const names=Object.keys(engines);const rows=[];for(const c of cases){const results={};for(const n of names){try{results[n]=engines[n](c.input)}catch(e){results[n]={error:e.message}}}rows.push({id:c.id,results,reference:c.reference||null});}return {version:'10.0',engines:names,cases:rows.length,rows,digest:digest(rows)};}
export function buildBenchmarkMatrix(report){const names=report.engines||[];return {engines:names,cases:report.cases,comparisons:names.flatMap((a,i)=>names.slice(i+1).map(b=>({left:a,right:b,status:'READY_FOR_COMPARISON'}))),independentEvidenceRequired:true};}
