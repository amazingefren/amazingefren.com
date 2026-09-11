import type { Operation } from '../../manifests/schema/operation.schema.ts';

export const publicationProjectOperationIds = [
  'publishing.projects.create',
  'publishing.projects.update',
  'publishing.projects.add-chapter',
  'publishing.projects.reorder',
  'publishing.projects.review',
  'publishing.projects.publish',
  'publishing.projects.schedule',
  'publishing.projects.cancel-schedule',
  'publishing.projects.withdraw',
] as const;
export const publicPublicationProjectOperationIds = [
  'publishing.projects.list-public',
  'publishing.projects.read-public',
] as const;
export type PublicationProjectOperationId =
  (typeof publicationProjectOperationIds)[number];
export type PublicPublicationProjectOperationId =
  (typeof publicPublicationProjectOperationIds)[number];

const authoringOperation = (id: PublicationProjectOperationId): Operation => ({
  id,
  dataScope: 'synthetic',
  access: { kind: 'public' },
  bindings: [
    {
      id: `${id}.http`,
      surface: { kind: 'http', method: 'POST', path: '/api/writing/operation' },
      scope: 'required',
      status: 'implemented',
      directory: 'publishing/projects',
      testsDirectory: 'publishing/tests/projects',
      implementation: 'publishing/projects/adapters.ts',
      tests: [],
    },
    {
      id: `${id}.mcp-tool`,
      surface: {
        kind: 'mcp-tool',
        name: id.replaceAll('.', '_').replaceAll('-', '_'),
        description: `Invoke ${id} through the authorized writing port.`,
        readOnly: false,
      },
      scope: 'required',
      status: 'implemented',
      directory: 'publishing/projects',
      testsDirectory: 'publishing/tests/projects',
      implementation: 'publishing/projects/adapters.ts',
      tests: [],
    },
    {
      id: `${id}.cli`,
      surface: {
        kind: 'cli',
        command: `ae writing ${id.replace('publishing.', '')}`,
        output: 'json',
      },
      scope: 'required',
      status: 'implemented',
      directory: 'publishing/projects',
      testsDirectory: 'publishing/tests/projects',
      implementation: 'publishing/projects/adapters.ts',
      tests: [],
    },
  ],
  status: 'implemented',
  input: 'contracts/writing/index.ts',
  output: 'contracts/writing/index.ts',
  errors: 'contracts/writing/index.ts',
  directory: `publishing/projects/operations/${id}`,
  testsDirectory: `publishing/tests/projects/${id}`,
  implementation: 'publishing/projects/adapters.ts',
  verification: [
    {
      id: `${id}.contract`,
      category: 'contract',
      expectation: 'The command and result use contracts/writing/index.ts.',
      tests: [],
    },
    {
      id: `${id}.access`,
      category: 'access',
      expectation: 'The injected port authorizes before protected operations.',
      tests: [],
    },
    {
      id: `${id}.behavior`,
      category: 'behavior',
      expectation: 'Project transitions use the expected project version.',
      tests: [],
    },
    {
      id: `${id}.failure`,
      category: 'failure',
      expectation:
        'Missing projects, invalid input, and stale versions return typed failures.',
      tests: [],
    },
  ],
});

const publicBinding = (
  id: string,
  surface: Operation['bindings'][number]['surface'],
) => ({
  id,
  surface,
  scope: 'required' as const,
  status: 'declared' as const,
  directory: 'publishing/projects',
  testsDirectory: 'publishing/tests/projects',
  implementation: 'web/adapters/http/publications.tsx',
  tests: [],
});
const publicOperation = (
  id: PublicPublicationProjectOperationId,
): Operation => ({
  id,
  dataScope: 'published',
  access: { kind: 'public' },
  bindings:
    id === 'publishing.projects.list-public'
      ? [
          publicBinding(`${id}.http`, {
            kind: 'http',
            method: 'GET',
            path: '/api/publications',
          }),
          publicBinding(`${id}.rss`, {
            kind: 'feed',
            format: 'rss',
            path: '/feeds/publications.rss.xml',
            fullText: true,
            itemId: 'id',
            updatedAt: 'publishedAt',
          }),
          publicBinding(`${id}.atom`, {
            kind: 'feed',
            format: 'atom',
            path: '/feeds/publications.atom.xml',
            fullText: true,
            itemId: 'id',
            updatedAt: 'publishedAt',
          }),
          publicBinding(`${id}.offline.mcp-resource`, {
            kind: 'mcp-resource',
            uriTemplate: 'ae://publications/offline-bundle',
            mimeType: 'application/zip',
          }),
          publicBinding(`${id}.offline.cli`, {
            kind: 'cli',
            command: 'ae publications download',
            output: 'zip',
          }),
          publicBinding(`${id}.offline.export`, {
            kind: 'export',
            format: 'offline-bundle',
            path: '/exports/publications.zip',
          }),
          publicBinding(`${id}.opml.mcp-resource`, {
            kind: 'mcp-resource',
            uriTemplate: 'ae://publications/subscriptions.opml',
            mimeType: 'text/x-opml',
          }),
          publicBinding(`${id}.opml.cli`, {
            kind: 'cli',
            command: 'ae publications subscriptions',
            output: 'opml',
          }),
          publicBinding(`${id}.opml.export`, {
            kind: 'export',
            format: 'opml',
            path: '/readings/subscriptions.opml',
          }),
        ]
      : [
          publicBinding(`${id}.http`, {
            kind: 'http',
            method: 'GET',
            path: '/api/publications/{slug}',
          }),
          publicBinding(`${id}.markdown`, {
            kind: 'export',
            format: 'markdown',
            path: '/publications/{slug}.md',
          }),
          publicBinding(`${id}.json`, {
            kind: 'export',
            format: 'json',
            path: '/publications/{slug}.json',
          }),
        ],
  status: 'declared',
  input: 'contracts/writing/index.ts',
  output: 'contracts/writing/index.ts',
  errors: 'contracts/writing/index.ts',
  directory: `publishing/projects/operations/${id}`,
  testsDirectory: `publishing/tests/projects/${id}`,
  implementation: 'web/adapters/http/publications.tsx',
  verification: [
    {
      id: `${id}.contract`,
      category: 'contract',
      expectation: 'Public snapshots use contracts/writing/index.ts.',
      tests: [],
    },
    {
      id: `${id}.access`,
      category: 'access',
      expectation: 'Only active public snapshots are available.',
      tests: [],
    },
    {
      id: `${id}.behavior`,
      category: 'behavior',
      expectation:
        'JSON, HTML, Markdown, feeds, and offline bundles use the same active snapshot.',
      tests: [],
    },
    {
      id: `${id}.failure`,
      category: 'failure',
      expectation: 'Unknown or withdrawn slugs do not disclose authoring data.',
      tests: [],
    },
  ],
});

export const publicationProjectOperations: readonly Operation[] = [
  ...publicationProjectOperationIds.map(authoringOperation),
  ...publicPublicationProjectOperationIds.map(publicOperation),
];
