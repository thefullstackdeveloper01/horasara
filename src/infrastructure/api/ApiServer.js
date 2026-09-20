import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendSubscriptionConfirmation } from '../../subscription/SubscriptionConfirmation.js';
import { adminConfig, parseCookies, verifyCredentials, issueSession, verifySession, setSessionCookie, clearSessionCookie } from '../../admin/AdminAuth.js';

const MAX_BODY_BYTES = 1_048_576;
const WEB_VERSION = '1.0.0-production';
const ADMIN_SESSION_TTL = 8 * 60 * 60;
const RATE_WINDOW_MS = 60 * 1000;
const ADMIN_LOGIN_MAX = 5;
const PREDICTION_MAX = Number(process.env.RATE_LIMIT_PREDICTION || 30);
const CHECKOUT_MAX = Number(process.env.RATE_LIMIT_CHECKOUT || 10);
const PAYMENT_VERIFY_MAX = Number(process.env.RATE_LIMIT_PAYMENT_VERIFY || 20);
const PUBLIC_CALCULATOR_MAX = Number(process.env.RATE_LIMIT_CALCULATOR || 30);
const PUBLIC_MILAN_MAX = Number(process.env.RATE_LIMIT_MILAN || 10);
const SAFE_KEY=/^[A-Za-z0-9_.-]{1,80}$/;
function sanitizeValue(value, depth=0){
  if(depth>8) throw Object.assign(new Error('INPUT_NESTING_TOO_DEEP'),{code:'INVALID_REQUEST'});
  if(value===null || typeof value==='boolean' || typeof value==='number') return value;
  if(typeof value==='string') return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').slice(0,10000);
  if(Array.isArray(value)) return value.slice(0,100).map(v=>sanitizeValue(v,depth+1));
  if(typeof value==='object'){
    const out={};
    for(const [k,v] of Object.entries(value)){ if(!SAFE_KEY.test(k) || ['__proto__','prototype','constructor'].includes(k)) throw Object.assign(new Error('INVALID_INPUT_KEY'),{code:'INVALID_REQUEST'}); out[k]=sanitizeValue(v,depth+1); }
    return out;
  }
  throw Object.assign(new Error('INVALID_INPUT_TYPE'),{code:'INVALID_REQUEST'});
}

function requestIp(request){ return String(request.headers['x-forwarded-for']||request.socket?.remoteAddress||'unknown').split(',')[0].trim(); }
function makeRateLimiter(limit, windowMs=RATE_WINDOW_MS){
  const hits=new Map();
  return {
    allow(key){
      const now=Date.now(); const k=String(key||'unknown'); const prev=hits.get(k);
      if(!prev || now-prev.start>=windowMs){ hits.set(k,{start:now,count:1}); return true; }
      prev.count+=1; return prev.count<=limit;
    },
    reset(key){ hits.delete(String(key||'unknown')); },
    sweep(){ const now=Date.now(); for(const [k,v] of hits) if(now-v.start>=windowMs) hits.delete(k); }
  };
}
function contentTypeFor(ext){
  switch(ext){
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml; charset=utf-8';
    case '.webmanifest': return 'application/manifest+json; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.xml': return 'application/xml; charset=utf-8';
    default: return 'application/octet-stream';
  }
}
function originFromRequest(request){
  if(process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/,'');
  const proto=String(request.headers['x-forwarded-proto']||'http').split(',')[0].trim();
  const host=request.headers['x-forwarded-host']||request.headers.host||'localhost';
  return `${proto}://${host}`;
}
function injectHtml(html, request){ return html.replaceAll('__PUBLIC_BASE_URL__',originFromRequest(request)); }
async function sendFile(response,filePath,request){
  const ext=extname(filePath).toLowerCase();
  response.setHeader('content-type',contentTypeFor(ext));
  response.setHeader('cache-control',ext==='.html'?'no-cache':'public, max-age=86400');
  response.statusCode=200;
  const buf=await readFile(filePath);
  response.end(ext==='.html'?injectHtml(buf.toString('utf8'),request):buf);
}
// Resolve the plan record for an activated subscription so the confirmation
// email can name the plan the customer actually bought. The subscription
// record persists `billingPeriod` and `amountInr`, so the plan is matched on
// those rather than on a planId that is never stored. Returns null when the
// dataset is unreadable — the email template already degrades gracefully.
async function resolvePlanForSubscription(subscription, webRoot){
  try {
    const plans=JSON.parse(await readFile(join(webRoot,'../dataset/used/core/subscription-plans.json'),'utf8'));
    const list=Array.isArray(plans.plans)?plans.plans:[];
    return list.find(p=>p.billingPeriod===subscription?.billingPeriod && Number(p.amountInr)===Number(subscription?.amountInr))
        || list.find(p=>p.billingPeriod===subscription?.billingPeriod)
        || null;
  } catch { return null; }
}

