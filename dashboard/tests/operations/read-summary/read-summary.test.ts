import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readSummary,
  type ReadSummaryDependencies,
} from '../../../operations/read-summary/index.ts';
import type { DashboardCaller } from '../../../ports/auth/index.ts';
import type { TelemetrySnapshot } from '../../../ports/telemetry/index.ts';

const caller: DashboardCaller = {
  id: 'session-1',
  ownerId: 'owner-1',
  kind: 'owner',
};
const input = {
  from: '2026-09-01T00:00:00.000Z',
  to: '2026-09-02T00:00:00.000Z',
};

function snapshot(): TelemetrySnapshot {
  return {
    source: 'consented-audience-aggregates',
    observedAt: '2026-09-02T00:00:00.000Z',
    metrics: {
      'page-views': {
        status: 'available',
        numerator: 12,
        denominator: null,
        source: 'consented-audience-aggregates',
      },
      'honeypot-triggers': {
        status: 'stale',
        numerator: 3,
        denominator: null,
        source: 'operational-security-aggregates',
      },
      'honeypot-trigger-rate': {
        status: 'available',
        numerator: 3,
        denominator: 12,
        source: 'operational-security-aggregates',
      },
    },
  };
}

test('owner summary authorizes before reading and calculates the rate from both counts', async () => {
  const calls: string[] = [];
  const result = await readSummary(
    {
      now: () => Date.parse('2026-09-02T01:00:00.000Z'),
      auth: {
        authorize: async (request) => {
          calls.push(`auth:${request.ownerId}`);
          return { allowed: true, ownerId: request.ownerId };
        },
      },
      telemetry: {
        read: async (request) => {
          calls.push(`telemetry:${request.ownerId}`);
          return { kind: 'snapshot', snapshot: snapshot() };
        },
      },
    },
    { input, caller },
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(calls, ['auth:owner-1', 'telemetry:owner-1']);
  assert.equal(result.value.dataScope, 'owner');
  assert.equal(result.value.freshness, '2026-09-02T00:00:00.000Z');
  assert.equal(result.value.metrics[0].value, 12);
  assert.equal(result.value.metrics[1].status, 'stale');
  assert.equal(result.value.metrics[2].value, 0.25);
  assert.equal(result.value.metrics[2].numerator, 3);
  assert.equal(result.value.metrics[2].denominator, 12);
});

test('owner summary denies a foreign owner before telemetry reads', async () => {
  let authReads = 0;
  let telemetryReads = 0;
  const result = await readSummary(
    {
      now: () => 0,
      auth: {
        authorize: async () => {
          authReads += 1;
          return { allowed: true, ownerId: 'owner-2' };
        },
      },
      telemetry: {
        read: async () => {
          telemetryReads += 1;
          return { kind: 'snapshot', snapshot: snapshot() };
        },
      },
    },
    { input, caller, ownerId: 'owner-2' },
  );

  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'forbidden',
      message: 'The caller cannot read another owner',
    },
  });
  assert.equal(authReads, 0);
  assert.equal(telemetryReads, 0);
});

test('owner summary denies guest credentials before protected reads', async () => {
  let authReads = 0;
  let telemetryReads = 0;
  const result = await readSummary(
    {
      now: () => 0,
      auth: {
        authorize: async () => {
          authReads += 1;
          return { allowed: true, ownerId: 'owner-1' };
        },
      },
      telemetry: {
        read: async () => {
          telemetryReads += 1;
          return { kind: 'snapshot', snapshot: snapshot() };
        },
      },
    },
    { input, caller: { id: 'guest', ownerId: 'owner-1', kind: 'guest' } },
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, 'unauthenticated');
  assert.equal(authReads, 0);
  assert.equal(telemetryReads, 0);
});

test('owner summary returns authorization denial before telemetry reads', async () => {
  let telemetryReads = 0;
  const result = await readSummary(
    {
      now: () => 0,
      auth: {
        authorize: async () => ({
          allowed: false,
          error: { code: 'forbidden', message: 'dashboard.read is required' },
        }),
      },
      telemetry: {
        read: async () => {
          telemetryReads += 1;
          return { kind: 'snapshot', snapshot: snapshot() };
        },
      },
    },
    { input, caller },
  );

  assert.deepEqual(result, {
    ok: false,
    error: { code: 'forbidden', message: 'dashboard.read is required' },
  });
  assert.equal(telemetryReads, 0);
});

