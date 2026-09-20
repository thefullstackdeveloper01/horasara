/**
 * menu.js — First thing the CLI asks: which of the three modes the user
 * wants. Single responsibility: turn either a --mode flag or an
 * interactive terminal answer into one of 'reading' | 'milan' | 'panchang'.
 * No astrology logic lives here.
 */
import readline from 'node:readline';
import { C, box } from './console-ui.js';
import { parseArgs } from './birth-input.js';

import moduleData from '../dataset/used/core/menu.json' with { type: 'json' };
const MODES = moduleData.MODES;

function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));
}

/**
 * @returns {Promise<'reading'|'milan'|'panchang'>}
 *
 * Normal `node cli.js` is now the single-person report entry point. The first
 * user-facing choice is Basic vs Full (handled by report-scope.js). The old
 * Milan/Panchang modes remain fully supported through --mode.
 */
export async function chooseMode() {
  const flags = parseArgs();
  if (flags.mode) {
    const resolved = MODES[String(flags.mode).toLowerCase()];
    if (!resolved) {
      console.error(`\n❌ Unknown --mode "${flags.mode}". Use: milan | reading | panchang.\n`);
      process.exit(1);
    }
    return resolved;
  }
  return 'reading';
}
