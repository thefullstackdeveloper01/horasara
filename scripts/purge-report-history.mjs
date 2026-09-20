/** JSON database retention helper. Keeps subscriber data untouched. */
import { JsonDatabase } from '../src/infrastructure/persistence/JsonDatabase.js';
const days=Number(process.env.RETENTION_DAYS||90),cutoff=Date.now()-days*86400000;
const db=new JsonDatabase({filePath:'data/runtime/report-history.json',defaults:{version:1,reports:[]}});
await db.transaction(x=>{x.reports=x.reports.filter(r=>new Date(r.createdAt).getTime()>=cutoff);return x}); console.log(`Report history retained for ${days} days`);
