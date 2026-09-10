import assert from 'node:assert/strict';
import test from 'node:test';
import { createSyntheticWorkspaceState } from '../../domain/index.ts';
import { createOwnerWorkspaceGateway } from '../../../web/composition/owner-workspace.ts';

function ownerState() {
  let id = 0;
  const seeded = createSyntheticWorkspaceState({ now: () => 0, nextId: () => `id-${++id}` });
  assert.equal(seeded.ok, true);
  if (!seeded.ok) throw new Error('Seed failed');
  return { ...seeded.value, synthetic: false };
}

test('owner gateway fails closed when the private service is unconfigured or authentication is absent', async () => {
  const unavailable = await createOwnerWorkspaceGateway(undefined).read(new Request('https://example.test/workspace'));
  assert.deepEqual(unavailable, { ok: false, error: { code: 'unavailable', message: 'Owner workspace service is unavailable' } });
  let calls = 0;
  const denied = await createOwnerWorkspaceGateway({ fetch: async () => { calls += 1; return new Response(); } }).read(new Request('https://example.test/workspace'));
  assert.deepEqual(denied, { ok: false, error: { code: 'denied', message: 'Owner authentication is required' } });
  assert.equal(calls, 0);
});

test('owner operation gateway rejects cross-origin and oversized commands before private service calls', async () => {
  let calls = 0;
  const gateway = createOwnerWorkspaceGateway({ fetch: async () => { calls += 1; return new Response(); } });
  const crossOrigin = await gateway.operation(new Request('https://example.test/api/workspace/operation', { method: 'POST', headers: { origin: 'https://other.test' }, body: '{}' }));
  assert.equal(crossOrigin.status, 403);
  const large = await gateway.operation(new Request('https://example.test/api/workspace/operation', { method: 'POST', headers: { origin: 'https://example.test', 'content-length': '262145', 'Cf-Access-Jwt-Assertion': 'assertion' }, body: '{}' }));
  assert.equal(large.status, 400);
  const streamed = await gateway.operation(new Request('https://example.test/api/workspace/operation', Object.assign({
    method: 'POST',
    headers: { origin: 'https://example.test', 'Cf-Access-Jwt-Assertion': 'assertion' },
    body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(262_145)); controller.close(); } })
  }, { duplex: 'half' }) as RequestInit));
  assert.equal(streamed.status, 400);
  assert.equal(calls, 0);
});

test('owner operation gateway denies a missing assertion before reading the command body', async () => {
  const gateway = createOwnerWorkspaceGateway({ fetch: async () => new Response() });
  const response = await gateway.operation(new Request('https://example.test/api/workspace/operation', { method: 'POST', headers: { origin: 'https://example.test' }, body: 'not-json' }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: { code: 'denied', message: 'Owner authentication is required' } });
});

test('owner operation gateway excludes guest reset before private service calls', async () => {
  let calls = 0;
  const gateway = createOwnerWorkspaceGateway({ fetch: async () => { calls += 1; return new Response(); } });
  const response = await gateway.operation(new Request('https://example.test/api/workspace/operation', { method: 'POST', headers: { origin: 'https://example.test', 'Cf-Access-Jwt-Assertion': 'assertion' }, body: JSON.stringify({ operation: 'workspace.reset', input: {} }) }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { ok: false, error: { code: 'invalid', message: 'Workspace reset is available only to guest sessions' } });
  assert.equal(calls, 0);
});

test('owner gateway forwards only the access assertion and validated original command to the configured service', async () => {
  const state = ownerState();
  const received: Request[] = [];
  const gateway = createOwnerWorkspaceGateway({ fetch: async request => {
    received.push(request);
    return new Response(JSON.stringify({ ok: true, value: state }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
  } });
  const body = JSON.stringify({ operation: 'workspace.read', input: {} });
  const response = await gateway.operation(new Request('https://example.test/api/workspace/operation', {
    method: 'POST',
    headers: { origin: 'https://example.test', 'Cf-Access-Jwt-Assertion': 'assertion', cookie: 'never-forward' },
    body
  }));
  assert.equal(response.status, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].url, 'https://workspace-owner.internal/api/workspace/operation');
  assert.equal(received[0].headers.get('Cf-Access-Jwt-Assertion'), 'assertion');
  assert.equal(received[0].headers.get('cookie'), null);
  assert.equal(await received[0].text(), body);
  assert.deepEqual(await response.json(), { ok: true, value: state });
});

test('owner gateway rejects a synthetic or malformed private service response', async () => {
  const synthetic = ownerState();
  const gateway = createOwnerWorkspaceGateway({ fetch: async () => new Response(JSON.stringify({ ok: true, value: { ...synthetic, synthetic: true } }), { status: 200 }) });
  const result = await gateway.read(new Request('https://example.test/workspace', { headers: { 'Cf-Access-Jwt-Assertion': 'assertion' } }));
  assert.deepEqual(result, { ok: false, error: { code: 'unavailable', message: 'Owner workspace service returned an invalid response' } });
});
