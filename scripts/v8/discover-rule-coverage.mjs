import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const root='dataset/used'; let json=0, ruleLike=0;
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.name.endsWith('.json')){json++;try{const x=JSON.parse(await readFile(p,'utf8'));const s=JSON.stringify(x);if(/rule|condition|interpret|prediction|yoga|dosha|muhurta|dasha/i.test(s))ruleLike++;}catch{}}}}
await walk(root);const report={version:'8.0.0',jsonFiles:json,ruleLikeDatasets:ruleLike,generatedAt:new Date().toISOString()};await writeFile('dataset/used/validation/v8_rule-coverage-discovery.json',JSON.stringify(report,null,2)+'\n');console.log(report);
