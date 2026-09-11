import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countWords,
  manuscriptOutline,
  markdownInsertion,
} from '../ui/writing/editor-helpers.ts';

test('writing helpers count words and preserve the manuscript outline', () => {
  assert.equal(countWords('  One\n two  '), 2);
  assert.deepEqual(manuscriptOutline('# Title\nText\n## Part'), [
    { line: 0, depth: 1, title: 'Title' },
    { line: 2, depth: 2, title: 'Part' },
  ]);
});

test('writing helpers produce Markdown insertions without user prose', () => {
  assert.equal(markdownInsertion('bold', 'Selected'), '**Selected**');
  assert.equal(markdownInsertion('link', 'Read'), '[Read](https://)');
  assert.match(markdownInsertion('table', 'Row'), /\| Row \|/);
});
