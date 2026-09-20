/**
 * extended-sections.js — Sections 21–43: the advanced, pre-formatted text
 * blocks produced by src/extensions/*.js (Career DNA, Financial/Medical
 * Astrology, Executive Summary, AI Synthesis, etc).
 *
 * Each entry maps a section number/title to the corresponding key inside
 * R.extendedReport, which already holds an array of ready-to-print lines.
 */
import { section, printLines, C } from '../console-ui.js';

import moduleData from '../../dataset/used/core/extended-sections.json' with { type: 'json' };
const SECTIONS = moduleData.SECTIONS;

// Any line recommending a gemstone gets an immediate safety note appended —
// gemstones are the one remedy category that can actively backfire
// (wrong stone for a functional malefic, or wrong finger/metal) if worn
// without a proper suitability check.
function withGemstoneSafety(lines) {
  const out = [];
  for (const line of lines) {
    out.push(line);
    if (/gemstone\s*:/i.test(line)) {
      out.push(`    ${C.yellow}⚠️  Safety: verify this stone is a FUNCTIONAL benefic for your Lagna before wearing —${C.reset}`);
      out.push(`    ${C.yellow}    a wrongly-chosen gemstone can amplify an affliction. Consult a qualified astrologer/jeweler first.${C.reset}`);
      out.push(`    ${C.dim}    Non-gemstone alternative: the matching mantra, colour, and charity above give a comparable, zero-risk effect.${C.reset}`);
    }
  }
  return out;
}

// `keys` (optional) lets callers print only a subset of the 23 extended
// sections, in SECTIONS order — used so the report can group these across
// the Calculations / Predictions parts instead of dumping all 23 in a
// single block. Omit `keys` to print all of them (original behaviour).
export function printExtendedSections(R, keys) {
  const list = keys ? SECTIONS.filter(([, key]) => keys.includes(key)) : SECTIONS;
  for (const [title, key] of list) {
    section(title);
    const lines = R.extendedReport?.[key];
    printLines(key === 'advancedRemedies' && Array.isArray(lines) ? withGemstoneSafety(lines) : lines);
  }
}
