import crypto from 'node:crypto';
import { JsonStore } from '../infrastructure/persistence/JsonStore.js';
import { EVENT_CONFIG } from '../prediction/UserPredictionPreferences.js';

const FREQUENCIES = new Set(['daily','weekly','monthly','yearly']);
const CHANNELS = new Set(['email','sms']);
const REPORTS = new Set(['daily','weekly','monthly','yearly','complete']);
const PREFERENCES = new Set(Object.keys(EVENT_CONFIG));
const PAYMENT_STATUSES = new Set(['pending','paid','failed','refunded']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[1-9]\d{7,14}$/;

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const token = () => crypto.randomBytes(32).toString('base64url');

function addBillingPeriod(from, billingPeriod) {
  const d = new Date(from);
  if (billingPeriod === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}
const clean = v => typeof v === 'string' ? v.trim() : v;

function assertSubscription(input) {
  const x = input || {};
  if (!clean(x.name)) throw new Error('name is required');
  if (!x.birth || typeof x.birth !== 'object') throw new Error('birth details are required');
  if (!Number.isInteger(Number(x.birth.year)) || !Number.isInteger(Number(x.birth.month)) || !Number.isInteger(Number(x.birth.day))) throw new Error('birth date is invalid');
  if (!Number.isFinite(Number(x.birth.hour)) || !Number.isFinite(Number(x.birth.min))) throw new Error('birth time is invalid');
  if (!Number.isFinite(Number(x.birth.lat)) || !Number.isFinite(Number(x.birth.lon))) throw new Error('birth coordinates are required');
  if (x.birth.tz !== undefined && !Number.isFinite(Number(x.birth.tz))) throw new Error('birth timezone is invalid');
  if (x.birth.timeZone !== undefined && typeof x.birth.timeZone !== 'string') throw new Error('birth IANA timezone is invalid');
  const email = clean(x.email);
  const mobile = clean(x.mobile);
  if (!email && !mobile) throw new Error('at least one delivery channel is required');
  if (email && !EMAIL_RE.test(email)) throw new Error('email format is invalid');
  if (mobile && !PHONE_RE.test(mobile.replace(/[\s()-]/g,''))) throw new Error('mobile must be in international format, e.g. +919876543210');
  const frequency = clean(x.frequency || 'daily').toLowerCase();
  const report = clean(x.report || frequency).toLowerCase();
  const preference = clean(x.preference || 'general').toLowerCase();
  if (!PREFERENCES.has(preference)) throw new Error('invalid prediction preference');
  if (!FREQUENCIES.has(frequency)) throw new Error('frequency must be daily, weekly, monthly or yearly');
  if (!REPORTS.has(report)) throw new Error('report must be daily, weekly, monthly, yearly or complete');
  return { ...x, name: clean(x.name), email, mobile, frequency, report, preference };
}

function localDateParts(date, timeZone) {
  const d = new Date(date);
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year:'numeric', month:'2-digit', day:'2-digit', weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false });
  const parts = Object.fromEntries(fmt.formatToParts(d).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return parts;
}

export class SubscriptionService {
  constructor({ filePath='data/runtime/subscriptions.json', clock=()=>new Date() }={}) {
    this.store = new JsonStore(filePath);
    this.clock = clock;
  }

  async list({ includeUnconfirmed=false }={}) {
    const db = await this.store.read({version:1, subscriptions:[]});
    return db.subscriptions.filter(s => includeUnconfirmed || s.status === 'active').map(s => ({...s, manageToken:undefined}));
  }

  async getById(subscriptionId) {
    const db = await this.store.read({version:1, subscriptions:[]});
    return db.subscriptions.find(s=>s.id===subscriptionId) || null;
  }

  async create(input) {
    const x = assertSubscription(input);
    const db = await this.store.read({version:1, subscriptions:[]});
    const createdAt = nowIso();
    const s = {
      id:id(), status:'active', createdAt, updatedAt:createdAt,
      name:x.name, email:x.email || null, mobile:x.mobile || null,
      channels:[...(x.email ? ['email'] : []), ...(x.mobile ? ['sms'] : [])],
      birth:{
        name:x.name, year:Number(x.birth.year), month:Number(x.birth.month), day:Number(x.birth.day),
        hour:Number(x.birth.hour), min:Number(x.birth.min), sec:Number(x.birth.sec||0),
        lat:Number(x.birth.lat), lon:Number(x.birth.lon),
        ...(x.birth.tz !== undefined ? {tz:Number(x.birth.tz)} : {}),
        ...(x.birth.timeZone ? {timeZone:x.birth.timeZone} : {}),
        elevation:Number(x.birth.elevation||0),
        ayanamsaMode:x.birth.ayanamsaMode || 'lahiri',
        houseSystem:x.birth.houseSystem || 'whole',
        nodeMode:x.birth.nodeMode || 'true'
      },
      frequency:x.frequency, report:x.report, preference:x.preference, deliveryHour:7,
      weekday:Number.isInteger(Number(x.weekday)) ? Number(x.weekday) : 1,
      monthDay:Number.isInteger(Number(x.monthDay)) ? Math.min(28,Math.max(1,Number(x.monthDay))) : 1,
      yearMonthDay:x.yearMonthDay || '01-01',
      timezone:x.timezone || x.birth.timeZone || 'Asia/Kolkata',
      locale:x.locale || 'en-IN', chartStyle:x.chartStyle || 'both',
      topics:Array.isArray(x.topics) && x.topics.length ? x.topics : ['overview','transits','dasha','yogas','doshas','remedies'],
      consent:{terms:true, marketing:Boolean(x.marketing), at:createdAt},
      manageToken:token(), lastDeliveredAt:null, lastDeliveryStatus:null
    };
    db.subscriptions.push(s);
    await this.store.write(db);
    return {...s, manageToken:s.manageToken};
  }

  async createPendingPayment(input, paymentContext = {}) {
    const x = assertSubscription({ ...input, frequency: 'daily', deliveryHour: 7 });
    const db = await this.store.read({version:1, subscriptions:[]});
    const createdAt = nowIso();
    const billingPeriod = paymentContext.billingPeriod === 'yearly' ? 'yearly' : 'monthly';
    const paidUntil = null;
    const s = {
      id:id(), status:'pending_payment', createdAt, updatedAt:createdAt,
      name:x.name, email:x.email || null, mobile:x.mobile || null,
      channels:[...(x.email ? ['email'] : []), ...(x.mobile ? ['sms'] : [])],
      birth:{
        name:x.name, year:Number(x.birth.year), month:Number(x.birth.month), day:Number(x.birth.day),
        hour:Number(x.birth.hour), min:Number(x.birth.min), sec:Number(x.birth.sec||0),
        lat:Number(x.birth.lat), lon:Number(x.birth.lon),
        ...(x.birth.tz !== undefined ? {tz:Number(x.birth.tz)} : {}),
        ...(x.birth.timeZone ? {timeZone:x.birth.timeZone} : {}),
        elevation:Number(x.birth.elevation||0),
        ayanamsaMode:x.birth.ayanamsaMode || 'lahiri', houseSystem:x.birth.houseSystem || 'whole', nodeMode:x.birth.nodeMode || 'true'
      },
      frequency:'daily', report:x.report || 'daily', preference:x.preference, deliveryHour:7, deliveryMinute:0,
      weekday:1, monthDay:1, yearMonthDay:'01-01',
      timezone:x.timezone || x.birth.timeZone || 'Asia/Kolkata', locale:x.locale || 'en-IN', chartStyle:x.chartStyle || 'both',
      topics:Array.isArray(x.topics) && x.topics.length ? x.topics : ['overview','transits','dasha','yogas','doshas','remedies'],
      consent:{terms:true, marketing:Boolean(x.marketing), at:createdAt},
      billingPeriod, amountInr:Number(paymentContext.amountInr || 0), currency:paymentContext.currency || 'INR',
      payment:{provider:'razorpay', status:'pending', orderId:paymentContext.orderId || null, paymentId:null, method:null, paidAt:null},
      paidUntil, manageToken:token(), lastDeliveredAt:null, lastDeliveryStatus:null
    };
    db.subscriptions.push(s);
    await this.store.write(db);
    return {...s, manageToken:s.manageToken};
  }

  async markPayment(subscriptionId, patch = {}) {
    const db=await this.store.read({version:1,subscriptions:[]});
    const s=db.subscriptions.find(x=>x.id===subscriptionId);
    if(!s) throw new Error('subscription not found');
    s.payment={...(s.payment||{}), ...Object.fromEntries(Object.entries(patch).filter(([,v])=>v!==undefined && v!==null))};
    if (s.payment.status === 'paid') {
      s.status='active';
      s.payment.paidAt=s.payment.paidAt || nowIso();
      s.paidUntil=s.paidUntil || addBillingPeriod(s.payment.paidAt, s.billingPeriod);
    }
    if (s.payment.status === 'failed') s.status='payment_failed';
    s.updatedAt=nowIso();
    await this.store.write(db);
    return {...s,manageToken:undefined};
  }

  async expireDuePaidSubscriptions(at=this.clock()) {
    const db=await this.store.read({version:1,subscriptions:[]});
    let changed=false;
    const now=new Date(at);
    for (const s of db.subscriptions) {
      if (s.status==='active' && s.paidUntil && new Date(s.paidUntil) <= now) { s.status='expired'; s.updatedAt=nowIso(); changed=true; }
    }
    if(changed) await this.store.write(db);
    return changed;
  }

  async unsubscribe(subscriptionId, manageToken) {
    const db = await this.store.read({version:1, subscriptions:[]});
    const s=db.subscriptions.find(x=>x.id===subscriptionId);
    const stored=Buffer.from(String(s?.manageToken||'')); const supplied=Buffer.from(String(manageToken||''));
    if (!s || stored.length!==supplied.length || !crypto.timingSafeEqual(stored,supplied)) throw new Error('invalid subscription management token');
    s.status='unsubscribed'; s.updatedAt=nowIso();
    await this.store.write(db);
    return {id:s.id,status:s.status};
  }

  async update(subscriptionId, manageToken, patch) {
    const db = await this.store.read({version:1, subscriptions:[]});
    const s=db.subscriptions.find(x=>x.id===subscriptionId);
    if (!s || String(s.manageToken)!==String(manageToken)) throw new Error('invalid subscription management token');
    const allowed=['frequency','report','preference','weekday','monthDay','timezone','locale','chartStyle','topics','email','mobile'];
    for (const k of allowed) if (patch[k] !== undefined) s[k]=patch[k];
    if (s.email && !EMAIL_RE.test(s.email)) throw new Error('email format is invalid');
    if (s.mobile && !PHONE_RE.test(String(s.mobile).replace(/[\s()-]/g,''))) throw new Error('mobile format is invalid');
    s.deliveryHour=7; s.deliveryMinute=0;
    s.channels=[...(s.email?['email']:[]),...(s.mobile?['sms']:[])];
    if (!s.channels.length) throw new Error('at least one delivery channel is required');
    if (s.frequency && !FREQUENCIES.has(s.frequency)) throw new Error('invalid frequency');
    if (s.preference && !PREFERENCES.has(String(s.preference).toLowerCase())) throw new Error('invalid prediction preference');
    s.preference=String(s.preference||'general').toLowerCase();
    s.updatedAt=nowIso(); s.status='active';
    await this.store.write(db); return {...s,manageToken:undefined};
  }

  isDue(subscription, at=this.clock()) {
    if (subscription.status!=='active') return false;
    if (subscription.payment?.status && subscription.payment.status !== 'paid') return false;
    if (subscription.paidUntil && new Date(subscription.paidUntil) <= new Date(at)) return false;
    const p=localDateParts(at,subscription.timezone||'UTC');
    if (Number(p.hour)!==Number(subscription.deliveryHour)) return false;
    const last=subscription.lastDeliveredAt ? new Date(subscription.lastDeliveredAt) : null;
    const sameDay=last && localDateParts(last,subscription.timezone||'UTC').year===p.year && localDateParts(last,subscription.timezone||'UTC').month===p.month && localDateParts(last,subscription.timezone||'UTC').day===p.day;
    if (sameDay) return false;
    if (subscription.frequency==='daily') return true;
    if (subscription.frequency==='weekly') {
      const days={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
      return days[p.weekday]===Number(subscription.weekday);
    }
    if (subscription.frequency==='monthly') return Number(p.day)===Number(subscription.monthDay);
    if (subscription.frequency==='yearly') return `${p.month}-${p.day}`===String(subscription.yearMonthDay);
    return false;
  }

  async markDelivery(subscriptionId,status,detail={}) {
    const db=await this.store.read({version:1,subscriptions:[]});
    const s=db.subscriptions.find(x=>x.id===subscriptionId); if(!s) return;
    s.lastDeliveredAt=nowIso(); s.lastDeliveryStatus={status,...detail}; s.updatedAt=nowIso();
    await this.store.write(db);
  }
}

export { assertSubscription, FREQUENCIES, CHANNELS, PREFERENCES };
