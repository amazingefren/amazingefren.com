import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkGateway } from '../adapters/owner.ts';
const command = { operation: 'work.read' };
function request(
  body: unknown = command,
  headers: Record<string, string> = {
    origin: 'https://ae.test',
    cookie: '__Host-ae-session=' + 'a'.repeat(43),
  },
  route = 'work.read',
) {
  return new Request(`https://ae.test/api/work/operations/${route}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
test('work gateway denies missing session and cross-origin before service calls', async () => {
  let calls = 0;
  const gateway = createWorkGateway({
    async fetch() {
      calls++;
      return Response.json({});
    },
  });
  assert.equal(
    (await gateway.operation(request(command, { origin: 'https://ae.test' })))
      .status,
    401,
  );
  assert.equal(
    (
      await gateway.operation(
        request(command, {
          origin: 'https://evil.test',
          cookie: '__Host-ae-session=' + 'a'.repeat(43),
        }),
      )
    ).status,
    403,
  );
  assert.equal(calls, 0);
});
test('work gateway rejects forged actors and route mismatch', async () => {
  let calls = 0;
  const gateway = createWorkGateway({
    async fetch() {
      calls++;
      return Response.json({});
    },
  });
  assert.equal(
    (await gateway.operation(request({ ...command, actor: 'owner' }))).status,
    400,
  );
  assert.equal(
    (await gateway.operation(request(command, undefined, 'work.accept')))
      .status,
    400,
  );
  assert.equal(calls, 0);
});
test('work gateway forwards only a parsed command and identity, validates owner state', async () => {
  const state = {
    schemaVersion: 1,
    version: 0,
    synthetic: false,
    spaces: [],
    items: [],
  };
  let captured: Request | undefined;
  const gateway = createWorkGateway({
    async fetch(r) {
      captured = r;
      return Response.json({ ok: true, state });
    },
  });
  const response = await gateway.operation(request());
  assert.equal(response.status, 200);
  assert.equal(
    captured?.url,
    'https://workspace-owner.internal/api/work/operation',
  );
  assert.equal(
    captured?.headers.get('cookie'),
    '__Host-ae-session=' + 'a'.repeat(43),
  );
  assert.equal(captured?.headers.get('Cf-Access-Jwt-Assertion'), null);
  assert.deepEqual(await captured!.json(), command);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const invalid = createWorkGateway({
    async fetch() {
      return Response.json({ ok: true, state: { ...state, synthetic: true } });
    },
  });
  assert.equal((await invalid.operation(request())).status, 503);
});
test('work gateway preserves typed conflicts and fails closed without service', async () => {
  const gateway = createWorkGateway({
    async fetch() {
      return Response.json({
        ok: false,
        error: 'conflict',
        message: 'Changed',
      });
    },
  });
  assert.equal((await gateway.operation(request())).status, 409);
  assert.equal(
    (await createWorkGateway(undefined).operation(request())).status,
    503,
  );
});
