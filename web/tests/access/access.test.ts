import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalPath,
  guardLaunchRequest,
  localWorkspacePreview,
  protectedPath,
  secureResponse,
  sessionCookieHeader,
  workspacePreviewPath,
} from '../../domain/access/index.ts';

const origin = 'https://amazingefren.com';

test('launch denies anonymous workspace pages, APIs, and encoded routes before any application read', async () => {
  for (const path of [
    '/workspace',
    '/workspace/documents?__rsc',
    '/guest/dashboard',
    '/guest/telemetry',
    '/api/guest/dashboard/summary',
    '/api/workspace/operation',
    '/api/work/operations/work.read',
    '/api/writing/assets/private',
    '/%77orkspace/dashboard',
  ]) {
    let checks = 0;
    const response = await guardLaunchRequest(
      new Request(origin + path),
      origin,
      async () => {
        checks++;
        return false;
      },
    );
    assert.equal(checks, 1, path);
    assert.equal(response?.status, path.startsWith('/api/') ? 401 : 303, path);
    assert.equal(response?.headers.get('cache-control'), 'private, no-store');
  }
});

test('local workspace preview is opt-in and limited to HTTP loopback requests', async () => {
  for (const url of [
    'http://localhost:5173/workspace',
    'http://127.0.0.1:5173/workspace',
    'http://[::1]:5173/workspace',
  ]) {
    const request = new Request(url);
    assert.equal(localWorkspacePreview(request, 'true'), true, url);
    assert.equal(
      await guardLaunchRequest(request, origin, async () => false, true),
      null,
      url,
    );
  }
  for (const url of [
    'https://localhost/workspace',
    'http://preview.test/workspace',
  ])
    assert.equal(localWorkspacePreview(new Request(url), 'true'), false, url);
  assert.equal(
    localWorkspacePreview(
      new Request('http://localhost:5173/workspace'),
      undefined,
    ),
    false,
  );
  for (const path of [
    '/workspace/connections/emacs',
    '/workspace/publishing/example/review',
    '/api/workspace/operation',
  ]) {
    assert.equal(workspacePreviewPath(path), false, path);
    assert.equal(
      (
        await guardLaunchRequest(
          new Request(`http://localhost:5173${path}`),
          origin,
          async () => false,
          true,
        )
      )?.status,
      503,
      path,
    );
  }
  assert.equal(workspacePreviewPath('/workspace/dashboard'), true);
});

test('launch permits owner sessions and public reading while denying undeclared framework actions', async () => {
  assert.equal(
    await guardLaunchRequest(
      new Request(origin + '/workspace'),
      origin,
      async () => true,
    ),
    null,
  );
  for (const path of [
    '/',
    '/about',
    '/readings',
    '/api/publications',
    '/auth/me',
  ]) {
    assert.equal(
      await guardLaunchRequest(new Request(origin + path), origin, async () => {
        throw new Error('Public route read auth storage');
      }),
      null,
    );
  }
  assert.equal(
    (
      await guardLaunchRequest(
        new Request(origin + '/?__rsc_action_id=forged'),
        origin,
        async () => true,
      )
    )?.status,
    403,
  );
  assert.equal(
    (
      await guardLaunchRequest(
        new Request(origin + '/workspace'),
        undefined,
        async () => true,
      )
    )?.status,
    503,
  );
  assert.equal(
    (
      await guardLaunchRequest(
        new Request('https://preview.test/workspace'),
        origin,
        async () => true,
      )
    )?.status,
    503,
  );
});

test('ambiguous paths and cookies fail closed; unrelated cookies and Access assertions are never forwarded', () => {
  for (const path of [
    '/guest%252ftelemetry',
    '/guest%5ctelemetry',
    '/guest//telemetry',
    '/guest%00',
  ])
    assert.equal(canonicalPath(new URL(origin + path)), null);
  assert.equal(protectedPath('/workspace-public'), false);
  const token = 'a'.repeat(43);
  assert.equal(
    sessionCookieHeader(
      new Request(origin, {
        headers: {
          cookie: `other=private; __Host-ae-session=${token}`,
          'Cf-Access-Jwt-Assertion': 'forged',
        },
      }),
    ),
    `__Host-ae-session=${token}`,
  );
  assert.equal(
    sessionCookieHeader(
      new Request(origin, {
        headers: {
          cookie: `__Host-ae-session=${token}; __Host-ae-session=${token}`,
        },
      }),
    ),
    null,
  );
  assert.equal(
    sessionCookieHeader(
      new Request(origin, { headers: { 'Cf-Access-Jwt-Assertion': 'forged' } }),
    ),
    null,
  );
});

test('private responses deny caching and framing without dropping cookie headers', () => {
  const result = secureResponse(
    new Response('private', {
      headers: {
        'set-cookie': 'test=1',
        'cache-control': 'public',
        'content-security-policy': "default-src 'none'",
      },
    }),
    true,
  );
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
  assert.equal(result.headers.get('set-cookie'), 'test=1');
  assert.equal(result.headers.get('x-frame-options'), 'DENY');
  assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
  assert.match(
    result.headers.get('content-security-policy')!,
    /default-src 'none'/,
  );
});
