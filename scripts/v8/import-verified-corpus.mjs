import { readFile, writeFile } from 'node:fs/promises';
import { validateHistoricalChart, validatePredictionOutcome } from '../../src/quality/v8/CorpusValidator.js';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/v8/import-verified-corpus.mjs <json>');process.exit(2);}
const data=JSON.parse(await readFile(file,'utf8'));
const charts=(data.charts||[]).map(validateHistoricalChart), outcomes=(data.outcomes||[]).map(validatePredictionOutcome);
const errors=[...charts.flatMap(x=>x.errors),...outcomes.flatMap(x=>x.errors)];
if(errors.length){console.error(JSON.stringify({status:'REJECTED',errors},null,2));process.exit(1);}
const out={version:'8.0.0',charts:data.charts||[],outcomes:data.outcomes||[],importedAt:new Date().toISOString(),status:'VERIFIED_IMPORT'};
await writeFile('dataset/used/validation/v8_corpus-manifest.json',JSON.stringify(out,null,2)+'\n');
console.log(`Accepted ${out.charts.length} charts and ${out.outcomes.length} outcomes.`);
