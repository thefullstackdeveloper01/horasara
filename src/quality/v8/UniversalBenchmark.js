import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('../../../', import.meta.url).pathname);
const angularDistance = (a,b) => { const d=Math.abs(Number(a)-Number(b))%360; return Math.min(d,360-d); };

export function compareReference(actual, expected, tolerance=0.1){
  const rows=[];
  for(const [key, value] of Object.entries(expected||{})){
    const got=actual?.[key];
    if(typeof value==='number' && typeof got==='number') rows.push({key,expected:value,actual:got,error:angularDistance(got,value),pass:angularDistance(got,value)<=tolerance});
    else rows.push({key,expected:value,actual:got,pass:JSON.stringify(value)===JSON.stringify(got)});
  }
  return {passed:rows.every(r=>r.pass), rows};
}

export async function runReferenceBenchmark({calculate,cases=[],tolerance=0.1}={}){
  if(typeof calculate!=='function') throw new TypeError('calculate must be a function');
  const results=[];
  for(const c of cases){
    const actual=await calculate(c.input);
    results.push({id:c.id, ...compareReference(actual,c.expected,tolerance)});
  }
  const passed=results.filter(r=>r.passed).length;
  return {version:'8.0.0',cases:results.length,passed,failed:results.length-passed,accuracy:results.length?passed/results.length:null,results};
}

export async function loadReferenceCases(file=resolve(ROOT,'dataset/used/validation/v8_reference-benchmark.json')){
  const data=JSON.parse(await readFile(file,'utf8'));
  if(!Array.isArray(data.cases)) throw new Error('reference benchmark cases must be an array');
  return data.cases;
}

export function validateReferenceCase(c){
  const errors=[];
  if(!c?.id) errors.push('missing id');
  if(!c?.input || typeof c.input!=='object') errors.push('missing input');
  if(!c?.expected || typeof c.expected!=='object') errors.push('missing expected');
  if(c?.source?.verificationStatus!=='verified') errors.push('reference case is not independently verified');
  return {valid:errors.length===0,errors};
}

export function validateDeclaredPaths(paths=[]){ return paths.map(path=>({path,exists:existsSync(resolve(ROOT,path))})); }
