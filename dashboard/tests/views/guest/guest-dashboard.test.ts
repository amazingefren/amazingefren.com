import assert from 'node:assert/strict';
import test from 'node:test';
import type { DashboardMetric } from '../../../contracts/summary.ts';
import {
  metricEvidenceLabel,
  metricStatusLabel,
  metricValueLabel,
  localDateTimeValue,
} from '../../../ui/summary/index.ts';

const availableCount: DashboardMetric = {
  id: 'page-views',
  value: 1200,
  unit: 'count',
  status: 'available',
  numerator: 1200,
  denominator: null,
  source: 'consented-audience-aggregates',
};

test('guest dashboard presentation keeps measured counts and rate evidence readable', () => {
  assert.equal(metricValueLabel(availableCount), '1,200');
  assert.equal(metricEvidenceLabel(availableCount), '1200 accepted events');
  assert.equal(metricStatusLabel(availableCount.status), 'Available');
  assert.equal(
    metricValueLabel({
      ...availableCount,
      id: 'honeypot-trigger-rate',
      value: 0.125,
      unit: 'ratio',
      numerator: 1,
      denominator: 8,
    }),
    '12.5%',
  );
  assert.equal(
    metricEvidenceLabel({
      ...availableCount,
      id: 'honeypot-trigger-rate',
      value: 0.125,
      unit: 'ratio',
      numerator: 1,
      denominator: 8,
    }),
    '1 triggered / 8 eligible evaluations',
  );
});

test('guest dashboard presentation preserves unavailable and local form states', () => {
  assert.equal(metricValueLabel(undefined), 'Unavailable');
  assert.equal(
    metricEvidenceLabel(undefined),
    'No measured value in this window',
  );
  assert.equal(metricStatusLabel('suppressed'), 'Suppressed');
  assert.equal(metricStatusLabel(undefined), 'Unavailable');
  assert.equal(
    localDateTimeValue('2026-09-01T12:30:00.000Z'),
    '2026-09-01T12:30',
  );
  assert.equal(localDateTimeValue('2026-09-01T12:30'), '2026-09-01T12:30');
  assert.equal(localDateTimeValue('not-a-date'), '');
});
