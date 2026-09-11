import assert from 'node:assert/strict';
import test from 'node:test';
import { createEvidenceGateway } from '../adapters/owner.ts';

const token = 'a'.repeat(43);
const command = JSON.stringify({ operation: 'evidence.read' });
const request = (
  body = command,
  path = 'evidence.read',
  headers: Record<string, string> = {},
) =>
  new Request(`https://ae.test/api/evidence/operations/${path}`, {
    method: 'POST',
    headers: {
      origin: 'https://ae.test',
      cookie: `__Host-ae-session=${token}`,
      'content-type': 'application/json',
      ...headers,
    },
    body,
  });

test('denies wrong origin and missing cookie before calling owner service', async () => {
  let calls = 0;
  const service = {
    fetch: async () => {
      calls += 1;
      return Response.json({});
    },
  };
  const gateway = createEvidenceGateway(service);
  assert.equal(
    (
      await gateway(
        request(command, 'evidence.read', { origin: 'https://other.test' }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await gateway(
        new Request('https://ae.test/api/evidence/operations/evidence.read', {
          method: 'POST',
          headers: {
            origin: 'https://ae.test',
            'content-type': 'application/json',
          },
          body: command,
        }),
      )
    ).status,
    401,
  );
  assert.equal(calls, 0);
});

test('rejects malformed and mismatched commands before the owner service', async () => {
  let calls = 0;
  const gateway = createEvidenceGateway({
    fetch: async () => {
      calls += 1;
      return Response.json({});
    },
  });
  assert.equal(
    (await gateway(request('{"operation":"evidence.read","extra":true}')))
      .status,
    400,
  );
  assert.equal(
    (await gateway(request(command, 'evidence.create'))).status,
    400,
  );
  assert.equal(calls, 0);
});

test('rejects malformed and synthetic upstream results', async () => {
  let response: Response = Response.json({ nope: true });
  const gateway = createEvidenceGateway({
    fetch: async () => response.clone(),
  });
  assert.equal((await gateway(request())).status, 503);
  response = Response.json({
    ok: true,
    value: { version: 1, synthetic: true, records: [] },
  });
  assert.equal((await gateway(request())).status, 503);
});

test('passes valid owner result through with no-store', async () => {
  const result = {
    ok: true,
    value: { version: 1, synthetic: false, records: [] },
  };
  const gateway = createEvidenceGateway({
    fetch: async () => Response.json(result),
  });
  const response = await gateway(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
