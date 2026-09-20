import { siteIdentity, POLICY_EFFECTIVE_DATE, postalAddress } from './SiteIdentity.js';
import { legalPages } from './pages/legal.js';
import { companyPages } from './pages/company.js';
import { commercePages } from './pages/commerce.js';
import { resourcePages } from './pages/resources.js';

/**
 * The administrative, legal, commercial and utility page registry.
 *
 * Pages are built once per process from the current environment so that a
 * deployment's real company details flow into every legal page without any
 * duplication. `hidden` keeps a page out of the footer, the HTML sitemap and
 * the XML sitemap (cart, checkout and the system pages), while `robots`
 * overrides the default index directive.
 */

export const PAGE_GROUPS = [
  { id: 'company', title: 'Company', description: 'Who we are and how to reach us.' },
  { id: 'commerce', title: 'Plans & Orders', description: 'Pricing, payment, delivery, refunds and order status.' },
  { id: 'resources', title: 'Resources', description: 'Articles, search, community and partners.' },
  { id: 'legal', title: 'Legal & Policies', description: 'Privacy, terms, disclaimers and your data rights.' },
  { id: 'system', title: 'System', description: 'Status and error pages.' },
];

let cache = null;

function build() {
  const id = siteIdentity();
  const date = POLICY_EFFECTIVE_DATE;
  const address = postalAddress(id);
  const context = { id, date, address };

  const pages = [
    ...companyPages(context),
    ...commercePages(context),
    ...resourcePages(context),
    ...legalPages(context),
  ].map(page => ({
    robots: 'index,follow,max-image-preview:large',
    status: 200,
    hidden: false,
    ...page,
    path: `/${page.slug}`,
  }));

  const index = new Map(pages.map(p => [p.slug, p]));
  return { pages, index, identity: id };
}

function registry() {
  if (!cache) cache = build();
  return cache;
}

/** Rebuilds the registry. Used by tests that mutate process.env. */
export function resetSitePages() { cache = null; }

export function getSitePage(slug) {
  return registry().index.get(String(slug || '').replace(/^\/+|\/+$/g, '').toLowerCase()) || null;
}

export function listSitePages({ includeHidden = false } = {}) {
  return registry().pages
    .filter(p => includeHidden || !p.hidden)
    .map(({ blocks, ...rest }) => rest);
}

/** Grouped listing for the footer and the HTML sitemap. */
export function sitePageGroups({ includeHidden = false } = {}) {
  const pages = listSitePages({ includeHidden });
  return PAGE_GROUPS
    .map(group => ({ ...group, pages: pages.filter(p => p.group === group.id) }))
    .filter(group => group.pages.length);
}

/** Every indexable administrative path, for the XML sitemap. */
export function indexableSitePaths() {
  return registry().pages
    .filter(p => !p.hidden && !/noindex/i.test(p.robots))
    .map(p => p.path);
}

export function sitePageIdentity() { return registry().identity; }
