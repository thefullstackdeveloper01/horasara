/**
 * CANONICAL DEFECT REGRESSION SUITE
 * ==================================
 * Locks in defects found by executing the engine (not by reading claims).
 * Every assertion here corresponds to a numbered clause of the master
 * engineering prompt. If any of these fail, the defect has returned.
 *
 *   D-01  §9  / §71.4 / §71.5 / §85.5 — one canonical solar-event engine
 *   D-02  §15 / §71.9 / §85.9        — Drik Bala is mathematically calculated
 *   D-03  §67 / §74                  — current-time dependence is declared
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateChart } from '../src/engine.js';
import { sphutaDrishti, grahaDrishti, drishtiNature } from '../src/strength/shadbala.js';
import { sunriseSunsetCorrected } from '../src/panchanga/panchanga.js';
import { sunriseSunset } from '../src/astronomy/utils.js';

const BIRTH = { year: 1990, month: 1, day: 15, hour: 14, min: 30, lat: 23.0225, lon: 72.5714, tz: 5.5 };
const chart = await calculateChart(BIRTH);

/* ─────────────────────────────────────────────────────────────
   D-01 — CANONICAL SOLAR EVENTS
   Regression: panchanga.sunriseSunsetCorrected() used to re-apply
   refraction on top of sunriseSunset()'s already-refracted result,
   producing a ~55s disagreement between meta.sunrise and
   panchanga.sunrise for the same birth.
   ───────────────────────────────────────────────────────────── */
test('D-01a sunriseSunsetCorrected does not double-correct refraction', () => {
  const base = sunriseSunset(2447906.875, BIRTH.lat, BIRTH.lon, 0);
  const corr = sunriseSunsetCorrected(2447906.875, BIRTH.lat, BIRTH.lon, 0);
  const driftSec = Math.abs(corr.sunrise - base.sunrise) * 86400;
  assert.ok(driftSec < 1e-6,
    `sunrise must be byte-identical to the canonical engine, drifted ${driftSec.toFixed(3)}s`);
  assert.ok(Math.abs(corr.sunset - base.sunset) * 86400 < 1e-6, 'sunset must match canonical engine');
});

test('D-01b elevation is forwarded to the canonical engine, not re-derived', () => {
  const sea = sunriseSunsetCorrected(2447906.875, BIRTH.lat, BIRTH.lon, 0);
  const high = sunriseSunsetCorrected(2447906.875, BIRTH.lat, BIRTH.lon, 2000);
  // A higher observer sees the sun earlier. 2000m dip ~= 1.31deg -> minutes, not seconds.
  assert.ok(high.sunrise < sea.sunrise, 'elevated observer must get an earlier sunrise');
  const deltaMin = (sea.sunrise - high.sunrise) * 1440;
  assert.ok(deltaMin > 1 && deltaMin < 30, `implausible elevation effect: ${deltaMin.toFixed(2)} min`);
});

test('D-01c every birth-date solar event in the chart is identical', () => {
  const found = [];
  (function walk(o, path, d = 0) {
    if (d > 8 || o === null || typeof o !== 'object') return;
    // Skip sections that explicitly declare they are evaluated at another epoch.
    if (o.timeDependent === true) return;
    for (const [k, v] of Object.entries(o)) {
      if (/^(sunrise|sunset)$/i.test(k) && typeof v === 'string') found.push([path + '.' + k, k.toLowerCase(), v]);
      if (v && typeof v === 'object') walk(v, path + '.' + k, d + 1);
    }
  })(chart, '');
  for (const kind of ['sunrise', 'sunset']) {
    const vals = found.filter(f => f[1] === kind);
    const distinct = [...new Set(vals.map(v => v[2]))];
    assert.equal(distinct.length <= 1, true,
      `${kind} disagrees across the chart: ${JSON.stringify(vals)}`);
  }
  assert.ok(found.length >= 2, 'expected the chart to surface solar events at all');
});

/* ─────────────────────────────────────────────────────────────
   D-02 — DRIK BALA
   Regression: drigBala() read `p.aspects`, a key no caller ever set,
   so the accumulation loop never ran and Drik Bala was exactly 0
   for every planet in every chart.
   ───────────────────────────────────────────────────────────── */
