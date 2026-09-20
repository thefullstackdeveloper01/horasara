import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SubscriptionService } from '../src/subscription/SubscriptionService.js';

const dir=await mkdtemp(join(tmpdir(),'jyotiveda-enterprise-'));
const service=new SubscriptionService({filePath:join(dir,'subscriptions.json'),clock:()=>new Date('2026-09-17T02:00:00Z')});
const s=await service.create({
 name:'Test Subscriber',email:'test@example.com',frequency:'daily',report:'daily',deliveryHour:7,timezone:'Asia/Kolkata',
 birth:{year:1990,month:5,day:15,hour:14,min:30,sec:0,lat:28.6139,lon:77.2090,tz:5.5}
});
assert.equal(s.status,'active'); assert.ok(s.manageToken.length>20); assert.deepEqual(s.channels,['email']);
assert.equal(service.isDue(s),true);
const list=await service.list(); assert.equal(list.length,1); assert.equal(list[0].manageToken,undefined);
const unsub=await service.unsubscribe(s.id,s.manageToken); assert.equal(unsub.status,'unsubscribed');
assert.equal((await service.list()).length,0);
console.log('Enterprise subscription smoke test: PASS');
