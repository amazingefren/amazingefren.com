import test from 'node:test';
import assert from 'node:assert/strict';
import { createExternalWritingGateway } from '../../composition/external-writing.ts';
import { guardLaunchRequest } from '../../domain/access/index.ts';

const origin = 'https://amazingefren.com';
const authorization = `Bearer ae_draft_${'a'.repeat(43)}`;

test('Emacs client administration and browser release review require an owner session', async () => {
  for (const path of [
    '/workspace/connections/emacs',
    '/workspace/publishing/synthetic/review',
  ]) {
    const request = new Request(origin + path, { headers: { authorization } });
    assert.equal(
      (await guardLaunchRequest(request, origin, async () => false))?.status,
      303,
    );
    assert.equal(
      await guardLaunchRequest(request, origin, async () => true),
      null,
    );
  }
});

test('external draft gateway denies undeclared transitions and malformed credentials before forwarding', async () => {
  let reads = 0;
  const gateway = createExternalWritingGateway({
    origin,
    service: {
      async fetch() {
        reads++;
        return Response.json({ ok: true, value: {} });
      },
    },
  });
  for (const path of [
    '/api/v1/studio/publications/project/publish',
    '/api/v1/studio/publications/project/review',
    '/api/v1/studio/publications/project/withdraw',
  ]) {
    const response = await gateway(
      new Request(origin + path, {
        method: 'POST',
        headers: { authorization },
      }),
    );
    assert.equal(response.status, 404);
  }
  assert.equal(
    (await gateway(new Request(origin + '/api/v1/studio/publications'))).status,
    401,
  );
  assert.equal(
    (
      await gateway(
        new Request(origin + '/api/v1/studio/publications', {
          headers: { authorization: 'Bearer invalid' },
        }),
      )
    ).status,
    401,
  );
  assert.equal(reads, 0);
});

test('draft forwarding passes only the credential and bounded body with no public caching', async () => {
  let forwarded: Request | undefined;
  const gateway = createExternalWritingGateway({
    origin,
    service: {
      async fetch(request) {
        forwarded = request;
        return Response.json({
          ok: true,
          value: { items: [], nextCursor: null },
        });
      },
    },
  });
  const response = await gateway(
    new Request(origin + '/api/v1/studio/publications?query=sample', {
      headers: {
        authorization,
        cookie: 'private-cookie',
        'x-owner-id': 'other-owner',
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(
    forwarded?.url,
    'https://workspace-owner.internal/api/v1/studio/publications?query=sample',
  );
  assert.equal(forwarded?.headers.get('authorization'), authorization);
  assert.equal(forwarded?.headers.get('cookie'), null);
  assert.equal(forwarded?.headers.get('x-owner-id'), null);
});

test('bearer credentials cannot manage credentials and oversized draft requests preserve remote state', async () => {
  let calls = 0;
  const gateway = createExternalWritingGateway({
    origin,
    service: {
      async fetch() {
        calls++;
        return Response.json({ ok: true, value: {} });
      },
    },
  });
  const clients = await gateway(
    new Request(origin + '/api/v1/studio/clients', {
      method: 'POST',
      headers: { authorization, origin, 'content-type': 'application/json' },
      body: '{}',
    }),
  );
  assert.equal(clients.status, 401);
  const large = await gateway(
    new Request(origin + '/api/v1/studio/publications/project/draft', {
      method: 'PUT',
      headers: { authorization, 'content-type': 'application/json' },
      body: 'a'.repeat(3 * 1024 * 1024 + 1),
    }),
  );
  assert.equal(large.status, 400);
  assert.equal(calls, 0);
});
