import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuestEvaluationPort } from '../adapters/guest.ts';
import type { EvaluationCommand } from '../contracts/index.ts';

type DefinitionInput = Extract<
  EvaluationCommand,
  { operation: 'evaluation.create-definition' }
>['input'];

const definition: DefinitionInput = {
  name: 'fixture',
  hypothesis: 'synthetic',
  cases: [
    { id: 'a', input: 'a', expected: 'yes' },
    { id: 'b', input: 'b', expected: 'yes' },
  ],
  subjects: [
    { id: 'one', label: 'One', configuration: {} },
    { id: 'two', label: 'Two', configuration: {} },
  ],
  metric: { kind: 'exact-match' as const },
  repetitions: 1,
  budget: { maxRequests: 4, maxTokens: 40 },
};
const manualDefinition: DefinitionInput = {
  ...definition,
  metric: { kind: 'manual' },
};
async function setup(
  port = createGuestEvaluationPort(),
  input: DefinitionInput = definition,
) {
  await port.execute({
    operation: 'evaluation.create-definition',
    input,
  });
  await port.execute({
    operation: 'evaluation.freeze-definition',
    definitionId: 'definition-1',
    revision: 1,
  });
  await port.execute({
    operation: 'evaluation.create-run',
    definitionId: 'definition-1',
    revision: 1,
  });
  return port;
}
async function executeUnknown(
  port: ReturnType<typeof createGuestEvaluationPort>,
  command: unknown,
) {
  return port.execute(command as never);
}
async function readState(port: ReturnType<typeof createGuestEvaluationPort>) {
  const result = await port.execute({ operation: 'evaluation.read' });
  if (!result.ok || !('value' in result)) throw new Error('State read failed.');
  return result.value;
}
const attempts = ['one:a', 'one:b', 'two:a', 'two:b'].map((value) => {
  const [subjectId, caseId] = value.split(':');
  return {
    subjectId,
    caseId,
    repetition: 1,
    status: 'completed' as const,
    output: caseId === 'a' ? 'yes' : 'no',
    failure: null,
    usage: { requests: 1, tokens: 2 },
  };
});

test('guest imports a complete synthetic matrix, compares it, and exports one run', async () => {
  const port = await setup();
  const imported = await port.execute({
    operation: 'evaluation.import-attempts',
    runId: 'run-2',
    attempts,
  });
  assert.equal(imported.ok, true);
  if (!imported.ok || !('value' in imported)) return;
  assert.equal(imported.value.runs[0].status, 'complete');
  assert.deepEqual(
    imported.value.aggregates.map((item) => [
      item.subjectId,
      item.passed,
      item.failed,
      item.unknown,
    ]),
    [
      ['one', 1, 1, 0],
      ['two', 1, 1, 0],
    ],
  );
  const report = await port.execute({
    operation: 'evaluation.export-report',
    runId: 'run-2',
    format: 'json',
  });
  assert.equal(report.ok, true);
  if (report.ok && 'report' in report)
    assert.equal(report.report.runs.length, 1);
});

test('guest rejects duplicate coordinates and isolates ports and returned values', async () => {
  const first = await setup();
  const second = createGuestEvaluationPort();
  const duplicate = await first.execute({
    operation: 'evaluation.import-attempts',
    runId: 'run-2',
    attempts: [attempts[0], attempts[0]],
  });
  assert.equal(duplicate.ok, false);
  const read = await first.execute({ operation: 'evaluation.read' });
  assert.equal(read.ok, true);
  if (read.ok && 'value' in read)
    (read.value.definitions as { name: string }[])[0].name = 'mutated';
  const again = await first.execute({ operation: 'evaluation.read' });
  assert.equal(again.ok, true);
  if (again.ok && 'value' in again)
    assert.equal(again.value.definitions[0].name, 'fixture');
  const isolated = await second.execute({ operation: 'evaluation.read' });
  assert.equal(isolated.ok, true);
  if (isolated.ok && 'value' in isolated)
    assert.equal(isolated.value.definitions.length, 0);
});

test('guest rejects malformed imported input and manual scores without mutation', async () => {
  const port = await setup();
  const before = await readState(port);
  const invalidImports = [
    {
      operation: 'evaluation.import-attempts',
      runId: 'run-2',
      attempts: [null],
    },
    {
      operation: 'evaluation.import-attempts',
      runId: 'run-2',
      attempts: [{ ...attempts[0], extra: true }],
    },
    {
      operation: 'evaluation.import-attempts',
      runId: 'run-2',
      attempts: [{ ...attempts[0], usage: { requests: '1', tokens: 2 } }],
    },
  ];
  for (const command of invalidImports) {
    assert.deepEqual(await executeUnknown(port, command), {
      ok: false,
      error: {
        code: 'invalid',
        message: 'Imported attempts are invalid or duplicate.',
      },
    });
    assert.deepEqual(await readState(port), before);
  }

  const manual = await setup(createGuestEvaluationPort(), manualDefinition);
  const imported = await manual.execute({
    operation: 'evaluation.import-attempts',
    runId: 'run-2',
    attempts,
  });
  assert.equal(imported.ok, true);
  const manualBefore = await readState(manual);
  for (const scores of [[null], [{ attemptId: 'attempt-3', passed: 'yes' }]]) {
    assert.deepEqual(
      await executeUnknown(manual, {
        operation: 'evaluation.score-manual',
        runId: 'run-2',
        scores,
      }),
      {
        ok: false,
        error: { code: 'invalid', message: 'Manual scores are invalid.' },
      },
    );
    assert.deepEqual(await readState(manual), manualBefore);
  }
});
