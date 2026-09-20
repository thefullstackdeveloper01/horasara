import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { RazorpayPaymentService } from '../src/payment/RazorpayPaymentService.js';
import { SubscriptionService } from '../src/subscription/SubscriptionService.js';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const svc=new RazorpayPaymentService({keyId:'rzp_test_demo',keySecret:'secret',webhookSecret:'webhook'});
const order='order_test_123', payment='pay_test_456';
const signature=crypto.createHmac('sha256','secret').update(`${order}|${payment}`).digest('hex');
assert.equal(svc.isConfigured(),true);
assert.equal(svc.verifyCheckoutSignature({orderId:order,paymentId:payment,signature}),true);
assert.equal(svc.verifyCheckoutSignature({orderId:order,paymentId:payment,signature:'bad'}),false);
const raw='{"event":"payment.captured"}';
const wh=crypto.createHmac('sha256','webhook').update(raw).digest('hex');
assert.equal(svc.verifyWebhookSignature(raw,wh),true);
assert.equal(svc.verifyWebhookSignature(raw,'bad'),false);

const dir=await mkdtemp(join(tmpdir(),'jv-paid-sub-'));
const subscriptions=new SubscriptionService({filePath:join(dir,'subscriptions.json'),clock:()=>new Date('2026-09-18T01:30:00Z')});
const pending=await subscriptions.createPendingPayment({name:'Paid Smoke',email:'paid@example.com',topics:['overview'],timezone:'Asia/Kolkata',birth:{year:1990,month:5,day:15,hour:14,min:30,sec:0,lat:28.6139,lon:77.2090,tz:5.5}}, {billingPeriod:'monthly',amountInr:499,currency:'INR',orderId:order});
assert.equal(pending.status,'pending_payment');
const active=await subscriptions.markPayment(pending.id,{status:'paid',orderId:order,paymentId:payment,method:'upi'});
assert.equal(active.status,'active');
assert.equal(active.deliveryHour,7); assert.equal(active.deliveryMinute,0); assert.equal(active.payment.status,'paid');
assert.ok(active.paidUntil);
assert.equal(subscriptions.isDue(active,new Date('2026-09-18T01:30:00Z')),true); // 07:00 Asia/Kolkata
console.log('Payment signature + paid subscription smoke test: PASS');
