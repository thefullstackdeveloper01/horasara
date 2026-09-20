import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run=promisify(execFile);
const dir=await mkdtemp(join(tmpdir(),'jyotish-mutant-'));
try{
  const source=`export function normalizeDegrees(x){return ((x%360)+360)%360}`;
  const test=`import {normalizeDegrees} from './mutant.mjs'; if(normalizeDegrees(-1)!==359) process.exit(1);`;
  await writeFile(join(dir,'mutant.mjs'),source); await writeFile(join(dir,'test.mjs'),test);
  const good=await run(process.execPath,[join(dir,'test.mjs')]); assert.equal(good.stderr,'');
  await writeFile(join(dir,'mutant.mjs'),source.replace('360)%360','359)%360'));
  await assert.rejects(run(process.execPath,[join(dir,'test.mjs')]));
  console.log('Mutation smoke test: 2 mutants (1 live baseline, 1 killed), 0 failures');
} finally { await rm(dir,{recursive:true,force:true}); }
