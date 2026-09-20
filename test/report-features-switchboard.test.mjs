import assert from 'node:assert/strict';
import test from 'node:test';
import { REPORT_FEATURES, reportFeatureEnabled, listEnabledReportFeatures } from '../config/ReportFeatures.js';

test('central report feature switchboard has unique active IDs', () => {
  assert.ok(REPORT_FEATURES.length > 40);
  assert.equal(new Set(REPORT_FEATURES).size, REPORT_FEATURES.length);
  assert.equal(listEnabledReportFeatures().length, REPORT_FEATURES.length);
});

test('ASHTAKAVARGA is centrally controllable', () => {
  assert.equal(reportFeatureEnabled('ASHTAKAVARGA'), true);
  assert.equal(reportFeatureEnabled('FEATURE_THAT_DOES_NOT_EXIST'), false);
});

test('switchboard is presentation-only and does not expose arbitrary IDs', () => {
  assert.equal(reportFeatureEnabled('ashtakavarga'), false);
  assert.ok(REPORT_FEATURES.includes('ASHTAKAVARGA'));
});
