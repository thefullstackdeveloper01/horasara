import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SubscriptionService } from '../src/subscription/SubscriptionService.js';
import { SpoolTransport, buildSubscriberReport } from '../src/subscription/DeliveryService.js';
import { ReportScheduler } from '../src/subscription/ReportScheduler.js';
import { calculateChart } from '../src/engine/InternalCalculationEngine.js';

const dir=await mkdtemp(join(tmpdir(),'jv-scheduler-'));
const now=()=>new Date('2026-09-17T01:30:00Z'); // 07:00 Asia/Kolkata
const subscriptions=new SubscriptionService({filePath:join(dir,'subs.json'),clock:now});
const s=await subscriptions.create({
 name:'Scheduler Smoke',email:'smoke@example.com',frequency:'daily',report:'daily',deliveryHour:7,timezone:'Asia/Kolkata',
 birth:{year:1990,month:5,day:15,hour:14,min:30,sec:0,lat:28.6139,lon:77.2090,tz:5.5}
});
const spool=new SpoolTransport({dir:join(dir,'outbox')});
const scheduler=new ReportScheduler({subscriptionService:subscriptions,transports:{email:spool,sms:spool},clock:now,calculate:calculateChart});
const result=await scheduler.runOnce();
assert.equal(result.due,1); assert.equal(result.results[0].status,'sent');
const files=await readdir(join(dir,'outbox')); assert.equal(files.length,1);
console.log('Enterprise scheduler + real calculation + offline email spool smoke test: PASS');
