import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { request } from 'node:https';
import crypto from 'node:crypto';
import { buildUserPrediction } from '../prediction/UserPredictionService.js';

const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleize = key => String(key ?? '').replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,m=>m.toUpperCase());
function plainValue(value, depth=0) {
  if (value==null || value==='') return 'Not available';
  if (typeof value!=='object') return String(value);
  if (depth>2) return 'See detailed chart data';
  if (Array.isArray(value)) return value.length ? value.slice(0,30).map(v=>`• ${plainValue(v,depth+1)}`).join('\n') : 'None';
  return Object.entries(value).slice(0,40).map(([k,v])=>`${titleize(k)}: ${plainValue(v,depth+1)}`).join('\n');
}
function htmlValue(value, depth=0) {
  if (value==null || value==='') return '<span class="muted">Not available</span>';
  if (typeof value!=='object') return `<span>${esc(value)}</span>`;
  if (depth>2) return '<span class="muted">See detailed chart data</span>';
  if (Array.isArray(value)) {
    if (!value.length) return '<span class="muted">None</span>';
    return `<ul>${value.slice(0,30).map(v=>`<li>${htmlValue(v,depth+1)}</li>`).join('')}</ul>`;
  }
  return `<table><tbody>${Object.entries(value).slice(0,40).map(([k,v])=>`<tr><th>${esc(titleize(k))}</th><td>${htmlValue(v,depth+1)}</td></tr>`).join('')}</tbody></table>`;
}

export function buildSubscriberReport(chart, subscription, reportDate=new Date()) {
  const zone=subscription?.timezone||chart?.meta?.timeZone||'Asia/Kolkata';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(reportDate));
  const dateParts=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const date=`${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const preference=String(subscription?.preference||'general').toLowerCase();
  const period=(subscription?.frequency==='weekly'||subscription?.frequency==='monthly'||subscription?.frequency==='yearly') ? subscription.frequency.replace('ly','') : 'day';
  const prediction=buildUserPrediction({chart,preference,period,date,tz:Number(chart?.meta?.tz||subscription?.birth?.tz||0)});
      const area=prediction.headline?.split(':')[0]||'Overall';
      const subject=`HoraSaar Daily Prediction — ${area} — ${date}`;
      const text=renderPredictionText(prediction,subscription,date);
      const html=renderPredictionHtml(prediction,subscription,date);
  return {subject,text,html,prediction,date,reportDate:date,preference};
}

function renderPredictionText(prediction,subscription,date){
  const lines=[
    `HoraSaar Daily Prediction — ${date}`,
    `${subscription?.name||'Subscriber'} · 07:00 local delivery`,
    '',`${prediction.label} · ${prediction.score}/100`,prediction.headline||'',prediction.summary||'',
    '', 'Why this reading is this way:',
    ...(prediction.drivers||[]).map(x=>`• ${x.text}`),
    '', 'Best timing:', (prediction.bestTimes||[]).length?`• ${prediction.bestTimes.join(' · ')}`:'• No standout window',
    'Use extra care:', (prediction.watchTimes||[]).length?`• ${prediction.watchTimes.join(' · ')}`:'• No pronounced weak window'
  ];
  if(prediction.hourly?.length){
    lines.push('','Hour-by-hour:');
    for(const h of prediction.hourly) lines.push(`${h.hour} — ${h.label} — ${h.summary}`);
  }
  return lines.join('\n');
}
function renderPredictionHtml(prediction,subscription,date){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const drivers=(prediction.drivers||[]).map(x=>`<li><b>${esc(x.planet||'Timing')}</b> — ${esc(x.text)}</li>`).join('');
  const hourly=(prediction.hourly||[]).map(h=>`<tr><td>${esc(h.hour)}</td><td><b>${esc(h.label)}</b></td><td>${esc(h.summary)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(prediction.headline||'HoraSaar Daily Prediction')}</title><style>body{margin:0;background:#f7f3ee;color:#28211d;font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:760px;margin:auto;padding:20px}.card{background:#fffdf9;border:1px solid #e8ddd1;border-radius:18px;padding:20px;margin:0 0 14px;box-shadow:0 6px 20px rgba(50,30,20,.05)}.orb{font-size:30px;font-weight:800}.muted{color:#706761}h1{font-size:25px;margin:0 0 6px}h2{font-size:17px;margin:0 0 8px}table{width:100%;border-collapse:collapse}td{border-top:1px solid #eee5dc;padding:8px;vertical-align:top}td:first-child{width:72px;font-weight:700}.tag{display:inline-block;padding:4px 8px;border-radius:999px;background:#f0e7df;margin:2px;font-size:12px}</style></head><body><div class="wrap"><div class="card"><div class="muted">HoraSaar · Personal daily prediction</div><h1>${esc(prediction.headline)}</h1><div class="orb">${esc(prediction.score)} / 100 · ${esc(prediction.label)}</div><p>${esc(prediction.summary)}</p><div class="muted">${esc(subscription?.name||'')} · ${esc(date)} · 07:00 local delivery</div></div><div class="card"><h2>Why this reading</h2><ul>${drivers}</ul></div><div class="card"><h2>Timing</h2><p><b>Best:</b> ${esc((prediction.bestTimes||[]).join(' · ')||'No standout window')}</p><p><b>Use care:</b> ${esc((prediction.watchTimes||[]).join(' · ')||'No pronounced weak window')}</p></div>${hourly?`<div class="card"><h2>Hour-by-hour</h2><table>${hourly}</table></div>`:''}<div class="card"><span class="tag">Personal chart pattern</span><span class="tag">Planetary movement</span><span class="tag">Timing windows</span><p class="muted">Traditional rule-based Jyotish interpretation. This is not an empirical probability or guaranteed outcome.</p></div></div></body></html>`;
}

