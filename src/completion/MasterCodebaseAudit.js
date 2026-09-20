/**
 * HoraSaar V1 Master Codebase Audit
 * Dependency-free, deterministic capability/policy audit.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import requirements from '../../dataset/used/core/master-requirements.json' with { type: 'json' };

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const walk=(dir)=>{const out=[];if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);e.isDirectory()?out.push(...walk(f)):out.push(f)}return out};
const rel=p=>path.relative(ROOT,p).replaceAll(path.sep,'/');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=(d,exts)=>walk(path.join(ROOT,d)).filter(f=>exts.some(e=>f.endsWith(e)));
const exists=x=>fs.existsSync(path.join(ROOT,x));
function fingerprint(fsx){return hash(fsx.sort().map(f=>rel(f)+':'+hash(fs.readFileSync(f))).join('\n'))}

export function runMasterAudit(){
 const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
 const lock=JSON.parse(fs.readFileSync(path.join(ROOT,'package-lock.json'),'utf8'));
 const source=files('src',['.js','.mjs']), tests=files('test',['.js','.mjs']), data=files('dataset/used',['.json']);
 const malformed=[];for(const f of data){try{JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){malformed.push({file:rel(f),error:e.message})}}
 const req= requirements.requirements.map(r=>({...r,missing:(r.source||[]).filter(x=>!exists(x))})).map(r=>({...r,effectiveStatus:r.missing.length?'FAIL':r.status}));
 const packageEntries=Object.keys(lock.packages||{}).filter(k=>k&&k!=='');
 const runtimeDeps=Object.keys(pkg.dependencies||{}),optionalDeps=Object.keys(pkg.optionalDependencies||{}),devDeps=Object.keys(pkg.devDependencies||{});
 const forbiddenPattern=/\b(?:import|require)\s*\(\s*['"](?:http|https):/i;
 const networkImports=source.filter(f=>forbiddenPattern.test(fs.readFileSync(f,'utf8'))).map(rel);
 const pass=req.every(r=>r.effectiveStatus!=='FAIL')&&malformed.length===0&&runtimeDeps.length===0&&optionalDeps.length===0&&devDeps.length===0&&networkImports.length===0;
 return Object.freeze({
   auditVersion:'1.0.0',
   pass,
   policy:requirements.policy,
   package:{name:pkg.name,version:pkg.version,runtimeDependencies:runtimeDeps,optionalDependencies:optionalDeps,devDependencies:devDeps,lockfilePackageEntries:packageEntries.length},
   counts:{sourceFiles:source.length,testFiles:tests.length,datasets:data.length},
   datasets:{validJson:malformed.length===0,malformed},
   networkImports,
   requirements:req,
   fingerprints:{source:fingerprint(source),datasets:fingerprint(data)},
   notes:[
     'This audit proves structural/policy completeness, not mathematical truth of every classical proposition.',
     'The bundled internal ephemeris is intentionally reported with its documented truncated-series precision; no Swiss/JPL equivalence is claimed.',
     'Unsupported or lineage-dependent astrology is surfaced as explicit variant/coverage metadata instead of invented results.'
   ]
 });
}
export function assertMasterAudit(){const r=runMasterAudit();if(!r.pass)throw new Error('Master audit failed');return r}
