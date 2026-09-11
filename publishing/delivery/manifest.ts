export default {
  purpose: 'Serve active publication releases through the public application.',
  decisions: [
    'Readings, JSON, Markdown, RSS, and Atom use the active private-engine snapshot projection.',
    'No authoring state, source notes, or private revision histories cross this boundary.',
    'No shared response cache is used until withdrawal and cache invalidation are verified.',
  ],
  capabilities: ['reading', 'json', 'markdown', 'rss', 'atom'],
  governance: {
    access: 'published-only',
    activation: 'explicit-owner-publish',
    implementationStatus: 'unverified',
  },
  risks: [
    'Publish transaction defects must be resolved before live configuration.',
    'Scheduling, offline bundles, EPUB/PDF, mirrors, and backup restoration are not enabled.',
  ],
  contracts: ['contracts/writing/index.ts'],
  bindings: [
    'web/composition/writing.ts',
    'web/adapters/http/publications.tsx',
  ],
  paths: [
    '/readings',
    '/readings/{slug}',
    '/api/publications',
    '/api/publications/{slug}',
    '/readings/{slug}/download.md',
    '/readings/feed.xml',
    '/readings/atom.xml',
  ],
} as const;