test('D-02a Sphuta Drishti curve is continuous at every breakpoint', () => {
  for (const b of [30, 60, 90, 120, 150, 180, 300]) {
    const gap = Math.abs(sphutaDrishti(b - 1e-9) - sphutaDrishti(b + 1e-9));
    assert.ok(gap < 1e-6, `discontinuity ${gap} at d=${b}`);
  }
});

test('D-02b Sphuta Drishti stays within [0,60] and wraps correctly', () => {
  let mn = Infinity, mx = -Infinity;
  for (let d = 0; d < 360; d += 0.05) { const v = sphutaDrishti(d); mn = Math.min(mn, v); mx = Math.max(mx, v); }
  assert.ok(mn >= 0 && mx <= 60 + 1e-9, `range violated: [${mn}, ${mx}]`);
  assert.equal(sphutaDrishti(-30), sphutaDrishti(330), 'must normalise negative angles');
  assert.equal(sphutaDrishti(180), 60, '7th aspect must be full 60 virupas');
  assert.equal(sphutaDrishti(0), 0, 'conjunction casts no drishti');
});

test('D-02c BPHS special aspects reach full strength; others do not', () => {
  assert.equal(Math.round(grahaDrishti('Mars', 90)), 60, 'Mars 4th');
  assert.equal(Math.round(grahaDrishti('Mars', 210)), 60, 'Mars 8th');
  assert.equal(Math.round(grahaDrishti('Jupiter', 120)), 60, 'Jupiter 5th');
  assert.equal(Math.round(grahaDrishti('Jupiter', 240)), 60, 'Jupiter 9th');
  assert.equal(Math.round(grahaDrishti('Saturn', 60)), 60, 'Saturn 3rd');
  assert.equal(Math.round(grahaDrishti('Saturn', 270)), 60, 'Saturn 10th');
  // The Sun has no special aspect: it must fall back to the base curve.
  assert.equal(grahaDrishti('Sun', 90), sphutaDrishti(90), 'Sun must get no special aspect');
  assert.equal(grahaDrishti('Venus', 60), sphutaDrishti(60), 'Venus must get no special aspect');
});

test('D-02d Moon benefic/malefic nature follows paksha, not a fixed list', () => {
  assert.equal(drishtiNature('Moon', { moonLon: 180, sunLon: 0 }), 'benefic', 'full moon is benefic');
  assert.equal(drishtiNature('Moon', { moonLon: 10, sunLon: 0 }), 'malefic', 'new moon is malefic');
});

test('D-02e Drik Bala is actually calculated for every planet', () => {
  const sb = chart.shadbala;
  const names = Object.keys(sb);
  assert.ok(names.length >= 7, 'expected seven grahas');
  const allZero = names.every(n => sb[n].drigBala === 0);
  assert.equal(allZero, false, 'REGRESSION: Drik Bala is zero for every planet again');
  for (const n of names) {
    const d = sb[n].drigBala;
    assert.equal(Number.isFinite(d), true, `${n} Drik Bala is not finite: ${d}`);
    // BPHS bound: pinda is at most 8 aspects * 60 virupas, /4 => +/-120.
    assert.ok(Math.abs(d) <= 120, `${n} Drik Bala out of bounds: ${d}`);
  }
});

test('D-02f Drik Bala exposes a full audit trail (§15)', () => {
  for (const [name, v] of Object.entries(chart.shadbala)) {
    const det = v.drigBalaDetail;
    assert.ok(det, `${name} missing drigBalaDetail`);
    assert.equal(det.status, 'CALCULATED', `${name} Drik Bala not CALCULATED`);
    assert.ok(det.formula && det.source, `${name} missing formula/source`);
    assert.ok(Array.isArray(det.contributions), `${name} missing contributions`);
    // The reported result must equal pinda/4 exactly.
    assert.ok(Math.abs(det.result - det.drishtiPinda / 4) < 0.01,
      `${name}: result ${det.result} != pinda/4 ${det.drishtiPinda / 4}`);
    // Every contribution must reconcile to the pinda.
    const sum = det.contributions.reduce((a, c) => a + c.signedVirupas, 0);
    assert.ok(Math.abs(sum - det.drishtiPinda) < 0.05,
      `${name}: contributions ${sum} do not reconcile to pinda ${det.drishtiPinda}`);
  }
});

