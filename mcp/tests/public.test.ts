import assert from 'node:assert/strict';
import test from 'node:test';
import { createSystemExplorer } from '../../system-explorer/operations/index.ts';
import { createPublicMcpHttpHandler } from '../transport/public.ts';

const handler = createPublicMcpHttpHandler(createSystemExplorer(), {
  allowedOrigins: ['https://ae.test'],
});
function request(body: unknown, headers: Record<string, string> = {}) {
  return handler(
    new Request('https://ae.test/mcp', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

test('legacy initialize negotiates the declared protocol and lists only catalog tools', async () => {
  const initialized = await request({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    },
  });
  const tools = await request({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal(
    ((await initialized.json()) as { result: { protocolVersion: string } })
      .result.protocolVersion,
    '2025-11-25',
  );
  assert.deepEqual(
    (
      (await tools.json()) as { result: { tools: Array<{ name: string }> } }
    ).result.tools.map((tool) => tool.name),
    ['list_systems', 'read_systems'],
  );
});

test('legacy requests return public catalog results', async () => {
  const response = await request(
    {
      jsonrpc: '2.0',
      id: 'catalog',
      method: 'tools/call',
      params: { name: 'list_systems', arguments: { limit: 1 } },
    },
    {
      'mcp-protocol-version': '2025-11-25',
      origin: 'https://ae.test',
    },
  );
  const body = (await response.json()) as {
    result: { structuredContent: { items: unknown[] } };
  };
  assert.equal(response.status, 200);
  assert.equal(body.result.structuredContent.items.length, 1);
});

test('transport denies bad origin, unknown methods, malformed calls, notifications, and GET SSE', async () => {
  const denied = await request(
    { jsonrpc: '2.0', id: 1, method: 'ping' },
    { origin: 'https://evil.test' },
  );
  const unknown = await request({
    jsonrpc: '2.0',
    id: 1,
    method: 'workspace.write',
  });
  const malformed = await request({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'workspace.write' },
  });
  const notification = await request({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });
  const get = await handler(new Request('https://ae.test/mcp'));
  assert.equal(denied.status, 403);
  assert.equal(
    ((await unknown.json()) as { error: { code: number } }).error.code,
    -32601,
  );
  assert.equal(
    ((await malformed.json()) as { error: { code: number } }).error.code,
    -32602,
  );
  assert.equal(notification.status, 202);
  assert.equal(get.status, 405);
});
