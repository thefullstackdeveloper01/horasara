# HoraSaar 1.0.0 — Production Build

This is the compact production distribution of HoraSaar.

## Included
- Dataset-driven Jyotish calculation and prediction engine (ephemeris
  computation memoized — repeat Julian Dates within one chart calculation
  are cached, ~40% faster than the unmemoized engine, verified
  byte-identical output on all deterministic fields)
- **"Your Kundali, Explained" trust panel** — every prediction response
  includes `prediction.kundaliTrust`: the chart's active doshas/yogas
  explained as Situation → Why → What it means → Traditional remedy, each
  backed by a real, attributed excerpt from a classical source text where
  a confident match exists (see "Scripture citations" below)
- Responsive web UI
- Accessibility foundations: semantic controls, labels, keyboard focus and reduced-motion support
- SEO: canonical URLs, robots.txt, sitemap.xml, JSON-LD, manifest and llms.txt
- Razorpay payment flow with server-side amount validation, checkout signature verification and webhook signature verification
- UPI availability through Razorpay Checkout when enabled/eligible on the merchant account
- Persistent subscription/payment state in the configured JSON database
- Timezone-aware personalized scheduled reports at the subscriber's configured delivery time (30 locations, each with a real IANA timezone)
- Email delivery plus dependency-free spool fallback
- Production security headers, payload limits, rate limiting and private admin boundary

## Scripture citations
`dataset/scripture-citation-index.json` (≈0.9 MB) is a prebuilt index of
short, attributed excerpts extracted offline from 171 classical source
books, built by `tools/build-scripture-index.mjs`. The 330 MB raw book
corpus itself is **not** included in this core build — it ships
separately as the optional **HoraSaar Scripture Pack** (see that pack's
own README for what it adds and how to install it). The core app's
citations work fully without it.

## What changed in this build (fixed this session)
- Subscription confirmation emails were never sent (`ReferenceError` on an
  undefined `plan` variable, silently swallowed) — fixed; verified an
  email now spools/sends with the correct plan name.
- `/tools` page rendered raw, unevaluated JavaScript as visible text —
  fixed with real markup.
- The birth-place picker read fields (`x.city`, `x.country`,
  `x.utcOffset`) that don't exist in `locations.json` — every prediction
  request silently sent `tz: null` and failed with HTTP 422. Fixed; 30
  locations now carry a real IANA `timeZone` too, so scheduled email
  delivery times are correct for non-India subscribers (11 of 30 cities
  were previously defaulting to IST).
- CSP blocked Google Fonts and the icon library's sourcemap request —
  `style-src`, `font-src` and `connect-src` updated.
- Removed 109 unreachable source files (never imported from `server.js`
  or `scheduler.js`) and 3 `package.json` script entries that referenced
  a nonexistent `scripts/` folder.

## Administrative, legal & content pages — V2.2

A full set of standard website pages has been added under `src/content/` and is
served by `ApiServer.js` through one shared HTML shell (`web/page.html`) and
one hydration script (`web/assets/site.js`). This is separate from the
Jyotish/portal content above.

**Pages added** (each with real, deployment-specific copy — not placeholder
text): `/privacy-policy`, `/terms`, `/disclaimer`, `/cookie-policy`,
`/data-rights` (GDPR + CCPA + India DPDP), `/copyright` (DMCA), `/security`,
`/accessibility`, `/about`, `/contact`, `/faq`, `/team`, `/testimonials`,
`/press`, `/careers`, `/pricing`, `/payment-methods`, `/delivery-policy`,
`/refund-policy`, `/track-order`, `/cart`, `/checkout`, `/blog` (+ 6 full
articles under `/blog/<slug>`), `/community`, `/affiliates`, `/sitemap`
(human-readable), `/search`, `/maintenance`, `/coming-soon`, `/server-error`.

**Configuration.** Company name, address, GSTIN/CIN, jurisdiction and every
contact address quoted on these pages come from environment variables — see
the "Company / legal identity" block in `.env.example`. Until
`COMPANY_LEGAL_NAME`, `COMPANY_ADDRESS`, `PUBLIC_BASE_URL` and `SUPPORT_EMAIL`
are set to real values, `siteIdentity()` flags them as placeholders
(`src/content/SiteIdentity.js`); replace them before launch — do not ship the
sample values.

