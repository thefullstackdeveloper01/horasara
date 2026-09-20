/**
 * console-ui.js — Terminal formatting primitives.
 * Single responsibility: render styled text/boxes/tables to stdout.
 * No astrology logic lives here.
 */

// ── ANSI colors (safe no-op fallback if disabled) ───────────────────────────
export const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m',
  magenta: '\x1b[35m', red: '\x1b[31m', blue: '\x1b[34m', white: '\x1b[37m',
};

export function line(ch = '─', n = 78) {
  return ch.repeat(n);
}

export function box(title) {
  console.log(C.cyan + '╔' + line('═') + '╗' + C.reset);
  const pad = Math.max(0, 78 - title.length - 2);
  console.log(C.cyan + '║ ' + C.bold + C.yellow + title + C.reset + ' '.repeat(pad) + C.cyan + '║' + C.reset);
  console.log(C.cyan + '╚' + line('═') + '╝' + C.reset);
}

// A part banner is one level ABOVE `box()` — it marks the big four-part
// structure of the full report (Basic Details / Calculations / Charts /
// Predictions), so it's visually distinct (double-line, different color)
// from both the outer title box() and the per-topic section() dividers.
export function partBanner(title) {
  console.log('');
  console.log(C.blue + C.bold + line('═', 80) + C.reset);
  const pad = Math.max(0, 76 - title.length);
  console.log(C.blue + C.bold + '║  ' + C.white + title + C.reset + ' '.repeat(pad) + C.blue + C.bold + '║' + C.reset);
  console.log(C.blue + C.bold + line('═', 80) + C.reset);
}

let customerSectionNumber = 0;

export function resetSectionNumbering() { customerSectionNumber = 0; }

export function section(title) {
  customerSectionNumber += 1;
  const text = `${customerSectionNumber}. ${title.replace(/^\s*\d+(?:\s*[–-]\s*\d+)?\.?(?=\s)/, '').trim()}`;
  console.log('');
  console.log(C.green + C.bold + '▓▓▓ ' + text + ' ' + line('▓', Math.max(0, 74 - text.length)) + C.reset);
  console.log('');
}

export function sub(title) {
  console.log(C.magenta + C.bold + '\n── ' + title + ' ' + line('─', Math.max(0, 72 - title.length)) + C.reset);
}

export function kv(k, v) {
  console.log('  ' + C.dim + (k + ':').padEnd(28) + C.reset + (v === undefined || v === null || v === '' ? '-' : v));
}

export function printLines(arr) {
  if (!Array.isArray(arr)) return;
  for (const l of arr) console.log(l);
}

export function table(headers, rows) {
  const clip = (s, max = 60) => { s = String(s ?? ''); return s.length > max ? s.slice(0, max - 1) + '…' : s; };
  rows = rows.map(r => r.map(c => clip(c)));
  const widths = headers.map((h, i) => Math.max(String(h).length, ...rows.map(r => String(r[i] ?? '').length)) + 2);
  const rowStr = (r) => r.map((c, i) => String(c ?? '').padEnd(widths[i])).join('');
  console.log(C.bold + rowStr(headers) + C.reset);
  console.log(widths.map(w => '─'.repeat(w - 1)).join(' '));
  for (const r of rows) console.log(rowStr(r));
}
