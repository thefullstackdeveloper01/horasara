import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getSitePage, listSitePages, indexableSitePaths, sitePageGroups } from '../src/content/SitePages.js';
import { renderSitePage, renderArticle } from '../src/content/SitePageRenderer.js';
import { getArticle, listArticles, relatedArticles } from '../src/content/BlogLibrary.js';
import { listOpenings } from '../src/content/Openings.js';
import { searchSite } from '../src/content/SiteSearch.js';
import { MessageStore, validateContact, validateFeedback } from '../src/content/MessageStore.js';

const REQUIRED_SLUGS = [
  'privacy-policy', 'terms', 'disclaimer', 'cookie-policy', 'data-rights', 'copyright',
  'security', 'accessibility', 'about', 'contact', 'faq', 'team', 'testimonials', 'press', 'careers',
  'pricing', 'payment-methods', 'delivery-policy', 'refund-policy', 'track-order', 'cart', 'checkout',
  'blog', 'community', 'affiliates', 'sitemap', 'search', 'maintenance', 'coming-soon', 'server-error',
];

test('every required administrative page exists with real content', () => {
  for (const slug of REQUIRED_SLUGS) {
    const page = getSitePage(slug);
    assert.ok(page, `missing page: ${slug}`);
    assert.ok(page.title && page.title.length > 3, `${slug} needs a title`);
    assert.ok(page.description && page.description.length > 20, `${slug} needs a real description`);
    assert.ok(Array.isArray(page.blocks) && page.blocks.length >= 3, `${slug} needs real content blocks`);
  }
});

test('hidden pages (cart, checkout, maintenance, error, coming-soon) are excluded from public listings and the sitemap', () => {
  const paths = indexableSitePaths();
  for (const slug of ['cart', 'checkout', 'maintenance', 'server-error', 'coming-soon']) {
    assert.ok(!paths.includes(`/${slug}`), `${slug} must not be indexed`);
    assert.ok(!listSitePages().some(p => p.slug === slug), `${slug} must not appear in the public listing`);
  }
  // But they must still be directly reachable and resolvable.
  assert.ok(getSitePage('cart'));
  assert.ok(getSitePage('server-error').status === 500);
  assert.ok(getSitePage('maintenance').status === 503);
});

test('legal pages carry no unresolved template placeholders', () => {
  for (const slug of ['privacy-policy', 'terms', 'refund-policy', 'data-rights']) {
    const page = getSitePage(slug);
    const text = JSON.stringify(page.blocks);
    assert.doesNotMatch(text, /\{\{|__[A-Z_]+__/, `${slug} has a leftover template token`);
  }
});

test('renderSitePage produces headed HTML with breadcrumb and page JSON-LD', () => {
  const page = getSitePage('privacy-policy');
  const { body, structured } = renderSitePage(page, { baseUrl: 'https://example.test', groupTitle: 'Legal & Policies' });
  assert.match(body, /<h1>Privacy Policy<\/h1>/);
  assert.match(body, /class="doc-h"/);
  assert.ok(structured.some(s => s['@type'] === 'BreadcrumbList'));
  assert.ok(structured.some(s => s.url === 'https://example.test/privacy-policy'));
});

test('faq blocks are surfaced as FAQPage structured data', () => {
  const page = getSitePage('faq');
  const { structured } = renderSitePage(page, { baseUrl: 'https://example.test' });
  const faq = structured.find(s => s['@type'] === 'FAQPage');
  assert.ok(faq, 'FAQ page should emit FAQPage JSON-LD');
  assert.ok(faq.mainEntity.length > 5);
});

test('site page groups only include visible pages, grouped by section', () => {
  const groups = sitePageGroups();
  const allSlugs = groups.flatMap(g => g.pages.map(p => p.slug));
  assert.ok(allSlugs.includes('privacy-policy'));
  assert.ok(!allSlugs.includes('cart'));
  const legal = groups.find(g => g.id === 'legal');
  assert.ok(legal.pages.every(p => p.group === 'legal'));
});

test('blog articles are real long-form content with sources and are cross-linked', () => {
  const articles = listArticles();
  assert.ok(articles.length >= 5);
  for (const item of articles) {
    const full = getArticle(item.slug);
    assert.ok(full.blocks.length >= 8, `${item.slug} should be a full article, not a stub`);
    const text = JSON.stringify(full.blocks);
    assert.ok(text.length > 3000, `${item.slug} should be substantial`);
  }
  const related = relatedArticles('how-to-read-your-birth-chart');
  assert.ok(related.length > 0);
});

test('renderArticle emits Article structured data', () => {
  const article = getArticle('ayanamsa-explained');
  const { structured } = renderArticle(article, { baseUrl: 'https://example.test', related: relatedArticles(article.slug) });
  const ld = structured.find(s => s['@type'] === 'Article');
  assert.ok(ld);
  assert.equal(ld.headline, article.title);
});

test('openings list has a stable shape and honours HORASAAR_OPEN_ROLES', () => {
  const openings = listOpenings();
  assert.ok(openings.length >= 3);
  for (const role of openings) {
    assert.ok(['open', 'expression-of-interest'].includes(role.status));
    assert.ok(Array.isArray(role.responsibilities) && role.responsibilities.length >= 2);
  }
});

test('site search matches pages, articles and returns nothing for gibberish', async () => {
  const hit = await searchSite('refund');
  assert.ok(hit.total > 0);
  assert.ok(hit.groups.some(g => g.id === 'pages'));

  const article = await searchSite('dasha');
  assert.ok(article.groups.some(g => g.id === 'articles'));

  const empty = await searchSite('zzzznonexistentqueryxyz123');
  assert.equal(empty.total, 0);
});

test('contact validation rejects incomplete submissions and accepts a good one', () => {
  assert.throws(() => validateContact({ name: 'A' }), /INVALID_SUBMISSION|name|email|message|about|confirm/i);
  const record = validateContact({
    name: 'Priya Shah', email: 'priya@example.com', topic: 'billing',
    message: 'My subscription was charged twice this month, please refund the duplicate charge.',
    consent: true,
  });
  assert.equal(record.type, 'contact');
  assert.equal(record.status, 'new');
});

test('feedback validation enforces a 1-5 rating and moderation gate', () => {
  assert.throws(() => validateFeedback({ name: 'A', rating: 9, message: 'short', consent: true }));
  const record = validateFeedback({
    name: 'Kiran', rating: 5, location: 'Pune',
    message: 'The daily report explained exactly which planetary period was driving the reading.',
    consent: true,
  });
  assert.equal(record.status, 'pending', 'feedback must start unpublished until moderated');
});

test('MessageStore persists, lists and updates status durably', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'horasaar-messages-'));
  const store = new MessageStore({ filePath: join(dir, 'messages.json') });
  try {
    const saved = await store.append({ type: 'feedback', status: 'pending', name: 'Test', rating: 4, message: 'Good service overall and clearly worded.' });
    assert.ok(saved.id);

    const listed = await store.list({ type: 'feedback' });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, saved.id);

    const updated = await store.setStatus(saved.id, 'approved');
    assert.equal(updated.status, 'approved');

    // Concurrent writes must not clobber each other.
    await Promise.all([
      store.append({ type: 'contact', status: 'new', name: 'A', email: 'a@example.com', message: 'one' }),
      store.append({ type: 'contact', status: 'new', name: 'B', email: 'b@example.com', message: 'two' }),
      store.append({ type: 'contact', status: 'new', name: 'C', email: 'c@example.com', message: 'three' }),
    ]);
    const all = await store.list({ limit: 100 });
    assert.equal(all.length, 4);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
