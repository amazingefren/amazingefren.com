import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseSummaryCliArgs,
  readGuestSummaryCli,
} from '../../../adapters/cli/summary.ts';
import { createSyntheticGuestTelemetry } from '../../../ports/telemetry/synthetic.ts';

test('CLI adapter parses bounded UTC window flags', () => {
  const parsed = parseSummaryCliArgs([
    '--from',
    '2026-09-01T00:00',
    '--to',
    '2026-09-02T00:00',
  ]);
  assert.deepEqual(parsed, {
    ok: true,
    value: { from: '2026-09-01T00:00:00Z', to: '2026-09-02T00:00:00Z' },
  });
  const invalid = parseSummaryCliArgs([
    '--from',
    '2026-09-01T00:00',
    '--bad',
    'value',
  ]);
  assert.equal(invalid.ok, false);
});

test('CLI guest adapter returns synthetic data through the shared operation', async () => {
  const result = await readGuestSummaryCli(
    { now: () => 0, guestTelemetry: createSyntheticGuestTelemetry() },
    ['--from', '2026-09-01T00:00', '--to', '2026-09-02T00:00'],
    'guest-preview',
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.dataScope, 'synthetic');
    assert.equal(result.value.metrics[0].value, 24);
  }
});

test('CLI rejects repeated window flags', () => {
  const result = parseSummaryCliArgs([
    '--from',
    '2026-09-01T00:00',
    '--from',
    '2026-09-02T00:00',
    '--to',
    '2026-09-03T00:00',
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'invalid_input');
});
