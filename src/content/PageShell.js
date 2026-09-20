import { escapeHtml } from './SitePageRenderer.js';

/**
 * Fills web/page.html with a rendered document.
 *
 * JSON-LD is serialised with `<` escaped so a stray angle bracket in a page
 * description can never close the script element early — the one injection
 * route a JSON-LD block realistically has.
 */
export function fillPageShell(template, { title, description, path, robots, body, structured = [] }) {
  const ld = structured
    .map(entry => `<script type="application/ld+json">${JSON.stringify(entry).replaceAll('<', '\\u003c')}</script>`)
    .join('\n');

  return template
    .replaceAll('__PAGE_TITLE__', escapeHtml(title))
    .replaceAll('__PAGE_DESC__', escapeHtml(description))
    .replaceAll('__PAGE_PATH__', escapeHtml(path))
    .replaceAll('__PAGE_ROBOTS__', escapeHtml(robots || 'index,follow'))
    .replaceAll('__PAGE_STRUCTURED__', ld)
    .replaceAll('__PAGE_BODY__', body);
}