test('owner summary fails closed when authorization is unavailable', async () => {
  let telemetryReads = 0;
  const result = await readSummary(
    {
      now: () => 0,
      auth: {
        authorize: async () => {
          throw new Error('auth down');
        },
      },
      telemetry: {
        read: async () => {
          telemetryReads += 1;
          return { kind: 'snapshot', snapshot: snapshot() };
        },
      },
    },
    { input, caller },
  );

  assert.deepEqual(result, {
    ok: false,
    error: { code: 'unavailable', message: 'Authorization is unavailable' },
  });
  assert.equal(telemetryReads, 0);
});

test('owner summary rejects reversed, excessive, and non-finite windows before reads', async (t) => {
  let reads = 0;
  const dependencies: ReadSummaryDependencies = {
    now: () => 0,
    auth: {
      authorize: async () => {
        reads += 1;
        return { allowed: true, ownerId: 'owner-1' };
      },
    },
    telemetry: {
      read: async () => {
        reads += 1;
        return { kind: 'snapshot', snapshot: snapshot() };
      },
    },
  };
  const cases = [
    { from: input.to, to: input.from },
    { from: input.from, to: '2026-10-03T00:00:00.000Z' },
    { from: 'Infinity', to: input.to },
  ];
  for (const invalid of cases) {
    await t.test(invalid.from, async () => {
      const result = await readSummary(dependencies, {
        input: invalid,
        caller,
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error.code, 'invalid_input');
    });
  }
  assert.equal(reads, 0);
});

test('owner telemetry gaps and failures remain unavailable', async () => {
  const unavailable = await readSummary(
    {
      now: () => 0,
      auth: { authorize: async () => ({ allowed: true, ownerId: 'owner-1' }) },
      telemetry: {
        read: async () => ({
          kind: 'unavailable',
          source: 'collector-gap',
          observedAt: null,
        }),
      },
    },
    { input, caller },
  );
  assert.equal(unavailable.ok, true);
  if (unavailable.ok) {
    assert.equal(
      unavailable.value.metrics.every((metric) => metric.value === null),
      true,
    );
    assert.equal(
      unavailable.value.metrics.every(
        (metric) => metric.status === 'unavailable',
      ),
      true,
    );
    assert.equal(unavailable.value.freshness, null);
  }

  const failed = await readSummary(
    {
      now: () => 0,
      auth: { authorize: async () => ({ allowed: true, ownerId: 'owner-1' }) },
      telemetry: {
        read: async () => {
          throw new Error('collector down');
        },
      },
    },
    { input, caller },
  );
  assert.equal(failed.ok, true);
  if (failed.ok)
    assert.equal(failed.value.metrics[0].source, 'telemetry-unavailable');
});

test('owner summary rejects invalid calendar dates, ambiguous timestamps, and extra fields before authorization', async () => {
  let reads = 0;
  const dependencies: ReadSummaryDependencies = {
    now: () => 0,
    auth: {
      authorize: async () => {
        reads += 1;
        return { allowed: true, ownerId: 'owner-1' };
      },
    },
    telemetry: {
      read: async () => {
        reads += 1;
        return { kind: 'snapshot', snapshot: snapshot() };
      },
    },
  };
  for (const invalid of [
    { from: '2026-02-30T00:00:00Z', to: '2026-03-03T00:00:00Z' },
    { from: '2026-09-01', to: input.to },
    { from: '2026-09-01T00:00:00', to: input.to },
    { from: '2026-09-01T24:00:00Z', to: '2026-09-03T00:00:00Z' },
    { ...input, ownerId: 'owner-2' },
  ]) {
    const result = await readSummary(dependencies, { input: invalid, caller });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'invalid_input');
  }
  assert.equal(reads, 0);
});

test('owner summary accepts leap days and equivalent offset windows', async () => {
  const result = await readSummary(
    {
      now: () => 0,
      auth: { authorize: async () => ({ allowed: true, ownerId: 'owner-1' }) },
      telemetry: {
        read: async ({ window }) => {
          assert.equal(window.fromMs, Date.parse('2024-02-29T00:00:00Z'));
          assert.equal(window.toMs, Date.parse('2024-03-01T00:00:00Z'));
          return { kind: 'unavailable', source: 'test', observedAt: null };
        },
      },
    },
    {
      input: { from: '2024-02-29T02:00:00+02:00', to: '2024-03-01T00:00:00Z' },
      caller,
    },
  );
  assert.equal(result.ok, true);
});
