import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const origin = 'https://example.com';
const snapshot = {
  id: 'release-1',
  publishedAt: '2026-09-10T00:00:00.000Z',
  title: 'Synthetic export fixture',
  slug: 'synthetic-export-fixture',
  summary: 'Test content.',
  kind: 'article',
  seoTitle: '',
  seoDescription: '',
  tags: [],
  coverAssetId: 'image-1',
  chapters: [
    {
      documentId: 'doc-1',
      revision: 3,
      title: 'Fixture',
      body: 'Approved test revision. ![Fixture](asset:image-1)',
    },
  ],
  assets: [
    {
      id: 'image-1',
      name: 'fixture.png',
      mime: 'image/png',
      dataUrl: '/api/publications/assets/release-1/image-1',
      alt: 'Fixture',
      caption: '',
      rights: '',
    },
  ],
  projectVersion: 2,
};
let withdrawn = false;
let failedAsset = false;
let assetReads = 0;
const runtime = new Miniflare(
  convertV4MiniflareOptions({
    workers: [
      {
        name: 'web',
        modules: true,
        scriptPath: new URL('../../dist/worker/index.js', import.meta.url)
          .pathname,
        compatibilityDate: '2026-09-10',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: ['AUTH_DB'],
        bindings: { AUTH_ORIGIN: origin },
        serviceBindings: {
          ASSETS: () => new Response(null, { status: 404 }),
          WORKSPACE_OWNER_SERVICE: (request) => {
            const path = new URL(request.url).pathname;
            if (path === '/api/publications/assets/release-1/image-1') {
              assetReads++;
              return failedAsset || withdrawn
                ? new Response(null, { status: 404 })
                : new Response(new Uint8Array([137, 80, 78, 71]), {
                    headers: { 'content-type': 'image/png' },
                  });
            }
            if (path === '/api/publications')
              return Response.json({
                ok: true,
                value: withdrawn ? [] : [snapshot],
              });
            if (path === `/api/publications/${snapshot.slug}`)
              return Response.json(
                withdrawn
                  ? {
                      ok: false,
                      error: {
                        code: 'missing',
                        message: 'Publication not found.',
                      },
                    }
                  : { ok: true, value: [snapshot] },
              );
            return new Response(null, { status: 404 });
          },
        },
      },
    ],
  }),
);
const send = (path, options) =>
  runtime.dispatchFetch(origin + path, { redirect: 'manual', ...options });
try {
  const catalog = await send('/api/systems');
  assert.equal(catalog.status, 200);
  const listing = await catalog.json();
  assert.ok(listing.items.some((entry) => entry.id === 'system-explorer'));
  assert.ok(!JSON.stringify(listing).includes('ae-workbench'));
  const jsonExport = await send('/exports/systems/index.json');
  assert.equal(jsonExport.status, 200);
  assert.deepEqual(await jsonExport.json(), listing);
  assert.equal((await send('/api/systems?limit=1&limit=2')).status, 400);
  assert.equal((await send('/api/systems/ae-workbench')).status, 404);
  const rpc = async (method, params = {}, extraHeaders = {}) => {
    const response = await send('/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2025-11-25',
        ...extraHeaders,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    return response;
  };
  const initialized = await rpc('initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'ae-runtime-test', version: '1' },
  });
  assert.equal(initialized.status, 200);
  assert.equal((await initialized.json()).result.protocolVersion, '2025-11-25');
  const tools = (await (await rpc('tools/list')).json()).result.tools;
  assert.deepEqual(tools.map((tool) => tool.name).sort(), [
    'list_systems',
    'read_systems',
  ]);
  const toolResult = await (
    await rpc('tools/call', { name: 'list_systems', arguments: {} })
  ).json();
  assert.deepEqual(toolResult.result.structuredContent, listing);
  const unknownTool = await (
    await rpc('tools/call', { name: 'studio_save_document', arguments: {} })
  ).json();
  assert.ok(unknownTool.error);
  assert.equal(
    (await rpc('tools/list', {}, { origin: 'https://untrusted.example' }))
      .status,
    403,
  );
  assert.equal((await send('/mcp')).status, 405);
  const resources = (await (await rpc('resources/list')).json()).result
    .resources;
  assert.ok(
    resources.some(
      (resource) => resource.uri === 'ae://publications/subscriptions.opml',
    ),
  );
  const subscriptions = (
    await (
      await rpc('resources/read', {
        uri: 'ae://publications/subscriptions.opml',
      })
    ).json()
  ).result;
  assert.match(subscriptions.contents[0].text, /<opml/);
  const systemZip = await send('/exports/systems.zip');
  assert.equal(systemZip.status, 200);
  assert.equal(
    new DataView(await systemZip.arrayBuffer()).getUint32(0, true),
    0x04034b50,
  );
  const opml = await send('/readings/subscriptions.opml');
  assert.equal(opml.status, 200);
  assert.match(
    await opml.text(),
    /https:\/\/amazingefren.com\/readings\/feed.xml/,
  );
  const reading = await send('/readings');
  assert.equal(reading.status, 200);
  const readingHtml = await reading.text();
  assert.match(readingHtml, /href="\/exports\/publications.zip"/);
  assert.match(readingHtml, /href="\/readings\/subscriptions.opml"/);
  const bundle = await send('/exports/publications.zip');
  assert.equal(bundle.status, 200);
  assert.equal(bundle.headers.get('cache-control'), 'no-store');
  const bundleBytes = await bundle.arrayBuffer();
  assert.equal(new DataView(bundleBytes).getUint32(0, true), 0x04034b50);
  assert.match(new TextDecoder().decode(bundleBytes), /Approved test revision/);
  assert.equal(assetReads, 1);
  failedAsset = true;
  assert.equal((await send('/exports/publications.zip')).status, 503);
  failedAsset = false;
  withdrawn = true;
  const afterWithdrawal = await send('/exports/publications.zip');
  assert.equal(afterWithdrawal.status, 200);
  assert.doesNotMatch(
    new TextDecoder().decode(await afterWithdrawal.arrayBuffer()),
    /Approved test revision/,
  );
  assert.equal((await send('/workspace')).status, 303);
  assert.equal((await send('/api/writing/assets/private')).status, 401);
  console.log(
    'Built Worker portable integration passed: catalog, JSON, ZIP, OPML, reading links, withdrawal, asset failure, and protected routes.',
  );
} finally {
  await runtime.dispose();
}
