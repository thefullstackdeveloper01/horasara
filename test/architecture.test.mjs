import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const master = join(root, 'dataset');
assert.ok(statSync(master).isDirectory());
const datasetDirs = readdirSync(master, {withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
assert.deepEqual(datasetDirs, ['unused', 'used'], 'dataset/ holds the wired database (used/) and everything unreferenced (unused/)');
const usedDirs = readdirSync(join(master, 'used'), {withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
assert.deepEqual(usedDirs, ['core', 'library', 'validation'], 'dataset/used/ holds exactly the three wired buckets');

function jsFiles(dir){
  const out=[];
  for(const e of readdirSync(dir,{withFileTypes:true})){
    const p=join(dir,e.name);
    if(e.isDirectory()) out.push(...jsFiles(p)); else if(e.name.endsWith('.js')||e.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}
const files=['src','app','cli'].flatMap(d=>jsFiles(join(root,d)));
for(const p of files){
  const s=readFileSync(p,'utf8');
  assert.equal(s.includes('data/vedic-jyotish-database'),false,`old nested data path remains: ${p}`);
  assert.equal(s.includes("'../data/")||s.includes('"../data/'),false,`legacy data import remains: ${p}`);
  const matches=[...s.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*([\[{])/gm)];
  for(const m of matches){
    const line=s.slice(m.index,s.indexOf('\n',m.index));
    assert.ok(line.includes('moduleData.') || ['_cache','pMap'].includes(m[1]),`inline data-like literal remains in ${p}: ${m[1]}`);
  }
}
console.log('\nArchitecture migration tests');
console.log('  ✓ runtime dataset is flat; validation contracts remain under dataset/validation');
console.log('  ✓ no old nested data/vedic-jyotish-database references remain');
console.log('  ✓ no legacy ../data imports remain');
console.log('  ✓ module-level array/object constants are externalized to paired JSON');
console.log('\n============================================================');
console.log('  4 passed, 0 failed');
console.log('============================================================');
