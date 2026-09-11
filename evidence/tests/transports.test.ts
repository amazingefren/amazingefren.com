import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEvidenceCli,
  createEvidenceMcp,
  evidenceCliOperations,
  evidenceMcpOperations,
} from '../adapters/transports.ts';
import type { EvidenceCommand } from '../contracts/index.ts';

test('evidence transports derive declared owner operations', () => {
  assert.deepEqual([...evidenceMcpOperations].sort(), [
    'evidence.create',
    'evidence.export-reviewed',
    'evidence.read',
    'evidence.review',
    'evidence.update',
  ]);
  assert.deepEqual([...evidenceCliOperations].sort(), [
    'evidence.create',
    'evidence.export-reviewed',
    'evidence.read',
    'evidence.review',
    'evidence.update',
  ]);
});

test('evidence transports deny malformed and undeclared input before dispatch', async () => {
  const calls: EvidenceCommand[] = [];
  const port = {
    async execute(command: EvidenceCommand) {
      calls.push(command);
      return {
        ok: true as const,
        value: { version: 0, synthetic: false, records: [] },
      };
    },
  };
  const mcp = createEvidenceMcp(port);
  const cli = createEvidenceCli(port);

  assert.equal((await mcp({ operation: 'evidence.delete' })).ok, false);
  assert.equal(
    (await mcp({ operation: 'evidence.read', extra: true })).ok,
    false,
  );
  assert.equal((await cli('{')).ok, false);
  assert.equal(
    (await cli(JSON.stringify({ operation: 'evidence.delete' }))).ok,
    false,
  );
  assert.equal(calls.length, 0);

  assert.equal((await mcp({ operation: 'evidence.read' })).ok, true);
  assert.equal(
    (await cli(JSON.stringify({ operation: 'evidence.read' }))).ok,
    true,
  );
  assert.equal(calls.length, 2);
});

test('evidence transports return typed unavailability when the authorized port fails', async () => {
  const port = {
    async execute(_command: EvidenceCommand) {
      throw new Error('storage outage');
    },
  };
  const result = await createEvidenceMcp(port)({ operation: 'evidence.read' });
  assert.deepEqual(result, {
    ok: false,
    error: { code: 'unavailable', message: 'Evidence is unavailable.' },
  });
});
