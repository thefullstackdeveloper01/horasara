#!/usr/bin/env node
import fs from 'node:fs';
import {validateVerifiedChart,validateOutcome} from '../../src/quality/v13/EvidenceCompletionEngine.js';
const [,,type,file]=process.argv;
if(!['chart','outcome'].includes(type)||!file) throw new Error('usage: node scripts/v13/import-verified-json.mjs <chart|outcome> <file.json>');
const data=JSON.parse(fs.readFileSync(file,'utf8')); const records=Array.isArray(data)?data:(data.records||[]);
const validator=type==='chart'?validateVerifiedChart:validateOutcome;
const results=records.map((r,i)=>({index:i,id:r.id||null,...validator(r)}));
const bad=results.filter(r=>!r.valid); console.log(JSON.stringify({type,total:records.length,valid:records.length-bad.length,invalid:bad.length,invalidRecords:bad.slice(0,100)},null,2));
if(bad.length) process.exit(2);
