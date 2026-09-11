import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readGuestSummary,
  type ReadGuestSummaryDependencies,
} from '../../../operations/read-guest-summary/index.ts';

const input = {
  from: '2026-09-01T00:00:00.000Z',
  to: '2026-09-02T00:00:00.000Z',
};

test('guest summary uses the isolated synthetic port and labels all sources synthetic', async () => {
  let requestedSession = '';
  const result = await readGuestSummary(
    {
      now: () => Date.parse('2026-09-02T01:00:00.000Z'),
      telemetry: {
        read: async ({ sessionId }) => {
          requestedSession = sessionId;
          return {
            kind: 'snapshot',
            snapshot: {
              source: 'owner-telemetry-should-not-be-visible',
              observedAt: '2026-09-02T00:00:00.000Z',
              metrics: {
                'page-views': {
                  status: 'available',
                  numerator: 9,
                  denominator: null,
                  source: 'owner-source',
                },
                'honeypot-triggers': {
                  status: 'suppressed',
                  numerator: 4,
                  denominator: null,
                  source: 'owner-source',
                },
                'honeypot-trigger-rate': {
                  status: 'available',
                  numerator: 1,
                  denominator: 0,
                  source: 'owner-source',
                },
              },
            },
          };
        },
      },
    },
    { input, sessionId: 'guest-session-1' },
  );

  assert.equal(requestedSession, 'guest-session-1');
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.dataScope, 'synthetic');
  assert.equal(result.value.freshness, '2026-09-02T00:00:00.000Z');
  assert.equal(result.value.metrics[0].source, 'synthetic-fixture');
  assert.equal(result.value.metrics[1].value, null);
  assert.equal(result.value.metrics[1].numerator, null);
  assert.equal(result.value.metrics[2].value, null);
  assert.equal(result.value.metrics[2].status, 'unavailable');
});

test('guest fixture failures fail closed without an owner fallback', async () => {
  let reads = 0;
  const result = await readGuestSummary(
    {
      now: () => 0,
      telemetry: {
        read: async () => {
          reads += 1;
          throw new Error('fixture missing');
        },
      },
    },
    { input, sessionId: 'guest-session-1' },
  );

  assert.equal(reads, 1);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.dataScope, 'synthetic');
    assert.equal(result.value.freshness, null);
    assert.equal(
      result.value.metrics.every((metric) => metric.value === null),
      true,
    );
    assert.equal(
      result.value.metrics.every(
        (metric) => metric.source === 'synthetic-fixture',
      ),
      true,
    );
  }
});

test('guest summary rejects missing sessions and invalid windows', async () => {
  let reads = 0;
  const dependencies: ReadGuestSummaryDependencies = {
    now: () => 0,
    telemetry: {
      read: async () => {
        reads += 1;
        return { kind: 'unavailable', source: 'synthetic', observedAt: null };
      },
    },
  };
  const missingSession = await readGuestSummary(dependencies, {
    input,
    sessionId: ' ',
  });
  assert.deepEqual(missingSession, {
    ok: false,
    error: { code: 'invalid_input', message: 'A guest session is required' },
  });
  const reversed = await readGuestSummary(dependencies, {
    input: { from: input.to, to: input.from },
    sessionId: 'guest-session-1',
  });
  assert.equal(reversed.ok, false);
  if (!reversed.ok) assert.equal(reversed.error.code, 'invalid_input');
  assert.equal(reads, 0);
});
