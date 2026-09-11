import test from 'node:test';
import assert from 'node:assert/strict';
import { nextMatrixId, reportMarkdown } from '../domain/report.ts';

test('matrix ids remain unique after deletions and gaps', () => {
  assert.equal(nextMatrixId('case', [{ id: 'case-2' }]), 'case-1');
  assert.equal(
    nextMatrixId('case', [{ id: 'case-1' }, { id: 'case-2' }]),
    'case-3',
  );
});
test('Markdown reports retain counts and run provenance without inventing conclusions', () => {
  const markdown = reportMarkdown({
    format: 'markdown',
    definitions: [
      {
        id: 'd',
        name: 'Sample',
        hypothesis: 'A question',
        revision: 2,
        frozenAt: '2026-09-10T00:00:00Z',
      },
    ],
    runs: [
      {
        id: 'r',
        definitionId: 'd',
        definitionRevision: 2,
        status: 'complete',
        aggregates: [
          {
            subjectId: 's',
            scheduled: 4,
            completed: 2,
            passed: 1,
            failed: 1,
            unknown: 2,
            passRate: 0.5,
          },
        ],
      },
    ],
    observations: ['Two outcomes remain unknown.'],
  });
  assert.match(markdown, /revision 2/);
  assert.match(markdown, /\| s \| 1 \| 1 \| 2 \| 4 \|/);
  assert.match(markdown, /Two outcomes remain unknown/);
  assert.doesNotMatch(markdown, /winner|superior|proven/);
});
