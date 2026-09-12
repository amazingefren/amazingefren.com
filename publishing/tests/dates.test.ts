import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPublicationDate } from '../projects/dates.ts';

test('legacy and Denver-zone releases retain the local day, time, and zone', () => {
  assert.equal(
    formatPublicationDate('2026-09-11T03:30:00Z'),
    'Sep 10, 2026, 9:30 PM MDT',
  );
  assert.equal(
    formatPublicationDate('2026-09-11T03:30:00Z', 'America/Denver'),
    'Sep 10, 2026, 9:30 PM MDT',
  );
  assert.equal(
    formatPublicationDate('2026-09-11T03:30:00Z', 'UTC'),
    'Sep 11, 2026, 3:30 AM UTC',
  );
  assert.equal(
    formatPublicationDate('2026-09-11T03:30:00Z', 'invalid'),
    'Sep 10, 2026, 9:30 PM MDT',
  );
  assert.equal(formatPublicationDate('invalid'), 'Date unavailable');
});
