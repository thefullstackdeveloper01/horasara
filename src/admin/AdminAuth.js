import crypto from 'node:crypto';

function safeEqual(a,b){
  const aa=Buffer.from(String(a??'')); const bb=Buffer.from(String(b??''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}
function b64(v){ return Buffer.from(v).toString('base64url'); }
function unb64(v){ return Buffer.from(v,'base64url').toString('utf8'); }

export function adminConfig(env=process.env){
  const route=String(env.ADMIN_ROUTE||'/_jv-control-7f3c9a1d').trim();
  const username=String(env.ADMIN_USERNAME||'').trim();
  const password=String(env.ADMIN_PASSWORD||'');
  const secret=String(env.ADMIN_SESSION_SECRET||'');
  return {route:route.startsWith('/')?route:`/${route}`,username,password,secret,configured:Boolean(username&&password&&secret)};
}
function sign(body,secret){ return crypto.createHmac('sha256',secret).update(body).digest('base64url'); }
export function issueSession({username,secret,ttlSeconds=8*60*60}){
  const payload={u:username,exp:Math.floor(Date.now()/1000)+ttlSeconds};
  const body=b64(JSON.stringify(payload)); return `${body}.${sign(body,secret)}`;
}
export function verifySession(token,{username,secret}={}){
  try{
    const [body,sig]=String(token||'').split('.'); if(!body||!sig||!secret) return false;
    if(!safeEqual(sig,sign(body,secret))) return false;
    const p=JSON.parse(unb64(body)); return p.u===username && Number(p.exp)>Math.floor(Date.now()/1000);
  }catch{return false;}
}
export function parseCookies(header=''){
  return Object.fromEntries(String(header).split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));
}
export function setSessionCookie(token,secure){ return `jv_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure?'; Secure':''}`;
}
export function clearSessionCookie(path='/'){ return `jv_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`; }
export function verifyCredentials(username,password,cfg=adminConfig()){
  return cfg.configured && safeEqual(username,cfg.username) && safeEqual(password,cfg.password);
}
