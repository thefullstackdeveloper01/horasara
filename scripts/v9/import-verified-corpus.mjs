import fs from 'node:fs/promises';
import { validateVerifiedRecord } from '../../src/quality/v9/VerifiedCorpus.js';
const [file,kind='chart']=process.argv.slice(2); if(!file){console.error('Usage: node scripts/v9/import-verified-corpus.mjs <json-file> [chart|outcome]');process.exit(2)}
const data=JSON.parse(await fs.readFile(file,'utf8'));const records=Array.isArray(data)?data:(data.records||[]);const results=records.map(r=>validateVerifiedRecord(r,{kind}));const invalid=results.filter(r=>!r.valid);console.log(JSON.stringify({kind,records:records.length,valid:records.length-invalid.length,invalid:invalid.length,details:invalid},null,2));process.exit(invalid.length?1:0);
