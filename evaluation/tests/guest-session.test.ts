import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGuestEvaluationSession,
  guestEvaluationStorageKey,
  resetGuestEvaluation,
} from '../adapters/guest-session.ts';
import { emptyEvaluationState } from '../fixtures/guest.ts';

const definition = {
  name: 'Synthetic session fixture',
  hypothesis: '',
  cases: [{ id: 'case', input: 'one', expected: 'one' }],
  subjects: [{ id: 'subject', label: 'Fixture', configuration: {} }],
  metric: { kind: 'exact-match' as const },
  repetitions: 1,
  budget: { maxRequests: 1, maxTokens: 10 },
};
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

test('guest benchmarks survive page recreation, preserve unique IDs, and reset only their storage', async () => {
  const saved = storage();
  const first = await createGuestEvaluationSession(saved).execute({
    operation: 'evaluation.create-definition',
    input: definition,
  });
  const second = await createGuestEvaluationSession(saved).execute({
    operation: 'evaluation.create-definition',
    input: definition,
  });
  assert.ok(first.ok && 'value' in first && second.ok && 'value' in second);
  assert.equal(second.value.definitions.length, 2);
  assert.notEqual(
    second.value.definitions[0].id,
    second.value.definitions[1].id,
  );
  const isolated = await createGuestEvaluationSession(storage()).execute({
    operation: 'evaluation.read',
  });
  assert.ok(isolated.ok && 'value' in isolated);
  assert.equal(isolated.value.definitions.length, 0);
  saved.setItem('other', 'retain');
  resetGuestEvaluation(saved);
  assert.equal(saved.getItem(guestEvaluationStorageKey), null);
  assert.equal(saved.getItem('other'), 'retain');
});

test('guest session rejects owner state and corrupt storage without replacing either', async () => {
  for (const invalid of [
    '{',
    JSON.stringify({ ...emptyEvaluationState(), synthetic: false }),
  ]) {
    const saved = storage();
    saved.setItem(guestEvaluationStorageKey, invalid);
    const result = await createGuestEvaluationSession(saved).execute({
      operation: 'evaluation.create-definition',
      input: definition,
    });
    assert.ok(!result.ok);
    assert.equal(result.error.code, 'unavailable');
    assert.equal(saved.getItem(guestEvaluationStorageKey), invalid);
  }
});

test('simultaneous guest writers cannot silently overwrite each other', async () => {
  const saved = storage();
  const results = await Promise.all(
    [
      createGuestEvaluationSession(saved),
      createGuestEvaluationSession(saved),
    ].map((port) =>
      port.execute({
        operation: 'evaluation.create-definition',
        input: definition,
      }),
    ),
  );
  assert.equal(results.filter((item) => item.ok).length, 1);
  const failed = results.find((item) => !item.ok);
  assert.ok(failed && !failed.ok);
  assert.equal(failed.error.code, 'conflict');
});
