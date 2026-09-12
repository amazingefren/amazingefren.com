export default {
  purpose: 'Serve active publication releases through the public application.',
  decisions: [
    'Readings, JSON, Markdown, RSS, and Atom use the active private-engine snapshot projection.',
    'No authoring state, source notes, or private revision histories cross this boundary.',
    'No shared response cache is used until withdrawal and cache invalidation are verified.',
  ],
  capabilities: [
    'reading',
    'json',
    'markdown',
    'rss',
    'atom',
    'offline-bundle',
    'opml',
  ],
  governance: {
    access: 'published-only',
    activation: 'explicit-owner-publish',
    implementationStatus: 'unverified',
  },
  risks: [
    'Publish transaction defects must be resolved before live configuration.',
    'Scheduling, EPUB/PDF, mirrors, and backup restoration are not enabled.',
  ],
  contracts: ['contracts/writing/index.ts'],
  browser: {
    shell: 'web/ui/shared/PublicShell.tsx',
    renderer: 'publishing/rendering/PublicationMarkdown.tsx',
    diagram: 'publishing/rendering/PublicationDiagram.tsx',
    preview: 'workspace/ui/writing/PublicPreview.tsx',
    previewStyles:
      'WorkspaceDocument supplies the bundled preview stylesheet URL through publication-preview-styles metadata. The iframe links it without importing CSS query modules into the client SSR graph.',
    styles: ['web/adapters/http/public.css', 'publishing/rendering/styles.css'],
  },
  source: {
    implementation: 'publishing/domain/source/index.ts',
    tests: ['publishing/tests/domain/source.test.ts'],
    formats:
      'Markdown downloads and RSS/Atom retain approved Markdown source, including Mermaid fences. JSON returns chapter bodies; offline bundles include Markdown and local assets. Browser diagrams are presentation only.',
  },
  bindings: [
    'web/composition/writing.ts',
    'web/adapters/http/publications.tsx',
    'publishing/adapters/http/portable-publications.ts',
    'publishing/adapters/cli/portable-publications.ts',
    'publishing/adapters/cli/main.ts',
    'publishing/adapters/mcp/portable-publications.ts',
  ],
  paths: [
    '/readings',
    '/readings/{slug}',
    '/api/publications',
    '/api/publications/{slug}',
    '/readings/{slug}/download.md',
    '/readings/feed.xml',
    '/readings/atom.xml',
    '/exports/publications.zip',
    '/readings/subscriptions.opml',
  ],
} as const;
