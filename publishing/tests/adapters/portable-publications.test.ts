import assert from 'node:assert/strict';
import test from 'node:test';
import { executePortablePublicationCli } from '../../adapters/cli/portable-publications.ts';
import { readPortablePublicationResource } from '../../adapters/mcp/portable-publications.ts';
import type { PortablePublicationDependencies } from '../../adapters/cli/portable-publications.ts';
import type { Snapshot } from '../../../contracts/writing/index.ts';

const snapshot: Snapshot = {
  id: 'release_1',
  publishedAt: '2026-09-10T15:00:00.000Z',
  title: 'Public release',
  slug: 'public-release',
  summary: 'Public.',
  kind: 'article',
  seoTitle: 'Public release',
  seoDescription: 'Public.',
  tags: [],
  coverAssetId: null,
  chapters: [
    {
      documentId: 'document_1',
      revision: 1,
      title: 'Public',
      body: 'Public text',
    },
  ],
  assets: [],
  projectVersion: 1,
};

const dependencies: PortablePublicationDependencies = {
  publications: {
    async list() {
      return { ok: true, value: [snapshot] };
    },
  },
  assets: {
    async read() {
      return { ok: false, error: { code: 'missing', message: 'No asset' } };
    },
  },
  origin: 'https://amazingefren.com/',
};

test('CLI and MCP emit the same portable publication representations', async () => {
  const cliBundle = await executePortablePublicationCli(dependencies, [
    'download',
  ]);
  const mcpBundle = await readPortablePublicationResource(
    dependencies,
    'ae://publications/offline-bundle',
  );
  assert.equal(cliBundle.ok, true);
  assert.equal(mcpBundle.ok, true);
  if (!cliBundle.ok || !mcpBundle.ok) return;
  assert.equal(cliBundle.value.contentType, 'application/zip');
  assert.deepEqual(cliBundle.value.body, mcpBundle.value.body);
  const cliOpml = await executePortablePublicationCli(dependencies, [
    'subscriptions',
  ]);
  const mcpOpml = await readPortablePublicationResource(
    dependencies,
    'ae://publications/subscriptions.opml',
  );
  assert.deepEqual(cliOpml, mcpOpml);
});

test('CLI and MCP reject undeclared input without reading publications', async () => {
  const deniedDependencies: PortablePublicationDependencies = {
    ...dependencies,
    publications: {
      async list() {
        throw new Error('Should not read');
      },
    },
  };
  const cli = await executePortablePublicationCli(deniedDependencies, [
    'download',
    'extra',
  ]);
  assert.deepEqual(cli, {
    ok: false,
    error: {
      code: 'invalid',
      message: 'Use `publications download` or `publications subscriptions`.',
    },
  });
  const mcp = await readPortablePublicationResource(
    deniedDependencies,
    'ae://publications/unknown',
  );
  assert.deepEqual(mcp, {
    ok: false,
    error: {
      code: 'missing',
      message: 'Publication resource is not declared.',
    },
  });
});
