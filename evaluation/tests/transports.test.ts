import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEvaluationCli,
  createEvaluationMcp,
} from '../adapters/transports.ts';

const port = {
  async execute(command: { operation: 'evaluation.read' }) {
    return {
      ok: true as const,
      value: {
        schemaVersion: 1 as const,
        version: 0,
        synthetic: true,
        definitions: [],
        runs: [],
        aggregates: [],
      },
    };
  },
};
test('portable evaluation transports deny undeclared input before the port', async () => {
  assert.equal(
    (await createEvaluationMcp(port)({ operation: 'evaluation.delete' })).ok,
    false,
  );
  assert.equal((await createEvaluationCli(port)('{')).ok, false);
  assert.equal(
    (
      await createEvaluationCli(port)(
        JSON.stringify({ operation: 'evaluation.read' }),
      )
    ).ok,
    true,
  );
});