**Architecture.**
- `src/content/SitePages.js` — the page registry (legal, company, commerce,
  resources), built once from `siteIdentity()`.
- `src/content/SitePageRenderer.js` — turns a page's content blocks into HTML,
  adds a table of contents for long documents, and emits BreadcrumbList /
  FAQPage / WebPage / Article JSON-LD.
- `src/content/BlogLibrary.js` — six full-length articles (chart reading,
  Vimshottari Dasha, birth-time accuracy, Panchang, spotting bad astrology,
  ayanamsa) with named classical sources.
- `src/content/SiteSearch.js` — merges page, article, calculator and reference
  library results behind `/api/search`.
- `src/content/MessageStore.js` — an atomic, queued JSON store (write to a
  temp file, then rename) backing the contact form and reader feedback, with
  a honeypot field and a moderation gate: feedback is `pending` until an
  administrator sets it to `approved` and only then appears on
  `/testimonials`.
- `web/assets/site.js` hydrates the `data-widget` containers the renderer
  emits (contact/feedback forms, plan list, cart, track-order, search,
  blog index, job list, HTML sitemap); every widget has a no-script fallback.
- The full site footer and the cookie notice are injected by
  `web/assets/horasaar.js` on every page from `/api/site/pages`.

**New JSON endpoints:** `GET /api/site/pages`, `GET /api/site/map`,
`GET /api/articles`, `GET /api/openings`, `GET /api/search?q=`,
`POST /api/contact`, `GET|POST /api/feedback`. Admin-only:
`GET {ADMIN_ROUTE}/api/messages`, `POST {ADMIN_ROUTE}/api/messages/status`
(moderate contact messages and reviews from the existing admin control room).

**Behaviour notes.**
- `MAINTENANCE_MODE=true` serves the styled maintenance page (HTTP 503) for
  all public traffic while keeping `/health`, the admin route and
  `/payments/webhook` reachable, so an in-flight payment is never lost.
- Any uncaught error in a request now renders the styled `/server-error` page
  (or a JSON body for API clients) with a short reference id that is also
  written to the server log, instead of hanging the socket.
- `/cart`, `/checkout`, `/maintenance`, `/coming-soon` and `/server-error` are
  `hidden` in the registry: reachable directly, excluded from the footer, the
  HTML sitemap and `sitemap.xml`.
- Legacy/likely-typed URLs 301-redirect to the canonical slug:
  `/privacy`, `/terms-of-service`, `/refunds`, `/cookies`, `/dmca`,
  `/about-us`, `/contact-us`, `/plans`, `/500`, `/error`.
- `sitemap.xml` and `/llms.txt` were extended to include every new page and
  article automatically (`indexableSitePaths()`, `listArticles()`).
- Tests: `test/site-content-pages.test.mjs` covers page/article completeness,
  hidden-page exclusion, structured data, search and the message store
  (including a concurrent-write test). Run with
  `node --test test/site-content-pages.test.mjs`.

## Production configuration
Copy `.env.example` to the deployment environment and set real secrets. Never put payment secrets in browser code.

Required for live payments:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Required for real email:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Set `PUBLIC_BASE_URL` to the exact HTTPS origin.

## Run
```bash
npm start
npm run subscriptions:daemon
```

Run the scheduler as a supervised service (systemd, Docker restart policy, PM2, Kubernetes, etc.). Do not rely on a browser tab for scheduled delivery.

## Known follow-ups (not yet done — flagged, not hidden)
- `/prediction` takes ~3 seconds per uncached request (ephemeris math).
  `src/infrastructure/cache/MemoryCalculationCache.js` and
  `CachedChartCalculator.js` exist in the codebase but are not yet wired
  into the server — wiring them would make repeat requests for the same
  birth data near-instant. First-ever request for a given birth data will
  still take ~3s; there is no way around the ephemeris computation cost
  for a new chart.
- The engine's forecast-calendar timing is not perfectly deterministic
  across processes (sub-second timestamp drift observed in testing,
  present in the unmodified engine too) — worth a fix if "mathematically
  proven" / fully reproducible output is a hard requirement.
- Two of the three Devanagari-only book files could not be indexed for
  citations (`.json` files without a machine-readable `text` field) —
  source data issue, listed in the build script's own output.

## Important performance target
A universal 3 ms end-to-end response time cannot be guaranteed: TLS, network RTT, browser rendering, database I/O and third-party payment APIs are outside the application's control. The build is optimized for low server overhead, compact assets, caching of public assets and deterministic local calculations. Measure p50/p95/p99 in the target production region before setting an SLA.

