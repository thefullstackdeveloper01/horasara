/**
 * ascii_chart.js — Dual-mode CLI chart visualizer.
 *
 * Single responsibility: turn (ascendant sign + planet house/sign
 * placements) into a readable box-grid chart for the terminal.
 *
 * Two classical styles are supported, and the underlying astrology is
 * correct for both — only the box geometry is simplified for monospace
 * text (a true rotated-diamond North Indian chart can't be drawn reliably
 * in a terminal font, so it's rendered as a labelled grid instead):
 *
 *   South Indian — SIGN-FIXED: each of the 12 outer cells is always the
 *   same zodiac sign in the same position (classical clockwise order from
 *   Pisces). The Ascendant is marked with an arrow in whichever cell holds
 *   that sign; house numbers are computed relative to it.
 *
 *   North Indian — HOUSE-FIXED: each of the 12 outer cells is always the
 *   same house number (1–12) in the same position. The zodiac sign shown
 *   in each cell rotates based on the Ascendant, exactly as classical
 *   North Indian charts work (sign = Ascendant sign + house offset).
 */

import moduleData from '../../dataset/used/core/ascii_chart.json' with { type: 'json' };
const SOUTH_INDIAN_SIGN_ORDER = moduleData.SOUTH_INDIAN_SIGN_ORDER;

const SIGN_SHORT = moduleData.SIGN_SHORT;
const SIGNS = moduleData.SIGNS;

const PLANET_SHORT = moduleData.PLANET_SHORT;

const CELL_W = moduleData.CELL_W;

function cellLines(headerText, planetTexts) {
  const lines = [headerText.slice(0, CELL_W).padEnd(CELL_W)];
  const planetLine = planetTexts.join(',').slice(0, CELL_W).padEnd(CELL_W);
  lines.push(planetLine);
  return lines;
}

function row(cells) {
  const line1 = cells.map(c => c[0]).join('│');
  const line2 = cells.map(c => c[1]).join('│');
  return [`│${line1}│`, `│${line2}│`];
}

function border(char1, mid, char2, n) {
  return char1 + Array(n).fill('─'.repeat(CELL_W)).join(mid) + char2;
}

/**
 * Build a 4x4-grid chart (12 outer cells + merged 2x2 center for Lagna info).
 * `cellFor(row, col)` returns { header, planets } for each outer cell, or
 * null for the 4 center cells.
 */
function renderGrid(cellFor, centerLines) {
  const out = [];
  out.push(border('┌', '┬', '┐', 4));

  // Row 0 (top): 4 cells
  const r0 = [0, 1, 2, 3].map(c => cellLines(...Object.values(cellFor(0, c))));
  out.push(...row(r0));

  out.push(border('├', '┼', '┤', 4));

  // Row 1: cell, [merged center header line 1-2], cell
  const c10 = cellLines(...Object.values(cellFor(1, 0)));
  const c13 = cellLines(...Object.values(cellFor(1, 3)));
  const centerW = CELL_W * 2 + 1;
  out.push(`│${c10[0]}│${(centerLines[0] || '').slice(0, centerW).padEnd(centerW)}│${c13[0]}│`);
  out.push(`│${c10[1]}│${(centerLines[1] || '').slice(0, centerW).padEnd(centerW)}│${c13[1]}│`);

  // Row 2: cell, [merged center line 3-4], cell
  const c20 = cellLines(...Object.values(cellFor(2, 0)));
  const c23 = cellLines(...Object.values(cellFor(2, 3)));
  out.push(`│${c20[0]}│${(centerLines[2] || '').slice(0, centerW).padEnd(centerW)}│${c23[0]}│`);
  out.push(`│${c20[1]}│${(centerLines[3] || '').slice(0, centerW).padEnd(centerW)}│${c23[1]}│`);

  out.push(border('├', '┼', '┤', 4));

  // Row 3 (bottom): 4 cells
  const r3 = [0, 1, 2, 3].map(c => cellLines(...Object.values(cellFor(3, c))));
  out.push(...row(r3));

  out.push(border('└', '┴', '┘', 4));
  return out;
}

function planetsInSign(planets, sign) {
  return planets.filter(p => p.sign === sign).map(p => PLANET_SHORT[p.name] || p.name.slice(0, 2));
}

function planetsInHouse(planets, houseNum) {
  return planets.filter(p => p.house === houseNum).map(p => PLANET_SHORT[p.name] || p.name.slice(0, 2));
}

export function renderSouthIndianChart(ascSign, planets) {
  const ascIdx = SIGNS.indexOf(ascSign);
  const positions = [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 3],
    [2, 0], [2, 3],
    [3, 0], [3, 1], [3, 2], [3, 3],
  ];
  const cellFor = (r, c) => {
    const idx = 4 * r + c;
    const sign = SOUTH_INDIAN_SIGN_ORDER[idx];
    if (!sign) return { header: '', planets: [] };
    const houseNum = ((SIGNS.indexOf(sign) - ascIdx + 12) % 12) + 1;
    const marker = sign === ascSign ? ' ►' : '';
    return { header: `H${houseNum} (${SIGN_SHORT[sign]})${marker}`, planets: planetsInSign(planets, sign) };
  };
  const center = [
    '  SOUTH INDIAN CHART',
    `  Lagna: ${ascSign}`,
    '  (► marks Ascendant',
    '     sign/house)',
  ];
  return renderGrid(cellFor, center).join('\n');
}

// Classical North-Indian reading order for the 12 outer grid cells
// (top row left→right, then right side, then bottom row, then left side).
const NORTH_INDIAN_HOUSE_ORDER = moduleData.NORTH_INDIAN_HOUSE_ORDER;

export function renderNorthIndianChart(ascSign, planets, ascDegreeDMS) {
  const ascIdx = SIGNS.indexOf(ascSign);
  const houseAt = {};
  for (const [r, c, h] of NORTH_INDIAN_HOUSE_ORDER) houseAt[`${r},${c}`] = h;

  const cellFor = (r, c) => {
    const h = houseAt[`${r},${c}`];
    if (h === undefined) return { header: '', planets: [] };
    const sign = SIGNS[(ascIdx + h - 1) % 12];
    const marker = h === 1 ? ' ►' : '';
    return { header: `H${h} (${SIGN_SHORT[sign]})${marker}`, planets: planetsInHouse(planets, h) };
  };
  const center = [
    '  NORTH INDIAN CHART',
    `  Lagna: ${ascSign}`,
    `  Asc: ${ascDegreeDMS || ''}`,
    '  (► marks House 1)',
  ];
  return renderGrid(cellFor, center).join('\n');
}
