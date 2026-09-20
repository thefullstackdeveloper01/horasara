import assert from 'node:assert/strict';
import { createApiServer } from '../src/infrastructure/api/ApiServer.js';
const api=createApiServer({calculate: async input=>({ok:true,input})});
await new Promise(resolve=>api.server.listen(0,'127.0.0.1',resolve));
const port=api.server.address().port;
try {
  const h=await fetch(`http://127.0.0.1:${port}/health`); assert.equal(h.status,200); assert.equal((await h.json()).status,'ok');
  const r=await fetch(`http://127.0.0.1:${port}/calculate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({year:2000})}); assert.equal(r.status,200); assert.deepEqual((await r.json()).input,{year:2000});
  const bad=await fetch(`http://127.0.0.1:${port}/calculate`,{method:'POST',headers:{'content-type':'application/json'},body:'[]'}); assert.equal(bad.status,400);
} finally { await new Promise(resolve=>api.server.close(resolve)); }
console.log('API server tests: health, calculation, and request validation passed');
