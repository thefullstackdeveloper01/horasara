import {readFile} from 'node:fs/promises';
import {validateOutcomeCorpus} from '../../src/quality/v10/OutcomeValidation.js';
const p='dataset/used/validation/v10_outcome-corpus.json';const d=JSON.parse(await readFile(p,'utf8'));const r=validateOutcomeCorpus(d.cases);console.log(`V10 outcome corpus: ${r.cases} verified cases loaded; status=${d.status}; valid=${r.valid}`);if(!r.valid){console.error(r.errors.join('\n'));process.exit(1)}
