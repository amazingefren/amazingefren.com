import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuestEvidencePort } from '../adapters/guest.ts';
import {
  createGuestEvidenceSession,
  guestEvidenceStorageKey,
  resetGuestEvidence,
} from '../adapters/guest-session.ts';

const source = [
  { id: 'source-1', label: 'Source', reference: 'https://example.test' },
];
test('guest review requires sources, freezes records, and exports reviewed selections', async () => {
  const port = createGuestEvidencePort();
  assert.equal(
    (
      await port.execute({
        operation: 'evidence.create',
        input: { kind: 'claim', text: 'A claim', sources: [] },
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await port.execute({
        operation: 'evidence.review',
        id: 'evidence-1',
        revision: 1,
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await port.execute({
        operation: 'evidence.update',
        id: 'evidence-1',
        revision: 1,
        input: { text: 'A claim', sources: source },
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await port.execute({
        operation: 'evidence.review',
        id: 'evidence-1',
        revision: 2,
      })
    ).ok,
    true,
  );
  const exported = await port.execute({
    operation: 'evidence.export-reviewed',
  });
  assert.equal(exported.ok, true);
  if (exported.ok && 'report' in exported) {
    assert.equal(exported.report.synthetic, true);
    assert.equal(exported.report.records.length, 1);
  }
  assert.equal(
    (
      await port.execute({
        operation: 'evidence.review',
        id: 'evidence-1',
        revision: 3,
      })
    ).ok,
    false,
  );
});
test('guest sessions persist separately and returned state cannot mutate storage', async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as Storage;
  const first = createGuestEvidenceSession(storage);
  const secondValues = new Map<string, string>();
  const second = createGuestEvidenceSession({
    ...storage,
    getItem: (key) => secondValues.get(key) ?? null,
    setItem: (key, value) => secondValues.set(key, value),
    removeItem: (key) => secondValues.delete(key),
  });
  await first.execute({
    operation: 'evidence.create',
    input: { kind: 'observation', text: 'Synthetic', sources: source },
  });
  const read = await first.execute({ operation: 'evidence.read' });
  if (read.ok && 'value' in read) read.value.records[0].text = 'mutated';
  const again = await createGuestEvidenceSession(storage).execute({
    operation: 'evidence.read',
  });
  assert.equal(again.ok, true);
  if (again.ok && 'value' in again)
    assert.equal(again.value.records[0].text, 'Synthetic');
  const isolated = await second.execute({ operation: 'evidence.read' });
  assert.equal(isolated.ok, true);
  if (isolated.ok && 'value' in isolated)
    assert.equal(isolated.value.records.length, 0);
  resetGuestEvidence(storage);
  assert.equal(storage.getItem(guestEvidenceStorageKey), null);
});