export class SpoolTransport {
  constructor({dir='data/runtime/outbox'}={}) { this.dir=dir; }
  async send({channel,to,subject,text,html,subscriptionId}) {
    await mkdir(this.dir,{recursive:true});
    const safe=String(to).replace(/[^a-zA-Z0-9+_.@-]/g,'_');
    const file=join(this.dir,`${new Date().toISOString().replace(/[:.]/g,'-')}-${subscriptionId}-${channel}-${safe}.json`);
    await writeFile(file,JSON.stringify({channel,to,subject,text,html,subscriptionId,createdAt:new Date().toISOString(),status:'spooled'},null,2),'utf8');
    return {status:'spooled',file};
  }
}

export class WebhookTransport {
  constructor({url,headers={}}={}) { this.url=url; this.headers=headers; }
  async send(payload) {
    if (!this.url) throw new Error('WEBHOOK URL is not configured');
    const res=await fetch(this.url,{method:'POST',headers:{'content-type':'application/json',...this.headers},body:JSON.stringify(payload)});
    if (!res.ok) throw new Error(`webhook delivery failed: HTTP ${res.status}`);
    return {status:'sent',provider:'webhook',httpStatus:res.status};
  }
}

export class TwilioSmsTransport {
  constructor({sid,token,from}={}) { this.sid=sid; this.token=token; this.from=from; }
  async send({to,text}) {
    if (!this.sid||!this.token||!this.from) throw new Error('Twilio SMS credentials are not configured');
    const body=new URLSearchParams({To:to,From:this.from,Body:text});
    const auth=Buffer.from(`${this.sid}:${this.token}`).toString('base64');
    const res=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.sid)}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'content-type':'application/x-www-form-urlencoded'},body});
    if(!res.ok) throw new Error(`Twilio SMS delivery failed: HTTP ${res.status}`);
    return {status:'sent',provider:'twilio',httpStatus:res.status};
  }
}

