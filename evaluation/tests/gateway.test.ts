import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvaluationGateway } from '../adapters/owner.ts';
const path = '/api/evaluation/operations/evaluation.read';
const request = (
  origin: string,
  cookie?: string,
  command: unknown = { operation: 'evaluation.read' },
) =>
  new Request('https://example.com' + path, {
    method: 'POST',
    headers: { origin, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(command),
  });

test('evaluation gateway denies unauthenticated and cross-origin requests before service reads', async () => {
  let calls = 0;
  const gateway = createEvaluationGateway({
    async fetch() {
      calls++;
      return Response.json({});
    },
  });
  assert.equal((await gateway(request('https://example.com'))).status, 401);
  assert.equal(
    (
      await gateway(
        request(
          'https://untrusted.example',
          '__Host-ae-session=' + 'a'.repeat(43),
        ),
      )
    ).status,
    401,
  );
  assert.equal(calls, 0);
});
test('evaluation gateway enforces the declared operation route and rejects synthetic owner state', async () => {
  let calls = 0;
  const gateway = createEvaluationGateway({
    async fetch() {
      calls++;
      return Response.json({
        ok: true,
        value: {
          schemaVersion: 1,
          version: 0,
          synthetic: true,
          definitions: [],
          runs: [],
          aggregates: [],
        },
      });
    },
  });
  const cookie = '__Host-ae-session=' + 'a'.repeat(43);
  assert.equal(
    (
      await gateway(
        request('https://example.com', cookie, {
          operation: 'evaluation.cancel-run',
          runId: 'one',
        }),
      )
    ).status,
    400,
  );
  assert.equal(calls, 0);
  assert.equal(
    (await gateway(request('https://example.com', cookie))).status,
    503,
  );
  assert.equal(calls, 1);
});