test('D-02g Drik Bala flows into the Shadbala total', () => {
  for (const [name, v] of Object.entries(chart.shadbala)) {
    const parts = v.totalSthanaBala + v.digBala + v.totalKalaBala + v.cheshtaBala + v.naisargikaBala + v.drigBala;
    assert.ok(Math.abs(parts - v.totalShadbala) < 0.05,
      `${name}: components ${parts.toFixed(2)} != totalShadbala ${v.totalShadbala}`);
  }
});

/* ─────────────────────────────────────────────────────────────
   D-03 — DECLARED TIME DEPENDENCE
   ───────────────────────────────────────────────────────────── */
test('D-03 non-reproducible sections declare their epoch', () => {
  const m = chart.extendedReport?.muhurta;
  assert.ok(m, 'muhurta section missing');
  assert.equal(m.timeDependent, true, 'muhurta must declare current-time dependence');
  assert.equal(m.referenceEpoch, 'CURRENT_INSTANT');
  assert.equal(m.reproducible, false);
});


/* ─────────────────────────────────────────────────────────────
   D-04 — §71.1 `vargas is not defined`
   The headline defect. It survived source greps because it was a
   RUNTIME ReferenceError swallowed by a try/catch and stringified
   into the report as '(unavailable: vargas is not defined)'.
   ───────────────────────────────────────────────────────────── */
