import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isEvidenceRecord,
  isEvidenceResult,
  isEvidenceState,
  parseEvidenceCommand,
} from '../contracts/index.ts';

const source = {
  id: 'source-1',
  label: 'Source',
  reference: 'https://example.test',
};
const draft = {
  id: 'record-1',
  kind: 'claim',
  text: 'A claim',
  sources: [],
  review: 'draft',
  revision: 1,
  createdAt: '2026-09-10T00:00:00.000Z',
  reviewedAt: null,
};
const reviewed = {
  ...draft,
  sources: [source],
  review: 'reviewed',
  reviewedAt: '2026-09-10T01:00:00.000Z',
};

test('commands reject undeclared operations and extra fields', () => {
  assert.equal(
    parseEvidenceCommand({ operation: 'evidence.read', extra: true }),
    null,
  );
  assert.equal(parseEvidenceCommand({ operation: 'evidence.delete' }), null);
  assert.equal(
    parseEvidenceCommand({
      operation: 'evidence.create',
      input: { kind: 'claim', text: 'x', sources: [], extra: true },
    }),
    null,
  );
});

test('state and records reject malformed, duplicate, and source-less reviewed data', () => {
  assert.equal(isEvidenceRecord({ ...draft, reviewedAt: 'not-a-date' }), false);
  assert.equal(isEvidenceRecord({ ...reviewed, sources: [] }), false);
  assert.equal(
    isEvidenceState({ version: 1, synthetic: false, records: [draft, draft] }),
    false,
  );
  assert.equal(
    isEvidenceState({ version: 1, synthetic: false, records: [draft] }),
    true,
  );
});

test('result validator rejects fake draft exports and extra fields', () => {
  assert.equal(
    isEvidenceResult({
      ok: true,
      report: { synthetic: false, revision: 1, records: [draft] },
    }),
    false,
  );
  assert.equal(
    isEvidenceResult({
      ok: false,
      error: { code: 'invalid', message: 'bad' },
      extra: true,
    }),
    false,
  );
  assert.equal(
    isEvidenceResult({
      ok: true,
      report: { synthetic: false, revision: 1, records: [reviewed] },
    }),
    true,
  );
});