// A missing page used to return bare text or a JSON blob. Anything that looks
// like a page request gets the styled 404 instead; API paths keep JSON.
async function sendNotFound(response,request,webRoot,path=''){
  const wantsHtml=String(request.headers.accept||'').includes('text/html');
  if(!wantsHtml){ response.statusCode=404; response.setHeader('content-type','application/json; charset=utf-8'); response.end(JSON.stringify({error:'NOT_FOUND',path})); return; }
  try {
    const html=await readFile(join(webRoot,'404.html'),'utf8');
    response.statusCode=404; response.setHeader('content-type','text/html; charset=utf-8'); response.setHeader('cache-control','no-store');
    response.end(injectHtml(html,request).replaceAll('__PATH__',String(path).replace(/[<>&"]/g,'')));
  } catch {
    response.statusCode=404; response.setHeader('content-type','text/html; charset=utf-8');
    response.end('<!doctype html><meta charset="utf-8"><title>Not found | HoraSaar</title><p>Page not found. <a href="/">Return home</a>.</p>');
  }
}

function sitemapXml(base,calculators=[],knowledgeTopics=[],listGroups=[],signs=[]){
  const urls=['/','/tools','/forecast/daily','/forecast/weekly','/forecast/monthly','/forecast/yearly','/rashi-bhavishya','/planet-bhavishya','/nakshatra-bhavishya','/astronomy','/panchang','/calendar','/kundali-milan','/calculators','/lists','/knowledge','/horoscope','/subscribe',
    // Every reference topic, list group and rāśi is now its own indexable page.
    ...knowledgeTopics.map(t=>t.href),
    ...listGroups.map(g=>g.href),
    ...signs.flatMap(s=>['daily','weekly','monthly','yearly'].map(p=>`/horoscope/${s.slug}?period=${p}`))];
  const seen=new Set();
  const clean=urls.filter(u=>!seen.has(u)&&seen.add(u));
  const calcUrls=calculators.map(c=>c.route?.replace(/^\/calculator\//,'/tools/')||null).filter(Boolean); const all=[...clean,...calcUrls]; const unique=[...new Set(all)]; const body=unique.map(u=>`<url><loc>${base}${u}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function createApiServer({ calculate, host = '127.0.0.1', port = 8787, subscriptions = null, paymentService = null } = {}) {
  if (typeof calculate !== 'function') throw new TypeError('createApiServer requires calculate()');
  const webRoot = join(fileURLToPath(new URL('../../../web/', import.meta.url)));
  const admin = adminConfig();
  const loginLimiter=makeRateLimiter(ADMIN_LOGIN_MAX,15*60*1000);
  const predictionLimiter=makeRateLimiter(PREDICTION_MAX,60*1000);
  const checkoutLimiter=makeRateLimiter(CHECKOUT_MAX,60*1000);
  const paymentVerifyLimiter=makeRateLimiter(PAYMENT_VERIFY_MAX,60*1000);
  const calculatorLimiter=makeRateLimiter(PUBLIC_CALCULATOR_MAX,60*1000);
  const milanLimiter=makeRateLimiter(PUBLIC_MILAN_MAX,60*1000);
  const server = createServer(async (request, response) => {
    loginLimiter.sweep(); predictionLimiter.sweep();
    const parsedUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('x-content-type-options','nosniff');
    response.setHeader('x-frame-options','DENY');
    response.setHeader('referrer-policy','strict-origin-when-cross-origin');
    response.setHeader('permissions-policy','camera=(), microphone=(), geolocation=(), payment=(self)');
    response.setHeader('cross-origin-opener-policy','same-origin');
    response.setHeader('cross-origin-resource-policy','same-origin');
    response.setHeader('cache-control', 'no-store');
    response.setHeader('x-xss-protection','0');
    response.setHeader('server-timing', 'app;dur=0');
    response.setHeader('x-dns-prefetch-control','off');
    response.setHeader('x-download-options','noopen');
    response.setHeader('origin-agent-cluster','?1');
    response.setHeader('x-permitted-cross-domain-policies','none');
    response.setHeader('content-security-policy',"default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; font-src 'self' data:; frame-src https://*.razorpay.com https://*.razorpay.in; connect-src 'self' https://*.razorpay.com https://*.razorpay.in; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; form-action 'self' https://*.razorpay.com https://*.razorpay.in");
    if(process.env.NODE_ENV==='production') response.setHeader('strict-transport-security','max-age=31536000; includeSubDomains');
    const isAdminPath = parsedUrl.pathname === admin.route || parsedUrl.pathname.startsWith(`${admin.route}/`);
    const cookies = parseCookies(request.headers.cookie || '');
    const adminAuthorized = verifySession(cookies.jv_admin_session, admin);
    const requireAdmin = () => {
      if (adminAuthorized) return true;
      response.statusCode = 401;
      response.setHeader('cache-control','no-store');
      response.end(JSON.stringify({ error:'ADMIN_AUTH_REQUIRED', message:'Administrator authentication required.' }));
      return false;
    };
    if (isAdminPath && request.method === 'GET' && parsedUrl.pathname === admin.route) {
      response.setHeader('content-type','text/html; charset=utf-8'); response.setHeader('cache-control','no-store');
      const html=await readFile(join(webRoot,'admin.html'),'utf8');
      response.statusCode=200; response.end(injectHtml(html,request)); return;
    }
    if (isAdminPath && request.method === 'POST' && parsedUrl.pathname === admin.route) {
      try {
        const chunks=[]; let size=0; for await(const chunk of request){size+=chunk.length;if(size>8192) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
        const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
        const ip=requestIp(request); if(!loginLimiter.allow(ip)){ response.statusCode=429; response.setHeader('retry-after','900'); response.setHeader('cache-control','no-store'); response.end(JSON.stringify({error:'ADMIN_LOGIN_RATE_LIMITED',message:'Too many administrator login attempts. Try again later.'})); return; }
        if(!verifyCredentials(body.username,body.password,admin)){ response.statusCode=401; response.setHeader('cache-control','no-store'); response.end(JSON.stringify({error:'ADMIN_LOGIN_FAILED',message:'Invalid administrator credentials.'})); return; }
        loginLimiter.reset(ip);
        const token=issueSession({username:admin.username,secret:admin.secret,ttlSeconds:ADMIN_SESSION_TTL});
        response.setHeader('set-cookie',setSessionCookie(token,process.env.NODE_ENV==='production'));
        response.setHeader('cache-control','no-store'); response.statusCode=200; response.end(JSON.stringify({status:'authenticated'})); return;
      } catch(e){ response.statusCode=400; response.end(JSON.stringify({error:'ADMIN_LOGIN_ERROR',message:e.message})); return; }
    }
    if (isAdminPath && request.method === 'POST' && parsedUrl.pathname === `${admin.route}/logout`) {
      response.setHeader('set-cookie',clearSessionCookie('/')); response.setHeader('cache-control','no-store'); response.statusCode=200; response.end(JSON.stringify({status:'signed_out'})); return;
    }
    if (isAdminPath && parsedUrl.pathname === `${admin.route}/api/summary`) {
      if(!requireAdmin()) return;
      try {
        const list=subscriptions ? await subscriptions.list({includeUnconfirmed:true}) : [];
        const active=list.filter(x=>x.status==='active').length, pending=list.filter(x=>x.status==='pending_payment').length;
        const { buildDatasetSummary } = await import('../../dataset/DatasetCatalog.js');
        const { buildCalculatorAudit } = await import('../../calculators/CalculatorRegistry.js');
        response.setHeader('cache-control','no-store'); response.statusCode=200;
        response.end(JSON.stringify({status:'ok',version:WEB_VERSION,admin:admin.configured,subscriptionSummary:{total:list.length,active,pending},dataset:buildDatasetSummary(),calculatorAudit:buildCalculatorAudit()})); return;
      } catch(e){response.statusCode=500;response.end(JSON.stringify({error:'ADMIN_SUMMARY_ERROR',message:e.message}));return;}
    }
    if (isAdminPath && parsedUrl.pathname === `${admin.route}/api/subscriptions`) {
      if(!requireAdmin()) return;
      const list=subscriptions ? await subscriptions.list({includeUnconfirmed:true}) : [];
      response.setHeader('cache-control','no-store'); response.statusCode=200; response.end(JSON.stringify(list)); return;
    }
    if (isAdminPath && request.method === 'POST' && parsedUrl.pathname === `${admin.route}/api/report`) {
      if(!requireAdmin()) return;
      try { const chunks=[]; let size=0; for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);} const input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); const started=Date.now(); const result=await calculate(input); const { buildHoraSaarReport }=await import('../../reporting/HoraSaarReportEngine.js'); const report=buildHoraSaarReport(result,{elapsedMs:Date.now()-started,version:WEB_VERSION}); response.setHeader('cache-control','no-store'); response.statusCode=200; response.end(JSON.stringify(report)); return; } catch(e){response.statusCode=e.message==='PAYLOAD_TOO_LARGE'?413:422;response.end(JSON.stringify({error:'ADMIN_REPORT_ERROR',message:e.message}));return;}
    }
    if (isAdminPath) {
      if(requireAdmin()) { const safePath=parsedUrl.pathname.slice(`${admin.route}/`.length); if(safePath && safePath.startsWith('api/')) { response.statusCode=404; response.end(JSON.stringify({error:'ADMIN_NOT_FOUND'})); return; } }
    }
    const portalRoutes={
      '/rashi-bhavishya':['Rāśi Based Bhavishya','General daily, weekly, monthly and yearly Rāśi forecasts based on current planetary positions, houses and aspects.','rashi'],
      '/planet-bhavishya':['Planet Based Bhavishya','General planet-wise movement, placement, aspects and traditional interpretation.','planet'],
      '/nakshatra-bhavishya':['Nakshatra Based Bhavishya','General daily, weekly, monthly and yearly Nakshatra guidance from Moon movement.','nakshatra'],
      '/astronomy':['Astronomy & World Sky','Planetary conjunction watch with clearly labelled traditional interpretation.','astronomy'],
      '/panchang':['Panchang, Muhurta & Hindu Calendar','Daily Panchang, Muhurta, Choghadiya, Hora, sunrise/sunset and calendar tools.','panchang'],
      '/calendar':['Hindu Calendar & Festivals','Year-wise festival reference and Panchang-based observance context.','calendar'],
      '/kundali-milan':['Kundali Milan','Detailed Ashtakoot / compatibility workflow.','milan'],
      '/calculators':['Jyotish Calculators','Public calculator directory and individual deterministic tools.','calculators'],
      '/lists':['Jyotish Lists','Nakshatras, Rāśi, months, Navagraha, concepts, Yogas, scriptures and astrologers.','lists'],
      '/knowledge':['Jyotish Knowledge Library','Festivals, deities, mantras, tantra, yantra, gemstones, devotional references and classical sources.','knowledge'],
      '/horoscope':['Rāśi Horoscope','Daily, weekly, monthly and yearly sign-based Bhavishya.','horoscope']
    };
    const portal=portalRoutes[parsedUrl.pathname];
    const sendPortal=async(title,desc,key,path)=>{
      const html=await readFile(join(webRoot,'portal.html'),'utf8');
      const esc=(v)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
      const out=html.replaceAll('__PORTAL_TITLE__',esc(title)).replaceAll('__PORTAL_DESC__',esc(desc)).replaceAll('__PORTAL_KEY__',esc(key)).replaceAll('__PORTAL_PATH__',esc(path));
      response.setHeader('content-type','text/html; charset=utf-8');response.setHeader('cache-control','no-cache');response.statusCode=200;response.end(injectHtml(out,request));
    };
    if(request.method==='GET' && portal){ await sendPortal(portal[0],portal[1],portal[2],parsedUrl.pathname); return; }

    // Deep reference pages. Every Knowledge and Lists menu entry used to land on
    // the same two index pages; these give each one a real URL. Reserved
    // segments below are existing JSON endpoints and must fall through.
    const KNOWLEDGE_API=new Set(['stats','texts','search','text','rules']);
    const segments=parsedUrl.pathname.split('/').filter(Boolean).map(s=>decodeURIComponent(s));
    if(request.method==='GET' && segments[0]==='knowledge' && segments.length>=2 && !KNOWLEDGE_API.has(segments[1])){
      try {
        const { getKnowledgeTopic, getKnowledgeEntry } = await import('../../knowledge/ReferenceLibrary.js');
        if(segments.length===2){
          const t=getKnowledgeTopic(segments[1]);
          if(t) { await sendPortal(t.title,t.description,'knowledge-topic',parsedUrl.pathname); return; }
        } else if(segments.length===3){
          const e=getKnowledgeEntry(segments[1],segments[2]);
          if(e) { await sendPortal(`${e.entry.name} — ${e.topic.title}`,`${e.topic.title} reference entry for ${e.entry.name}.`,'knowledge-entry',parsedUrl.pathname); return; }
        }
        await sendNotFound(response,request,webRoot,parsedUrl.pathname); return;
      } catch(e){ response.statusCode=500; response.end(JSON.stringify({error:'KNOWLEDGE_PAGE_ERROR',message:e.message})); return; }
    }
    if(request.method==='GET' && segments[0]==='lists' && segments.length>=2){
      try {
        const { getListGroup, getListEntry } = await import('../../knowledge/ReferenceLibrary.js');
        if(segments.length===2){
          const g=getListGroup(segments[1],{limit:1});
          if(g) { await sendPortal(g.title,g.description,'list-group',parsedUrl.pathname); return; }
        } else if(segments.length===3){
          const e=getListEntry(segments[1],segments[2]);
          if(e) { await sendPortal(`${e.entry.name} — ${e.group.title}`,`${e.group.title} reference entry for ${e.entry.name}.`,'list-entry',parsedUrl.pathname); return; }
        }
        await sendNotFound(response,request,webRoot,parsedUrl.pathname); return;
      } catch(e){ response.statusCode=500; response.end(JSON.stringify({error:'LIST_PAGE_ERROR',message:e.message})); return; }
    }
    // /horoscope/<sign> renders one sign; the existing /horoscope/<period>-horoscope
    // JSON routes are matched later and are left untouched.
    if(request.method==='GET' && segments[0]==='horoscope' && segments.length===2 && !segments[1].endsWith('-horoscope')){
      const { SIGN_LIST } = await import('../../horoscope/HoroscopeEngine.js');
      const s=SIGN_LIST.find(x=>x.slug===segments[1].toLowerCase());
      if(s){ await sendPortal(`${s.name} Horoscope`,`Daily, weekly, monthly and yearly ${s.name} (${s.sanskrit}) horoscope with life-area ratings, lucky factors and remedies.`,'horoscope-sign',parsedUrl.pathname); return; }
      await sendNotFound(response,request,webRoot,parsedUrl.pathname); return;
    }

    if (request.method === 'GET' && request.url === '/health') { response.statusCode = 200; response.end(JSON.stringify({ status: 'ok', version:WEB_VERSION, offline: true })); return; }
    if (request.method === 'GET' && request.url.split('?')[0] === '/subscribe') { await sendFile(response,join(webRoot,'subscribe.html'),request); return; }
    if (request.method === 'GET' && request.url.split('?')[0] === '/report') { await sendFile(response,join(webRoot,'report.html'),request); return; }
    if (request.method === 'GET' && request.url.split('?')[0] === '/unsubscribe') { await sendFile(response,join(webRoot,'unsubscribe.html'),request); return; }
    if (request.method === 'GET' && request.url.split('?')[0] === '/tools') { await sendFile(response,join(webRoot,'tools.html'),request); return; }
    if (request.method === 'GET' && request.url.split('?')[0] === '/llms.txt') { response.setHeader('content-type','text/plain; charset=utf-8'); response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(`# HoraSaar\\n\\nPersonalized dataset-driven Jyotish web application with birth-chart calculations, Dasha timing, planetary transits, Panchang, forecasts and paid daily reports.\\n\\n## Public pages\\n- /\\n- /tools\\n- /forecast/daily\\n- /forecast/weekly\\n- /forecast/monthly\\n- /forecast/yearly\\n- /subscribe\\n\\n## Indexing\\n- /robots.txt\\n- /sitemap.xml\\n\\nReports and private subscription endpoints are not public content.`); return; }
    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/forecast/') && parsedUrl.pathname !== '/forecast/general') {
      const period=parsedUrl.pathname.split('/').filter(Boolean).pop();
      const defs={
        daily:{title:'Daily',lower:'day',desc:'See a personal daily Jyotish outlook with hour-by-hour timing.'},
        weekly:{title:'Weekly',lower:'week',desc:'See a personal weekly Jyotish outlook with day-by-day timing.'},
        monthly:{title:'Monthly',lower:'month',desc:'See a personal monthly Jyotish outlook as planetary timing changes.'},
        yearly:{title:'Yearly',lower:'year',desc:'See a personal yearly Jyotish outlook across twelve months.'}
      };
      const d=defs[period];
      if(!d){response.statusCode=404;response.end('<!doctype html><html><head><title>Forecast not found | HoraSaar</title></head><body>Forecast not found.</body></html>');return;}
      let html=await readFile(join(webRoot,'forecast.html'),'utf8');
      const esc=(v)=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
      html=html.replaceAll('__PUBLIC_BASE_URL__',originFromRequest(request)).replaceAll('__PERIOD__',period).replaceAll('__PERIOD_TITLE__',esc(d.title)).replaceAll('__PERIOD_LOWER__',esc(d.lower)).replaceAll('__PERIOD_DESC__',esc(d.desc));
      response.setHeader('content-type','text/html; charset=utf-8'); response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(html); return;
    }
    if (request.method === 'GET' && request.url.split('?')[0] === '/robots.txt') { const base=injectHtml(await readFile(join(webRoot,'robots.txt'),'utf8'),request).replace(/\n?Disallow: \/_jv-control-[^\n]*/g,''); const txt=`${base.trimEnd()}\nDisallow: ${admin.route}\n`; response.setHeader('content-type','text/plain; charset=utf-8'); response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(txt); return; }
    if (request.method === 'GET' && request.url.split('?')[0] === '/sitemap.xml') { try { const { buildCalculatorAudit } = await import('../../calculators/CalculatorRegistry.js'); const audit=buildCalculatorAudit(); const { listKnowledgeTopics, listListGroups } = await import('../../knowledge/ReferenceLibrary.js'); const { SIGN_LIST } = await import('../../horoscope/HoroscopeEngine.js'); const xml=sitemapXml(originFromRequest(request),audit.calculators||[],listKnowledgeTopics(),listListGroups(),SIGN_LIST); response.setHeader('content-type','application/xml; charset=utf-8'); response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(xml); return; } catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'SITEMAP_ERROR',message:e.message})); return; } }
    if (request.method === 'GET' && request.url.split('?')[0] === '/favicon.svg') { await sendFile(response,join(webRoot,'favicon.svg'),request); return; }
    if (request.method === 'GET' && request.url.split('?')[0] === '/site.webmanifest') { await sendFile(response,join(webRoot,'site.webmanifest'),request); return; }
    if (request.method === 'GET' && request.url.split('?')[0].startsWith('/assets/')) { try { const rel=request.url.split('?')[0].slice('/assets/'.length); if(!rel || rel.includes('..') || rel.includes(String.fromCharCode(92))) throw new Error('invalid asset path'); await sendFile(response,join(webRoot,'assets',rel),request); return; } catch(e) { response.statusCode=404; response.end(JSON.stringify({error:'ASSET_NOT_FOUND'})); return; } }
    if (request.method === 'GET' && request.url.split('?')[0] === '/i18n') {
      try { const i18n = await readFile(join(webRoot,'i18n.json'),'utf8'); response.setHeader('cache-control','no-cache'); response.statusCode=200; response.end(i18n); return; }
      catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'I18N_CATALOG_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && (request.url === '/' || request.url === '/index.html')) { await sendFile(response,join(webRoot,'index.html'),request); return; }
    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/tools/')) {
      try {
        const id=decodeURIComponent(parsedUrl.pathname.split('/').filter(Boolean).pop()||'');
        const { getCalculator } = await import('../../calculators/CalculatorRegistry.js');
        const feature=getCalculator(id);
        if(!feature){ response.statusCode=404; response.end('<!doctype html><html><head><meta charset="utf-8"><title>Tool not found | HoraSaar</title></head><body>Tool not found.</body></html>'); return; }
        let html=await readFile(join(webRoot,'tool.html'),'utf8');
        const replace=(v)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
        const nameValue=String(feature.name||id);
        html=html.replaceAll('__PUBLIC_BASE_URL__',originFromRequest(request)).replaceAll('__CALC_ID__',encodeURIComponent(id)).replaceAll('__CALC_NAME__',replace(nameValue)).replaceAll('__CALC_NAME_JSON__',JSON.stringify(nameValue)).replaceAll('__CALC_STATUS__',replace(feature.scientificStatus||'CALCULATION')).replaceAll('__CALC_CATEGORY__',replace(feature.category||'Tool')).replaceAll('__CALC_INPUTS_JSON__',JSON.stringify(feature.inputs||[]));
        response.setHeader('content-type','text/html; charset=utf-8'); response.setHeader('cache-control','no-cache'); response.statusCode=200; response.end(html); return;
      } catch(e){ response.statusCode=500; response.end(JSON.stringify({error:'TOOL_PAGE_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/enterprise/v10/status') {
      if(!requireAdmin()) return;
      try { const { buildProductionReadiness } = await import('../../quality/v10/ProductionReadiness.js'); const { readFile } = await import('node:fs/promises'); const corpus=JSON.parse(await readFile(join(webRoot,'../dataset/used/validation/v10_outcome-corpus.json'),'utf8')); const bench=JSON.parse(await readFile(join(webRoot,'../dataset/used/validation/v10_cross-engine-benchmark.json'),'utf8')); response.statusCode=200; response.end(JSON.stringify({version:'10.0.0',outcomeCases:corpus.cases.length, outcomeStatus:corpus.status, benchmarkCases:bench.cases.length, benchmarkStatus:bench.status, production:buildProductionReadiness()})); return; } catch(e){response.statusCode=500;response.end(JSON.stringify({error:'V10_STATUS_ERROR',message:e.message}));return;}
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/enterprise/v10/dashboard') {
      if(!requireAdmin()) return;
      response.setHeader('content-type','text/html; charset=utf-8'); response.statusCode=200; response.end(await readFile(join(webRoot,'v10','dashboard.html'))); return;
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/enterprise/v8/status') {
      if(!requireAdmin()) return;
      try {
        const { readFile } = await import('node:fs/promises');
        const manifest = JSON.parse(await readFile(join(webRoot,'../dataset/used/validation/v8_corpus-manifest.json'),'utf8'));
        const benchmark = JSON.parse(await readFile(join(webRoot,'../dataset/used/validation/v8_reference-benchmark.json'),'utf8'));
        response.statusCode=200; response.end(JSON.stringify({version:'8.0.0',engineeringReady:true,historicalCharts:manifest.charts?.length||0,predictionOutcomes:manifest.outcomes?.length||0,referenceCases:benchmark.cases?.length||0,empiricalAccuracyReady:(manifest.outcomes?.length||0)>0})); return;
      } catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'V8_STATUS_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/enterprise/v8/evidence-contract') {
      if(!requireAdmin()) return;
      try { const { V8_VALIDATION_CONTRACTS } = await import('../../quality/v8/ValidationContracts.js'); response.statusCode=200; response.end(JSON.stringify({version:'8.0.0',contracts:V8_VALIDATION_CONTRACTS})); return; }
      catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'V8_CONTRACT_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/enterprise/datasets') {
      if(!requireAdmin()) return;
      try {
        const { buildDatasetSummary } = await import('../../dataset/DatasetCatalog.js');
        response.statusCode = 200; response.end(JSON.stringify(buildDatasetSummary())); return;
      } catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'DATASET_AUDIT_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/enterprise/capabilities') {
      if(!requireAdmin()) return;
      try {
        const capabilities = await readFile(join(webRoot,'../dataset/used/core/competitive-capability-matrix.json'),'utf8');
        response.statusCode=200; response.end(capabilities); return;
      } catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'CAPABILITY_MATRIX_ERROR',message:e.message})); return; }
    }

    if (request.method === 'GET' && parsedUrl.pathname === '/locations') {
      try {
        const locations = await readFile(join(webRoot,'locations.json'),'utf8');
        response.statusCode=200; response.end(locations); return;
      } catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'LOCATION_CATALOG_ERROR',message:e.message})); return; }
    }

    if (request.method === 'GET' && parsedUrl.pathname === '/catalog/public') {
      try { const catalog=await readFile(join(webRoot,'../dataset/used/core/public-navigation.json'),'utf8'); response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(catalog); return; }
      catch(e){response.statusCode=500;response.end(JSON.stringify({error:'PUBLIC_CATALOG_ERROR',message:e.message}));return;}
    }

    // --- Reference + horoscope JSON APIs -------------------------------
    // These live under /api/ so none of them can be shadowed by a portal page
    // route, which is what left /calculators rendering an empty grid: the HTML
    // page and the JSON audit shared one path and the page always won.
    if (request.method === 'GET' && parsedUrl.pathname === '/api/calculators') {
      try { const { buildCalculatorAudit } = await import('../../calculators/CalculatorRegistry.js'); response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(JSON.stringify(buildCalculatorAudit())); return; }
      catch(e){ response.statusCode=500; response.end(JSON.stringify({error:'CALCULATOR_AUDIT_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/api/knowledge')) {
      try {
        const { listKnowledgeTopics, getKnowledgeTopic, getKnowledgeEntry } = await import('../../knowledge/ReferenceLibrary.js');
        const parts=parsedUrl.pathname.split('/').filter(Boolean).map(s=>decodeURIComponent(s)); // api,knowledge,...
        response.setHeader('cache-control','public, max-age=3600');
        if(parts.length===2){ response.statusCode=200; response.end(JSON.stringify({topics:listKnowledgeTopics()})); return; }
        if(parts.length===3){ const t=getKnowledgeTopic(parts[2]); if(!t){response.statusCode=404;response.end(JSON.stringify({error:'TOPIC_NOT_FOUND'}));return;} response.statusCode=200; response.end(JSON.stringify(t)); return; }
        if(parts.length===4){ const e=getKnowledgeEntry(parts[2],parts[3]); if(!e){response.statusCode=404;response.end(JSON.stringify({error:'ENTRY_NOT_FOUND'}));return;} response.statusCode=200; response.end(JSON.stringify(e)); return; }
        response.statusCode=404; response.end(JSON.stringify({error:'NOT_FOUND'})); return;
      } catch(e){ response.statusCode=500; response.end(JSON.stringify({error:'KNOWLEDGE_API_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/api/lists')) {
      try {
        const { listListGroups, getListGroup, getListEntry } = await import('../../knowledge/ReferenceLibrary.js');
        const parts=parsedUrl.pathname.split('/').filter(Boolean).map(s=>decodeURIComponent(s));
        response.setHeader('cache-control','public, max-age=3600');
        if(parts.length===2){ response.statusCode=200; response.end(JSON.stringify({groups:listListGroups()})); return; }
        if(parts.length===3){
          const g=getListGroup(parts[2],{
            q:parsedUrl.searchParams.get('q')||'',
            limit:Math.min(Number(parsedUrl.searchParams.get('limit'))||0,500),
            offset:Math.max(Number(parsedUrl.searchParams.get('offset'))||0,0),
          });
          if(!g){response.statusCode=404;response.end(JSON.stringify({error:'GROUP_NOT_FOUND'}));return;}
          response.statusCode=200; response.end(JSON.stringify(g)); return;
        }
        if(parts.length===4){ const e=getListEntry(parts[2],parts[3]); if(!e){response.statusCode=404;response.end(JSON.stringify({error:'ENTRY_NOT_FOUND'}));return;} response.statusCode=200; response.end(JSON.stringify(e)); return; }
        response.statusCode=404; response.end(JSON.stringify({error:'NOT_FOUND'})); return;
      } catch(e){ response.statusCode=500; response.end(JSON.stringify({error:'LISTS_API_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/api/reference/search') {
      if(!calculatorLimiter.allow(requestIp(request))){ response.statusCode=429; response.setHeader('retry-after','60'); response.end(JSON.stringify({error:'SEARCH_RATE_LIMITED'})); return; }
      try { const { searchReference } = await import('../../knowledge/ReferenceLibrary.js'); const q=String(parsedUrl.searchParams.get('q')||'').slice(0,120); response.setHeader('cache-control','no-store'); response.statusCode=200; response.end(JSON.stringify(searchReference(q,{limit:30}))); return; }
      catch(e){ response.statusCode=500; response.end(JSON.stringify({error:'SEARCH_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/api/horoscope') {
      try {
        const { buildSignHoroscope, buildAllSignHoroscopes, SIGN_LIST, HOROSCOPE_PERIODS } = await import('../../horoscope/HoroscopeEngine.js');
        const period=HOROSCOPE_PERIODS.includes(parsedUrl.searchParams.get('period'))?parsedUrl.searchParams.get('period'):'daily';
        const date=parsedUrl.searchParams.get('date')||undefined;
        const sign=parsedUrl.searchParams.get('sign');
        response.setHeader('cache-control','public, max-age=600'); response.statusCode=200;
        // buildAllSignHoroscopes() also returns a `signs` array, so spreading it
        // after `signs: SIGN_LIST` silently replaced the picker list and left
        // every entry without its slug. The reference list is named separately.
        response.end(JSON.stringify(sign
          ? { signList:SIGN_LIST, horoscope:buildSignHoroscope({sign,period,date}) }
          : { signList:SIGN_LIST, ...buildAllSignHoroscopes({period,date}) }));
        return;
      } catch(e){ response.statusCode=e.code==='INVALID_REQUEST'?400:422; response.end(JSON.stringify({error:e.code||'HOROSCOPE_ERROR',message:e.message})); return; }
    }

    if (request.method === 'GET' && parsedUrl.pathname === '/knowledge/stats') {
      try {
        const { libraryStats, listSubjects } = await import('../../knowledge/KnowledgeLibrary.js');
        response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200;
        response.end(JSON.stringify({ library: libraryStats(), subjects: listSubjects() })); return;
      } catch(e){response.statusCode=500;response.end(JSON.stringify({error:'KNOWLEDGE_STATS_ERROR',message:e.message}));return;}
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/knowledge/texts') {
      try {
        const { listTexts } = await import('../../knowledge/KnowledgeLibrary.js');
        const subject = parsedUrl.searchParams.get('subject') || undefined;
        const limit = Math.min(Number(parsedUrl.searchParams.get('limit')) || 100, 500);
        const offset = Math.max(Number(parsedUrl.searchParams.get('offset')) || 0, 0);
        response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200;
        response.end(JSON.stringify(listTexts({ subject, limit, offset }))); return;
      } catch(e){response.statusCode=500;response.end(JSON.stringify({error:'KNOWLEDGE_TEXTS_ERROR',message:e.message}));return;}
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/knowledge/search') {
      if(!calculatorLimiter.allow(requestIp(request))){ response.statusCode=429; response.setHeader('retry-after','60'); response.setHeader('cache-control','no-store'); response.end(JSON.stringify({error:'KNOWLEDGE_SEARCH_RATE_LIMITED'})); return; }
      try {
        const { searchCatalogue, searchFullText } = await import('../../knowledge/KnowledgeLibrary.js');
        const q = String(parsedUrl.searchParams.get('q') || '').slice(0, 200);
        const deep = parsedUrl.searchParams.get('deep') === '1';
        const limit = Math.min(Number(parsedUrl.searchParams.get('limit')) || 20, 50);
        const result = deep ? searchFullText(q, { limit }) : { query: q, matches: searchCatalogue(q, { limit }) };
        response.setHeader('cache-control','no-store'); response.statusCode=200; response.end(JSON.stringify(result)); return;
      } catch(e){response.statusCode=500;response.end(JSON.stringify({error:'KNOWLEDGE_SEARCH_ERROR',message:e.message}));return;}
    }
    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/knowledge/text/')) {
      try {
        const { getText } = await import('../../knowledge/KnowledgeLibrary.js');
        const id = decodeURIComponent(parsedUrl.pathname.slice('/knowledge/text/'.length)).replace(/[\\/]/g,'');
        const includeBody = parsedUrl.searchParams.get('body') === '1';
        const result = getText(id, { includeBody, maxBody: 200000 });
        response.setHeader('cache-control', result.status==='AVAILABLE' ? 'public, max-age=3600' : 'no-store');
        response.statusCode = result.status==='AVAILABLE' ? 200 : 404;
        response.end(JSON.stringify(result)); return;
      } catch(e){response.statusCode=500;response.end(JSON.stringify({error:'KNOWLEDGE_TEXT_ERROR',message:e.message}));return;}
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/knowledge/rules') {
      try {
        const { listRuleTables } = await import('../../data/RuleTables.js');
        response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200;
        response.end(JSON.stringify({ tables: listRuleTables() })); return;
      } catch(e){response.statusCode=500;response.end(JSON.stringify({error:'RULE_TABLES_LIST_ERROR',message:e.message}));return;}
    }
    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/knowledge/rules/')) {
      try {
        const { getRuleTable } = await import('../../data/RuleTables.js');
        const name = decodeURIComponent(parsedUrl.pathname.slice('/knowledge/rules/'.length));
        const data = getRuleTable(name);
        response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200;
        response.end(JSON.stringify({ name, data })); return;
      } catch(e){response.statusCode=404;response.end(JSON.stringify({error:'RULE_TABLE_NOT_FOUND',message:e.message}));return;}
    }

    if (request.method === 'POST' && parsedUrl.pathname === '/prediction') {
      if(!predictionLimiter.allow(requestIp(request))){ response.statusCode=429; response.setHeader('retry-after','60'); response.setHeader('cache-control','no-store'); response.end(JSON.stringify({error:'PREDICTION_RATE_LIMITED',message:'Too many forecast requests. Please try again shortly.'})); return; }
      try {
        const chunks=[]; let size=0; for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
        const input=sanitizeValue(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));
        const { buildUserPrediction } = await import('../../prediction/UserPredictionService.js');
        const chart=await calculate(input.birth||input); const prediction=buildUserPrediction({chart,preference:input.preference,period:input.period,date:input.date,tz:Number(input.tz ?? input.birth?.tz ?? chart.meta?.tz ?? 0)});
        response.setHeader('cache-control','no-store'); response.statusCode=200; response.end(JSON.stringify({prediction})); return;
      } catch(e){response.statusCode=e.message==='PAYLOAD_TOO_LARGE'?413:422;response.end(JSON.stringify({error:'PREDICTION_ERROR',message:e.message}));return;}
    }
    if (request.method === 'POST' && parsedUrl.pathname === '/report') {
      // Public report endpoint is intentionally prediction-only. The full calculation report is admin-only.
      try {
        const chunks=[]; let size=0; for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
        const input=sanitizeValue(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));
        const { buildUserPrediction } = await import('../../prediction/UserPredictionService.js');
        const chart=await calculate(input.birth||input); const prediction=buildUserPrediction({chart,preference:input.preference,period:input.period,date:input.date,tz:Number(input.tz ?? input.birth?.tz ?? chart.meta?.tz ?? 0)});
        response.setHeader('cache-control','no-store'); response.statusCode=200; response.end(JSON.stringify({mode:'prediction-only',prediction})); return;
      } catch(e){response.statusCode=e.message==='PAYLOAD_TOO_LARGE'?413:422;response.end(JSON.stringify({error:'PREDICTION_REPORT_ERROR',message:e.message}));return;}
    }

    if (request.method === 'GET' && parsedUrl.pathname === '/subscription/plans') {
      try {
        const plans = await readFile(join(webRoot,'../dataset/used/core/subscription-plans.json'),'utf8');
        response.statusCode=200; response.end(plans); return;
      } catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'SUBSCRIPTION_PLANS_ERROR',message:e.message})); return; }
    }

    if (request.method === 'GET' && parsedUrl.pathname === '/payment/config') {
      response.statusCode=200; response.end(JSON.stringify(paymentService?.publicConfig?.() || {provider:null,configured:false,paymentMethods:[]})); return;
    }

    if (request.method === 'GET' && parsedUrl.pathname === '/subscription/catalog') {
      try {
        const source = JSON.parse(await readFile(join(webRoot,'../dataset/used/core/user-prediction-preferences.json'),'utf8'));
        const topics=Object.keys(source.rules||{}).map(id=>({id,label:source.labels?.[id]||id,description:source.descriptions?.[id]||''}));
        response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(JSON.stringify({version:1,topics})); return;
      } catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'CATALOG_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/enterprise/catalog') {
      if(!requireAdmin()) return;
      try {
        const catalog = await readFile(join(webRoot,'../dataset/used/core/subscription-report-catalog.json'),'utf8');
        response.statusCode=200; response.end(catalog); return;
      } catch(e) { response.statusCode=500; response.end(JSON.stringify({error:'CATALOG_ERROR',message:e.message})); return; }
    }


    if (subscriptions && paymentService && request.method === 'POST' && parsedUrl.pathname === '/subscriptions/checkout') {
      if (!checkoutLimiter.allow(requestIp(request))) { response.statusCode=429; response.setHeader('retry-after','60'); response.end(JSON.stringify({error:'CHECKOUT_RATE_LIMITED',message:'Too many checkout attempts. Please try again later.'})); return; }
      try {
        if (!paymentService.isConfigured()) throw new Error('RAZORPAY_NOT_CONFIGURED');
        const chunks=[]; let size=0;
        for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
        const input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
        const plans=JSON.parse(await readFile(join(webRoot,'../dataset/used/core/subscription-plans.json'),'utf8'));
        const plan=plans.plans?.find(p=>p.id===String(input.planId||''));
        if(!plan) throw new Error('subscription plan not found');
        if(!Number.isInteger(Number(plan.amountInr)) || Number(plan.amountInr)<1) throw new Error('subscription plan amount is invalid');
        const created=await subscriptions.createPendingPayment({...input,frequency:'daily',deliveryHour:7,report:input.report||'daily'}, {billingPeriod:plan.billingPeriod,amountInr:plan.amountInr,currency:plans.currency||'INR'});
        const order=await paymentService.createOrder({amountInr:plan.amountInr,receipt:created.id,notes:{subscriptionId:created.id,planId:plan.id}});
        const saved=await subscriptions.markPayment(created.id,{status:'pending',orderId:order.id,method:null});
        response.statusCode=201;
        response.end(JSON.stringify({subscription:{...saved,manageToken:created.manageToken,manageUrl:`/unsubscribe?id=${encodeURIComponent(created.id)}&token=${encodeURIComponent(created.manageToken)}`},payment:{provider:'razorpay',keyId:paymentService.keyId,orderId:order.id,amount:order.amount,currency:order.currency,name:'HoraSaar',description:plan.label},plan})); return;
      } catch(e){response.statusCode=e.message==='PAYLOAD_TOO_LARGE'?413:400;response.end(JSON.stringify({error:'CHECKOUT_CREATE_ERROR',message:e.message}));return;}
    }

    if (subscriptions && paymentService && request.method === 'POST' && parsedUrl.pathname === '/payments/verify') {
      if (!paymentVerifyLimiter.allow(requestIp(request))) { response.statusCode=429; response.setHeader('retry-after','60'); response.end(JSON.stringify({error:'PAYMENT_VERIFY_RATE_LIMITED',message:'Too many payment verification attempts. Please try again later.'})); return; }
      try {
        const chunks=[]; let size=0;
        for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
        const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
        const s=await subscriptions.getById(body.subscriptionId);
        if(!s) throw new Error('subscription not found');
        if(s.payment?.status==='paid' && String(s.payment?.paymentId||'')===String(body.razorpay_payment_id||'')) { response.statusCode=200; response.end(JSON.stringify({status:'active',subscription:{...s,manageToken:undefined},payment:{id:s.payment.paymentId,status:'captured',amount:s.amountInr*100,currency:s.currency}})); return; }
        if(String(s.payment?.orderId)!==String(body.razorpay_order_id)) throw new Error('payment order does not match subscription');
        if(!paymentService.verifyCheckoutSignature({orderId:body.razorpay_order_id,paymentId:body.razorpay_payment_id,signature:body.razorpay_signature})) throw new Error('payment signature verification failed');
        const [order,payment]=await Promise.all([paymentService.fetchOrder(body.razorpay_order_id),paymentService.fetchPayment(body.razorpay_payment_id)]);
        if(order.status!=='paid' || payment.status!=='captured') throw new Error(`payment is not captured (order=${order.status}, payment=${payment.status})`);
        if(Number(payment.amount)!==Number(s.amountInr)*100) throw new Error('payment amount does not match subscription');
        if(String(payment.currency)!==String(s.currency||'INR')) throw new Error('payment currency does not match subscription');
        const active=await subscriptions.markPayment(s.id,{status:'paid',orderId:order.id,paymentId:payment.id,method:payment.method||null,paidAt:new Date().toISOString()});
        let confirmationEmail={status:'skipped'};
        const activatedPlan=await resolvePlanForSubscription(active,webRoot);
        try { confirmationEmail=await sendSubscriptionConfirmation(active,activatedPlan,process.env); } catch(e) { confirmationEmail={status:'failed',error:e.message}; }
        response.statusCode=200; response.end(JSON.stringify({status:'active',subscription:active,payment:{id:payment.id,method:payment.method,amount:payment.amount,currency:payment.currency,status:payment.status},confirmationEmail})); return;
      } catch(e){response.statusCode=e.message==='PAYLOAD_TOO_LARGE'?413:400;response.end(JSON.stringify({error:'PAYMENT_VERIFY_ERROR',message:e.message}));return;}
    }

    if (subscriptions && paymentService && request.method === 'POST' && parsedUrl.pathname === '/payments/webhook') {
      try {
        const chunks=[]; let size=0; for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
        const raw=Buffer.concat(chunks).toString('utf8');
        if(!paymentService.verifyWebhookSignature(raw,request.headers['x-razorpay-signature'])) { response.statusCode=401; response.end(JSON.stringify({error:'INVALID_WEBHOOK_SIGNATURE'})); return; }
        const event=JSON.parse(raw); const payload=event.payload||{};
        const payment=payload.payment?.entity||{}; const orderEntity=payload.order?.entity||{};
        let notes=payment.notes||orderEntity.notes||{}; let subscriptionId=notes.subscriptionId;
        if(!subscriptionId && payment.order_id) {
          try { const order=await paymentService.fetchOrder(payment.order_id); notes=order.notes||{}; subscriptionId=notes.subscriptionId; } catch(_) {}
        }
        if(subscriptionId && (event.event==='payment.captured' || event.event==='order.paid')) {
          const activated=await subscriptions.markPayment(subscriptionId,{status:'paid',orderId:orderEntity.id||payment.order_id||undefined,paymentId:payment.id||undefined,method:payment.method||undefined,paidAt:new Date().toISOString()});
          try { await sendSubscriptionConfirmation(activated,await resolvePlanForSubscription(activated,webRoot),process.env); } catch(_) {}
        } else if(subscriptionId && event.event==='payment.failed') {
          await subscriptions.markPayment(subscriptionId,{status:'failed',orderId:payment.order_id||undefined,paymentId:payment.id||undefined,method:payment.method||undefined});
        }
        response.statusCode=200; response.end(JSON.stringify({received:true,event:event.event||null})); return;
      } catch(e){response.statusCode=e.message==='PAYLOAD_TOO_LARGE'?413:400;response.end(JSON.stringify({error:'PAYMENT_WEBHOOK_ERROR',message:e.message}));return;}
    }

    if (subscriptions && request.method === 'POST' && parsedUrl.pathname === '/subscriptions') {
      response.statusCode=410;
      response.end(JSON.stringify({error:'PAYMENT_REQUIRED',message:'Direct subscription activation is disabled. Use POST /subscriptions/checkout and complete the Razorpay payment first.'}));
      return;
    }

    if (subscriptions && request.method === 'POST' && parsedUrl.pathname === '/subscriptions/unsubscribe') {
      try {
        const result=await subscriptions.unsubscribe(parsedUrl.searchParams.get('id'),parsedUrl.searchParams.get('token'));
        response.statusCode=200;response.end(JSON.stringify(result));return;
      } catch(e){response.statusCode=403;response.end(JSON.stringify({error:'UNSUBSCRIBE_ERROR',message:e.message}));return;}
    }

    if (subscriptions && request.method === 'GET' && parsedUrl.pathname === '/subscriptions/manage') {
      try {
        const s=await subscriptions.getById(parsedUrl.searchParams.get('id'));
        if(!s || String(s.manageToken)!==String(parsedUrl.searchParams.get('token'))) throw new Error('invalid management token');
        response.statusCode=200;response.end(JSON.stringify({...s,manageToken:undefined}));return;
      }catch(e){response.statusCode=403;response.end(JSON.stringify({error:'MANAGE_ERROR',message:e.message}));return;}
    }

    if (request.method === 'POST' && parsedUrl.pathname === '/kundali-milan') {
      if(!milanLimiter.allow(requestIp(request))){response.statusCode=429;response.setHeader('retry-after','60');response.end(JSON.stringify({error:'MILAN_RATE_LIMITED',message:'Too many Milan requests. Please try again shortly.'}));return;}
      try {
        const chunks=[]; let size=0; for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
        const input=sanitizeValue(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));
        if(!input.groom || !input.bride) throw Object.assign(new Error('groom and bride birth details are required'),{code:'INVALID_REQUEST'});
        const [a,b]=await Promise.all([calculate(input.groom),calculate(input.bride)]);
        const { calcFullMilan }=await import('../../milan/ashtakoot.js');
        response.statusCode=200;response.end(JSON.stringify(calcFullMilan(a,b)));return;
      }catch(e){response.statusCode=e.message==='PAYLOAD_TOO_LARGE'?413:(e.code==='INVALID_REQUEST'?400:422);response.end(JSON.stringify({error:e.code||'MILAN_ERROR',message:e.message}));return;}
    }

    if (request.method === 'GET' && parsedUrl.pathname === '/panchang/range') {
      try {
        const start=parsedUrl.searchParams.get('date')||new Date().toISOString().slice(0,10); const period=parsedUrl.searchParams.get('period')||'weekly';
        const lat=Number(parsedUrl.searchParams.get('lat')||0),lon=Number(parsedUrl.searchParams.get('lon')||0),tz=Number(parsedUrl.searchParams.get('tz')||0);
        const startDate=new Date(`${start}T00:00:00Z`); if(Number.isNaN(startDate.getTime())) throw new Error('Invalid date');
        const count=period==='daily'?1:period==='weekly'?7:period==='monthly'?new Date(Date.UTC(startDate.getUTCFullYear(),startDate.getUTCMonth()+1,0)).getUTCDate():period==='yearly'?12:7;
        const rows=[]; for(let i=0;i<count;i++){const d=period==='yearly'?new Date(Date.UTC(startDate.getUTCFullYear(),i,1)):new Date(startDate.getTime()+i*86400000); const date=d.toISOString().slice(0,10); rows.push({date,...(await import('../../calculators/CalculatorEngine.js')).buildPanchangFeature('today-panchang',{date,lat,lon,tz})});}
        response.setHeader('cache-control','public, max-age=300');response.statusCode=200;response.end(JSON.stringify({period,start,days:rows}));return;
      }catch(e){response.statusCode=422;response.end(JSON.stringify({error:'PANCHANG_RANGE_ERROR',message:e.message}));return;}
    }
    if (request.method === 'GET' && (parsedUrl.pathname === '/forecast/general' || parsedUrl.pathname === '/forecast/general/')) {
      try {
        const { buildGeneralForecast } = await import('../../prediction/generalForecast.js');
        const period=parsedUrl.searchParams.get('period')||'daily';
        const result=buildGeneralForecast({date:parsedUrl.searchParams.get('date')||undefined,sign:parsedUrl.searchParams.get('sign')||'Aries',planet:parsedUrl.searchParams.get('planet')||null,nakshatra:parsedUrl.searchParams.get('nakshatra')||null,period});
        response.setHeader('cache-control','public, max-age=300'); response.statusCode=200; response.end(JSON.stringify(result)); return;
      } catch(e) { response.statusCode=422; response.end(JSON.stringify({error:'GENERAL_FORECAST_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/astronomy/space-feed') {
      try {
        const { getPublicSpaceFeed } = await import('../../astronomy/publicSpaceFeed.js');
        const date=parsedUrl.searchParams.get('date')||new Date().toISOString().slice(0,10);
        const startDate=parsedUrl.searchParams.get('startDate')||date, endDate=parsedUrl.searchParams.get('endDate')||date;
        const result=await getPublicSpaceFeed({date,startDate,endDate});
        response.setHeader('cache-control','public, max-age=300'); response.statusCode=200; response.end(JSON.stringify(result)); return;
      } catch(e) { response.statusCode=502; response.end(JSON.stringify({error:'SPACE_FEED_ERROR',message:'External astronomy feed unavailable.'})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/astronomy/today') {
      try { const {buildWorldSky}=await import('../../astronomy/worldSky.js'); const date=parsedUrl.searchParams.get('date')||new Date().toISOString().slice(0,10); response.setHeader('cache-control','public, max-age=300');response.statusCode=200;response.end(JSON.stringify(buildWorldSky(date)));return; }
      catch(e){response.statusCode=422;response.end(JSON.stringify({error:'ASTRONOMY_ERROR',message:e.message}));return;}
    }

    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/horoscope/')) {
      try {
        const { horoscopeRequest, HOROSCOPE_ROUTES } = await import('../../horoscope/horoscope_routes.js');
        if (!HOROSCOPE_ROUTES[parsedUrl.pathname]) { response.statusCode=404; response.end(JSON.stringify({error:'NOT_FOUND'})); return; }
        const result = horoscopeRequest(parsedUrl.pathname, parsedUrl.searchParams.get('date') || undefined, parsedUrl.searchParams.get('sign') || undefined);
        response.statusCode=200; response.end(JSON.stringify(result)); return;
      } catch(e) { response.statusCode=422; response.end(JSON.stringify({error:e.code||'HOROSCOPE_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/panchang/')) {
      try {
        const feature=parsedUrl.pathname.split('/').filter(Boolean).pop();
        const map={today:'today-panchang',tomorrow:'tomorrow-panchang','rahu-kaal':'rahu-kaal',choghadiya:'choghadiya',tithi:'tithi',vaar:'vaar',hora:'hora',karana:'karana','shubh-muhurat':'shubh-muhurat',numerology:'numerology'};
        if(!map[feature]) { response.statusCode=404; response.end(JSON.stringify({error:'NOT_FOUND'})); return; }
        const { buildPanchangFeature } = await import('../../calculators/CalculatorEngine.js');
        const input={date:parsedUrl.searchParams.get('date')||undefined,lat:Number(parsedUrl.searchParams.get('lat')||0),lon:Number(parsedUrl.searchParams.get('lon')||0),tz:Number(parsedUrl.searchParams.get('tz')||0),name:parsedUrl.searchParams.get('name')||undefined,dob:parsedUrl.searchParams.get('dob')?JSON.parse(parsedUrl.searchParams.get('dob')):undefined};
        response.statusCode=200; response.end(JSON.stringify(buildPanchangFeature(map[feature],input))); return;
      } catch(e) { response.statusCode=422; response.end(JSON.stringify({error:e.code||'PANCHANG_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname.startsWith('/calculator/')) {
      const id=parsedUrl.pathname.split('/').filter(Boolean).pop();
      const { getCalculator }=await import('../../calculators/CalculatorRegistry.js');
      const feature=getCalculator(id);
      if(!feature){response.statusCode=404; response.end(JSON.stringify({error:'NOT_FOUND'})); return;}
      response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(JSON.stringify({feature,usage:`POST /calculator/${id}`})); return;
    }
    if (request.method === 'POST' && parsedUrl.pathname.startsWith('/calculator/')) {
      if(!calculatorLimiter.allow(requestIp(request))){response.statusCode=429;response.setHeader('retry-after','60');response.end(JSON.stringify({error:'CALCULATOR_RATE_LIMITED',message:'Too many calculator requests. Please try again shortly.'}));return;}
      try {
        const chunks=[]; let size=0; for await(const chunk of request){size+=chunk.length;if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
        const input=sanitizeValue(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));
        const id=parsedUrl.pathname.split('/').filter(Boolean).pop();
        const { runCalculator }=await import('../../calculators/CalculatorEngine.js');
        response.statusCode=200; response.end(JSON.stringify(await runCalculator(id,input))); return;
      } catch(e) { response.statusCode=e.message==='PAYLOAD_TOO_LARGE'?413:(e.code==='INVALID_REQUEST'?400:422); response.end(JSON.stringify({error:e.code||'CALCULATOR_ERROR',message:e.message})); return; }
    }
    if (request.method === 'GET' && parsedUrl.pathname === '/calculators') {
      const { buildCalculatorAudit } = await import('../../calculators/CalculatorRegistry.js'); response.setHeader('cache-control','public, max-age=3600'); response.statusCode=200; response.end(JSON.stringify(buildCalculatorAudit())); return;
    }
    if (request.method === 'POST' && parsedUrl.pathname === '/chart.svg') {
      if(!requireAdmin()) return;
      try {
        const chunks=[]; let size=0; for await (const chunk of request){ size+=chunk.length; if(size>MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE'); chunks.push(chunk); }
        const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const { renderChartSvg } = await import('../../presentation/svg/chartSvg.js');
        response.setHeader('content-type','image/svg+xml; charset=utf-8'); response.statusCode=200; response.end(renderChartSvg(payload)); return;
      } catch(e){ response.statusCode=400; response.end(`<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="20">${String(e.message).replace(/[&<>"]/g,'')}</text></svg>`); return; }
    }
    if (request.method !== 'POST' || parsedUrl.pathname !== '/calculate') { await sendNotFound(response,request,webRoot,parsedUrl.pathname); return; }
    if(!predictionLimiter.allow(requestIp(request))){response.statusCode=429;response.setHeader('retry-after','60');response.end(JSON.stringify({error:'CALCULATION_RATE_LIMITED',message:'Too many calculation requests. Please try again shortly.'}));return;}
    try {
      const chunks = []; let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) { response.statusCode = 413; response.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', maxBytes: MAX_BODY_BYTES })); request.destroy(); return; }
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) throw Object.assign(new Error('Request body must be a JSON object'), { code: 'INVALID_REQUEST' });
      const input = sanitizeValue(JSON.parse(raw));
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('Request body must be a JSON object'), { code: 'INVALID_REQUEST' });
      const result = await calculate(input);
      response.statusCode = 200; response.end(JSON.stringify(result));
    } catch (error) {
      response.statusCode = error?.code === 'INVALID_REQUEST' ? 400 : 422;
      response.end(JSON.stringify({ error: error.code || 'CALCULATION_ERROR', message: error.message }));
    }
  });
  return { server, host, port, maxBodyBytes: MAX_BODY_BYTES };
}