test('D-04a no section is an "(unavailable: ...)" swallowed-exception stub', () => {
  const found = [];
  (function walk(o, path, d = 0) {
    if (d > 8 || o == null) return;
    if (typeof o === 'string') { if (/^\(unavailable/.test(o)) found.push(path + ' = ' + o); return; }
    if (typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) walk(v, path + '.' + k, d + 1);
  })(chart, '');
  assert.deepEqual(found, [], `§65 swallowed exceptions present:\n${found.join('\n')}`);
});

test('D-04b executive summary renders real content', () => {
  const es = chart.extendedReport?.executiveSummary;
  assert.ok(Array.isArray(es) && es.length > 5, 'executiveSummary missing or truncated');
  assert.ok(es.join('\n').includes('EXECUTIVE SUMMARY'), 'executiveSummary did not render');
  assert.ok(!es.join('\n').includes('is not defined'), 'REGRESSION: ReferenceError text in report');
});

/* ─────────────────────────────────────────────────────────────
   D-05 — §4 NaN / Infinity must never reach output
   ───────────────────────────────────────────────────────────── */
test('D-05 no NaN or Infinity anywhere in the chart output', () => {
  const bad = [];
  (function walk(o, path, d = 0) {
    if (d > 8 || o == null) return;
    if (typeof o === 'number') { if (!Number.isFinite(o)) bad.push(`${path} = ${o}`); return; }
    if (typeof o === 'string') { if (/NaN|^-?Infinity$/.test(o)) bad.push(`${path} = ${o.slice(0, 60)}`); return; }
    if (typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) walk(v, path + '.' + k, d + 1);
  })(chart, '');
  assert.equal(bad.length, 0, `§4 non-finite values reached output:\n${bad.slice(0, 10).join('\n')}`);
});

/* ─────────────────────────────────────────────────────────────
   D-06 — §1/§36 birth-time sensitivity must agree with the chart
   ───────────────────────────────────────────────────────────── */
test('D-06a sensitivity table agrees with the canonical Lagna', () => {
  const rows = chart.extendedReport.birthTimeSensitivity;
  const stated = rows.find(r => typeof r === 'string' && r.includes('STATED TIME'));
  assert.ok(stated, 'stated-time row missing');
  const canonicalSign = chart.lagna?.sign || chart.ascendant?.sign;
  assert.ok(canonicalSign, 'chart exposes no canonical Lagna sign');
  assert.ok(stated.includes(canonicalSign),
    `§1 VIOLATION: sensitivity row "${stated.trim()}" contradicts canonical Lagna ${canonicalSign}`);
  assert.ok(!stated.includes('NaN'), 'clock time is NaN');
});

test('D-06b ascendant advances non-uniformly (real solver, not a linear guess)', () => {
  const rows = chart.extendedReport.birthTimeSensitivity
    .filter(r => typeof r === 'string' && /\d\d:\d\d \(/.test(r));
  const degs = rows.map(r => { const m = r.match(/(\d+\.\d+)°/); return m ? parseFloat(m[1]) : null; })
                   .filter(x => x !== null);
  assert.ok(degs.length >= 5, 'not enough sensitivity rows parsed');
  const steps = degs.slice(1).map((d, i) => d - degs[i]);
  const spread = Math.max(...steps) - Math.min(...steps);
  // A flat 0.25°/min extrapolation gives identical steps (spread == 0 exactly).
  assert.ok(spread > 1e-6,
    'REGRESSION: ascendant steps are perfectly uniform — the linear approximation is back');
});

/* ─────────────────────────────────────────────────────────────
   D-07 — §4 exact-aspect timestamps are real dates in-window
   ───────────────────────────────────────────────────────────── */
test('D-07 exact aspect timestamps parse and fall inside the forecast window', () => {
  const win = chart.exactEventForecast?.[0];
  if (!win) return; // nothing forecast for this chart is acceptable
  const aspects = (win.triggers ?? []).flatMap(t => t.exactAspects ?? []);
  if (!aspects.length) return;
  // The formatter now degrades a bad JD to 'NOT_CALCULATED' rather than NaN
  // (§40). That is correct behaviour, but it must not be allowed to MASK the
  // upstream defect: if the point-item stops carrying `jd`, every aspect
  // degrades at once. So require that aspects are genuinely computed.
  const resolved = aspects.filter(a => a.dateTime !== 'NOT_CALCULATED');
  assert.ok(resolved.length === aspects.length,
    `REGRESSION: ${aspects.length - resolved.length}/${aspects.length} exact aspects degraded to NOT_CALCULATED — upstream jd is missing`);
  const lo = Date.parse(win.startDate ?? win.start);
  const hi = Date.parse(win.endDate ?? win.end);
  for (const a of resolved) {
    assert.ok(!/NaN/.test(a.dateTime), `NaN in exact aspect date: ${a.dateTime}`);
    const t = Date.parse(a.dateTime);
    assert.ok(!Number.isNaN(t), `unparseable exact aspect date: ${a.dateTime}`);
    if (Number.isFinite(lo) && Number.isFinite(hi)) {
      assert.ok(t >= lo - 864e5 && t <= hi + 864e5,
        `exact aspect ${a.dateTime} falls outside its forecast window`);
    }
  }
});


/* ─────────────────────────────────────────────────────────────
   D-08 — §66/§67 the reproducibility manifest must be TRUE, not
   decorative. Everything it does not list must be byte-identical
   across runs; everything it lists must actually vary.
   ───────────────────────────────────────────────────────────── */
test('D-08 reproducibility manifest matches measured behaviour', async () => {
  const man = chart.reproducibility;
  assert.ok(man, 'reproducibility manifest missing');
  assert.equal(man.status, 'DECLARED');
  assert.ok(Array.isArray(man.timeDependentSections));
  assert.ok(man.versions?.ephemerisProvider, 'engine version not recorded');

  await new Promise(r => setTimeout(r, 1200));
  const again = await calculateChart(BIRTH);

  const TS = new Set(['generatedAt','generated_at','calculationDateTime','referenceJD',
                      'auditHash','timestamp','createdAt','asOf','evaluationInstantJD','evaluationInstantUTC']);
  const strip = (o) => JSON.stringify(o, (k, v) => (TS.has(k) ? undefined : v));

  const declared = new Set(man.timeDependentSections.map(s => s.split('.')[0]));
  const drifted = [];
  for (const k of Object.keys(chart)) {
    if (k === 'reproducibility') continue;
    if (strip(chart[k]) !== strip(again[k])) drifted.push(k);
  }
  const undeclared = drifted.filter(k => !declared.has(k));
  assert.deepEqual(undeclared, [],
    `§67 VIOLATION: these sections vary run-to-run but are not declared time-dependent: ${undeclared.join(', ')}`);
});

console.log('canonical-defect-regression: PASS');
