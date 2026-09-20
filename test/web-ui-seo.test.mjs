import assert from 'node:assert/strict';
import { createApiServer } from '../src/infrastructure/api/ApiServer.js';

const api = createApiServer({ calculate: async input => ({ meta: input }), host: '127.0.0.1', port: 0 });
await new Promise(resolve => api.server.listen(0, api.host, resolve));
const port = api.server.address().port;
const get = async path => {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  return { status: res.status, text: await res.text(), contentType: res.headers.get('content-type') || '' };
};
try {
  const home = await get('/');
  assert.equal(home.status, 200);
  assert.match(home.text, /rel="canonical"/);
  assert.doesNotMatch(home.text, /__PUBLIC_BASE_URL__/);
  assert.match(home.text, /languageToggle/);
  assert.match(home.text, /id="theme"/);

  const report = await get('/report');
  assert.equal(report.status, 200);
  assert.match(report.text, /noindex,nofollow,noarchive/);
  assert.match(report.text, /Technical JSON for audit\/debugging/);

  const tools = await get('/tools');
  assert.equal(tools.status, 200);
  assert.match(tools.text, /Astrology Tools & Calculators/);

  const tool = await get('/tools/love');
  assert.equal(tool.status, 200);
  const ld = tool.text.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
  assert.ok(ld);
  assert.equal(JSON.parse(ld).name, 'Love Calculator');
  assert.match(tool.text, /Love Calculator/);

  const robots = await get('/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(robots.text, /Sitemap: http:\/\/127\.0\.0\.1:/);

  const sitemap = await get('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.contentType, /application\/xml/);
  assert.ok((sitemap.text.match(/<url>/g) || []).length >= 28);

  const css = await get('/assets/jyotiveda.css');
  assert.equal(css.status, 200);
  assert.match(css.contentType, /text\/css/);

  console.log('Web UI + SEO tests: PASS');
} finally {
  await new Promise(resolve => api.server.close(resolve));
}
