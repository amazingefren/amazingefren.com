import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countWords,
  manuscriptOutline,
  markdownInsertion,
  publicationInstant,
} from '../ui/writing/editor-helpers.ts';

test('writing helpers count words and preserve the manuscript outline', () => {
  assert.equal(countWords('  One\n two  '), 2);
  assert.deepEqual(manuscriptOutline('# Title\nText\n## Part'), [
    { line: 0, depth: 1, title: 'Title' },
    { line: 2, depth: 2, title: 'Part' },
  ]);
});

test('publication date input preserves its selected IANA timezone', () => {
  assert.equal(
    publicationInstant('2026-09-10T21:30', 'America/Denver'),
    '2026-09-11T03:30:00.000Z',
  );
  assert.equal(publicationInstant('2026-09-10', 'America/Denver'), null);
  assert.equal(
    publicationInstant('2026-01-10T21:30', 'America/Denver'),
    '2026-01-11T04:30:00.000Z',
  );
  assert.equal(
    publicationInstant('2026-09-10T21:30', 'UTC'),
    '2026-09-10T21:30:00.000Z',
  );
  assert.equal(publicationInstant('2026-03-08T02:30', 'America/Denver'), null);
  assert.equal(publicationInstant('2026-11-01T01:30', 'America/Denver'), null);
  assert.equal(publicationInstant('2026-02-30T10:00', 'America/Denver'), null);
});

test('writing helpers produce Markdown insertions without user prose', () => {
  assert.equal(markdownInsertion('bold', 'Selected'), '**Selected**');
  assert.equal(markdownInsertion('link', 'Read'), '[Read](https://)');
  assert.match(markdownInsertion('table', 'Row'), /\| Row \|/);
});
