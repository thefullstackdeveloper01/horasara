/**
 * Renders a content page's blocks to HTML on the server.
 *
 * Server-side rendering rather than a client fetch is deliberate: legal and
 * policy text must be present in the initial response for crawlers, for
 * archiving, and for anyone reading with scripting disabled. The interactive
 * pieces (forms, plan lists, search) are `widget` blocks that ship an empty,
 * labelled container the client script hydrates — and each widget container
 * carries a no-script fallback so the page is never a blank box.
 */

export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

/** Stable, readable fragment ids so headings can be linked to directly. */
const slugify = (text) => String(text || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'section';

const WIDGET_FALLBACK = {
  'contact-form': 'The contact form needs JavaScript. You can email us directly at the addresses listed above.',
  'feedback-form': 'The feedback form needs JavaScript. You are welcome to email your feedback instead.',
  'testimonial-list': 'Published reader feedback loads with JavaScript enabled.',
  'plan-list': 'Current plans and prices are shown on the subscribe page.',
  'track-order': 'Open the management link from any report email to view or cancel your subscription.',
  'cart-view': 'Your cart is stored in your browser and needs JavaScript to display.',
  'checkout-redirect': 'Continue to the subscribe page to complete your purchase.',
  'blog-index': 'Article list loads with JavaScript enabled.',
  'html-sitemap': 'The full page index loads with JavaScript enabled. The XML sitemap is at /sitemap.xml.',
  'site-search': 'Search needs JavaScript. You can browse the knowledge library and calculator directory instead.',
  'job-list': 'Role listings load with JavaScript enabled.',
};

function renderBlock(block) {
  switch (block.type) {
    case 'h': {
      const id = block.id || slugify(block.text);
      return `<h2 id="${escapeHtml(id)}" class="doc-h"><a class="doc-anchor" href="#${escapeHtml(id)}" aria-label="Link to this section">#</a>${escapeHtml(block.text)}</h2>`;
    }
    case 'h3':
      return `<h3 class="doc-h3">${escapeHtml(block.text)}</h3>`;
    case 'p':
      return `<p>${escapeHtml(block.text)}</p>`;
    case 'ul':
      return `<ul class="doc-list">${(block.items || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
    case 'ol':
      return `<ol class="doc-list">${(block.items || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ol>`;
    case 'dl':
      return `<dl class="doc-dl">${(block.items || []).map(([term, def]) =>
        `<div class="doc-dl-row"><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(def)}</dd></div>`).join('')}</dl>`;
    case 'table':
      return `<div class="doc-table-wrap" tabindex="0" role="region" aria-label="Table"><table class="doc-table">`
        + `<thead><tr>${(block.head || []).map(h => `<th scope="col">${escapeHtml(h)}</th>`).join('')}</tr></thead>`
        + `<tbody>${(block.rows || []).map(row =>
          `<tr>${row.map((cell, i) => i === 0
            ? `<th scope="row">${escapeHtml(cell)}</th>`
            : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'note':
      return `<aside class="doc-note ${block.tone === 'warn' ? 'warn' : 'info'}">`
        + (block.title ? `<strong>${escapeHtml(block.title)}</strong>` : '')
        + `<p>${escapeHtml(block.text)}</p></aside>`;
    case 'cards':
      return `<div class="doc-cards">${(block.items || []).map(item => {
        const body = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span>`;
        return item.href
          ? `<a class="doc-card" href="${escapeHtml(item.href)}">${body}</a>`
          : `<div class="doc-card">${body}</div>`;
      }).join('')}</div>`;
    case 'faq':
      return `<div class="doc-faq">${(block.items || []).map(item =>
        `<details class="doc-faq-item"><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join('')}</div>`;
    case 'widget':
      return `<div class="doc-widget" data-widget="${escapeHtml(block.id)}" aria-busy="true">`
        + `<p class="doc-widget-fallback">${escapeHtml(WIDGET_FALLBACK[block.id] || 'This section needs JavaScript.')}</p></div>`;
    default:
      return '';
  }
}

/** Table of contents from the top-level headings, for long policy documents. */
function renderToc(blocks) {
  const headings = blocks.filter(b => b.type === 'h');
  if (headings.length < 4) return '';
  return `<nav class="doc-toc" aria-label="On this page"><strong>On this page</strong><ol>`
    + headings.map(h => `<li><a href="#${escapeHtml(h.id || slugify(h.text))}">${escapeHtml(h.text)}</a></li>`).join('')
    + `</ol></nav>`;
}

export function renderBlocks(blocks = []) {
  return blocks.map(renderBlock).join('\n');
}

/** Breadcrumb trail, rendered as markup and as JSON-LD by the caller. */
export function renderCrumbs(trail) {
  return `<nav class="crumbs" aria-label="Breadcrumb">` + trail.map((crumb, i) => {
    const sep = i ? '<span class="crumb-sep" aria-hidden="true">/</span>' : '';
    return sep + (i === trail.length - 1
      ? `<span aria-current="page">${escapeHtml(crumb.name)}</span>`
      : `<a href="${escapeHtml(crumb.href)}">${escapeHtml(crumb.name)}</a>`);
  }).join('') + `</nav>`;
}

function breadcrumbLd(base, trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem', position: i + 1, name: crumb.name,
      ...(crumb.href ? { item: `${base}${crumb.href}` } : {}),
    })),
  };
}

/** FAQPage structured data, emitted only when the page really carries Q&A. */
function faqLd(blocks) {
  const items = blocks.filter(b => b.type === 'faq').flatMap(b => b.items || []);
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/**
 * Full document body for a registry page. Returns the pieces the HTML shell
 * template needs, rather than a whole document, so one shell serves every page.
 */
export function renderSitePage(page, { baseUrl = '', groupTitle = '' } = {}) {
  const trail = [{ name: 'Home', href: '/' }];
  if (groupTitle) trail.push({ name: groupTitle, href: '/sitemap' });
  trail.push({ name: page.nav || page.title, href: page.path });

  const structured = [breadcrumbLd(baseUrl, trail)];
  const faq = faqLd(page.blocks || []);
  if (faq) structured.push(faq);
  structured.push({
    '@context': 'https://schema.org',
    '@type': page.group === 'legal' ? 'WebPage' : 'WebPage',
    name: page.title,
    url: `${baseUrl}${page.path}`,
    description: page.description,
    dateModified: page.updated,
    isPartOf: { '@type': 'WebSite', url: `${baseUrl}/` },
  });

  const body = [
    renderCrumbs(trail),
    `<header class="doc-head">`,
    `<span class="eyebrow">${escapeHtml(groupTitle || 'HoraSaar')}</span>`,
    `<h1>${escapeHtml(page.title)}</h1>`,
    page.lede ? `<p class="doc-lede">${escapeHtml(page.lede)}</p>` : '',
    page.updated ? `<p class="doc-meta">Last updated <time datetime="${escapeHtml(page.updated)}">${escapeHtml(page.updated)}</time></p>` : '',
    `</header>`,
    renderToc(page.blocks || []),
    `<div class="doc-body">${renderBlocks(page.blocks)}</div>`,
  ].join('\n');

  return { body, structured };
}

/** Article rendering reuses the block renderer and adds Article JSON-LD. */
export function renderArticle(article, { baseUrl = '', related = [] } = {}) {
  const trail = [
    { name: 'Home', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: article.title, href: `/blog/${article.slug}` },
  ];

  const structured = [
    breadcrumbLd(baseUrl, trail),
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.published,
      dateModified: article.updated || article.published,
      url: `${baseUrl}/blog/${article.slug}`,
      author: { '@type': 'Organization', name: 'HoraSaar' },
      publisher: { '@type': 'Organization', name: 'HoraSaar', url: `${baseUrl}/` },
      mainEntityOfPage: `${baseUrl}/blog/${article.slug}`,
    },
  ];

  const relatedHtml = related.length
    ? `<section class="doc-related"><h2 class="doc-h">Related reading</h2><div class="doc-cards">`
      + related.map(r => `<a class="doc-card" href="/blog/${escapeHtml(r.slug)}"><strong>${escapeHtml(r.title)}</strong><span>${escapeHtml(r.description)}</span></a>`).join('')
      + `</div></section>`
    : '';

  const body = [
    renderCrumbs(trail),
    `<header class="doc-head">`,
    `<span class="eyebrow">${escapeHtml(article.tag || 'Article')}</span>`,
    `<h1>${escapeHtml(article.title)}</h1>`,
    article.lede ? `<p class="doc-lede">${escapeHtml(article.lede)}</p>` : '',
    `<p class="doc-meta">Published <time datetime="${escapeHtml(article.published)}">${escapeHtml(article.published)}</time>`
      + (article.readingMinutes ? ` \u00B7 about ${escapeHtml(article.readingMinutes)} minute read` : '') + `</p>`,
    `</header>`,
    renderToc(article.blocks || []),
    `<div class="doc-body">${renderBlocks(article.blocks)}</div>`,
    `<aside class="doc-note info"><strong>A standing reminder</strong><p>Everything interpretive on this site is traditional guidance, not a statement of fact about the future, and never medical, legal or financial advice. Our disclaimer page explains the boundary in full.</p></aside>`,
    relatedHtml,
  ].join('\n');

  return { body, structured };
}
