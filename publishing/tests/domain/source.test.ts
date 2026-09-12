import assert from 'node:assert/strict';
import test from 'node:test';
import type { Snapshot } from '../../../contracts/writing/index.ts';
import {
  publicationFeed,
  publicationMarkdown,
} from '../../domain/source/index.ts';

const diagram = '```mermaid\ngraph TD\n  A["<start> & go"] --> B\n```';
const snapshot: Snapshot = {
  id: 'release_1',
  title: 'Source & diagrams',
  slug: 'source-diagrams',
  publishedAt: '2026-09-10T15:00:00.000Z',
  updatedAt: '2026-09-12T16:00:00.000Z',
  summary: 'Approved source.',
  kind: 'article',
  seoTitle: '',
  seoDescription: '',
  tags: [],
  coverAssetId: null,
  chapters: [
    { documentId: 'doc_1', revision: 2, title: 'Chapter', body: diagram },
  ],
  assets: [],
  projectVersion: 3,
};

test('Markdown retains Mermaid fences and book chapter source', () => {
  assert.equal(
    publicationMarkdown(snapshot),
    `# Source & diagrams\n\n${diagram}`,
  );
  assert.equal(
    publicationMarkdown({ ...snapshot, kind: 'book' }),
    `# Source & diagrams\n\n## Chapter\n\n${diagram}`,
  );
});

test('Markdown resolves only approved asset URLs for the active release', () => {
  const asset = {
    id: 'image_1',
    name: 'image.png',
    mime: 'image/png' as const,
    dataUrl: '/api/publications/assets/release_1/image_1',
    alt: '',
    caption: '',
    rights: '',
  };
  const value = {
    ...snapshot,
    chapters: [
      { ...snapshot.chapters[0]!, body: 'asset:image_1 asset:missing' },
    ],
    assets: [asset],
  };
  assert.equal(
    publicationMarkdown(value),
    '# Source & diagrams\n\nhttps://amazingefren.com/api/publications/assets/release_1/image_1 ',
  );
  for (const dataUrl of [
    'https://other.example/image.png',
    '/api/writing/assets/image_1',
    '/api/publications/assets/other_release/image_1',
    '/api/publications/assets/release_1/image_1?private=true',
  ])
    assert.equal(
      publicationMarkdown({ ...value, assets: [{ ...asset, dataUrl }] }),
      '# Source & diagrams\n\n ',
    );
});

test('Atom publishes XML-escaped Markdown with stable links and release timestamps', () => {
  const feed = publicationFeed([snapshot], 'atom');
  assert.match(
    feed,
    /<content type="text"># Source &amp; diagrams\n\n```mermaid/,
  );
  assert.match(feed, /A\[&quot;&lt;start&gt; &amp; go&quot;\] --&gt; B/);
  assert.match(
    feed,
    /<id>https:\/\/amazingefren.com\/readings\/source-diagrams<\/id>/,
  );
  assert.match(feed, /<published>2026-09-10T15:00:00.000Z<\/published>/);
  assert.match(feed, /<updated>2026-09-12T16:00:00.000Z<\/updated>/);
  assert.doesNotMatch(
    feed,
    /<svg|<button|diagram-toggle|publication-code|<script/,
  );
});

test('RSS publishes full Markdown source in its XML-escaped description', () => {
  const feed = publicationFeed([snapshot], 'rss');
  const content =
    '# Source &amp; diagrams\n\n```mermaid\ngraph TD\n  A[&quot;&lt;start&gt; &amp; go&quot;] --&gt; B\n```';
  assert.ok(feed.includes(`<description>${content}</description>`));
  assert.match(
    feed,
    /<guid isPermaLink="true">https:\/\/amazingefren.com\/readings\/source-diagrams<\/guid>/,
  );
  assert.match(feed, /<pubDate>Thu, 10 Sep 2026 15:00:00 GMT<\/pubDate>/);
  assert.doesNotMatch(
    feed,
    /<svg|<button|diagram-toggle|publication-code|<script/,
  );
});

test('empty Atom feed retains deterministic metadata', () => {
  assert.match(
    publicationFeed([], 'atom'),
    /<updated>1970-01-01T00:00:00.000Z<\/updated>/,
  );
});