export class SmtpEmailTransport {
  constructor({host,port=465,secure=true,user,pass,from,timeoutMs=15000}={}) {
    this.host=host;this.port=Number(port);this.secure=secure;this.user=user;this.pass=pass;this.from=from||user;this.timeoutMs=timeoutMs;
  }
  async send({to,subject,text,html}) {
    // SMTP transport intentionally remains dependency-free. For production,
    // implicit TLS (465) is supported. STARTTLS providers can be fronted by a
    // local SMTP relay; otherwise use the webhook or spool adapter.
    if(!this.host||!this.from) throw new Error('SMTP_HOST and SMTP_FROM are required');
    const tls=await import('node:tls');
    const net=await import('node:net');
    return new Promise((resolve,reject)=>{
      const socket=(this.secure?tls.connect({host:this.host,port:this.port,servername:this.host}):net.connect({host:this.host,port:this.port}));
      let buffer='', step=0, done=false;
      const finish=(err,result)=>{if(done)return;done=true;try{socket.end()}catch{};err?reject(err):resolve(result)};
      const send=cmd=>socket.write(cmd+'\r\n');
      socket.setTimeout(this.timeoutMs,()=>finish(new Error('SMTP timeout')));
      socket.on('error',e=>finish(e));
      socket.on('data',chunk=>{
        buffer+=chunk.toString();
        let idx;
        while((idx=buffer.indexOf('\r\n'))>=0){
          const line=buffer.slice(0,idx);buffer=buffer.slice(idx+2);
          const code=Number(line.slice(0,3));
          if(!code) continue;
          try{
            if(step===0){ if(code!==220) throw new Error(`SMTP greeting ${line}`); send('EHLO horasaar.local'); step=1; }
            else if(step===1){ if(code!==250) throw new Error(`SMTP EHLO ${line}`); if(this.user){send('AUTH LOGIN');step=2}else{send(`MAIL FROM:<${this.from}>`);step=4;} }
            else if(step===2){ if(code!==334) throw new Error(`SMTP AUTH ${line}`); send(Buffer.from(this.user).toString('base64'));step=3; }
            else if(step===3){ if(code!==334) throw new Error(`SMTP AUTH user ${line}`); send(Buffer.from(this.pass||'').toString('base64'));step=4; }
            else if(step===4){ if(code!==235 && this.user) throw new Error(`SMTP AUTH password ${line}`); if(code!==250 && !this.user) throw new Error(`SMTP MAIL ${line}`); if(this.user){send(`MAIL FROM:<${this.from}>`);step=5}else{send(`RCPT TO:<${to}>`);step=6;} }
            else if(step===5){if(code!==250)throw new Error(`SMTP MAIL ${line}`);send(`RCPT TO:<${to}>`);step=6;}
            else if(step===6){if(code!==250)throw new Error(`SMTP RCPT ${line}`);send('DATA');step=7;}
            else if(step===7){if(code!==354)throw new Error(`SMTP DATA ${line}`);const boundary=`jv-${crypto.randomUUID()}`;const msg=`From: ${this.from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}\r\n--${boundary}--\r\n.`;send(msg);step=8;}
            else if(step===8){if(code!==250)throw new Error(`SMTP DATA result ${line}`);send('QUIT');step=9;}
            else if(step===9){finish(null,{status:'sent',provider:'smtp'});}
          }catch(e){finish(e);}
        }
      });
    });
  }
}
export async function createDeliveryTransports(env=process.env) {
  const spool=new SpoolTransport({dir:env.HORASAAR_OUTBOX_DIR||'data/runtime/outbox'});
  const email=env.SMTP_HOST ? new SmtpEmailTransport({host:env.SMTP_HOST,port:env.SMTP_PORT||465,secure:String(env.SMTP_SECURE??'true')!=='false',user:env.SMTP_USER,pass:env.SMTP_PASS,from:env.SMTP_FROM||env.SMTP_USER}) : spool;
  const sms=env.TWILIO_ACCOUNT_SID ? new TwilioSmsTransport({sid:env.TWILIO_ACCOUNT_SID,token:env.TWILIO_AUTH_TOKEN,from:env.TWILIO_FROM}) : (env.SMS_WEBHOOK_URL ? new WebhookTransport({url:env.SMS_WEBHOOK_URL}) : spool);
  return {email,sms,spool};
}
