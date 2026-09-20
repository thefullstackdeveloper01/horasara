/**
 * Boots the real server, then runs web/assets/horasaar.js and portal.js inside
 * a minimal DOM against it. Catches the class of bug that a 200 status cannot:
 * a page that responds fine but renders nothing, or renders raw i18n keys.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PORT = 8802;
const BASE = `http://127.0.0.1:${PORT}`;
const srv = spawn('node', ['server.js'], { cwd: '/home/claude/work/HoraSaar', env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) return; } catch {}
    await sleep(250);
  }
  throw new Error('server did not start');
}

const JS = {
  shell: readFileSync('/home/claude/work/HoraSaar/web/assets/horasaar.js', 'utf8'),
  portal: readFileSync('/home/claude/work/HoraSaar/web/assets/portal.js', 'utf8'),
};

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

async function renderPage(path, { locale = 'en', runPortal = true } = {}) {
  const html = await (await fetch(`${BASE}${path}`, { headers: { accept: 'text/html' } })).text();
  const dom = new JSDOM(html, { url: `${BASE}${path}`, pretendToBeVisual: true, runScripts: 'outside-only' });
  const w = dom.window;
  w.fetch = (u, o) => fetch(new URL(u, BASE).href, o);
  w.localStorage.setItem('jv-locale', locale);
  // outside-only mode does not run the page's own inline <script>, which is
  // what sets window.HoraSaarPortal. Without it portal.js sees no key and
  // falls back to the home renderer, so run that one snippet by hand.
  const inline = html.match(/window\.HoraSaarPortal\s*=\s*(\{[^}]*\})/);
  if (inline) w.eval(`window.HoraSaarPortal=${inline[1]}`);
  w.eval(JS.shell);
  if (runPortal && inline) w.eval(JS.portal);
  // Let the async i18n + data fetches settle.
  for (let i = 0; i < 40; i++) { await sleep(60); if (w.document.querySelector('#portalContent')?.textContent.trim().length > 80 || !runPortal) break; }
  await sleep(500);
  return w;
}

await waitUp();

console.log('\n=== Navigation labels (the "navForecasts ▾" bug) ===');
{
  const w = await renderPage('/', { runPortal: false });
  const btns = [...w.document.querySelectorAll('.desktop-main-nav .nav-menu>button')].map(b => b.textContent.replace('▾', '').trim());
  check('five menus rendered', btns.length === 5, btns.join(' | '));
  check('no raw i18n keys in menu labels', !btns.some(t => /^nav[A-Z]/.test(t)), btns.join(' | '));
  const links = [...w.document.querySelectorAll('.desktop-main-nav .nav-dropdown a')];
  check('submenu items present', links.length >= 45, `${links.length} items`);
  const hrefs = links.map(a => a.getAttribute('href'));
  check('no submenu item is a bare /knowledge alias', hrefs.filter(h => h === '/knowledge').length <= 1,
    `${hrefs.filter(h => h === '/knowledge').length} pointing at /knowledge`);
  const uniq = new Set(hrefs);
  check('submenu destinations are mostly distinct', uniq.size >= hrefs.length - 4, `${uniq.size} unique of ${hrefs.length}`);
  const labels = links.map(a => a.querySelector('strong')?.textContent || '');
  check('no raw keys in submenu labels', !labels.some(t => /^nav[A-Z]/.test(t)));
}

console.log('\n=== Hindi locale ===');
{
  const w = await renderPage('/', { locale: 'hi', runPortal: false });
  const btns = [...w.document.querySelectorAll('.desktop-main-nav .nav-menu>button')].map(b => b.textContent.replace('▾', '').trim());
  check('menu labels translated to Hindi', btns.some(t => /[\u0900-\u097F]/.test(t)), btns.join(' | '));
  const labels = [...w.document.querySelectorAll('.desktop-main-nav .nav-dropdown a strong')].map(e => e.textContent);
  const devanagari = labels.filter(t => /[\u0900-\u097F]/.test(t)).length;
  check('submenu items translated', devanagari >= 35, `${devanagari}/${labels.length} in Devanagari`);
  const tagged = [...w.document.querySelectorAll('[data-i18n]')].map(e => e.textContent.trim());
  check('page body strings translated', tagged.some(t => /[\u0900-\u097F]/.test(t)), tagged.slice(0, 4).join(' | '));
}

console.log('\n=== Odia locale (only partial translations — must fall back, not break) ===');
{
  const w = await renderPage('/', { locale: 'or', runPortal: false });
  const labels = [...w.document.querySelectorAll('.desktop-main-nav .nav-dropdown a strong')].map(e => e.textContent);
  check('no raw i18n keys leak on a partially-translated locale', !labels.some(t => /^nav[A-Z]/.test(t)));
}

console.log('\n=== Reference pages render real content ===');
for (const [path, needle] of [
  ['/knowledge', 'God Details'],
  ['/knowledge/gods', 'Hanuman'],
  ['/knowledge/gods/hanuman', 'हनुमते'],
  ['/knowledge/gemstones', 'Blue Sapphire'],
  ['/lists', 'Nakshatras'],
  ['/lists/nakshatras', 'Rohini'],
  ['/lists/nakshatras/rohini', 'Brahma'],
  ['/lists/scriptures', 'Nadi Sutras'],
  ['/calculators', 'Numerology'],
]) {
  const w = await renderPage(path);
  const text = w.document.querySelector('#portalContent')?.textContent || '';
  check(`${path} renders content`, text.length > 120, `${text.length} chars`);
  check(`${path} contains "${needle}"`, text.includes(needle));
}

console.log('\n=== Horoscope ===');
{
  const w = await renderPage('/horoscope');
  const cards = w.document.querySelectorAll('.sign-card');
  check('/horoscope lists 12 signs', cards.length === 12, `${cards.length} cards`);
  check('sign cards carry a star rating', w.document.querySelectorAll('.sign-card .stars').length === 12);
}
{
  const w = await renderPage('/horoscope/leo?period=weekly');
  const text = w.document.querySelector('#portalContent')?.textContent || '';
  check('/horoscope/leo renders a reading', text.length > 800, `${text.length} chars`);
  check('has 7 life-area cards', w.document.querySelectorAll('.area-card').length === 7,
    `${w.document.querySelectorAll('.area-card').length}`);
  check('has lucky factors', text.includes('Lucky number'));
  check('has do/avoid guidance', w.document.querySelectorAll('.guidance').length === 2);
  check('has a remedy mantra', !!w.document.querySelector('.remedy-card .mantra-text'));
  check('lists the transits used', w.document.querySelectorAll('.period-row').length >= 9);
  check('breadcrumbs rendered', (w.document.querySelector('#portalCrumbs')?.textContent || '').includes('Horoscope'));
}

console.log('\n=== 404 ===');
{
  const r = await fetch(`${BASE}/definitely-not-a-page`, { headers: { accept: 'text/html' } });
  const body = await r.text();
  check('404 status', r.status === 404);
  check('404 is the styled page', body.includes('notfound-wrap'));
  const rj = await fetch(`${BASE}/api/nope`, { headers: { accept: 'application/json' } });
  check('API 404 still returns JSON', rj.status === 404 && (await rj.text()).startsWith('{'));
}

console.log('\n=== Sitemap includes the new pages ===');
{
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check('sitemap has knowledge topics', xml.includes('/knowledge/gemstones'));
  check('sitemap has list groups', xml.includes('/lists/nakshatras'));
  check('sitemap has per-sign horoscopes', xml.includes('/horoscope/leo'));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
srv.kill();
process.exit(fail ? 1 : 0);