## Mathematical / calculation integrity
The calculation engine is deterministic and input-driven. "Mathematically proven" should be understood as verified formulas, invariants, regression/golden tests and deterministic outputs—not as proof that astrological predictions are empirically guaranteed.

## Security
No software can honestly guarantee that nobody will ever hack it. This release applies defense-in-depth, but production still requires HTTPS, secret management, dependency/OS patching, backups, monitoring, WAF/rate limiting at the edge, least-privilege deployment and periodic security testing.

## Full public navigation and core feature surface — V2.1

The production web surface now exposes the requested navigation groups through the shared responsive menu and mobile drawer:

- Rāśi Based Bhavishya — daily, weekly, monthly, yearly
- Planet Based Bhavishya
- Nakshatra Based Bhavishya — daily, weekly, monthly, yearly
- Astronomy & World Sky — calculated conjunction watch with explicitly labelled traditional interpretation
- Panchang / Panchangam — daily, weekly, monthly and yearly views; Tithi, Vara, Nakshatra, Yoga, Karana, Abhijit, Brahma, Vijaya, Godhuli, Nishita, Rahu Kaal, Choghadiya, Hora, sunrise and sunset
- Hindu Calendar / Festivals
- Kundali Milan — full Ashtakoot, supplementary kootas, Mangal Dosha and Papa Samyam through the existing Milan engine
- Calculators — including the new Ayanamsa Calculator plus the existing numerology, Rāśi, Sun Sign, Ascendant, Nakshatra, Love, Friendship and other tools
- Lists — Nakshatras, Rāśi, solar/lunar months, Navagraha, concepts, Yogas, scriptures and Rishis/Astrologers
- Knowledge — festivals, deities/lords, mantra, tantra, yantra, gemstones, devotional references, names and classical sources

Public calculation endpoints are rate-limited and request payloads are recursively sanitized against control characters, prototype-pollution keys and excessive nesting. Public pages use the bundled CSS/JS only; Razorpay remains the intentionally external payment provider.

### Payment configuration

Razorpay checkout cannot be activated without merchant credentials. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in the server environment. The UI now exposes the supported payment-method choices, prevents a misleading fake activation, and keeps subscription management/cancellation on the private management-token flow.

### Accuracy boundary

Astronomical quantities are deterministic calculations from the application's astronomy engine. Traditional Jyotish interpretations, festival observance rules and predictive statements are not scientific proofs and are therefore labelled as traditional/rule-based guidance rather than guaranteed causal outcomes.

## CLI/PDF Basic vs Full Report selector

Running `node cli.js` or `node generatepdf.js` now starts the normal birth-report flow with exactly two choices: **1) Basic Report** or **2) Full Report**. `node pdfgenerate.js` remains the canonical PDF command.

- Basic Report uses the shared `src/reporting/BasicReport.js` definition for both console and PDF output and contains the 15 requested customer-facing groups.
- Full Report preserves the existing detailed pipeline and the 80-section master report organization.
- `--report basic` and `--report full` are supported for automation; non-interactive runs without `--report` default to Full.
- Existing `--mode milan` and `--mode panchang` flows are preserved. Legacy `--report today|monthly|yearly` scopes remain accepted.
- `generatepdf.js` is an additive compatibility alias for `pdfgenerate.js`.
- No calculation engine was replaced by the Basic selector; it is presentation-only over the same canonical chart result.

## General Forecast & Astronomy Feed Architecture
- `/rashi-bhavishya`, `/planet-bhavishya`, and `/nakshatra-bhavishya` are general forecasts; they do not use a user's birth chart.
- Daily/weekly/monthly/yearly general forecasts sample the internal astronomical engine across the selected period and aggregate configured sign/aspect signals.
- `/forecast/general` is the normalized calculation endpoint used by the Web forecast portals.
- `/astronomy/space-feed` is a server-side proxy/cache for NASA APOD, NASA NeoWs, NASA DONKI and NOAA SWPC data. External feeds are informational astronomy/space-weather data and are not treated as Jyotish causal evidence.
- No new third-party npm package is required for these additions; Node's native `fetch()` is used for external read-only feeds.
- Set `NASA_API_KEY` server-side for NASA APIs. Never place the key in browser JavaScript.
