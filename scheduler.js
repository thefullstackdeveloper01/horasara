#!/usr/bin/env node
import { createDefaultScheduler } from './src/subscription/ReportScheduler.js';
const scheduler=await createDefaultScheduler({filePath:process.env.HORASAAR_SUBSCRIPTIONS_FILE||'data/runtime/subscriptions.json'});
if(process.argv.includes('--once')) {
  const result=await scheduler.runOnce(); console.log(JSON.stringify(result,null,2)); process.exit(result.results.some(r=>r.status==='failed')?1:0);
}
console.log('HoraSaar enterprise scheduler running. Run this daemon continuously for timezone-aware daily 07:00 delivery, or use `node scheduler.js --once` from a scheduler that invokes it frequently enough to cover all subscriber timezones.');
await scheduler.daemon({pollMs:Number(process.env.SCHEDULER_POLL_MS||60000)});
