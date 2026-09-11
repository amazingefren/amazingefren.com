import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCommitMessage, validateCommitMessage } from './check.ts';

const valid = `feat(work): add queue\n\nManifest-Commit: 0\n\nManifest: work/work.manifest.ts\n\nAdded: work.enqueue | observable queue operation\n\nX-Review: work.enqueue | owner review`;

test('parses version zero records and extensions', () => {
  const commit = parseCommitMessage(valid);
  assert.equal(commit.subject.type, 'feat');
  assert.equal(commit.records.at(-1).key, 'X-Review');
});

test('allows ordinary Conventional Commits without manifest records', () => {
  const result = validateCommitMessage('fix: correct typo');
  assert.equal(result.valid, true);
});

test('rejects unsafe paths, duplicate manifests, and malformed targets', () => {
  for (const message of [
    valid.replace('work/work.manifest.ts', '../secret.ts'),
    valid.replace(
      'Manifest: work/work.manifest.ts\n\n',
      'Manifest: work/work.manifest.ts\nManifest: work/work.manifest.ts\n\n',
    ),
    valid.replace('work.enqueue |', 'work enqueue |'),
  ])
    assert.equal(validateCommitMessage(message).valid, false);
});

test('rejects wrong versions, continuation lines, and unknown core keys', () => {
  assert.equal(
    validateCommitMessage(
      valid.replace('Manifest-Commit: 0', 'Manifest-Commit: 1'),
    ).valid,
    false,
  );
  assert.equal(validateCommitMessage(`${valid}\ncontinuation`).valid, false);
  assert.equal(
    validateCommitMessage(valid.replace('Added:', 'Bogus:')).valid,
    false,
  );
});

test('known catalogs constrain references without checking claims', () => {
  const catalog = [
    {
      id: 'work',
      operations: [{ id: 'work.enqueue', bindings: [] }],
      events: [],
      risks: [],
    },
  ];
  assert.equal(validateCommitMessage(valid, { catalog }).valid, true);
  assert.equal(
    validateCommitMessage(valid.replace('work.enqueue |', 'work.missing |'), {
      catalog,
    }).valid,
    false,
  );
});

test('breaking subjects require a migration footer', () => {
  assert.equal(validateCommitMessage('feat!: change API').valid, false);
  assert.equal(
    validateCommitMessage(
      'feat!: change API\n\nBREAKING CHANGE: migrate clients',
    ).valid,
    true,
  );
});
