import assert from 'node:assert/strict';
import { MASTER_REPORT_OUTLINE } from '../src/reporting/MasterReportOutline.js';
assert.equal(MASTER_REPORT_OUTLINE.length,80);
assert.equal(String(MASTER_REPORT_OUTLINE[0][0]),'1');
assert.equal(String(MASTER_REPORT_OUTLINE[79][0]),'80');
assert.equal(MASTER_REPORT_OUTLINE[64][1],'Complete Nakshatra Level Breakdown');
assert.equal(MASTER_REPORT_OUTLINE[76][1],'Lal Kitab Specialized Mechanics');
assert.equal(MASTER_REPORT_OUTLINE[25][1],'Numerology Analysis (Ank Jyotish)');
console.log('Master report outline regression: PASS (80 sections)');
